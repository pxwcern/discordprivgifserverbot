const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency.'),
    async execute(interaction, client) {
        const ping = client.ws.ping;
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setDescription(`Latenci: **${ping}ms**`)
            .setColor(config.colors.primary)
            .setTimestamp()
            .setFooter({ text: 'Bleed System' });

        await interaction.reply({ embeds: [embed] });
    },
};
