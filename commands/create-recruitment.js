const fs = require('fs');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');

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
            .setTitle('LoL募集')
            .setDescription(`参加するにはリアクションを押してください\n募集人数: ${interaction.options.getString('count')}人`)
            .setColor(0x00AE86);
        const message = await interaction.reply({
            embeds: [embed],
            fetchReply: true
        });
        await message.react('✅');
    }
};