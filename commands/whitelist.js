const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../utils/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Manage the system whitelist (Owner Only).')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a user to the whitelist.')
                .addUserOption(option => option.setName('user').setDescription('The user to whitelist').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a user from the whitelist.')
                .addUserOption(option => option.setName('user').setDescription('The user to remove').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('List all whitelisted users.')
        ),
    async execute(interaction, client) {
        const ownerId = process.env.OWNER_ID || '999243124943630449';
        
        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: 'Only the bot owner can manage the whitelist.', flags: [64] });
        }

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');

        if (subcommand === 'add') {
            db.addToWhitelist(user.id);
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Whitelist Updated')
                .setDescription(`Successfully added <@${user.id}> to the whitelist.`)
                .setColor(config.colors.success)
                .setTimestamp()
                .setFooter({ text: 'Bleed Security' });
            
            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'remove') {
            db.removeFromWhitelist(user.id);
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Whitelist Updated')
                .setDescription(`Successfully removed <@${user.id}> from the whitelist.`)
                .setColor(config.colors.warning)
                .setTimestamp()
                .setFooter({ text: 'Bleed Security' });
            
            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'list') {
            const list = db.getWhitelist();
            const listText = list.length > 0 ? list.map(id => `<@${id}> (\`${id}\`)`).join('\n') : 'No whitelisted users.';
            
            const embed = new EmbedBuilder()
                .setTitle('🛡️ Whitelist Members')
                .setDescription(listText)
                .setColor(config.colors.primary)
                .setTimestamp()
                .setFooter({ text: 'Bleed Security' });
            
            await interaction.reply({ embeds: [embed] });
        }
    },
};
