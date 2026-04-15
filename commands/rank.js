const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Shows yours or another user\'s rank.')
        .addUserOption(option => option.setName('user').setDescription('The user to check')),
    async execute(interaction, client) {
        const target = (interaction.options.getUser('user') || interaction.user);
        const user = db.getUser(target.id);

        const nextLevelXp = 100 * (user.level + 1);
        const progress = Math.min(1, Math.max(0, user.xp / nextLevelXp)); 
        const barSize = 10;
        const filled = Math.round(progress * barSize);
        const empty = Math.max(0, barSize - filled);
        const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${target.username}'s Rank`)
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: 'Level', value: `\`${user.level}\``, inline: true },
                { name: 'XP', value: `\`${user.xp}\``, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }, // Spacer
                { name: 'Today\'s Shared', value: `\`${user.shared_media_today || 0}\``, inline: true },
                { name: 'Total Shared', value: `\`${user.shared_media || 0}\``, inline: true }
            )
            .setColor(config.colors.primary)
            .setTimestamp()
            .setFooter({ text: 'Bleed Leveling' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rank_avatar_${target.id}`)
                .setLabel('Avatar')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🖼️')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
