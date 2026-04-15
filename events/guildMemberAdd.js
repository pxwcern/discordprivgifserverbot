const { Events } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        const guildId = member.guild.id;
        const pojChannelIds = db.getPojChannels();
        const pojDelay = db.getConfig('poj_delay');
        const autoroleId = db.getConfig('autorole_id');

        // Assign auto-role if configured
        if (autoroleId && !member.user.bot) {
            const role = member.guild.roles.cache.get(autoroleId);
            if (role) {
                // Check permissions
                if (member.guild.members.me.permissions.has('ManageRoles') && role.position < member.guild.members.me.roles.highest.position) {
                    await member.roles.add(role).catch(console.error);
                }
            }
        }

        if (pojChannelIds.length === 0) return;

        for (const channelId of pojChannelIds) {
            const channel = await member.guild.channels.fetch(channelId).catch(() => null);

            if (channel) {
                const welcomeMessage = await channel.send(`<@${member.id}> **Welcome** to our server **GIFCLUB!** <a:blueess:1481308400389324871>`).catch(console.error);

                // Auto-delete after delay
                if (welcomeMessage && pojDelay) {
                    setTimeout(() => {
                        welcomeMessage.delete().catch(() => null);
                    }, pojDelay * 1000);
                }
            }
        }
    },
};
