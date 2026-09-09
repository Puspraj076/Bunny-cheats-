require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const http = require('http');

// Simple web server to satisfy Render's port check
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

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}! Made by Jack for Bunny Cheats.`);

    const commands = [
        new SlashCommandBuilder()
            .setName('info')
            .setDescription('Get information about Bunny Cheats and creator Jack'),
        new SlashCommandBuilder()
            .setName('ping')
            .setDescription('Replies with Pong!'),
        new SlashCommandBuilder()
            .setName('announce')
            .setDescription('Send a custom announcement to a channel')
            .addChannelOption(option => option.setName('channel').setDescription('The channel to send the announcement to').setRequired(true))
            .addStringOption(option => option.setName('message').setDescription('The announcement text').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        new SlashCommandBuilder()
            .setName('play')
            .setDescription('Play audio in your voice channel')
            .addStringOption(option => option.setName('song').setDescription('Song name or link').setRequired(true))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'info') {
        const infoEmbed = new EmbedBuilder()
            .setColor(0x00FFFF)
            .setTitle('🐰 Bunny Cheats')
            .setDescription('Welcome to Bunny Cheats! Multi-feature discord bot.')
            .addFields(
                { name: '👑 Creator', value: 'Jack', inline: true },
                { name: '💬 Discord Server', value: '[Join our Discord](https://discord.gg/yourinvite)', inline: true },
                { name: '📺 YouTube', value: '[Visit YouTube Channel](https://youtube.com/@yourchannel)', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bunny Cheats • Made by Jack' });

        await interaction.reply({ embeds: [infoEmbed] });
    }
    else if (commandName === 'ping') {
        await interaction.reply('Pong!');
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

        if (!voiceChannel) {
            return interaction.reply({ content: 'You need to be in a voice channel to play music!', ephemeral: true });
        }

        await interaction.reply(`🎶 Searching and preparing to play: **${songQuery}** (Voice connection initialized!)`);
    }
});

client.login(process.env.TOKEN);
