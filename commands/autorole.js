const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Configure a role to be automatically assigned to new members.')
        .addSubcommand(subcommand =>
            subcommand.setName('set')
                .setDescription('Set the role for new members.')
                .addRoleOption(option => option.setName('role').setDescription('The role to assign').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Disable the auto-role feature.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('status')
                .setDescription('View the current auto-role configuration.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            const role = interaction.options.getRole('role');
            
            // Check if the role is assignable (below bot's highest role)
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({ content: 'I cannot assign this role because it is higher than or equal to my highest role.', flags: [64] });
            }

            db.setConfig('autorole_id', role.id);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Autorole Set')
                .setDescription(`New members will now automatically receive the <@&${role.id}> role.`)
                .setColor(config.colors.success)
                .setTimestamp()
                .setFooter({ text: 'Bleed System' });

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'remove') {
            db.deleteConfig('autorole_id');
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Autorole Removed')
                .setDescription('Auto-role has been disabled.')
                .setColor(config.colors.error)
                .setTimestamp()
                .setFooter({ text: 'Bleed System' });

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'status') {
            const roleId = db.getConfig('autorole_id');
            const role = roleId ? interaction.guild.roles.cache.get(roleId) : null;

            const description = role 
                ? `Currently configured auto-role: <@&${roleId}>`
                : 'No auto-role is currently configured.';
            
            const embed = new EmbedBuilder()
                .setTitle('ℹ️ Autorole Status')
                .setDescription(description)
                .setColor(config.colors.primary)
                .setTimestamp()
                .setFooter({ text: 'Bleed System' });

            await interaction.reply({ embeds: [embed] });
        }
    },
};
