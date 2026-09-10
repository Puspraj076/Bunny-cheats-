// Timer to end giveaway automatically
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
                    // FIXED: Changed <T@ to <@ so it pings properly without weird text
                    const winnerEmbed = new EmbedBuilder().setColor(0x2ecc71).setTitle('🎉 GIVEAWAY ENDED 🎉').setDescription(`Prize: **${prize}**\n\n🏆 Winner: <@${winnerId}>!\nCongratulations!`);
                    fetchedMsg.edit({ embeds: [winnerEmbed], components: [] });
                    fetchedMsg.reply(`🎊 Congratulations <@${winnerId}>! You won **${prize}**!`);
                }, ms);
