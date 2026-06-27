const {
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const recruitments = require('../recruitments');

module.exports = {
    data: {
        name: 'create-recruitment'
    },

    async execute(interaction) {

        const count = interaction.options.getString('count');
        const time = interaction.options.getInteger('time');
        const title = interaction.options.getString('title');

        await interaction.deferReply({ ephemeral: true });

        let remaining = time * 60;

        function createEmbed(data) {
            const minutes = Math.floor(data.remaining / 60);
            const seconds = data.remaining % 60;

            return new EmbedBuilder()
                .setTitle(`🎮 ${data.title}募集`)
                .setDescription('参加するにはリアクションを押してください')
                .addFields(
                    { name: '募集人数', value: `${data.max}人`, inline: true },
                    { name: '募集主', value: `<@${data.ownerId}>`, inline: true },
                    { name: '現在', value: `${data.participants.length}/${data.max}`, inline: true },
                    { name: '残り時間', value: `${minutes}分${seconds.toString().padStart(2, '0')}秒`, inline: true }
                )
                .setColor(0x00AE86);
        }

        const cancelButton = new ButtonBuilder()
            .setCustomId('recruit-cancel')
            .setLabel('✖ 募集をキャンセル')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(cancelButton);

        const message = await interaction.channel.send({
            content: '@everyone',
            embeds: [
                new EmbedBuilder()
                    .setTitle(`🎮 ${title}募集`)
                    .setDescription('参加するにはリアクションを押してください')
                    .addFields(
                        { name: '募集人数', value: `${count}人`, inline: true },
                        { name: '募集主', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '現在', value: `0/${count}`, inline: true },
                        { name: '残り時間', value: `${time}分00秒`, inline: true }
                    )
                    .setColor(0x00AE86)
            ],
            components: [row],
            allowedMentions: { parse: ['everyone'] }
        });

        await message.react('✅');

        // 🔥 データ保存（interval含む）
        const interval = setInterval(async () => {

            const data = recruitments.get(message.id);
            if (!data) {
                clearInterval(interval);
                return;
            }

            data.remaining -= 10;

            try {
                await message.edit({
                    embeds: [createEmbed(data)]
                });
            } catch {
                clearInterval(interval);
            }

            if (data.remaining <= 0) {
                clearInterval(interval);

                await message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('⏰ 募集終了')
                            .setDescription('時間切れで募集が終了しました')
                            .setColor(0xff9900)
                    ]
                });

                await message.delete().catch(() => { });
                recruitments.delete(message.id);
            }

        }, 10000);

        recruitments.set(message.id, {
            ownerId: interaction.user.id,
            interaction: interaction,
            max: Number(count),
            title: title,
            participants: [],
            remaining: remaining,
            interval: interval
        });

        await interaction.editReply('募集を作成しました');
    },

    // =========================
    // キャンセル
    // =========================
    async handleButton(interaction) {

        if (interaction.customId !== 'recruit-cancel') return false;

        const data = recruitments.get(interaction.message.id);
        if (!data) return false;

        if (interaction.user.id !== data.ownerId) {
            await interaction.reply({
                content: '募集主のみキャンセルできます',
                ephemeral: true
            });
            return true;
        }

        clearInterval(data.interval); // 🔥重要

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('❌ 募集キャンセル')
                    .setDescription('募集はキャンセルされました')
                    .setColor(0xff0000)
            ],
            components: []
        });

        recruitments.delete(interaction.message.id);
        return true;
    },

    // =========================
    // 参加
    // =========================
    async handleReactionAdd(reaction, user) {

        if (user.bot) return;
        if (reaction.partial) await reaction.fetch();

        const data = recruitments.get(reaction.message.id);
        if (!data) return;

        if (user.id === data.ownerId) {
            await reaction.users.remove(user.id);
            return;
        }

        if (!data.participants.includes(user.id)) {
            data.participants.push(user.id);
        }

        await reaction.message.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`🎮 ${data.title}募集`)
                    .setDescription('参加するにはリアクションを押してください')
                    .addFields(
                        { name: '募集人数', value: `${data.max}人`, inline: true },
                        { name: '募集主', value: `<@${data.ownerId}>`, inline: true },
                        { name: '現在', value: `${data.participants.length}/${data.max}`, inline: true },
                        { name: '残り時間', value: `${Math.floor(data.remaining / 60)}分${(data.remaining % 60).toString().padStart(2, '0')}秒`, inline: true }
                    )
                    .setColor(0x00AE86)
            ]
        });

        if (data.participants.length >= data.max) {

            clearInterval(data.interval); 

            await reaction.message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ 募集締め切り')
                        .setDescription('募集が定員に達しました')
                        .setColor(0xff0000)
                ]
            });

            await data.interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('📋 参加者')
                        .addFields({
                            name: 'メンバー',
                            value: data.participants.map(id => `<@${id}>`).join('\n')
                        })
                ],
            }).catch(() => { });

            await reaction.message.delete();
            recruitments.delete(reaction.message.id);
        }
    }
};