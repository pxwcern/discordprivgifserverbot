const { Events, ActivityType, EmbedBuilder, REST, Routes } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // Set presence
        client.user.setActivity('over Bleed', { type: ActivityType.Watching });

        // Revert username Change if it was applied
        client.user.setUsername('Bleed').catch(() => console.log('[System] Username change rate limited.'));

        // Register Slash Commands
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const commands = client.commands.map(command => command.data.toJSON());

        try {
            console.log(`Started refreshing ${commands.length} application (/) commands.`);

            // Register to a specific guild (faster for dev/specific server bot)
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
                { body: commands },
            );

            console.log(`Successfully reloaded application (/) commands.`);
        } catch (error) {
            console.error(error);
        }

        // Initialize logic for ongoing tasks (giveaways, etc.) if needed
    },
};
