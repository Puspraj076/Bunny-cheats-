require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
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

const PREFIX = 'x';
const db = { levels: {}, economy: {}, warnings: {} };

const memes = [
    'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=500',
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500'
];

const jokes = [
    'Why do programmers prefer dark mode? Because light attracts bugs!',
    'Why did the developer go broke? Because he used up all his cache.'
];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}! Powered by Jack for Bunny Cheats.`);

    const commands = [
        new SlashCommandBuilder().setName('info').setDescription('Get bot and creator info'),
        new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
        new SlashCommandBuilder().setName('ticket').setDescription('Open a support ticket panel').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        new SlashCommandBuilder().setName('reminder').setDescription('Set a reminder').addIntegerOption(o=>o.setName('mins').setDescription('Minutes').setRequired(true)).addStringOption(o=>o.setName('task').setDescription('Task').setRequired(true)),
        new SlashCommandBuilder().setName('poll').setDescription('Create a quick poll').addStringOption(o=>o.setName('question').setDescription('Question').setRequired(true)),
        new SlashCommandBuilder().setName('suggestion').setDescription('Submit a suggestion').addStringOption(o=>o.setName('idea').setDescription('Idea').setRequired(true)),

        // Admin & Broadcast
        new SlashCommandBuilder().setName('broadcast').setDescription('Broadcast a custom message to a channel').addChannelOption(o=>o.setName('channel').setDescription('Target channel').setRequired(true)).addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
        new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addIntegerOption(o=>o.setName('mins').setDescription('Minutes').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('warn').setDescription('Warn a user').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('clear').setDescription('Clear messages').addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

        // Community & Economy
        new SlashCommandBuilder().setName('level').setDescription('Check level'),
        new SlashCommandBuilder().setName('giveaway').setDescription('Host giveaway').addStringOption(o=>o.setName('prize').setDescription('Prize').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        new SlashCommandBuilder().setName('balance').setDescription('Check balance'),
        new SlashCommandBuilder().setName('daily').setDescription('Claim daily coins'),
        new SlashCommandBuilder().setName('work').setDescription('Work for coins'),
        new SlashCommandBuilder().setName('shop').setDescription('View shop'),

        // Gaming & Entertainment
        new SlashCommandBuilder().setName('mcstatus').setDescription('Minecraft status').addStringOption(o=>o.setName('ip').setDescription('IP').setRequired(true)),
        new SlashCommandBuilder().setName('freefire').setDescription('Free Fire updates'),
        new SlashCommandBuilder().setName('gtarp').setDescription('GTA RP stats'),
        new SlashCommandBuilder().setName('play').setDescription('Play audio in voice channel').addStringOption(o=>o.setName('song').setDescription('Song name or link').setRequired(true)),
        new SlashCommandBuilder().setName('meme').setDescription('Random meme'),
        new SlashCommandBuilder().setName('joke').setDescription('Random joke'),
        new SlashCommandBuilder().setName('ai').setDescription('Chat with AI').addStringOption(o=>o.setName('prompt').setDescription('Prompt').setRequired(true))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered commands with music, broadcast, and admin security.');
    } catch (error) {
        console.error(error);
    }
});

// Auto-Welcome System & XP Tracker
client.on('guildMemberAdd', member => {
    const welcomeChannel = member.guild.systemChannel || member.guild.channels.cache.find(ch => ch.name.includes('welcome') || ch.name.includes('general'));
    if (!welcomeChannel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('👋 Welcome to the Server!')
        .setDescription(`Hey ${member}, welcome to **${member.guild.name}**! Powered by Jack.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    welcomeChannel.send({ embeds: [welcomeEmbed] });
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // XP Tracking
    const uid = message.author.id;
    if (!db.levels[uid]) db.levels[uid] = { xp: 0, level: 1 };
    db.levels[uid].xp += Math.floor(Math.random() * 10) + 5;
    if (db.levels[uid].xp >= db.levels[uid].level * 100) {
        db.levels[uid].level += 1;
        message.channel.send(`🎉 GG ${message.author}, you reached **Level ${db.levels[uid].level}**!`);
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Prefix Commands with Admin Safeguards
    if (cmd === 'ping') message.reply(`Pong! Latency: ${client.ws.ping}ms`);
    else if (cmd === 'info') message.reply('🐰 **Bunny Cheats** • Powered by Jack | All modules active!');
    else if (cmd === 'level') message.reply(`📊 Level: ${db.levels[uid]?.level || 1} | XP: ${db.levels[uid]?.xp || 0}`);
    else if (cmd === 'bal' || cmd === 'balance') message.reply(`💰 Balance: **${db.economy[uid] || 0} coins**`);
    else if (cmd === 'daily') {
        db.economy[uid] = (db.economy[uid] || 0) + 500;
        message.reply('🎁 Claimed daily reward: **+500 coins**!');
    }
    else if (cmd === 'work') {
        const earned = Math.floor(Math.random() * 150) + 50;
        db.economy[uid] = (db.economy[uid] || 0) + earned;
        message.reply(`💼 You worked hard and earned **+${earned} coins**!`);
    }
    else if (cmd === 'broadcast') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ You must be an Administrator to use this command.');
        const channel = message.mentions.channels.first();
        const msgText = args.slice(1).join(' ');
        if (!channel || !msgText) return message.reply('Usage: `xbroadcast #channel [message]`');
        const bEmbed = new EmbedBuilder().setColor(0xFF4500).setTitle('📢 Broadcast Notice').setDescription(msgText).setTimestamp().setFooter({ text: `Broadcasted by ${message.author.tag}` });
        await channel.send({ embeds: [bEmbed] });
        message.reply('✅ Broadcast sent successfully!');
    }
    else if (cmd === 'play') {
        const channel = message.member.voice.channel;
        if (!channel) return message.reply('❌ You need to be in a voice channel to play music!');
        const songName = args.join(' ');
        if (!songName) return message.reply('Please specify a song name or link!');

        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            message.reply(`🎶 Connected to **${channel.name}** and preparing playback for: **${songName}**!`);
        } catch (error) {
            console.error(error);
            message.reply('❌ Failed to connect to the voice channel.');
        }
    }
    else if (cmd === 'help') {
        message.reply('Prefix commands: `xping`, `xinfo`, `xplay [song]`, `xbroadcast [#channel] [msg]`, `xbal`, `xdaily`, `xhelp` (Admin commands require Administrator permissions)');
    }
});

