const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Create a ticket panel.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('support')
                .setDescription('Create a support ticket panel.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('staff')
                .setDescription('Create a staff application ticket panel.'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        const type = interaction.options.getSubcommand();
        const color = config.colors.primary;

        const embed = new EmbedBuilder()
            .setTitle(type === 'support' ? 'Help Service' : 'Staff Application')
            .setDescription(`To create a ${type} ticket use the **Create ticket** button below.`)
            .setColor(color)
            .setFooter({ text: 'Bleed Support - Ticketing without clutter', iconURL: client.user.displayAvatarURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_${type}`)
                .setLabel('Create ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📩')
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `Successfully sent the ${type} panel!`, flags: [64] });
    },
};
