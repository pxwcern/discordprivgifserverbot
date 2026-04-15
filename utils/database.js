const Database = require('better-sqlite3');
const path = require('path');

// Use absolute path for reliability across different start methods
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for high performance and durability (prevents data loss on close/crash)
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        last_message_at INTEGER DEFAULT 0,
        shared_media INTEGER DEFAULT 0,
        shared_media_today INTEGER DEFAULT 0,
        last_media_date TEXT
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        channel_id TEXT,
        type TEXT,
        status TEXT DEFAULT 'open'
    );

    CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        channel_id TEXT,
        prize TEXT,
        winners INTEGER,
        end_at INTEGER,
        hosted_by TEXT,
        status TEXT DEFAULT 'active'
    );
 
    CREATE TABLE IF NOT EXISTS giveaway_participants (
        message_id TEXT,
        user_id TEXT,
        PRIMARY KEY (message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS whitelist (
        id TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS poj_channels (
        id TEXT PRIMARY KEY
    );

    -- Ensure hosted_by column exists (for existing databases)
    BEGIN;
    SELECT CASE WHEN (SELECT count(*) FROM pragma_table_info('giveaways') WHERE name='hosted_by') = 0 
    THEN 'ALTER TABLE giveaways ADD COLUMN hosted_by TEXT' 
    ELSE 'SELECT 1' 
    END AS query;
    COMMIT;
`);

// Simple migrations
try {
    db.prepare('ALTER TABLE giveaways ADD COLUMN hosted_by TEXT').run();
} catch (e) {}

try {
    db.prepare('ALTER TABLE users ADD COLUMN shared_media_today INTEGER DEFAULT 0').run();
} catch (e) {}

try {
    db.prepare('ALTER TABLE users ADD COLUMN last_media_date TEXT').run();
} catch (e) {}

// Data integrity cleanup for media stats
try {
    db.prepare("UPDATE users SET shared_media = 0 WHERE shared_media IS NULL").run();
    db.prepare("UPDATE users SET shared_media_today = 0 WHERE shared_media_today IS NULL").run();
} catch (e) {}

module.exports = {
    // User Leveling
    getUser: (userId) => {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (user) return user;
        
        // Return default object for new users
        return { 
            id: userId, 
            xp: 0, 
            level: 0, 
            last_message_at: 0, 
            shared_media: 0, 
            shared_media_today: 0, 
            last_media_date: null 
        };
    },
    updateUser: (userId, xp, level, lastMessageAt) => {
        db.prepare(`
            INSERT INTO users (id, xp, level, last_message_at) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                xp = excluded.xp,
                level = excluded.level,
                last_message_at = excluded.last_message_at
        `).run(userId, xp, level, lastMessageAt);
    },
    getTopUsers: (limit = 10) => db.prepare('SELECT * FROM users ORDER BY xp DESC LIMIT ?').all(limit),

    incrementMediaCount: (userId, amount = 1) => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Ensure user exists first
        db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(userId);
        
        const user = db.prepare('SELECT last_media_date FROM users WHERE id = ?').get(userId);

        if (user.last_media_date !== today) {
            // New day! Reset daily counter
            db.prepare(`
                UPDATE users SET 
                    shared_media = COALESCE(shared_media, 0) + ?, 
                    shared_media_today = ?, 
                    last_media_date = ? 
                WHERE id = ?
            `).run(amount, amount, today, userId);
        } else {
            // Same day! Increment both
            db.prepare(`
                UPDATE users SET 
                    shared_media = COALESCE(shared_media, 0) + ?, 
                    shared_media_today = COALESCE(shared_media_today, 0) + ? 
                WHERE id = ?
            `).run(amount, amount, userId);
        }
    },

    // Tickets
    createTicket: (userId, channelId, type) => db.prepare('INSERT INTO tickets (user_id, channel_id, type) VALUES (?, ?, ?)').run(userId, channelId, type),
    getTicketByChannel: (channelId) => db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId),
    closeTicket: (channelId) => db.prepare("UPDATE tickets SET status = 'closed' WHERE channel_id = ?").run(channelId),

    // Giveaways
    createGiveaway: (messageId, channelId, prize, winners, endAt, hostedBy) => {
        db.prepare('INSERT INTO giveaways (message_id, channel_id, prize, winners, end_at, hosted_by) VALUES (?, ?, ?, ?, ?, ?)').run(messageId, channelId, prize, winners, endAt, hostedBy);
    },
    getActiveGiveaways: () => db.prepare("SELECT * FROM giveaways WHERE status = 'active'").all(),
    finishGiveaway: (messageId) => db.prepare("UPDATE giveaways SET status = 'finished' WHERE message_id = ?").run(messageId),
 
    // Giveaway Participants
    addGiveawayParticipant: (messageId, userId) => {
        try {
            db.prepare('INSERT INTO giveaway_participants (message_id, user_id) VALUES (?, ?)').run(messageId, userId);
            return true;
        } catch (e) {
            return false; // Already entered (primary key constraint)
        }
    },
    getGiveawayParticipants: (messageId) => db.prepare('SELECT user_id FROM giveaway_participants WHERE message_id = ?').all(messageId).map(row => row.user_id),
    getGiveawayParticipantCount: (messageId) => db.prepare('SELECT COUNT(*) as count FROM giveaway_participants WHERE message_id = ?').get(messageId).count,

    // Generic Config
    getConfig: (key) => db.prepare('SELECT value FROM config WHERE key = ?').get(key)?.value,
    setConfig: (key, value) => db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value.toString()),
    deleteConfig: (key) => db.prepare('DELETE FROM config WHERE key = ?').run(key),

    // Whitelist
    isWhitelisted: (userId) => !!db.prepare('SELECT 1 FROM whitelist WHERE id = ?').get(userId),
    addToWhitelist: (userId) => db.prepare('INSERT OR IGNORE INTO whitelist (id) VALUES (?)').run(userId),
    removeFromWhitelist: (userId) => db.prepare('DELETE FROM whitelist WHERE id = ?').run(userId),
    getWhitelist: () => db.prepare('SELECT id FROM whitelist').all().map(row => row.id),

    // POJ Channels
    getPojChannels: () => db.prepare('SELECT id FROM poj_channels').all().map(row => row.id),
    addPojChannel: (channelId) => db.prepare('INSERT OR IGNORE INTO poj_channels (id) VALUES (?)').run(channelId),
    removePojChannel: (channelId) => db.prepare('DELETE FROM poj_channels WHERE id = ?').run(channelId)
};
