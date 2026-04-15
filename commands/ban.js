const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a member from the server.')
        .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for banning'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = await interaction.guild.members.fetch(user.id);

        if (!member) {
            return interaction.reply({ content: 'Member not found.', flags: [64] });
        }

        if (!member.bannable) {
            return interaction.reply({ content: 'I cannot ban this member.', flags: [64] });
        }

        await member.ban({ reason });

        const embed = new EmbedBuilder()
            .setTitle('Member Banned')
            .setDescription(`**User:** <@${user.id}>\n**Reason:** ${reason}`)
            .setColor(config.colors.error)
            .setTimestamp()
            .setFooter({ text: 'Bleed Moderation' });

        await interaction.reply({ embeds: [embed] });
    },
};
