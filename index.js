const { Client, GatewayIntentBits, Partials, ButtonBuilder, ButtonComponent, ButtonStyle, ActionRowBuilder, PermissionsFlags, ModalBuilder, TextInputBuilder, TextInputStyle, Collection, AttachmentBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, EmbedBuilder, PresenceUpdateStatus, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const fs = require("node:fs")
const ayarlar = require("./ayarlar.js")
const db = require('croxydb')
const client = new Client({
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Reaction,
        Partials.GuildScheduledEvent,
        Partials.User,
        Partials.ThreadMember,
    ],
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
    ],
});

client.on("ready", async () => {
    client.user.setPresence({ activities: [{ name: ayarlar.botdurum }], status: PresenceUpdateStatus.Idle });
    const kanal = client.channels.cache.get(ayarlar.ticketkanal)
    if (kanal) {
        if (!db.get(`ticketmesaj_${kanal.guild.id}`)) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("destek")
                        .setLabel("Destek Talebi Oluştur")
                        .setStyle(ButtonStyle.Secondary)
                )
            if (ayarlar.destekemoji) {
                await row.components[0].setEmoji(ayarlar.destekemoji)
            }
            await kanal.send({ embeds: [new EmbedBuilder().setAuthor({ name: `${kanal.guild.name}`, iconURL: kanal.guild.iconURL() }).setTitle("Destek Talebi").setDescription(`Bu Kanal Üzerinden **Destek Talebi** Açarak Bizden **Her Konuda Destek** Alabilirsiniz.\n\n**NOT:** Gereksiz Destek Talebi Açman Ceza Almana Neden Olabilir`).setColor('Blurple').setThumbnail(kanal.guild.iconURL()).setTimestamp().setFooter({ text: `${kanal.guild.name}`, iconURL: kanal.guild.iconURL() })], components: [row] }).then(e => {
                db.set(`ticketmesaj_${kanal.guild.id}`, e.id)
            })
        }
    }
    console.log(`Bot ${client.user.username} adlı olarak giriş yaptı!`)
})


client.login(ayarlar.token)


