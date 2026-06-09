const fs = require('fs');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const recruitments = require('../recruitments');

module.exports = {
    data: {
        name: 'create-recruitment'
    },
    

    async execute(interaction) {

        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: 'このコマンドは管理者のみ使用できます',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎮LoL募集')
            .setDescription(`参加するにはリアクションを押してください`)
            .addFields(
                {name : '募集人数', value: interaction.options.getString('count'), inline: true},
                {name : '募集主', value: `<@${interaction.user.id}>`, inline: true},
                {name : '現在の参加者数', value: `0/${interaction.options.getString('count')}`, inline: true}
            )
            .setColor(0x00AE86);
        const message = await interaction.reply({
            content: '@everyone',
            embeds: [embed],
            fetchReply: true
        });
        recruitments.set(message.id, {
            ownerId: interaction.user.id,
            max: interaction.options.getString('count'),
            participants: []
        });
        await message.react('✅');
    }
};