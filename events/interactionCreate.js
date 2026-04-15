const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(interaction.commandName, error);
                await interaction.reply({ content: 'There was an error while executing this command!', flags: [64] });
            }
        } else if (interaction.isButton()) {
            const customId = interaction.customId;
            const db = require('../utils/database');
            const { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

            if (customId === 'ticket_close') {
                const ticket = db.getTicketByChannel(interaction.channel.id);
                if (ticket) {
                    db.closeTicket(interaction.channel.id);
                    await interaction.reply({ content: 'Closing ticket...', flags: [64] });
                    // Wait a bit and then delete
                    setTimeout(() => interaction.channel.delete().catch(console.error), 2000);
                } else {
                    await interaction.reply({ content: 'This channel is not a ticket channel.', flags: [64] });
                }
            } else if (customId.startsWith('ticket_')) {
                const type = customId.split('_')[1];
                const userId = interaction.user.id;
                
                // Create a channel
                const channelName = `ticket-${type}-${interaction.user.username}`;
                const categoryId = type === 'staff' ? process.env.TICKET_STAFF_CATEGORY : process.env.TICKET_SUPPORT_CATEGORY;

                try {
                    const ticketChannel = await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: categoryId || null,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id, // Everyone
                                deny: [PermissionsBitField.Flags.ViewChannel],
                            },
                            {
                                id: userId,
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                            },
                            {
                                id: client.user.id,
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels],
                            }
                        ],
                    });

                    db.createTicket(userId, ticketChannel.id, type);

                    const welcomeEmbed = new EmbedBuilder()
                        .setTitle(`Bleed ${type.charAt(0).toUpperCase() + type.slice(1)} Ticket`)
                        .setDescription(`Hello <@${userId}>, support will be with you shortly. Use the button below to close this ticket.`)
                        .setColor(config.colors.primary)
                        .setTimestamp()
                        .setFooter({ text: 'Bleed System' });

                    const closeRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('ticket_close')
                            .setLabel('Close Ticket')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await ticketChannel.send({ embeds: [welcomeEmbed], components: [closeRow] });
                    await interaction.reply({ content: `Your ticket has been created: ${ticketChannel}`, flags: [64] });

                } catch (error) {
                    console.error('Error creating ticket:', error);
                    await interaction.reply({ content: 'Failed to create ticket. Make sure the bot has "Manage Channels" permission.', flags: [64] });
                }
            } else if (customId.startsWith('color_')) {
                const color = customId.split('_')[1];
                const member = interaction.member;
                const guild = interaction.guild;

                await interaction.deferReply({ flags: [64] });

                // Find or create role
                let roleName = `Color: ${color.charAt(0).toUpperCase() + color.slice(1)}`;
                if (color === 'reset') {
                    // Remove all color roles
                    const colorRoles = member.roles.cache.filter(role => role.name.startsWith('Color: '));
                    await member.roles.remove(colorRoles);
                    return interaction.editReply({ content: 'Your nickname color has been reset.' });
                }

                let role = guild.roles.cache.find(r => r.name === roleName);
                
                if (!role) {
                    const colorMap = {
                        'red': '#FF0000',
                        'blue': '#0000FF',
                        'green': '#00FF00',
                        'yellow': '#FFFF00',
                        'purple': '#800080'
                    };
                    
                    try {
                        role = await guild.roles.create({
                            name: roleName,
                            color: colorMap[color],
                            reason: 'Bleed Color Selection'
                        });
                    } catch (error) {
                        console.error('Error creating role:', error);
                        return interaction.editReply({ content: 'Failed to create color role. Make sure the bot has "Manage Roles" permission.' });
                    }
                }

                // Remove existing color roles and add the new one
                const oldColorRoles = member.roles.cache.filter(role => role.name.startsWith('Color: '));
                await member.roles.remove(oldColorRoles);
                await member.roles.add(role);

                await interaction.editReply({ content: `Your nickname color has been set to **${color}**!` });
            } else if (customId.startsWith('rank_avatar_')) {
                const targetId = customId.split('_')[2];
                const target = await client.users.fetch(targetId);
                
                const avatarEmbed = new EmbedBuilder()
                    .setAuthor({ name: `${target.username}'s Avatar`, iconURL: target.displayAvatarURL() })
                    .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
                    .setColor(config.colors.primary)
                    .setTimestamp()
                    .setFooter({ text: 'Bleed Utility' });

                await interaction.reply({ embeds: [avatarEmbed], flags: [64] });
            }
        }
    },
};