client.on('interactionCreate', async i => {
    if (i.customId.startsWith("destek")) {
        if (db.get(`userticket_${i.guild.id}_${i.user.id}`)) {
            return i.reply({ content: `Zaten açık bir ticketın var.`, ephemeral: true })
        }
        const modal = new ModalBuilder()
            .setCustomId("talep")
            .setTitle("Destek Talebi");

        const sebep = new TextInputBuilder()
            .setCustomId("sebep")
            .setLabel("Sebep?")
            .setPlaceholder("Destek Talebi Açma Sebebini Yaz.")
            .setMinLength(1)
            .setMaxLength(150)
            .setRequired(true)
            .setStyle(TextInputStyle.Short);

        const row = new ActionRowBuilder().addComponents(sebep);

        modal.addComponents(row);
        await i.showModal(modal);
    }
    if (i.isModalSubmit()) {
        if (i.customId === "talep") {
            await i.deferReply({ ephemeral: true });

            let sebep = i.fields.getTextInputValue('sebep')
            let kategori = i.guild.channels.cache.get(ayarlar.ticketkategori)
            let yetkili = i.guild.roles.cache.get(ayarlar.yetkili)
            let log = i.guild.channels.cache.get(ayarlar.ticketlog)
            if (kategori) {
                await i.guild.channels.create({
                    parent: kategori.id,
                    name: `destek-${i.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: i.guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: i.user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.SendMessages],
                        },
                        {
                            id: yetkili.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.SendMessages],
                        }
                    ],
                }).then(async (e) => {
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`kapatdestek-${e.id}-${i.user.id}`)
                                .setLabel("Talebi Kapat")
                                .setStyle(ButtonStyle.Danger)
                        )
                    if (ayarlar.destekkapatemoji) {
                        await row.components[0].setEmoji(ayarlar.destekkapatemoji)
                    }
                    await e.send({
                        embeds: [new EmbedBuilder().setAuthor({ name: `${i.guild.name}`, iconURL: i.guild.iconURL() }).setTitle("Destek Talebi").setDescription(`Merhaba yetkililerin cevap vermesini bekleyebilirsin.`).addFields([
                            { name: `Kullanıcı`, value: `${i.user} - ${i.user.username} - ${i.user.id}`, inline: true },
                            { name: `Açılış Zaman`, value: `<t:${Math.floor((Date.now()) / 1000)}:f>`, inline: true },
                            { name: `Sebep`, value: `\`\`\`${sebep}\`\`\`` }
                        ]).setColor('Blurple').setThumbnail(i.guild.iconURL()).setTimestamp().setFooter({ text: `${i.guild.name}`, iconURL: i.guild.iconURL() })], components: [row]
                    })
                    await log.send({
                        embeds: [new EmbedBuilder().setAuthor({ name: `${i.guild.name}`, iconURL: i.guild.iconURL() }).setTitle("Destek Talebi").setDescription(`Merhaba yetkililerin cevap vermesini bekleyebilirsin.`).addFields([
                            { name: `Kullanıcı`, value: `${i.user} - ${i.user.username} - ${i.user.id}`, inline: true },
                            { name: `Açılış Zaman`, value: `<t:${Math.floor((Date.now()) / 1000)}:f>`, inline: true },
                            { name: `Sebep`, value: `\`\`\`${sebep}\`\`\`` }
                        ]).setColor('Blurple').setThumbnail(i.guild.iconURL()).setTimestamp().setFooter({ text: `${i.guild.name}`, iconURL: i.guild.iconURL() })]
                    })
                    await i.followUp({ content: `Destek talebiniz oluşturuldu: ${e}`, ephemeral: true })
                    await db.set(`userticket_${i.guild.id}_${i.user.id}`,
                        {
                            kanal: `${e.id}`,
                            sebep: sebep,
                            zaman: Date.now()
                        })
                })
            } else {
                await i.guild.channels.create({
                    name: `destek-${i.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: i.guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: i.user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.SendMessages],
                        },
                        {
                            id: yetkili.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.SendMessages],
                        }
                    ],
                }).then(async (e) => {
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`kapatdestek-${e.id}-${i.user.id}`)
                                .setLabel("Talebi Kapat")
                                .setStyle(ButtonStyle.Danger)
                        )
                    if (ayarlar.destekkapatemoji) {
                        await row.components[0].setEmoji(ayarlar.destekkapatemoji)
                    }
                    await e.send({
                        content: `${i.user} - ${yetkili}`,
                        embeds: [new EmbedBuilder().setAuthor({ name: `${i.guild.name}`, iconURL: i.guild.iconURL() }).setTitle("Destek Talebi").setDescription(`Merhaba yetkililerin cevap vermesini bekleyebilirsin.`).addFields([
                            { name: `Kullanıcı`, value: `${i.user} - ${i.user.username} - ${i.user.id}`, inline: true },
                            { name: `Açılış Zaman`, value: `<t:${Math.floor((Date.now()) / 1000)}:f>`, inline: true },
                            { name: `Sebep`, value: `\`\`\`${sebep}\`\`\`` }
                        ]).setColor('Blurple').setThumbnail(i.guild.iconURL()).setTimestamp().setFooter({ text: `${i.guild.name}`, iconURL: i.guild.iconURL() })], components: [row]
                    })
                    await log.send({
                        embeds: [new EmbedBuilder().setAuthor({ name: `${i.guild.name}`, iconURL: i.guild.iconURL() }).setTitle("Destek Talebi").setDescription(`Merhaba yetkililerin cevap vermesini bekleyebilirsin.`).addFields([
                            { name: `Kullanıcı`, value: `${i.user} - ${i.user.username} - ${i.user.id}`, inline: true },
                            { name: `Açılış Zaman`, value: `<t:${Math.floor((Date.now()) / 1000)}:f>`, inline: true },
                            { name: `Sebep`, value: `\`\`\`${sebep}\`\`\`` }
                        ]).setColor('Blurple').setThumbnail(i.guild.iconURL()).setTimestamp().setFooter({ text: `${i.guild.name}`, iconURL: i.guild.iconURL() })]
                    })
                    await i.followUp({ content: `Destek talebiniz oluşturuldu: ${e}`, ephemeral: true })
                    await db.set(`userticket_${i.guild.id}_${i.user.id}`,
                        {
                            kanal: `${e.id}`,
                            sebep: sebep,
                            zaman: Date.now()
                        })
                })
            }
        }
    }
})

