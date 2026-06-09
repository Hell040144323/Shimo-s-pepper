const fs = require('fs');
const { PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const recruitments = require('../recruitments');

module.exports = {
    data: {
        name: 'create-recruitment'
    },


    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🎮募集')
            .setDescription(`参加するにはリアクションを押してください`)
            .addFields(
                { name: '募集人数', value: interaction.options.getString('count'), inline: true },
                { name: '募集主', value: `<@${interaction.user.id}>`, inline: true },
                { name: '現在の参加者数', value: `0/${interaction.options.getString('count')}`, inline: true }
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
            max: Number(interaction.options.getString('count')),
            participants: []
        });
        await message.react('✅');
        
        await interaction.editReply({
        content: '募集を作成しました',
        embeds: [],
            components: []
        });
        
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
            .setTitle('🎮 募集')
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