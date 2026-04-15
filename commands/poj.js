const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const db = require('../utils/database');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poj')
        .setDescription('Configure Ping On Join (POJ) settings.')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a channel to the POJ system.')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel where welcome pings will be sent')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a channel from the POJ system.')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to remove')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('List all POJ channels and delay setup.')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('edit')
                .setDescription('Edit global POJ settings.')
                .addIntegerOption(option => 
                    option.setName('delay')
                        .setDescription('New deletion delay in seconds')))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        if (interaction.options.getSubcommand() === 'add') {
            const channel = interaction.options.getChannel('channel');
            db.addPojChannel(channel.id);

            const embed = new EmbedBuilder()
                .setTitle('🛡️ POJ Channel Added')
                .setDescription(`Successfully added ${channel} to the Ping On Join system.`)
                .setColor(config.colors.success)
                .setTimestamp()
                .setFooter({ text: 'Bleed Security' });

            await interaction.reply({ embeds: [embed], flags: [64] });
        } else if (interaction.options.getSubcommand() === 'remove') {
            const channel = interaction.options.getChannel('channel');
            db.removePojChannel(channel.id);

            const embed = new EmbedBuilder()
                .setTitle('🛡️ POJ Channel Removed')
                .setDescription(`Successfully removed ${channel} from the Ping On Join system.`)
                .setColor(config.colors.warning)
                .setTimestamp()
                .setFooter({ text: 'Bleed Security' });

            await interaction.reply({ embeds: [embed], flags: [64] });
        } else if (interaction.options.getSubcommand() === 'list') {
            const channelIds = db.getPojChannels();
            const delay = db.getConfig('poj_delay');

            const channelList = channelIds.length > 0 
                ? channelIds.map(id => `<#${id}>`).join('\n') 
                : 'No channels configured.';

            const embed = new EmbedBuilder()
                .setTitle('📋 POJ Overall Settings')
                .addFields(
                    { name: 'Active Channels', value: channelList },
                    { name: 'Deletion Delay', value: `${delay || 0} seconds` }
                )
                .setColor(config.colors.primary)
                .setTimestamp()
                .setFooter({ text: 'Bleed Security' });

            await interaction.reply({ embeds: [embed], flags: [64] });
        } else if (interaction.options.getSubcommand() === 'edit') {
            const delay = interaction.options.getInteger('delay');

            if (delay !== null) {
                db.setConfig('poj_delay', delay);
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ POJ Settings Updated')
                .setDescription(`The global deletion delay has been updated to: **${delay} seconds**.`)
                .setColor(config.colors.primary)
                .setTimestamp()
                .setFooter({ text: 'Bleed Security' });

            await interaction.reply({ embeds: [embed], flags: [64] });
        }
    },
};