client.on('interactionCreate', async i => {
    if (i.customId.startsWith('kapatdestek')) {
        await i.deferReply({ ephemeral: true })
        let kanal = i.channel;
        let userId = i.customId.split('-')[2]
        let user = i.guild.members.cache.get(userId)
        let data = await db.get(`userticket_${i.guild.id}_${userId}`)
        let log = i.guild.channels.cache.get(ayarlar.ticketlog)
        let yetkili = i.guild.channels.cache.get(ayarlar.yetkili)
        await i.editReply({ content: `Ticket kapatılıyor...`, ephemeral: true })
        await i.channel.send({ content: `5 Saniye sonra kanal kapatılacak...` }).then(async (e) => {
            setTimeout(async () => {
                const messages = await kanal.messages.fetch({ limit: 100 });

                const formatted = messages
                    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                    .map(m => `${m.author.tag} : ${m.content}`)
                    .join('\n');

                if (formatted.length >= 1000) {
                    fs.writeFileSync('transcript.txt', formatted);
                    await log.send({
                        files: [{
                            attachment: './transcript.txt',
                            name: `transcript-${kanal.name}.txt`
                        }],
                        embeds: [new EmbedBuilder().setAuthor({ name: `${i.guild.name}`, iconURL: i.guild.iconURL() }).setTitle("Destek Talebi").setDescription(`Merhaba yetkililerin cevap vermesini bekleyebilirsin.`).addFields([
                            { name: `Kullanıcı`, value: `${i.user} - ${i.user.username} - ${i.user.id}`, inline: true },
                            { name: `Açılış Zaman`, value: `<t:${Math.floor((data.zaman) / 1000)}:f>`, inline: true },
                            { name: `Kapanış Zaman`, value: `<t:${Math.floor((Date.now()) / 1000)}:f>`, inline: true },
                            { name: `Sebep`, value: `\`\`\`${data.sebep}\`\`\`` }
                        ]).setColor('Blurple').setThumbnail(i.guild.iconURL()).setTimestamp().setFooter({ text: `${i.guild.name}`, iconURL: i.guild.iconURL() })]
                    });
                } else {
                    await log.send({
                        content: `\`\`\`txt\n${formatted || "Hiç Mesaj Atılmamış."}\n\`\`\``,
                        embeds: [new EmbedBuilder().setAuthor({ name: `${i.guild.name}`, iconURL: i.guild.iconURL() }).setTitle("Destek Talebi").setDescription(`Merhaba yetkililerin cevap vermesini bekleyebilirsin.`).addFields([
                            { name: `Kullanıcı`, value: `${i.user} - ${i.user.username} - ${i.user.id}`, inline: true },
                            { name: `Açılış Zaman`, value: `<t:${Math.floor((data.zaman) / 1000)}:f>`, inline: true },
                            { name: `Kapanış Zaman`, value: `<t:${Math.floor((Date.now()) / 1000)}:f>`, inline: true },
                            { name: `Sebep`, value: `\`\`\`${data.sebep}\`\`\`` }
                        ]).setColor('Blurple').setThumbnail(i.guild.iconURL()).setTimestamp().setFooter({ text: `${i.guild.name}`, iconURL: i.guild.iconURL() })]
                    });
                }
                await i.channel.delete().catch(err => { })
                await db.delete(`userticket_${i.guild.id}_${userId}`)
            }, 5000)
        })
    }
})


