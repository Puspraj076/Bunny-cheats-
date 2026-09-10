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
const db = { levels: {}, economy: {}, warnings: {}, giveaways: {} };

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}! Powered by Jack for Bunny Cheats.`);

    const commands = [
        new SlashCommandBuilder().setName('info').setDescription('Get bot and creator info'),
        new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
        new SlashCommandBuilder().setName('supportticket').setDescription('Send the support ticket panel').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        new SlashCommandBuilder().setName('purchaseticket').setDescription('Send the purchase ticket panel').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        new SlashCommandBuilder().setName('reactionrole').setDescription('Send reaction role panel').setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
        new SlashCommandBuilder().setName('panel').setDescription('Send a clean feature configuration panel').addStringOption(o => o.setName('title').setDescription('Panel title/header').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
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

        // Community, Leaderboards & Economy
        new SlashCommandBuilder().setName('level').setDescription('Check level'),
        new SlashCommandBuilder().setName('leaderboard').setDescription('View server top leaderboards').addStringOption(o=>o.setName('type').setDescription('Leaderboard type').setRequired(true).addChoices({name:'XP / Levels',value:'xp'},{name:'Economy Coins',value:'coins'})),
        
        // Timed Giveaway Subcommands
        new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Manage timed giveaways')
            .addSubcommand(sub =>
                sub.setName('start')
                    .setDescription('Start a timed giveaway')
                    .addStringOption(o=>o.setName('duration').setDescription('Duration (e.g., 30s, 5m, 2h, 1d)').setRequired(true))
                    .addStringOption(o=>o.setName('prize').setDescription('What is being given away?').setRequired(true))
            )
            .addSubcommand(sub =>
                sub.setName('end')
                    .setDescription('End an active giveaway early')
                    .addStringOption(o=>o.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
            )
            .addSubcommand(sub =>
                sub.setName('reroll')
                    .setDescription('Reroll a new winner for a giveaway')
                    .addStringOption(o=>o.setName('message_id').setDescription('Giveaway message ID').setRequired(true))
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

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
        console.log('Successfully registered all commands including separate ticket panels.');
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

// Helper Function to Parse Duration (e.g. 10s, 5m, 2h, 1d)
function parseDuration(timeStr) {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === 's') return value * 1000;
    if (unit === 'm') return value * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    if (unit === 'd') return value * 24 * 60 * 60 * 1000;
    return null;
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

    // Anti-Invite Auto-Mod
    if (message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            message.delete().catch(() => {});
            sendModLog(message.guild, '🛡️ Auto-Mod Triggered', `Deleted invite link sent by ${message.author.tag} in ${message.channel}`);
            return message.channel.send(`${message.author}, Discord invites are not allowed here!`).then(m => setTimeout(() => m.delete().catch(()=>{}), 4000));
        }
    }

    // XP Tracking
    const uid = message.author.id;
    if (!db.levels[uid]) db.levels[uid] = { xp: 0, level: 1, tag: message.author.tag };
    db.levels[uid].xp += Math.floor(Math.random() * 10) + 5;
    db.levels[uid].tag = message.author.tag;

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
    else if (cmd === 'help') {
        message.reply('Prefix commands: `xping`, `xinfo`, `xjoinvc`, `xbroadcast`, `xbal`, `xdaily`, `xwork`, `xcf`, `xhelp` (Use `/` slash commands for full feature list!)');
    }
});

// Slash Commands & Handlers
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;
        const uid = interaction.user.id;

        if (commandName === 'info') {
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FFFF).setTitle('🐰 Bunny Cheats').setDescription('Powered by Jack • Separate Tickets, Giveaways, Leaderboards, Auto-Mod active.')] });
        }
        else if (commandName === 'ping') await interaction.reply(`Pong! Latency: ${client.ws.ping}ms`);
        else if (commandName === 'joinvc') {
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) return interaction.reply({ content: '❌ You must be in a voice channel!', ephemeral: true });
            joinVoiceChannel({ channelId: voiceChannel.id, guildId: interaction.guild.id, adapterCreator: interaction.guild.voiceAdapterCreator });
            await interaction.reply({ content: `🔊 Successfully joined **${voiceChannel.name}**!`, ephemeral: true });
        }
        else if (commandName === 'panel') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
            }

            const panelTitle = options.getString('title');
            const cleanEmbed = new EmbedBuilder()
                .setColor(0x8b00ff)
                .setDescription(
                    `• **${panelTitle}**\n\n` +
                    `> **Visual Function :-**\n\n` +
                    `• **Esp Line**\n` +
                    `• **Esp Box**\n` +
                    `• **Many More**\n\n` +
                    `> **Major Function :-**\n\n` +
                    `• **Max Distance Limit**\n` +
                    `• **Ignore Knocked Enemies**\n` +
                    `• **120Fps Support**\n` +
                    `• **Inverted GlooWall**\n` +
                    `• **Instant Loot**\n` +
                    `• **Aspect Ratio**\n` +
                    `• **Stream Proof / Stream Hide**`
                );

            await interaction.channel.send({ embeds: [cleanEmbed] });
            await interaction.reply({ content: '✅ Panel sent successfully!', ephemeral: true });
        }
        else if (commandName === 'supportticket') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
            }

            const tEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('🛠️ Support Tickets')
                .setDescription('Click below to open a private support ticket.');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_support_ticket').setLabel('Create Support Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫')
            );

            await interaction.channel.send({ embeds: [tEmbed], components: [row] });
            await interaction.reply({ content: '✅ Support ticket panel sent!', ephemeral: true });
        }
        else if (commandName === 'purchaseticket') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
            }

            const tEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('🛒 Purchase Tickets')
                .setDescription('Click below to open a private purchase ticket.');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_purchase_ticket').setLabel('Create Purchase Ticket').setStyle(ButtonStyle.Success).setEmoji('🛒')
            );

            await interaction.channel.send({ embeds: [tEmbed], components: [row] });
            await interaction.reply({ content: '✅ Purchase ticket panel sent!', ephemeral: true });
        }
        else if (commandName === 'leaderboard') {
            const type = options.getString('type');
            if (type === 'xp') {
                const sorted = Object.entries(db.levels).sort((a, b) => b[1].level - a[1].level || b[1].xp - a[1].xp).slice(0, 10);
                const desc = sorted.length ? sorted.map((([id, data], index) => `**${index + 1}.** <@${id}> — Level **${data.level}** (${data.xp} XP)`)).join('\n') : 'No data recorded yet.';
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('🏆 Server XP Leaderboard').setDescription(desc)] });
            } else {
                const sorted = Object.entries(db.economy).sort((a, b) => b[1] - a[1]).slice(0, 10);
                const desc = sorted.length ? sorted.map((([id, coins], index) => `**${index + 1}.** <@${id}> — **${coins} coins**`)).join('\n') : 'No coins recorded yet.';
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('💰 Server Economy Leaderboard').setDescription(desc)] });
            }
        }
        else if (commandName === 'giveaway') {
            const subcommand = options.getSubcommand();

            if (subcommand === 'start') {
                const durationStr = options.getString('duration');
                const prize = options.getString('prize');
                const ms = parseDuration(durationStr);

                if (!ms) return interaction.reply({ content: '❌ Invalid duration format! Use format like `30s`, `10m`, `2h`, or `1d`.', ephemeral: true });

                const endsAt = Date.now() + ms;
                const gEmbed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle('🎉 TIMED GIVEAWAY 🎉')
                    .setDescription(`Prize: **${prize}**\nHosted by: ${interaction.user}\nEnds: <t:${Math.floor(endsAt / 1000)}:R>\n\nClick the 🎉 button below to enter!`)
                    .setTimestamp(endsAt)
                    .setFooter({ text: 'Ends at' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('join_giveaway').setLabel('Enter Giveaway').setStyle(ButtonStyle.Success).setEmoji('🎉')
                );

                const msg = await interaction.channel.send({ embeds: [gEmbed], components: [row] });
                
                db.giveaways[msg.id] = {
                    prize,
                    host: interaction.user.id,
                    entries: [],
                    ended: false
                };

                await interaction.reply({ content: `✅ Giveaway started successfully!`, ephemeral: true });

                setTimeout(async () => {
                    const giveaway = db.giveaways[msg.id];
                    if (!giveaway || giveaway.ended) return;
                    giveaway.ended = true;

                    const fetchedMsg = await interaction.channel.messages.fetch(msg.id).catch(() => {});
                    if (!fetchedMsg) return;

                    if (giveaway.entries.length === 0) {
                        const endedEmbed = new EmbedBuilder().setColor(0xe74c3c).setTitle('🎉 GIVEAWAY ENDED 🎉').setDescription(`Prize: **${prize}**\n\n❌ No valid entries entered. No winner chosen.`);
                        return fetchedMsg.edit({ embeds: [endedEmbed], components: [] });
                    }

                    const winnerId = giveaway.entries[Math.floor(Math.random() * giveaway.entries.length)];
                    const winnerEmbed = new EmbedBuilder().setColor(0x2ecc71).setTitle('🎉 GIVEAWAY ENDED 🎉').setDescription(`Prize: **${prize}**\n\n🏆 Winner: <@${winnerId}>!\nCongratulations!`);
                    fetchedMsg.edit({ embeds: [winnerEmbed], components: [] });
                    fetchedMsg.reply(`🎊 Congratulations <@${winnerId}>! You won **${prize}**!`);
                }, ms);
            }
            else if (subcommand === 'end') {
                const messageId = options.getString('message_id');
                const giveaway = db.giveaways[messageId];
                if (!giveaway || giveaway.ended) return interaction.reply({ content: '❌ Giveaway not found or already ended.', ephemeral: true });
                
                giveaway.ended = true;
                const fetchedMsg = await interaction.channel.messages.fetch(messageId).catch(() => {});
                if (fetchedMsg) {
                    if (giveaway.entries.length === 0) {
                        fetchedMsg.edit({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle('🎉 GIVEAWAY ENDED 🎉').setDescription(`Prize: **${giveaway.prize}**\n\n❌ Ended early. No entries.`)], components: [] });
                    } else {
                        const winnerId = giveaway.entries[Math.floor(Math.random() * giveaway.entries.length)];
                        fetchedMsg.edit({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle('🎉 GIVEAWAY ENDED 🎉').setDescription(`Prize: **${giveaway.prize}**\n\n🏆 Winner: <@${winnerId}>!`)], components: [] });
                        fetchedMsg.reply(`🎊 Giveaway ended early! Congratulations <@${winnerId}> for winning **${giveaway.prize}**!`);
                    }
                }
                await interaction.reply({ content: '✅ Giveaway ended successfully!', ephemeral: true });
            }
            else if (subcommand === 'reroll') {
                const messageId = options.getString('message_id');
                const giveaway = db.giveaways[messageId];
                if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
                if (giveaway.entries.length === 0) return interaction.reply({ content: '❌ No entries available to reroll.', ephemeral: true });

                const newWinnerId = giveaway.entries[Math.floor(Math.random() * giveaway.entries.length)];
                await interaction.reply(`🔄 **Giveaway Rerolled!** New winner: <@${newWinnerId}>! Congratulations!`);
            }
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
    }
    else if (interaction.isButton()) {
        if (interaction.customId === 'open_support_ticket' || interaction.customId === 'open_purchase_ticket') {
            const isPurchase = interaction.customId === 'open_purchase_ticket';
            const prefix = isPurchase ? 'purchase' : 'support';
            const channelName = `${prefix}-${interaction.user.username}`;
            
            const ticketChan = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const panelTitle = isPurchase ? '🛒 Purchase Ticket Opened' : '🛠️ Support Ticket Opened';
            const panelDesc = isPurchase 
                ? 'Thank you for your interest in buying! Please let us know which product you want and your payment method.' 
                : 'Support will be with you shortly. Please describe your issue.';

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
            );

            await ticketChan.send({ 
                content: `${interaction.user}`, 
                embeds: [new EmbedBuilder().setColor(isPurchase ? 0x2ecc71 : 0x3498db).setTitle(panelTitle).setDescription(panelDesc)], 
                components: [closeRow] 
            });

            await interaction.reply({ content: `Ticket created: ${ticketChan}`, ephemeral: true });
        }
        else if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Closing ticket...' });
            setTimeout(() => interaction.channel.delete().catch(()=>{}), 2000);
        }
        else if (interaction.customId === 'join_giveaway') {
            const giveaway = db.giveaways[interaction.message.id];
            if (!giveaway || giveaway.ended) return interaction.reply({ content: '❌ This giveaway has already ended!', ephemeral: true });

            if (giveaway.entries.includes(interaction.user.id)) {
                return interaction.reply({ content: '⚠️ You are already entered into this giveaway!', ephemeral: true });
            }

            giveaway.entries.push(interaction.user.id);
            await interaction.reply({ content: '🎉 Successfully entered the giveaway! Good luck!', ephemeral: true });
        }
        else if (interaction.customId === 'role_community') {
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
                await interaction.reply({ content: '❌ Missing permissions to manage roles.', ephemeral: true });
            }
        }
    }
});

client.login(process.env.TOKEN);
