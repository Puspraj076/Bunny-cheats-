require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
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
        new SlashCommandBuilder().setName('reactionrole').setDescription('Send reaction role panel').setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
        new SlashCommandBuilder().setName('reminder').setDescription('Set a reminder').addIntegerOption(o=>o.setName('mins').setDescription('Minutes').setRequired(true)).addStringOption(o=>o.setName('task').setDescription('Task').setRequired(true)),
        new SlashCommandBuilder().setName('poll').setDescription('Create a quick poll').addStringOption(o=>o.setName('question').setDescription('Question').setRequired(true)),
        new SlashCommandBuilder().setName('suggestion').setDescription('Submit a suggestion').addStringOption(o=>o.setName('idea').setDescription('Idea').setRequired(true)),

        // Voice Channel Connect
        new SlashCommandBuilder().setName('joinvc').setDescription('Make the bot join your voice channel'),

        // Admin & Broadcast
        new SlashCommandBuilder().setName('broadcast').setDescription('Broadcast a custom message to a channel').addChannelOption(o=>o.setName('channel').setDescription('Target channel').setRequired(true)).addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
        new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addIntegerOption(o=>o.setName('mins').setDescription('Minutes').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('warn').setDescription('Warn a user').addUserOption(o=>o.setName('target').setDescription('User').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Reason').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
        new SlashCommandBuilder().setName('clear').setDescription('Clear messages').addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

        // Community & Economy & Gambling
        new SlashCommandBuilder().setName('level').setDescription('Check level'),
        new SlashCommandBuilder().setName('giveaway').setDescription('Host giveaway').addStringOption(o=>o.setName('prize').setDescription('Prize').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
        new SlashCommandBuilder().setName('balance').setDescription('Check balance'),
        new SlashCommandBuilder().setName('daily').setDescription('Claim daily coins'),
        new SlashCommandBuilder().setName('work').setDescription('Work for coins'),
        new SlashCommandBuilder().setName('cf').setDescription('Gamble coins on a Coinflip').addIntegerOption(o=>o.setName('amount').setDescription('Coins to bet').setRequired(true)).addStringOption(o=>o.setName('choice').setDescription('Heads or Tails').setRequired(true).addChoices({name:'Heads',value:'heads'},{name:'Tails',value:'tails'})),
        new SlashCommandBuilder().setName('shop').setDescription('View shop'),

        // Gaming & Entertainment
        new SlashCommandBuilder().setName('mcstatus').setDescription('Minecraft status').addStringOption(o=>o.setName('ip').setDescription('IP').setRequired(true)),
        new SlashCommandBuilder().setName('freefire').setDescription('Free Fire updates'),
        new SlashCommandBuilder().setName('gtarp').setDescription('GTA RP stats'),
        new SlashCommandBuilder().setName('meme').setDescription('Random meme'),
        new SlashCommandBuilder().setName('joke').setDescription('Random joke'),
        new SlashCommandBuilder().setName('ai').setDescription('Chat with AI').addStringOption(o=>o.setName('prompt').setDescription('Prompt').setRequired(true))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered all advanced commands.');
    } catch (error) {
        console.error(error);
    }
});

// Helper Function for Mod Logs
async function sendModLog(guild, title, description, color = 0xff0000) {
    const logChannel = guild.channels.cache.find(c => c.name === 'mod-logs' || c.name === 'logs');
    if (!logChannel) return;
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(() => {});
}

