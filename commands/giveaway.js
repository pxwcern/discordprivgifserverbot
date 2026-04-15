const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage giveaways.')
        .addSubcommand(subcommand =>
            subcommand.setName('start')
                .setDescription('Starts a giveaway.')
                .addStringOption(option => option.setName('prize').setDescription('What to give away').setRequired(true))
                .addStringOption(option => option.setName('duration').setDescription('Wait duration (e.g., 1h, 1d)').setRequired(true))
                .addIntegerOption(option => option.setName('winners').setDescription('Number of winners').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction, client) {
        if (interaction.options.getSubcommand() === 'start') {
            const prize = interaction.options.getString('prize');
            const duration = interaction.options.getString('duration');
            const winnerCount = interaction.options.getInteger('winners');

            const msDuration = ms(duration);
            if (!msDuration) {
                return interaction.reply({ content: 'Invalid duration specified.', flags: [64] });
            }

            const endAt = Date.now() + msDuration;

            const embed = new EmbedBuilder()
                .setTitle(`Giveaway: ${prize}`)
                .setDescription(`Click the <a:rewards:1473682667542417592> button to enter\nNumber of winners: **${winnerCount}**\nParticipants: **0**\n\n**Giveaway ends**\nin <t:${Math.floor(endAt / 1000)}:R>`)
                .setColor('#00A3FF'); 

            const message = await interaction.channel.send({ 
                embeds: [embed]
            });
            await message.react('<a:rewards:1473682667542417592>');

            db.createGiveaway(message.id, interaction.channel.id, prize, winnerCount, endAt, interaction.user.id);

            await interaction.reply({ content: 'Giveaway started!', flags: [64] });
        }
    },
};
