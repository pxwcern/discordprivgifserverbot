const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Deletes a specified number of messages.')
        .addIntegerOption(option => option.setName('amount').setDescription('The number of messages to delete (1-100)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction, client) {
        const amount = interaction.options.getInteger('amount');

        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: 'Amount must be between 1 and 100.', flags: [64] });
        }

        const messages = await interaction.channel.bulkDelete(amount, true);

        const embed = new EmbedBuilder()
            .setTitle('Messages Purged')
            .setDescription(`Successfully deleted ${messages.size} messages.`)
            .setColor(config.colors.success)
            .setTimestamp()
            .setFooter({ text: 'Bleed Moderation' });

        await interaction.reply({ embeds: [embed], flags: [64] });
    },
};
