const { Events, AuditLogEvent, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const config = require('../config.json');
const guard = require('../utils/guardManager');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        if (!member.guild) return;

        // Fetch Audit Logs to check if it was a kick
        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberKick,
        });
        const kickLog = fetchedLogs.entries.first();

        // If no kick log or log is old, it might be a normal leave
        if (!kickLog || kickLog.target.id !== member.id || Date.now() - kickLog.createdTimestamp > 5000) return;

        const { executor } = kickLog;
        const isOwner = executor.id === process.env.OWNER_ID;
        const isWhitelisted = db.isWhitelisted(executor.id);
        const isAuthorized = isOwner || isWhitelisted || (config.whitelisted_users && config.whitelisted_users.includes(executor.id));

        // Skip if authorized but log it
        if (isAuthorized) {
            console.log(`[Bleed Guard] Authorized kick by: ${executor.tag}`);

            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = await member.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    let actionReason = "Whitelisted User";
                    if (isOwner && isWhitelisted) actionReason = "Owner & Whitelist";
                    else if (isOwner) actionReason = "Owner";

                    const logEmbed = new EmbedBuilder()
                        .setTitle('🛡️ Guard: Safe Triggered')
                        .setDescription(`A member kick was performed by an authorized user.`)
                        .addFields(
                            { name: 'Target', value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
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

        // 1. Check Mass Action
        const isMassKick = guard.checkMassAction(executor.id, 'kick', 3, 10000);

        if (isMassKick) {
            // 2. Punishment: Role Strip + 7-Day Timeout
            try {
                const executorMember = await member.guild.members.fetch(executor.id);

                if (executorMember && executorMember.moderatable) {
                    // Strip all roles
                    await executorMember.roles.set([]).catch(e => console.error('[Bleed Guard] Failed to strip roles:', e));
                    
                    // 7-day timeout
                    await executorMember.timeout(7 * 24 * 60 * 60 * 1000, 'Bleed Guard: Mass kick detection');
                    console.log(`[Bleed Guard] Stripped roles and timed out ${executor.tag} for 7 days.`);
                    
                    // 3. Log
                    const logChannelId = process.env.LOG_CHANNEL_ID;
                    if (logChannelId) {
                        const logChannel = await member.guild.channels.fetch(logChannelId).catch(() => null);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('🚨 Guard: Mass Kick Detected!')
                                .setDescription(`An unauthorized user is kicking members rapidly. Action has been taken.`)
                                .addFields(
                                    { name: 'Executor', value: `<@${executor.id}> (\`${executor.tag}\`)`, inline: true },
                                    { name: 'Threshold', value: '> 3 kicks in 10s', inline: true },
                                    { name: 'Action', value: 'Roles Stripped & User Timed Out (7d)', inline: false }
                                )
                                .setColor(config.colors.error)
                                .setTimestamp()
                                .setFooter({ text: 'Bleed Security' });

                            logChannel.send({ embeds: [logEmbed] });
                        }
                    }
                }
            } catch (error) {
                console.error('[Bleed Guard] Error handling mass kick:', error);
            }
        }
    },
};
