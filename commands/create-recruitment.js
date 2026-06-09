const fs = require('fs');
const { PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const recruitments = require('../recruitments');

module.exports = {
    data: {
        name: 'create-recruitment'
    },


    async execute(interaction) {

        const count = interaction.options.getString('count');
        const time = interaction.options.getInteger('time');
        const title = interaction.options.getString('title')

        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle(`🎮${interaction.options.getString('title')}募集`)
            .setDescription(`参加するにはリアクションを押してください`)
            .addFields(
                { name: '募集人数', value: count, inline: true },
                { name: '募集主', value: `<@${interaction.user.id}>`, inline: true },
                { name: '現在の参加者数', value: `0/${count}`, inline: true }
            )

            .setColor(0x00AE86);

        const cancelButton = new ButtonBuilder()
            .setCustomId('recruit-cancel')
            .setLabel('✖ 募集をキャンセル')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(cancelButton);

        const message = await interaction.channel.send({
            content: '@everyone',
            embeds: [embed],
            components: [row],
            fetchReply: true,
            allowMentions: { parse: ['everyone'] }
        });

        recruitments.set(message.id, {
            ownerId: interaction.user.id,
            interaction: interaction,
            max: Number(count),
            title: title,
            participants: []
        });
        await message.react('✅');

        await interaction.editReply({
            content: '募集を作成しました',
            embeds: [],
            components: []
        });

        let remaining = time * 60;

        const interval = setInterval(async () => {

            const data = recruitments.get(message.id);
            if (!data) {
                clearInterval(interval);
                return;
            }

            remaining--;

            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;

            const timeText = `${minutes}分${seconds.toString().padStart(2, '0')}秒`;

            const updatedEmbed = new EmbedBuilder()
                .setTitle(`🎮${title}募集`)
                .setDescription('参加するにはリアクションを押してください')
                .addFields(
                    { name: '募集人数', value: `${data.max}人`, inline: true },
                    { name: '募集主', value: `<@${data.ownerId}>`, inline: true },
                    { name: '現在', value: `${data.participants.length}/${data.max}`, inline: true },
                    { name: '残り時間', value: timeText, inline: true }
                )
                .setColor(0x00AE86);

            try {
                await message.edit({ embeds: [updatedEmbed] });
            } catch (err) {
                clearInterval(interval);
            }

            // 🔥 時間切れ
            if (remaining <= 0) {
                clearInterval(interval);

                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ 募集終了')
                    .setDescription('時間切れで募集が終了しました')
                    .setColor(0xff9900);

                await message.channel.send({ embeds: [timeoutEmbed] });

                try {
                    await message.delete();
                } catch { }

                recruitments.delete(message.id);
            }

        }, 1000); // 1秒ごと更新

    },
    async handleButton(interaction) {

        if (interaction.customId !== 'recruit-cancel') return false;

        const data = recruitments.get(interaction.message.id);
        if (!data) return false;

        // 🔥 募集主チェック
        if (interaction.user.id !== data.ownerId) {
            await interaction.reply({
                content: '募集主のみキャンセルできます',
                ephemeral: true
            });
            return true;
        }

        // 🔥 キャンセル
        const embed = new EmbedBuilder()
            .setTitle('❌ 募集キャンセル')
            .setDescription('募集はキャンセルされました')
            .setColor(0xff0000);

        await interaction.update({
            embeds: [embed],
            components: []
        });

        recruitments.delete(interaction.message.id);

        return true;
    },

    async handleReactionAdd(reaction, user) {
        if (user.bot) return;

        if (reaction.partial) await reaction.fetch();

        const data = recruitments.get(reaction.message.id);
        if (!data) return;

        if (user.id === data.ownerId) {
            await reaction.users.remove(user.id);
            return;
        };

        // 🔥 参加追加
        if (!data.participants.includes(user.id)) {
            data.participants.push(user.id);
        }

        // 🔥 Embed更新
        const embed = new EmbedBuilder()
            .setTitle(`🎮${data.title}募集`)
            .setDescription('参加するにはリアクションを押してください')
            .addFields(
                { name: '募集人数', value: `${data.max}人`, inline: true },
                { name: '募集主', value: `<@${data.ownerId}>`, inline: true },
                { name: '現在の参加者数', value: `${data.participants.length}/${data.max}`, inline: true }
            )
            .setColor(0x00AE86);

        await reaction.message.edit({ embeds: [embed] });

        // 🔥 定員到達
        if (data.participants.length >= data.max) {

            // =========================
            // 全員に見える締め切り
            // =========================
            const finishEmbed = new EmbedBuilder()
                .setTitle('✅ 募集締め切り')
                .setDescription('募集が定員に達しました')
                .setColor(0xff0000);

            await reaction.message.reply({
                embeds: [finishEmbed]
            });

            // =========================
            // 募集主だけに表示
            // =========================
            try {
                await data.interaction.followUp({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('📋 参加者リスト（あなただけ表示）')
                            .addFields({
                                name: '参加者',
                                value: data.participants.map(id => `<@${id}>`).join('\n')
                            })
                            .setColor(0x00AE86)
                    ],
                    ephemeral: true
                });
            } catch (error) {
                console.log('interaction期限切れ');
            }

            // =========================
            // 募集削除
            // =========================
            await reaction.message.delete();

            recruitments.delete(reaction.message.id);
        }

    },

    async handleReactionRemove(reaction, user) {
        if (user.bot) return;

        if (reaction.partial) await reaction.fetch();

        const data = recruitments.get(reaction.message.id);
        if (!data) return;

        // 🔥 参加してなかったら無視
        if (!data.participants.includes(user.id)) return;

        // 🔥 削除
        data.participants = data.participants.filter(id => id !== user.id);

        // 🔥 Embed更新
        const embed = new EmbedBuilder()
            .setTitle('🎮 募集')
            .setDescription('参加するにはリアクションを押してください')
            .addFields(
                { name: '募集人数', value: `${data.max}人`, inline: true },
                { name: '募集主', value: `<@${data.ownerId}>`, inline: true },
                { name: '現在の参加者数', value: `${data.participants.length}/${data.max}`, inline: true }
            )
            .setColor(0x00AE86);

        await reaction.message.edit({ embeds: [embed] });

    }

};