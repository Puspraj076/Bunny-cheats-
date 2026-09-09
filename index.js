require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const http = require('http');

// Simple web server to keep Render's port check happy
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bunny Cheats is alive and running!');
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const PREFIX = 'j!';

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}! Made by Jack for Bunny Cheats.`);

    const commands = [
        new SlashCommandBuilder().setName('info').setDescription('Get information about Bunny Cheats and creator Jack'),
        new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
        new SlashCommandBuilder()
            .setName('announce')
            .setDescription('Send a custom announcement to a channel')
            .addChannelOption(option => option.setName('channel').setDescription('The channel to send it to').setRequired(true))
            .addStringOption(option => option.setName('message').setDescription('The announcement text').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        new SlashCommandBuilder()
            .setName('play')
            .setDescription('Play audio in your voice channel')
            .addStringOption(option => option.setName('song').setDescription('Song name or link').setRequired(true)),
        new SlashCommandBuilder()
            .setName('cf')
            .setDescription('Play Coinflip (Heads or Tails)')
            .addStringOption(option => option.setName('choice').setDescription('Choose heads or tails').setRequired(true).addChoices(
                { name: 'Heads', value: 'heads' },
                { name: 'Tails', value: 'tails' }
            )),
        new SlashCommandBuilder().setName('mines').setDescription('Play a mini Mines game'),
        new SlashCommandBuilder()
            .setName('kick')
            .setDescription('Kick a member from the server')
            .addUserOption(option => option.setName('target').setDescription('The user to kick').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for kick').setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
        new SlashCommandBuilder()
            .setName('ban')
            .setDescription('Ban a member from the server')
            .addUserOption(option => option.setName('target').setDescription('The user to ban').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        new SlashCommandBuilder()
            .setName('timeout')
            .setDescription('Timeout a member for a specified duration in minutes')
            .addUserOption(option => option.setName('target').setDescription('The user to timeout').setRequired(true))
            .addIntegerOption(option => option.setName('minutes').setDescription('Duration in minutes').setRequired(true))
            .addStringOption(option => option.setName('reason').setDescription('Reason for timeout').setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder()
            .setName('ticket')
            .setDescription('Send the ticket creation panel')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }
});

// Auto-Welcome Member Event
client.on('guildMemberAdd', member => {
    const welcomeChannel = member.guild.systemChannel || member.guild.channels.cache.find(ch => ch.name.includes('welcome') || ch.name.includes('general'));
    if (!welcomeChannel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('👋 Welcome to the Server!')
        .setDescription(`Hey ${member}, welcome to **${member.guild.name}**! We are thrilled to have you here. Enjoy your stay!`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'Bunny Cheats • Welcome Bot' });

    welcomeChannel.send({ embeds: [welcomeEmbed] });
});

// Interactions & Buttons Handler
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;

        if (commandName === 'info') {
            const infoEmbed = new EmbedBuilder()
                .setColor(0x00FFFF)
                .setTitle('🐰 Bunny Cheats')
                .setDescription('Welcome to Bunny Cheats! Multi-feature discord bot.')
                .addFields(
                    { name: '👑 Creator', value: 'Jack', inline: true },
                    { name: '💬 Prefix', value: '`j!`', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Bunny Cheats • Made by Jack' });
            await interaction.reply({ embeds: [infoEmbed] });
        }
        else if (commandName === 'ping') {
            await interaction.reply(`Pong! Latency is ${client.ws.ping}ms.`);
        } 
        else if (commandName === 'announce') {
            const targetChannel = options.getChannel('channel');
            const announcementText = options.getString('message');
            const announceEmbed = new EmbedBuilder()
                .setColor(0xFF4500)
                .setTitle('📢 Announcement')
                .setDescription(announcementText)
                .setTimestamp()
                .setFooter({ text: `Announced by ${interaction.user.tag}` });

            await targetChannel.send({ embeds: [announceEmbed] });
            await interaction.reply({ content: `Announcement successfully sent to ${targetChannel}!`, ephemeral: true });
        }
        else if (commandName === 'play') {
            const songQuery = options.getString('song');
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) return interaction.reply({ content: 'You need to be in a voice channel to play music!', ephemeral: true });
            await interaction.reply(`🎶 Searching and playing: **${songQuery}** in your voice channel!`);
        }
        else if (commandName === 'cf') {
            const choice = options.getString('choice');
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const won = choice === result;
            await interaction.reply(`🪙 The coin flipped and landed on **${result}**! ${won ? '🎉 You won!' : '😢 You lost!'}`);
        }
        else if (commandName === 'mines') {
            await interaction.reply('💣 **Mines Game:** Pick a tile (1-5)... *[Safe! You cleared the multiplier!]*');
        }
        else if (commandName === 'kick') {
            const target = options.getUser('target');
            const reason = options.getString('reason') || 'No reason provided';
            const member = interaction.guild.members.cache.get(target.id);
            if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
            await member.kick(reason);
            await interaction.reply({ content: `Successfully kicked ${target.tag}. Reason: ${reason}`, ephemeral: true });
        }
        else if (commandName === 'ban') {
            const target = options.getUser('target');
            const reason = options.getString('reason') || 'No reason provided';
            await interaction.guild.members.ban(target, { reason });
            await interaction.reply({ content: `Successfully banned ${target.tag}. Reason: ${reason}`, ephemeral: true });
        }
        else if (commandName === 'timeout') {
            const target = options.getUser('target');
            const minutes = options.getInteger('minutes');
            const reason = options.getString('reason') || 'No reason provided';
            const member = interaction.guild.members.cache.get(target.id);
            if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
            await member.timeout(minutes * 60 * 1000, reason);
            await interaction.reply({ content: `Successfully timed out ${target.tag} for ${minutes} minutes. Reason: ${reason}`, ephemeral: true });
        }
        else if (commandName === 'ticket') {
            const ticketEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎫 Support Tickets')
                .setDescription('Click the button below to open a private support ticket with staff.');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('Create Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );

            await interaction.channel.send({ embeds: [ticketEmbed], components: [row] });
            await interaction.reply({ content: 'Ticket panel sent successfully!', ephemeral: true });
        }
    } 
    else if (interaction.isButton()) {
        if (interaction.customId === 'open_ticket') {
            const guild = interaction.guild;
            const channelName = `ticket-${interaction.user.username}`;
            
            // Check if user already has an open ticket channel
            const existingChannel = guild.channels.cache.find(c => c.name === channelName.toLowerCase());
            if (existingChannel) {
                return interaction.reply({ content: `You already have an open ticket here: ${existingChannel}`, ephemeral: true });
            }

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
                    }
                ],
            });

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            const welcomeEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`Ticket created by ${interaction.user.tag}`)
                .setDescription('Support staff will be with you shortly. Click the button below to close this ticket.');

            await ticketChannel.send({ content: `${interaction.user}`, embeds: [welcomeEmbed], components: [closeRow] });
            await interaction.reply({ content: `Your ticket has been created: ${ticketChannel}`, ephemeral: true });
        }
        else if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Closing ticket in 3 seconds...' });
            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 3000);
        }
    }
});

// Custom Prefix Commands Handler (j!)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'ping') {
        message.reply(`Pong! Latency is ${client.ws.ping}ms.`);
    }
    else if (command === 'info') {
        const infoEmbed = new EmbedBuilder()
            .setColor(0x00FFFF)
            .setTitle('🐰 Bunny Cheats')
            .setDescription('Welcome to Bunny Cheats! Multi-feature discord bot.')
            .addFields(
                { name: '👑 Creator', value: 'Jack', inline: true },
                { name: '💬 Prefix', value: '`j!`', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bunny Cheats • Made by Jack' });
        message.reply({ embeds: [infoEmbed] });
    }
    else if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Please specify a song name to play! Example: `j!play despacito`');
        message.reply(`🎶 Searching and playing: **${query}**!`);
    }
    else if (command === 'cf' || command === 'coinflip') {
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        message.reply(`🪙 The coin flipped and landed on **${result}**!`);
    }
    else if (command === 'mines') {
        message.reply('💣 **Mines Game:** Pick a tile (1-5)... *[Safe! You cleared the multiplier!]*');
    }
    else if (command === 'ticket') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('You do not have permission to use this command.');
        const ticketEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎫 Support Tickets')
            .setDescription('Click the button below to open a private support ticket with staff.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('Create Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );

        message.channel.send({ embeds: [ticketEmbed], components: [row] });
        message.delete().catch(() => {});
    }
    else if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('You do not have permission to use this command.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('Please tag a user to kick. Example: `j!kick @user reason`');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await target.kick(reason);
        message.reply(`Successfully kicked ${target.user.tag}.`);
    }
    else if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('You do not have permission to use this command.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('Please tag a user to ban. Example: `j!ban @user reason`');
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await target.ban({ reason });
        message.reply(`Successfully banned ${target.user.tag}.`);
    }
    else if (command === 'timeout' || command === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('You do not have permission to use this command.');
        const target = message.mentions.members.first();
        const minutes = parseInt(args[1]);
        if (!target || isNaN(minutes)) return message.reply('Usage: `j!timeout @user [minutes] [reason]`');
        const reason = args.slice(2).join(' ') || 'No reason provided';
        await target.timeout(minutes * 60 * 1000, reason);
        message.reply(`Successfully timed out ${target.user.tag} for ${minutes} minutes.`);
    }
    else if (command === 'help') {
        message.reply('Commands available:\n- Slash: `/info`, `/ping`, `/announce`, `/play`, `/cf`, `/mines`, `/kick`, `/ban`, `/timeout`, `/ticket`\n- Prefix: `j!info`, `j!ping`, `j!play [song]`, `j!cf`, `j!mines`, `j!ticket`, `j!kick`, `j!ban`, `j!timeout`, `j!help`');
    }
});

client.login(process.env.TOKEN);
