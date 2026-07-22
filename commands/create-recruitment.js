const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const pool = require('../db');

const recruitments = require('../recruitments');

module.exports = {
    data: {
        name: '募集作成',
        description: '募集を作成'
    },

    // =========================
    // コマンド → モーダル
    // =========================
    async execute(interaction) {

        const modal = new ModalBuilder()
            .setCustomId('recruit-modal')
            .setTitle('🎮 募集作成');

        const titleInput = new TextInputBuilder()
            .setCustomId('title')
            .setLabel('募集内容')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const countInput = new TextInputBuilder()
            .setCustomId('count')
            .setLabel('人数')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const timeInput = new TextInputBuilder()
            .setCustomId('time')
            .setLabel('時間（分）')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(countInput),
            new ActionRowBuilder().addComponents(timeInput)
        );

        await interaction.showModal(modal);
    },

    // =========================
    // モーダル送信 → 募集作成
    // =========================
    async handleModal(interaction) {

        if (interaction.customId !== 'recruit-modal') return false;

        const title = interaction.fields.getTextInputValue('title');
        const count = Number(interaction.fields.getTextInputValue('count'));
        const time = Number(interaction.fields.getTextInputValue('time'));

        if (!count || !time) {
            await interaction.reply({
                content: '入力が正しくないよ',
                ephemeral: true
            });
            return true;
        }

        await interaction.deferReply({ ephemeral: true });

        let remaining = time * 60;

        function createEmbed(data) {
            const minutes = Math.floor(data.remaining / 60);
            const seconds = data.remaining % 60;

            return new EmbedBuilder()
                .setTitle(`🎮 ${data.title}募集`)
                .setDescription('リアクションで参加！')
                .addFields(
                    { name: '募集人数', value: `${data.max}人`, inline: true },
                    { name: '募集主', value: `<@${data.ownerId}>`, inline: true },
                    { name: '現在', value: `${data.participants.length}/${data.max}`, inline: true },
                    {
                        name: '参加者',
                        value: data.participants.length
                            ? data.participants.map(id => `<@${id}>`).join('\n')
                            : 'なし'
                    },
                    {
                        name: '残り時間',
                        value: `${minutes}分${seconds.toString().padStart(2, '0')}秒`,
                        inline: true
                    }
                )
                .setColor(0x00AE86);
        }

        const cancelButton = new ButtonBuilder()
            .setCustomId('recruit-cancel')
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(cancelButton);

        const result = await pool.query(
            `SELECT recruit_channel_id FROM guild_settings WHERE guild_id = $1`,
            [interaction.guild.id]
        );

        const channelId = result.rows[0]?.recruit_channel_id;

        if (!channelId) {
            await interaction.editReply('募集チャンネルが設定されていません');
            return true;
        }

        const recruitChannel = interaction.guild.channels.cache.get(channelId);

        if (!recruitChannel) {
            await interaction.editReply('チャンネルが見つかりません');
            return true;
        }

        const message = await recruitChannel.send({
            content: '@everyone',
            embeds: [createEmbed({
                title,
                max: count,
                ownerId: interaction.user.id,
                participants: [],
                remaining
            })],
            components: [row],
            allowedMentions: { parse: ['everyone'] }
        });

        await message.react('✅');

        // タイマー
        const interval = setInterval(async () => {

            const data = recruitments.get(message.id);
            if (!data) return clearInterval(interval);

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
                            .setDescription('時間切れで終了')
                    ]
                });

                await message.delete().catch(() => { });
                recruitments.delete(message.id);
            }

        }, 10000);

        recruitments.set(message.id, {
            ownerId: interaction.user.id,
            max: count,
            title,
            participants: [],
            remaining,
            interval
        });

        await interaction.editReply('募集を作成したよ！');

        return true;
    },

    // =========================
    // キャンセルボタン
    // =========================
    async handleButton(interaction) {

        if (interaction.customId !== 'recruit-cancel') return false;

        const data = recruitments.get(interaction.message.id);
        if (!data) return false;

        if (interaction.user.id !== data.ownerId) {
            await interaction.reply({
                content: '募集主だけキャンセルできるよ',
                ephemeral: true
            });
            return true;
        }

        clearInterval(data.interval);

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle('❌ 募集キャンセル')
                    .setDescription('キャンセルされました')
            ],
            components: []
        });

        recruitments.delete(interaction.message.id);
        return true;
    },

    // =========================
    // リアクション参加
    // =========================
    async handleReactionAdd(reaction, user) {

        if (user.bot) return;
        if (reaction.partial) await reaction.fetch();

        const data = recruitments.get(reaction.message.id);
        if (!data) return;

        if (!data.participants.includes(user.id)) {
            data.participants.push(user.id);
        }

        if (user.id === data.ownerId) {
            await reaction.users.remove(user.id);
            return;
        }

        // 更新
        await reaction.message.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`🎮 ${data.title}募集`)
                    .setDescription('リアクションで参加！')
                    .addFields(
                        { name: '募集人数', value: `${data.max}人`, inline: true },
                        { name: '募集主', value: `<@${data.ownerId}>`, inline: true },
                        { name: '現在', value: `${data.participants.length}/${data.max}`, inline: true },
                        {
                            name: '参加者',
                            value: data.participants.map(id => `<@${id}>`).join('\n')
                        }
                    )
            ]
        });

        // 定員
        if (data.participants.length >= data.max) {

            clearInterval(data.interval);

            await reaction.message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ 募集締め切り')
                        .setDescription('定員に達しました')
                ]
            });

            await reaction.message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('📋 参加者')
                        .setDescription(
                            data.participants.map(id => `<@${id}>`).join('\n')
                        )
                ]
            });

            await reaction.message.delete();
            recruitments.delete(reaction.message.id);
        }
    }
};