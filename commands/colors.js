const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('colors')
        .setDescription('Choose your nickname color.'),
    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setTitle('🎨 Nickname Color Selection')
            .setDescription('Click a button below to change your nickname color!')
            .setColor(config.colors.primary)
            .setTimestamp()
            .setFooter({ text: 'Bleed Colors' });

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('color_red').setLabel('Red').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('color_blue').setLabel('Blue').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('color_green').setLabel('Green').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('color_yellow').setLabel('Yellow').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('color_purple').setLabel('Purple').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('color_reset').setLabel('Reset Color').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    },
};
