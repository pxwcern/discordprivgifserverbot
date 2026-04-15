const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a member from the server.')
        .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for kicking'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = await interaction.guild.members.fetch(user.id);

        if (!member) {
            return interaction.reply({ content: 'Member not found.', flags: [64] });
        }

        if (!member.kickable) {
            return interaction.reply({ content: 'I cannot kick this member.', flags: [64] });
        }

        await member.kick(reason);

        const embed = new EmbedBuilder()
            .setTitle('Member Kicked')
            .setDescription(`**User:** <@${user.id}>\n**Reason:** ${reason}`)
            .setColor(config.colors.error)
            .setTimestamp()
            .setFooter({ text: 'Bleed Moderation' });

        await interaction.reply({ embeds: [embed] });
    },
};
