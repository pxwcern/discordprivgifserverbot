const { EmbedBuilder } = require('discord.js');
const db = require('./database');

module.exports = {
    async checkGiveaways(client) {
        const activeGiveaways = db.getActiveGiveaways();
        const now = Date.now();

        for (const giveaway of activeGiveaways) {
            const endAt = Number(giveaway.end_at);
            // Check if it's over
            if (endAt <= now) {
                await this.endGiveaway(client, giveaway);
            } else if (now % 5000 < 1000) {
                // Every ~5 seconds
                await this.updateGiveaway(client, giveaway);
            }
        }
    },

    async endGiveaway(client, giveaway) {
        try {
            const channel = await client.channels.fetch(giveaway.channel_id);
            const message = await channel.messages.fetch(giveaway.message_id);

            // Robust reaction finding (ID: 1473682667542417592)
            const reaction = message.reactions.cache.get('1473682667542417592') || message.reactions.cache.find(r => r.emoji.name === 'rewards' || r.emoji.id === '1473682667542417592');

            let participants = [];
            if (reaction) {
                const users = await reaction.users.fetch();
                participants = users.filter(user => !user.bot).map(user => user.id);
            }

            db.finishGiveaway(giveaway.message_id);

            if (participants.length === 0) {
                const noWinnersEmbed = EmbedBuilder.from(message.embeds[0])
                    .setDescription(`**Giveaway ended**\n*No one participated.*`)
                    .setColor('#2F3136');

                await message.edit({ embeds: [noWinnersEmbed] });
                await channel.send(`The giveaway for **${giveaway.prize}** ended, but no one participated.`);
                return;
            }

            // Pick winner(s)
            const winnerIds = [];
            const tempParticipants = [...participants];
            for (let i = 0; i < giveaway.winners; i++) {
                if (tempParticipants.length === 0) break;
                const randomIndex = Math.floor(Math.random() * tempParticipants.length);
                winnerIds.push(tempParticipants.splice(randomIndex, 1)[0]);
            }

            const winnerMentions = winnerIds.map(id => `<@${id}>`).join(', ');

            const winnersEmbed = EmbedBuilder.from(message.embeds[0])
                .setDescription(`**Giveaway ended**\nWinners: ${winnerMentions}\nParticipants: **${participants.length}**`)
                .setColor('#2F3136');

            await message.edit({ embeds: [winnersEmbed] });
            await channel.send(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);

        } catch (error) {
            console.error('Error ending giveaway:', error);
            db.finishGiveaway(giveaway.message_id);
        }
    },

    async updateGiveaway(client, giveaway) {
        try {
            const channel = client.channels.cache.get(giveaway.channel_id) || await client.channels.fetch(giveaway.channel_id);
            if (!channel) return;
            const message = await channel.messages.fetch(giveaway.message_id);

            // Robust reaction finding (ID: 1473682667542417592)
            const reaction = message.reactions.cache.get('1473682667542417592') || message.reactions.cache.find(r => r.emoji.name === 'rewards' || r.emoji.id === '1473682667542417592');

            const countSize = reaction ? (await reaction.users.fetch()).filter(u => !u.bot).size : 0;

            const updatedEmbed = EmbedBuilder.from(message.embeds[0])
                .setDescription(`Click the <a:rewards:1473682667542417592> button to enter\nNumber of winners: **${giveaway.winners}**\nParticipants: **${countSize}**\n\n**Giveaway ends**\nin <t:${Math.floor(Number(giveaway.end_at) / 1000)}:R>`)
                .setColor('#00A3FF');

            await message.edit({ embeds: [updatedEmbed] });
        } catch (error) {
            // Ignore errors
        }
    }
};
