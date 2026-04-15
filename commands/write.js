const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('write')
        .setDescription('Make the bot write a message.')
        .addStringOption(option => option.setName('message').setDescription('Message to send').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction, client) {
        const ownerId = process.env.OWNER_ID || '999243124943630449';
        
        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: 'Only the bot owner can use this command.', flags: [64] });
        }

        const message = interaction.options.getString('message');
        // Replace literal \n string with actual newline characters
        const formattedMessage = message.replace(/\\n/g, '\n');
        
        await interaction.channel.send(formattedMessage);
        await interaction.reply({ content: 'Message sent!', flags: [64] });
    },
};
