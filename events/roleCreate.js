const { Events, AuditLogEvent, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const config = require('../config.json');

module.exports = {
    name: Events.GuildRoleCreate,
    async execute(role, client) {
        if (!role.guild) return;

        // Fetch Audit Logs
        const fetchedLogs = await role.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.RoleCreate,
        });
        const creationLog = fetchedLogs.entries.first();

        if (!creationLog) return;
        const { executor } = creationLog;
        const isOwner = executor.id === process.env.OWNER_ID;
        const isWhitelisted = db.isWhitelisted(executor.id);
        const isAuthorized = isOwner || isWhitelisted || (config.whitelisted_users && config.whitelisted_users.includes(executor.id));

        // Skip if authorized but log it
        if (isAuthorized) {
            console.log(`[Bleed Guard] Authorized role creation by: ${executor.tag}`);
            
            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = await role.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    let actionReason = "Whitelisted User";
                    if (isOwner && isWhitelisted) actionReason = "Owner & Whitelist";
                    else if (isOwner) actionReason = "Owner";

                    const logEmbed = new EmbedBuilder()
                        .setTitle('🛡️ Guard: Safe Triggered')
                        .setDescription(`A role creation was performed by an authorized user.`)
                        .addFields(
                            { name: 'Role', value: `${role.name}`, inline: true },
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

        // 1. Delete Unauthorized Role
        try {
            await role.delete('Bleed Guard: Unauthorized role creation');
            console.log(`[Bleed Guard] Deleted unauthorized role: ${role.name}`);
        } catch (error) {
            console.error('[Bleed Guard] Error deleting role:', error);
        }

        // 2. Punishment: Role Strip + 7-Day Timeout
        try {
            const member = await role.guild.members.fetch(executor.id);

            if (member && member.moderatable) {
                // Strip all roles
                await member.roles.set([]).catch(e => console.error('[Bleed Guard] Failed to strip roles:', e));
                
                // 7-day timeout
                await member.timeout(7 * 24 * 60 * 60 * 1000, 'Bleed Guard: Unauthorized role creation');
                console.log(`[Bleed Guard] Stripped roles and timed out ${executor.tag} for 7 days.`);
            }
        } catch (error) {
            console.error('[Bleed Guard] Error punishing member:', error);
        }

        // 3. Log
        const logChannelId = process.env.LOG_CHANNEL_ID;
        if (logChannelId) {
            const logChannel = await role.guild.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🛡️ Guard: Unauthorized Role Creation')
                    .setDescription(`An unauthorized role creation was prevented.`)
                    .addFields(
                        { name: 'Role', value: `${role.name}`, inline: true },
                        { name: 'Executor', value: `<@${executor.id}>`, inline: true },
                        { name: 'Action', value: 'Role Deleted, Roles Stripped & User Timed Out (7d)', inline: false }
                    )
                    .setColor(config.colors.error)
                    .setTimestamp()
                    .setFooter({ text: 'Bleed Security' });

                logChannel.send({ embeds: [logEmbed] });
            }
        }
    },
};
