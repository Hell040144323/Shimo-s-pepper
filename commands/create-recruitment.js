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
            .setDescription('参加するにはリアクションを押してください')
            .setColor(0x00AE86);
        await interaction.reply({
            embeds: [embed],
            ephemeral: false
        });
    }
};