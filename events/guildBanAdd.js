const { Events, AuditLogEvent, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const config = require('../config.json');
const guard = require('../utils/guardManager');

module.exports = {
    name: Events.GuildBanAdd,
    async execute(ban, client) {
        if (!ban.guild) return;

        // Fetch Audit Logs to check who did the ban
        const fetchedLogs = await ban.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberBanAdd,
        });
        const banLog = fetchedLogs.entries.first();

        if (!banLog || banLog.target.id !== ban.user.id || Date.now() - banLog.createdTimestamp > 5000) return;

        const { executor } = banLog;
        const isWhitelisted = db.isWhitelisted(executor.id) || executor.id === process.env.OWNER_ID || (config.whitelisted_users && config.whitelisted_users.includes(executor.id));

        // Skip if authorized
        if (executor.id === client.user.id || isWhitelisted) {
            console.log(`[Bleed Guard] Authorized ban by: ${executor.tag}`);
            return;
        }

        // 1. Check Mass Action
        const isMassBan = guard.checkMassAction(executor.id, 'ban', 3, 10000);
        
        if (isMassBan) {
            // 2. Action: Timeout User
            try {
                const execMember = await ban.guild.members.fetch(executor.id);
                if (execMember && execMember.moderatable) {
                    await execMember.timeout(7 * 24 * 60 * 60 * 1000, 'Bleed Guard: Mass Ban detected');
                    console.log(`[Bleed Guard] Mass Ban! Timed out ${executor.tag} for 7 days.`);
                    
                    // 3. Log
                    const logChannelId = process.env.LOG_CHANNEL_ID;
                    if (logChannelId) {
                        const logChannel = await ban.guild.channels.fetch(logChannelId).catch(() => null);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('🚨 Guard: Mass Ban Detected!')
                                .setDescription(`An unauthorized user is banning members rapidly. Action has been taken.`)
                                .addFields(
                                    { name: 'Executor', value: `<@${executor.id}> (\`${executor.id}\`)`, inline: true },
                                    { name: 'Threshold', value: '> 3 bans in 10s', inline: true },
                                    { name: 'Action', value: 'User Timed Out (7d)', inline: false }
                                )
                                .setColor(config.colors.error)
                                .setTimestamp()
                                .setFooter({ text: 'Bleed Security' });

                            logChannel.send({ embeds: [logEmbed] });
                        }
                    }
                }
            } catch (error) {
                console.error('[Bleed Guard] Error handling mass ban:', error);
            }
        }
    },
};
