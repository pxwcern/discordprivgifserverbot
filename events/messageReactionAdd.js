const { Events } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user, client) {
        if (user.bot) return;

        // Note: Reaction role handling usually requires a mapping in the database.
        // For this demo, let's assume we're looking for roles based on the emoji.
        // Real-world use would check the database for (messageId, emoji) -> roleId.
        
        console.log(`[Bleed Reaction Roles] Reaction added: ${reaction.emoji.name} by ${user.tag}`);

        // Placeholder for real logic (e.g., db.getRoleByReaction(reaction.message.id, reaction.emoji.name))
    },
};
