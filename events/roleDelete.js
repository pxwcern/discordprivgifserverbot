const { Events, AuditLogEvent, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const config = require('../config.json');

module.exports = {
    name: Events.GuildRoleDelete,
    async execute(role, client) {
        if (!role.guild) return;

        // Fetch Audit Logs
        const fetchedLogs = await role.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.RoleDelete,
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
            console.log(`[Bleed Guard] Authorized role deletion by: ${executor.tag}`);

            const logChannelId = process.env.LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = await role.guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    let actionReason = "Whitelisted User";
                    if (isOwner && isWhitelisted) actionReason = "Owner & Whitelist";
                    else if (isOwner) actionReason = "Owner";

                    const logEmbed = new EmbedBuilder()
                        .setTitle('🛡️ Guard: Safe Triggered')
                        .setDescription(`A role deletion was performed by an authorized user.`)
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

        // 1. Recreate Role
        try {
            const newRole = await role.guild.roles.create({
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                permissions: role.permissions,
                mentionable: role.mentionable,
                position: role.position,
                reason: 'Bleed Guard: Unauthorized role deletion',
            });

            console.log(`[Bleed Guard] Recreated role: ${newRole.name}`);
        } catch (error) {
            console.error('[Bleed Guard] Error recreating role:', error);
        }

        // 2. Punishment: Role Strip + 7-Day Timeout
        try {
            const member = await role.guild.members.fetch(executor.id).catch(() => null);
            const botMember = await role.guild.members.fetch(client.user.id).catch(() => null);

            if (!member) {
                console.log(`[Bleed Guard] Punishment Failed: Could not find member ${executor.tag} in guild.`);
                return;
            }

            console.log(`[Bleed Guard] Diagnostic: Bot Role Pos: ${botMember.roles.highest.position} | Member Role Pos: ${member.roles.highest.position}`);

            if (member.id === role.guild.ownerId) {
                console.log(`[Bleed Guard] Punishment Skipped: Member ${executor.tag} is the Server Owner.`);
                return;
            }

            // 1. Strip Roles (Possible even on Admins if bot is higher)
            if (botMember.roles.highest.position > member.roles.highest.position) {
                await member.roles.set([]).catch(e => console.error('[Bleed Guard] Failed to strip roles (Hierarchy?):', e));
                console.log(`[Bleed Guard] SUCCESS: Stripped roles from ${executor.tag}.`);
            } else {
                console.log(`[Bleed Guard] FAILED: Could not strip roles from ${executor.tag} because the bot is BELOW them in hierarchy.`);
            }
                
            // 2. Timeout (Impossible on Admins)
            if (member.moderatable) {
                await member.timeout(7 * 24 * 60 * 60 * 1000, 'Bleed Guard: Unauthorized role deletion');
                console.log(`[Bleed Guard] SUCCESS: Timed out ${executor.tag} for 7 days.`);
            } else {
                console.log(`[Bleed Guard] FAILED: Could not timeout ${executor.tag}. (Admins are immune to timeouts, or hierarchy issue).`);
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
                    .setTitle('🛡️ Guard: Unauthorized Role Deletion')
                    .setDescription(`An unauthorized role deletion was prevented.`)
                    .addFields(
                        { name: 'Role', value: `${role.name}`, inline: true },
                        { name: 'Executor', value: `<@${executor.id}>`, inline: true },
                        { name: 'Action', value: 'Role Recreated & User Timed Out (7d)', inline: false }
                    )
                    .setColor(config.colors.error)
                    .setTimestamp()
                    .setFooter({ text: 'Bleed Security' });

                logChannel.send({ embeds: [logEmbed] });
            }
        }
    },
};
