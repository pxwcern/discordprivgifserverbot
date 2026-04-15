const { Events, ActivityType } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.PresenceUpdate,
    async execute(oldPresence, newPresence, client) {
        if (!newPresence || !newPresence.member) return;

        const member = newPresence.member;
        const guild = newPresence.guild;
        const supporterRoleId = config.supporter_role_id;
        const promoLink = config.promotion_link;

        if (!supporterRoleId || !promoLink) return;

        const role = guild.roles.cache.get(supporterRoleId);
        if (!role) return;

        // Custom Status Check
        const customStatus = newPresence.activities.find(act => act.type === ActivityType.Custom);
        const hasPromo = customStatus && customStatus.state && customStatus.state.includes(promoLink);

        try {
            if (hasPromo) {
                if (!member.roles.cache.has(supporterRoleId)) {
                    await member.roles.add(role);
                    console.log(`[Status Role] Added Supporter role to ${member.user.tag}`);
                }
            } else {
                if (member.roles.cache.has(supporterRoleId)) {
                    await member.roles.remove(role);
                    console.log(`[Status Role] Removed Supporter role from ${member.user.tag}`);
                }
            }
        } catch (error) {
            console.error(`[Status Role] Error updating roles for ${member.user.tag}:`, error);
        }
    },
};
