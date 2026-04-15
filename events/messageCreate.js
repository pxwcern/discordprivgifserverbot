const { Events, EmbedBuilder, MessageType } = require('discord.js');
const db = require('../utils/database');
const config = require('../config.json');
const messageBackup = require('../utils/messageBackup');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Booster Notification Automation (Target Channel: 1463918843087818756)
        if (message.channel.id === '1463918843087818756') {
            const boostTypes = [
                MessageType.GuildBoost,
                MessageType.GuildTier1Boost,
                MessageType.GuildTier2Boost,
                MessageType.GuildTier3Boost
            ];

            if (boostTypes.includes(message.type)) {
                // 1. React with custom emoji
                await message.react('<:lilalove:1463919359197057108>').catch(() => null);

                // 2. Refresh info message
                const messages = await message.channel.messages.fetch({ limit: 20 }).catch(() => null);
                if (messages) {
                    const botMessage = messages.find(m => m.author.id === client.user.id);
                    if (botMessage) {
                        await botMessage.delete().catch(() => null);
                    }
                }

                const infoMessage = `**Thank you for boosts!** If you want to take info about booster perks check here: <#1463918843087818756> <:lilalove:1463919359197057108>\nYou can **make your own custom banner & avatar** here by boosting us! <#1482071720121598073> & <#1482071953555722351>`;
                await message.channel.send(infoMessage);
            }
        }

        if (message.author.bot || !message.guild) return;
 
        // Prefix Command Handling
        const prefix = config.prefix || 'b!';
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const command = client.commands.get(commandName);
 
            if (command) {
                // Check permissions
                if (command.data.default_member_permissions) {
                    if (!message.member.permissions.has(command.data.default_member_permissions)) {
                        return message.reply(`You don't have permission to use this command.`);
                    }
                }
 
                // Create Interaction-like shim
                const interactionShim = {
                    reply: async (options) => {
                        if (typeof options === 'string') return message.reply(options);
                        return message.channel.send({ content: options.content, embeds: options.embeds, components: options.components });
                    },
                    editReply: async (options) => message.channel.send(options),
                    deferReply: async () => {},
                    user: message.author,
                    member: message.member,
                    guild: message.guild,
                    channel: message.channel,
                    commandName: commandName,
                    options: {
                        getSubcommand: () => {
                            const subcommands = command.data.options?.filter(o => o.type === 1) || [];
                            if (subcommands.length > 0 && subcommands.some(s => s.name === args[0])) {
                                return args.shift();
                            }
                            return null;
                        },
                        getString: (name) => {
                            // Find option index in command data
                            const options = command.data.options || [];
                            const idx = options.findIndex(o => o.name === name);
                            return args[idx] || null;
                        },
                        getInteger: (name) => {
                            const options = command.data.options || [];
                            const idx = options.findIndex(o => o.name === name);
                            return args[idx] ? parseInt(args[idx]) : null;
                        },
                        getUser: (name) => {
                            const mention = message.mentions.users.first();
                            if (mention) return mention;
                            // Basic ID check in args (only for the first user/target)
                            return null; 
                        },
                        getMember: (name) => message.mentions.members.first(),
                    }
                };
 
                // Specific fix for subcommand positional args mapping
                const originalGetSubcommand = interactionShim.options.getSubcommand;
                interactionShim.options.getSubcommand = () => {
                    const sub = originalGetSubcommand();
                    if (sub) {
                        // Remap options to the subcommand's options
                        const subData = command.data.options.find(o => o.name === sub);
                        const subOptions = subData.options || [];
                        interactionShim.options.getString = (name) => {
                            const idx = subOptions.findIndex(o => o.name === name);
                            return args[idx] || null;
                        };
                        interactionShim.options.getInteger = (name) => {
                            const idx = subOptions.findIndex(o => o.name === name);
                            return args[idx] ? parseInt(args[idx]) : null;
                        };
                    }
                    return sub;
                };
 
                try {
                    await command.execute(interactionShim, client);
                } catch (error) {
                    console.error(error);
                    message.reply('There was an error while executing this command!');
                }
                return;
            }
        }

        // Store message in Backup Buffer
        messageBackup.addMessage(message);

        // Leveling Logic
        const userId = message.author.id;
        const now = Date.now();

        // Media Detection & Counting
        let mediaCount = 0;

        // Count Attachments
        if (message.attachments.size > 0) {
            mediaCount += message.attachments.size;
        }

        // Count Media Links (Tenor/Giphy/Direct Images)
        const mediaRegex = /https?:\/\/(?:tenor\.com|giphy\.com|media\.giphy\.com|pbs\.twimg\.com|cdn\.discordapp\.com|media\.discordapp\.net)\/\S+|https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|mp4|mov)/gi;
        const matches = message.content.match(mediaRegex);
        if (matches) {
            mediaCount += matches.length;
        }

        if (mediaCount > 0) {
            db.incrementMediaCount(userId, mediaCount);
            console.log(`[Bleed Media] Counted ${mediaCount} items for ${message.author.tag}`);
        }

        // Shortcut Message Logic (-w)
        if (message.content.endsWith(' -w')) {
            const isWhitelisted = db.isWhitelisted(userId) || userId === process.env.OWNER_ID;

            if (isWhitelisted) {
                const content = message.content.slice(0, -3).trim();
                await message.delete().catch(() => null);
                if (content.length > 0) {
                    await message.channel.send(content);
                }
                return; // Skip leveling for shortcut messages
            }
        }

        const user = db.getUser(userId);

        // 1-minute cooldown for XP
        if (now - user.last_message_at > 60000) {
            const xpGain = Math.floor(Math.random() * 11) + 15; // 15-25 XP
            let newXp = user.xp + xpGain;
            let newLevel = user.level;

            // Level Up Formula: 100 * (level + 1)
            const xpNeeded = 100 * (newLevel + 1);

            if (newXp >= xpNeeded) {
                newLevel++;
                newXp -= xpNeeded;

                // Level Up Embed
                const levelUpEmoji = '<a:1149274229255176274:1481300146976460820>';
                await message.channel.send(`Congratulations <@${userId}>! You've reached **Level ${newLevel}**! ${levelUpEmoji}`);

                // Level Roles Logic (if configured in settings/database)
                // This would check if a role should be added for this specific level.
            }

            db.updateUser(userId, newXp, newLevel, now);
        }
    },
};