// Auto-Welcome System with Banner
client.on('guildMemberAdd', member => {
    const welcomeChannel = member.guild.systemChannel || member.guild.channels.cache.find(ch => ch.name.includes('welcome') || ch.name.includes('general'));
    if (!welcomeChannel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('👋 Welcome to the Server!')
        .setDescription(`Hey ${member}, welcome to **${member.guild.name}**! Powered by Jack.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage('https://media.giphy.com/media/l41YtZQbZXElABNn2/giphy.gif')
        .setTimestamp()
        .setFooter({ text: 'Bunny Cheats • Welcome Bot' });

    welcomeChannel.send({ embeds: [welcomeEmbed] });
});

// Auto-Moderation & Message Handler
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // 1. Auto-Mod: Anti-Invite & Anti-Scam Links
    if (message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            message.delete().catch(() => {});
            sendModLog(message.guild, '🛡️ Auto-Mod Triggered', `Deleted invite link sent by ${message.author.tag} in ${message.channel}`);
            return message.channel.send(`${message.author}, Discord invites are not allowed here!`).then(m => setTimeout(() => m.delete().catch(()=>{}), 4000));
        }
    }

    // 2. XP Tracking
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
    else if (cmd === 'cf') {
        const bet = parseInt(args[0]);
        const choice = args[1]?.toLowerCase();
        if (isNaN(bet) || !['heads', 'tails'].includes(choice)) return message.reply('Usage: `x cf [amount] [heads/tails]`');
        if ((db.economy[uid] || 0) < bet) return message.reply("❌ You don't have enough coins!");

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        if (choice === result) {
            db.economy[uid] += bet;
            message.reply(`🪙 Landed on **${result}**! 🎉 You won **+${bet} coins**! (New Balance: ${db.economy[uid]})`);
        } else {
            db.economy[uid] -= bet;
            message.reply(`🪙 Landed on **${result}**! 😢 You lost **-${bet} coins**. (New Balance: ${db.economy[uid]})`);
        }
    }
    else if (cmd === 'joinvc') {
        const channel = message.member.voice.channel;
        if (!channel) return message.reply('❌ You need to be in a voice channel first!');
        try {
            joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
            message.reply(`🔊 Successfully joined your voice channel: **${channel.name}**!`);
        } catch (err) {
            message.reply('❌ Failed to join the voice channel.');
        }
    }
    else if (cmd === 'broadcast') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Access Denied.');
        const channel = message.mentions.channels.first();
        const msgText = args.slice(1).join(' ');
        if (!channel || !msgText) return message.reply('Usage: `xbroadcast #channel [message]`');
        await channel.send({ embeds: [new EmbedBuilder().setColor(0xFF4500).setDescription(msgText)] });
        message.reply('✅ Broadcast sent successfully!');
    }
    else if (cmd === 'help') {
        message.reply('Prefix commands: `xping`, `xinfo`, `xjoinvc`, `xbroadcast`, `xbal`, `xdaily`, `xwork`, `xcf`, `xhelp`');
    }
});

// Slash Commands & Handlers
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;
        const uid = interaction.user.id;

        if (commandName === 'info') {
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FFFF).setTitle('🐰 Bunny Cheats').setDescription('Powered by Jack • Auto-Mod, Reaction Roles, Logs, Economy, and Tickets active.')] });
        }
        else if (commandName === 'ping') await interaction.reply(`Pong! Latency: ${client.ws.ping}ms`);
        else if (commandName === 'joinvc') {
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) return interaction.reply({ content: '❌ You must be in a voice channel!', ephemeral: true });
            joinVoiceChannel({ channelId: voiceChannel.id, guildId: interaction.guild.id, adapterCreator: interaction.guild.voiceAdapterCreator });
            await interaction.reply({ content: `🔊 Successfully joined **${voiceChannel.name}**!`, ephemeral: true });
        }
        else if (commandName === 'reactionrole') {
            const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('⭐ Reaction Roles').setDescription('Click the button below to get your Community Notification role!');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('role_community').setLabel('Get Community Role').setStyle(ButtonStyle.Success).setEmoji('🔔'));
            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: 'Reaction role panel sent!', ephemeral: true });
        }
        else if (commandName === 'cf') {
            const bet = options.getInteger('amount');
            const choice = options.getString('choice');
            if ((db.economy[uid] || 0) < bet) return interaction.reply({ content: "❌ You don't have enough coins for this bet!", ephemeral: true });

            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            if (choice === result) {
                db.economy[uid] += bet;
                await interaction.reply(`🪙 Coin flipped: **${result}**! 🎉 You won **+${bet} coins**!`);
            } else {
                db.economy[uid] -= bet;
                await interaction.reply(`🪙 Coin flipped: **${result}**! 😢 You lost **-${bet} coins**.`);
            }
        }
        else if (commandName === 'broadcast') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
            const targetChannel = options.getChannel('channel');
            const msg = options.getString('message');
            await targetChannel.send({ embeds: [new EmbedBuilder().setColor(0xFF4500).setDescription(msg)] });
            await interaction.reply({ content: `✅ Broadcast delivered to ${targetChannel}!`, ephemeral: true });
        }
        else if (commandName === 'kick') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
            const target = options.getUser('target');
            const reason = options.getString('reason') || 'No reason';
            await interaction.guild.members.kick(target, reason);
            sendModLog(interaction.guild, '👢 Member Kicked', `User: ${target.tag}\nModerator: ${interaction.user.tag}\nReason: ${reason}`);
            await interaction.reply({ content: `✅ Kicked ${target.tag}.`, ephemeral: true });
        }
        else if (commandName === 'ban') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
            const target = options.getUser('target');
            const reason = options.getString('reason') || 'No reason';
            await interaction.guild.members.ban(target, { reason });
            sendModLog(interaction.guild, '🔨 Member Banned', `User: ${target.tag}\nModerator: ${interaction.user.tag}\nReason: ${reason}`);
            await interaction.reply({ content: `✅ Banned ${target.tag}.`, ephemeral: true });
        }
        else if (commandName === 'timeout') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
            const target = options.getUser('target');
            const mins = options.getInteger('mins');
            const member = interaction.guild.members.cache.get(target.id);
            await member.timeout(mins * 60 * 1000);
            sendModLog(interaction.guild, '⏳ Member Timed Out', `User: ${target.tag}\nDuration: ${mins} mins\nModerator: ${interaction.user.tag}`);
            await interaction.reply({ content: `✅ Timed out ${target.tag} for ${mins} mins.`, ephemeral: true });
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
        else if (interaction.customId === 'role_community') {
            // Find or create a role named "Community"
            let role = interaction.guild.roles.cache.find(r => r.name === 'Community');
            if (!role) {
                role = await interaction.guild.roles.create({ name: 'Community', color: 0x3498db }).catch(() => {});
            }
            if (role) {
                if (interaction.member.roles.cache.has(role.id)) {
                    await interaction.member.roles.remove(role);
                    await interaction.reply({ content: '❌ Removed the Community role from you.', ephemeral: true });
                } else {
                    await interaction.member.roles.add(role);
                    await interaction.reply({ content: '✅ Added the Community role to you!', ephemeral: true });
                }
            } else {
                await interaction.reply({ content: '❌ Could not assign role. Make sure the bot has "Manage Roles" permission and its role is higher than the target role!', ephemeral: true });
            }
        }
    }
});

client.login(process.env.TOKEN);
