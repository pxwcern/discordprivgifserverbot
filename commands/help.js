const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows a list of all available commands.'),
    async execute(interaction, client) {
        const commands = client.commands;

        // Group commands by category (for simplicity, we'll just list them)
        const helpEmbed = new EmbedBuilder()
            .setTitle('Bleed Bot Commands')
            .setDescription('Here are the available commands for Bleed Bot:')
            .setColor(config.colors.primary)
            .setTimestamp()
            .setFooter({ text: 'Bleed System' });

        const commandList = commands.map(cmd => `**/${cmd.data.name}**: ${cmd.data.description}`).join('\n');
        helpEmbed.addFields({ name: 'Commands', value: commandList });

        await interaction.reply({ embeds: [helpEmbed] });
    },
};
