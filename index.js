require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

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
            .setName('ban')
            .setDescription('Bans a member')
            .addUserOption(option => option.setName('target').setDescription('The user to ban').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        new SlashCommandBuilder()
            .setName('kick')
            .setDescription('Kicks a member')
            .addUserOption(option => option.setName('target').setDescription('The user to kick').setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
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
    else if (commandName === 'kick') {
        const target = options.getUser('target');
        const member = interaction.guild.members.cache.get(target.id);
        if (member) {
            await member.kick();
            await interaction.reply({ content: `Successfully kicked ${target.tag}`, ephemeral: true });
        } else {
            await interaction.reply({ content: 'That user is not in this server!', ephemeral: true });
        }
    } 
    else if (commandName === 'ban') {
        const target = options.getUser('target');
        await interaction.guild.members.ban(target);
        await interaction.reply({ content: `Successfully banned ${target.tag}`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);

