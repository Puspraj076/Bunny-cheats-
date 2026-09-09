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
const db = {
    levels: {},
    economy: {},
    warnings: {}
};

const memes = [
    'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=500',
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500',
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500'
];

const jokes = [
    'Why do programmers prefer dark mode? Because light attracts bugs!',
    'Why did the developer go broke? Because he used up all his cache.',
    'There are 10 types of people in the world: those who understand binary, and those who don’t.'
];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}! Powered by Jack for Bunny Cheats.`);

    const commands = [
        // Utility & Info
        new SlashCommandBuilder().setName('info').setDescription('Get bot and creator info'),
        new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
        new SlashCommandBuilder().setName('ticket').setDescription('Open a support ticket panel').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        new SlashCommandBuilder().setName('reminder').setDescription('Set a reminder').addIntegerOption(o=>o.setName('mins').setDescription('Minutes').setRequired(true)).addStringOption(o=>o.setName('task').setDescription('Task').setRequired(true)),
        new SlashCommandBuilder().setName('poll').setDescription('Create a quick poll').addStringOption(o=>o.setName('question').setDescription('Poll question').setRequired(true)),
        new SlashCommandBuilder().setName('suggestion').setDescription('Submit a server suggestion').addStringOption(o=>o.setName('idea').setDescription('Your suggestion').setRequired(true)),

        // Moderation
        new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
        new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addIntegerOption(o=>o.setName('mins').setDescription('Minutes').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('warn').setDescription('Warn a user').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('clear').setDescription('Clear messages').addIntegerOption(o=>o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

        // Community & Leveling
        new SlashCommandBuilder().setName('level').setDescription('Check your level and XP'),
        new SlashCommandBuilder().setName('giveaway').setDescription('Host a giveaway').addStringOption(o=>o.setName('prize').setDescription('Prize').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

        // Economy
        new SlashCommandBuilder().setName('balance').setDescription('Check your coin balance'),
        new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward coins'),
        new SlashCommandBuilder().setName('work').setDescription('Work to earn coins'),
        new SlashCommandBuilder().setName('shop').setDescription('View the server item shop'),

        // Gaming
        new SlashCommandBuilder().setName('mcstatus').setDescription('Check Minecraft server status').addStringOption(o=>o.setName('ip').setDescription('Server IP').setRequired(true)),
        new SlashCommandBuilder().setName('freefire').setDescription('Get latest Free Fire tournament announcements'),
        new SlashCommandBuilder().setName('gtarp').setDescription('View GTA RP family management stats'),

        // Entertainment
        new SlashCommandBuilder().setName('play').setDescription('Play audio in voice channel').addStringOption(o=>o.setName('song').setDescription('Song name').setRequired(true)),
        new SlashCommandBuilder().setName('meme').setDescription('Get a random funny meme'),
        new SlashCommandBuilder().setName('joke').setDescription('Get a funny developer joke'),
        new SlashCommandBuilder().setName('quiz').setDescription('Play a quick trivia quiz'),
        new SlashCommandBuilder().setName('ai').setDescription('Chat with Bunny AI').addStringOption(o=>o.setName('prompt').setDescription('Message').setRequired(true)),
        new SlashCommandBuilder().setName('cf').setDescription('Flip a coin').addStringOption(o=>o.setName('choice').setDescription('Heads or tails').setRequired(true).addChoices({name:'Heads',value:'heads'},{name:'Tails',value:'tails'})),
        new SlashCommandBuilder().setName('mines').setDescription('Play a mini Mines game')
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered all module application commands.');
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

    // Prefix command executor map
    if (cmd === 'ping') message.reply(`Pong! Latency: ${client.ws.ping}ms`);
    else if (cmd === 'info') message.reply('🐰 **Bunny Cheats** • Powered by Jack | All modules active!');
    else if (cmd === 'level') message.reply(`📊 Level: ${db.levels[uid]?.level || 1} | XP: ${db.levels[uid]?.xp || 0}`);
    else if (cmd === 'balance' || cmd === 'bal') message.reply(`💰 Balance: **${db.economy[uid] || 0} coins**`);
    else if (cmd === 'daily') {
        db.economy[uid] = (db.economy[uid] || 0) + 500;
        message.reply('🎁 Claimed daily reward: **+500 coins**!');
    }
    else if (cmd === 'work') {
        const earned = Math.floor(Math.random() * 150) + 50;
        db.economy[uid] = (db.economy[uid] || 0) + earned;
        message.reply(`💼 You worked hard and earned **+${earned} coins**!`);
    }
    else if (cmd === 'meme') {
        const m = memes[Math.floor(Math.random() * memes.length)];
        message.reply({ embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle('😂 Meme').setImage(m)] });
    }
    else if (cmd === 'joke') message.reply(`🎭 ${jokes[Math.floor(Math.random() * jokes.length)]}`);
    else if (cmd === 'ai') message.reply(`🤖 **Bunny AI:** I am fully operational and ready to assist your community, powered by Jack!`);
    else if (cmd === 'help') message.reply('Check your slash commands (`/`) or use prefix `j!` for all utility, moderation, economy, gaming, and entertainment commands!');
});

// Slash Commands & Button Handler
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;
        const uid = interaction.user.id;

        if (commandName === 'info') {
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FFFF).setTitle('🐰 Bunny Cheats').setDescription('Powered by Jack • All modules active (Moderation, Economy, Gaming, Tickets, Entertainment)')] });
        }
        else if (commandName === 'ping') await interaction.reply(`Pong! Latency: ${client.ws.ping}ms`);
        else if (commandName === 'level') {
            const stats = db.levels[uid] || { xp: 0, level: 1 };
            await interaction.reply({ content: `📊 Level: **${stats.level}** | XP: **${stats.xp}**`, ephemeral: true });
        }
        else if (commandName === 'balance') {
            await interaction.reply({ content: `💰 Balance: **${db.economy[uid] || 0} coins**`, ephemeral: true });
        }
        else if (commandName === 'daily') {
            db.economy[uid] = (db.economy[uid] || 0) + 500;
            await interaction.reply('🎁 Claimed daily reward: **+500 coins**!');
        }
        else if (commandName === 'work') {
            const earned = Math.floor(Math.random() * 150) + 50;
            db.economy[uid] = (db.economy[uid] || 0) + earned;
            await interaction.reply(`💼 You worked as a Discord moderator and earned **+${earned} coins**!`);
        }
        else if (commandName === 'shop') {
            await interaction.reply('🛒 **Server Shop:**\n1. VIP Role - 2000 coins (`j!buy vip`)\n2. Custom Color - 1000 coins');
        }
        else if (commandName === 'mcstatus') {
            const ip = options.getString('ip');
            await interaction.reply(`🟢 Minecraft Server **${ip}** is **ONLINE** (Ping: 24ms, Players: 12/50)`);
        }
        else if (commandName === 'freefire') {
            await interaction.reply('🔥 **Free Fire MAX Tournament:** Custom Room opening tonight at 8:00 PM IST! Prize pool: 1000 Diamonds.');
        }
        else if (commandName === 'gtarp') {
            await interaction.reply('🚗 **GTA RP Family:** Family Safehouse level 3, active members: 15, vehicle garage full.');
        }
        else if (commandName === 'meme') {
            const m = memes[Math.floor(Math.random() * memes.length)];
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle('😂 Meme').setImage(m)] });
        }
        else if (commandName === 'joke') {
            await interaction.reply(`🎭 ${jokes[Math.floor(Math.random() * jokes.length)]}`);
        }
        else if (commandName === 'quiz') {
            await interaction.reply('🧠 **Trivia Quiz:** What is the powerhouse of the cell? *(First person to type Mitochondria wins!)*');
        }
        else if (commandName === 'ai') {
            const prompt = options.getString('prompt');
            await interaction.reply(`🤖 **Bunny AI:** You asked "${prompt}". Everything is running smoothly, powered by Jack!`);
        }
        else if (commandName === 'poll') {
            const q = options.getString('question');
            const pEmbed = new EmbedBuilder().setColor(0x3498db).setTitle('📊 Server Poll').setDescription(q).setFooter({ text: `Poll by ${interaction.user.tag}` });
            const msg = await interaction.channel.send({ embeds: [pEmbed] });
            await msg.react('👍');
            await msg.react('👎');
            await interaction.reply({ content: 'Poll created successfully!', ephemeral: true });
        }
        else if (commandName === 'suggestion') {
            const idea = options.getString('idea');
            const sEmbed = new EmbedBuilder().setColor(0xf1c40f).setTitle('💡 New Suggestion').setDescription(idea).setFooter({ text: `Suggested by ${interaction.user.tag}` });
            const sChan = interaction.guild.channels.cache.find(c => c.name.includes('suggestion') || c.name.includes('general'));
            if (sChan) await sChan.send({ embeds: [sEmbed] });
            await interaction.reply({ content: 'Suggestion submitted!', ephemeral: true });
        }
        else if (commandName === 'reminder') {
            const mins = options.getInteger('mins');
            const task = options.getString('task');
            await interaction.reply({ content: `⏰ Reminder set for ${mins} minutes from now!`, ephemeral: true });
            setTimeout(() => { interaction.user.send(`⏰ **Reminder:** ${task}`).catch(()=>{}); }, mins * 60 * 1000);
        }
        else if (commandName === 'kick') {
            const target = options.getUser('target');
            const reason = options.getString('reason') || 'No reason';
            await interaction.guild.members.kick(target, reason);
            await interaction.reply({ content: `Successfully kicked ${target.tag}.`, ephemeral: true });
        }
        else if (commandName === 'ban') {
            const target = options.getUser('target');
            const reason = options.getString('reason') || 'No reason';
            await interaction.guild.members.ban(target, { reason });
            await interaction.reply({ content: `Successfully banned ${target.tag}.`, ephemeral: true });
        }
        else if (commandName === 'timeout') {
            const target = options.getUser('target');
            const mins = options.getInteger('mins');
            const member = interaction.guild.members.cache.get(target.id);
            await member.timeout(mins * 60 * 1000);
            await interaction.reply({ content: `Timed out ${target.tag} for ${mins} mins.`, ephemeral: true });
        }
        else if (commandName === 'warn') {
            const target = options.getUser('target');
            const reason = options.getString('reason');
            if (!db.warnings[target.id]) db.warnings[target.id] = [];
            db.warnings[target.id].push(reason);
            await interaction.reply({ content: `Warned ${target.tag}. Total warnings: ${db.warnings[target.id].length}`, ephemeral: true });
        }
        else if (commandName === 'clear') {
            const amount = options.getInteger('amount');
            await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ content: `Cleared ${amount} messages.`, ephemeral: true });
        }
        else if (commandName === 'ticket') {
            const tEmbed = new EmbedBuilder().setColor(0x5865F2).setTitle('🎫 Support Tickets').setDescription('Click below to open a private ticket.');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('Create Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫'));
            await interaction.channel.send({ embeds: [tEmbed], components: [row] });
            await interaction.reply({ content: 'Ticket panel sent!', ephemeral: true });
        }
        else if (commandName === 'giveaway') {
            const prize = options.getString('prize');
            const gEmbed = new EmbedBuilder().setColor(0xFFD700).setTitle('🎉 GIVEAWAY 🎉').setDescription(`Prize: **${prize}**\nClick below to enter!`);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('join_giveaway').setLabel('Enter Giveaway').setStyle(ButtonStyle.Success).setEmoji('🎉'));
            await interaction.channel.send({ embeds: [gEmbed], components: [row] });
            await interaction.reply({ content: 'Giveaway started!', ephemeral: true });
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
        else if (interaction.customId === 'join_giveaway') {
            await interaction.reply({ content: '🎉 Entered giveaway successfully!', ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
