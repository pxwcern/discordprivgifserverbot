const { Events, AuditLogEvent, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../utils/database');
const config = require('../config.json');
const messageBackup = require('../utils/messageBackup');

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel, client) {
        if (!channel.guild) return;

        // Fetch Audit Logs
        const fetchedLogs = await channel.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.ChannelDelete,
        });
        const deletionLog = fetchedLogs.entries.first();

        if (!deletionLog) return;

        const { executor } = deletionLog;
        // Skip if bot
        if (executor.id === client.user.id) return;

        const isOwner = executor.id === process.env.OWNER_ID;
        const isWhitelisted = db.isWhitelisted(executor.id);
        const isAuthorized = isOwner || isWhitelisted || (config.whitelisted_users && config.whitelisted_users.includes(executor.id));

        // Skip if authorized but log it
        if (isAuthorized) {
            console.log(`[Bleed Anti-Nuke] Authorized deletion by: ${executor.tag}. Skipping punishment due to Whitelist/Owner status.`);

            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = await channel.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    let actionReason = "Whitelisted User";
                    if (isOwner && isWhitelisted) actionReason = "Owner & Whitelist";
                    else if (isOwner) actionReason = "Owner";

                    const logEmbed = new EmbedBuilder()
                        .setTitle('🛡️ Anti-Nuke: Safe Triggered')
                        .setDescription(`A channel deletion was performed by an authorized user.`)
                        .addFields(
                            { name: 'Channel', value: `${channel.name}`, inline: true },
                            { name: 'Executor', value: `<@${executor.id}> (\`${executor.tag}\`)`, inline: true },
                            { name: 'Action', value: `None - Admin Whitelisted Bypass (${actionReason})`, inline: false }
                        )
                        .setColor(config.colors.success)
                        .setTimestamp()
                        .setFooter({ text: 'Bleed Security' });

                    logChannel.send({ embeds: [logEmbed] });
                }
            }
            return;
        }

        // 1. IMMEDIATE Punishment: Role Strip + 7-Day Timeout
        const punishExecutor = async () => {
            try {
                const member = await channel.guild.members.fetch(executor.id).catch(() => null);
                const botMember = await channel.guild.members.fetch(client.user.id).catch(() => null);

                if (!member) return;

                // 1. Strip Roles (Highest Priority)
                if (botMember.roles.highest.position > member.roles.highest.position) {
                    await member.roles.set([]).catch(() => null);
                    console.log(`[Bleed Anti-Nuke] INSTANT: Stripped roles from ${executor.tag}.`);
                }
                    
                // 2. Timeout (Secondary Priority)
                if (member.moderatable) {
                    await member.timeout(7 * 24 * 60 * 60 * 1000, 'Bleed Anti-Nuke: Unauthorized channel deletion').catch(() => null);
                    console.log(`[Bleed Anti-Nuke] INSTANT: Timed out ${executor.tag} for 7 days.`);
                }
            } catch (error) {
                console.error('[Bleed Anti-Nuke] Fast-Punish Error:', error);
            }
        };

        // Start punishment immediately without waiting
        punishExecutor();

        // 2. Recreate Channel & Restore Messages (Asynchronous)
        const restoreChannel = async () => {
            try {
                const newChannel = await channel.guild.channels.create({
                    name: channel.name,
                    type: channel.type,
                    parent: channel.parentId,
                    permissionOverwrites: channel.permissionOverwrites.cache,
                    position: channel.position,
                    topic: channel.topic,
                    nsfw: channel.nsfw,
                    bitrate: channel.bitrate,
                    userLimit: channel.userLimit,
                    rateLimitPerUser: channel.rateLimitPerUser,
                });

                console.log(`[Bleed Anti-Nuke] Recreated channel: ${newChannel.name}`);

                const backupMessages = messageBackup.getMessages(channel.id);
                if (backupMessages.length > 0) {
                    const webhook = await newChannel.createWebhook({
                        name: 'Bleed Restoration',
                        avatar: client.user.displayAvatarURL(),
                    });

                    for (const msg of backupMessages) {
                        await webhook.send({
                            content: msg.content || '\u200B',
                            username: msg.author.username,
                            avatarURL: msg.author.avatarURL,
                            embeds: msg.embeds,
                            files: msg.attachments,
                        }).catch(() => null);
                    }

                    await webhook.delete().catch(() => null);
                    messageBackup.clearBuffer(channel.id);
                }
            } catch (error) {
                console.error('[Bleed Anti-Nuke] Restoration Error:', error);
            }
        };

        // Run restoration in background
        restoreChannel();

        // 3. Log to designated channel
        const logChannelId = process.env.LOG_CHANNEL_ID;
        if (logChannelId) {
            const logChannel = await channel.guild.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🛡️ Anti-Nuke Triggered')
                    .setDescription(`An unauthorized channel deletion was prevented.`)
                    .addFields(
                        { name: 'Channel', value: `${channel.name}`, inline: true },
                        { name: 'Executor', value: `<@${executor.id}>`, inline: true },
                        { name: 'Action', value: 'Channel Recreated, Messages Restored & User Punished', inline: false }
                    )
                    .setColor(config.colors.error)
                    .setTimestamp()
                    .setFooter({ text: 'Bleed Security' });

                logChannel.send({ embeds: [logEmbed] });
            }
        }
    },
};
