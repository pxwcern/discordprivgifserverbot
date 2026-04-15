const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes a member using timeout.')
        .addUserOption(option => option.setName('user').setDescription('The user to mute').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('Duration (e.g., 10m, 1h, 1d)').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for muting'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const member = await interaction.guild.members.fetch(user.id);

        if (!member) {
            return interaction.reply({ content: 'Member not found.', flags: [64] });
        }

        const duration = ms(durationStr);
        if (!duration || duration > 28 * 24 * 60 * 60 * 1000) {
            return interaction.reply({ content: 'Invalid duration. Maximum is 28 days.', flags: [64] });
        }

        if (!member.moderatable) {
            return interaction.reply({ content: 'I cannot mute this member.', flags: [64] });
        }

        await member.timeout(duration, reason);

        const embed = new EmbedBuilder()
            .setTitle('Member Muted')
            .setDescription(`**User:** <@${user.id}>\n**Duration:** ${durationStr}\n**Reason:** ${reason}`)
            .setColor(config.colors.warning)
            .setTimestamp()
            .setFooter({ text: 'Bleed Moderation' });

        await interaction.reply({ embeds: [embed] });
    },
};