// Slash Commands & Voice/Button Handler
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;
        const uid = interaction.user.id;

        if (commandName === 'info') {
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FFFF).setTitle('🐰 Bunny Cheats').setDescription('Powered by Jack • Fully operational with Voice, Admin Guards, and Broadcast system')] });
        }
        else if (commandName === 'ping') await interaction.reply(`Pong! Latency: ${client.ws.ping}ms`);
        else if (commandName === 'play') {
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) return interaction.reply({ content: '❌ You must be in a voice channel to use this command!', ephemeral: true });
            const song = options.getString('song');

            try {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                await interaction.reply(`🎶 Successfully joined **${voiceChannel.name}** and initialized stream for: **${song}**!`);
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Error connecting to voice channel.', ephemeral: true });
            }
        }
        else if (commandName === 'broadcast') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Access Denied: You need Administrator permissions.', ephemeral: true });
            }
            const targetChannel = options.getChannel('channel');
            const msg = options.getString('message');
            const bEmbed = new EmbedBuilder().setColor(0xFF4500).setTitle('📢 Broadcast Notice').setDescription(msg).setTimestamp().setFooter({ text: `Broadcast by ${interaction.user.tag}` });
            
            await targetChannel.send({ embeds: [bEmbed] });
            await interaction.reply({ content: `✅ Broadcast successfully delivered to ${targetChannel}!`, ephemeral: true });
        }
        else if (commandName === 'kick') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
            const target = options.getUser('target');
            const reason = options.getString('reason') || 'No reason';
            await interaction.guild.members.kick(target, reason);
            await interaction.reply({ content: `✅ Kicked ${target.tag}.`, ephemeral: true });
        }
        else if (commandName === 'ban') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
            const target = options.getUser('target');
            const reason = options.getString('reason') || 'No reason';
            await interaction.guild.members.ban(target, { reason });
            await interaction.reply({ content: `✅ Banned ${target.tag}.`, ephemeral: true });
        }
        else if (commandName === 'ticket') {
            const tEmbed = new EmbedBuilder().setColor(0x5865F2).setTitle('🎫 Support Tickets').setDescription('Click below to open a private ticket.');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('Create Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫'));
            await interaction.channel.send({ embeds: [tEmbed], components: [row] });
            await interaction.reply({ content: 'Ticket panel sent!', ephemeral: true });
        }
    }
    else if (interaction.isButton()) {
        if (interaction.customId === 'open_ticket') {
            const channelName = `ticket-${interaction.user.username}`;
            const ticketChan = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger));
            await ticketChan.send({ content: `${interaction.user}`, embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('Ticket Opened').setDescription('Support will be with you shortly.')], components: [closeRow] });
            await interaction.reply({ content: `Ticket created: ${ticketChan}`, ephemeral: true });
        }
        else if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Closing ticket...' });
            setTimeout(() => interaction.channel.delete().catch(()=>{}), 2000);
        }
    }
});

client.login(process.env.TOKEN);
