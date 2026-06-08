const fs = require('fs');
const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  data: {
    name: 'lol-delete'
  },

  async execute(interaction) {
    const target = interaction.options.getUser('target');

    const isAdmin = interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    // 管理者じゃないのに他人指定した場合
    if (target && !isAdmin) {
      return interaction.reply({
        content: '他人の削除は管理者のみ可能です',
        ephemeral: true
      });
    }

    const targetUser = target || interaction.user;

    const confirmButton = new ButtonBuilder()
      .setCustomId(`lol-delete-confirm-${targetUser.id}`)
      .setLabel('削除する')
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId('lol-delete-cancel')
      .setLabel('キャンセル')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    await interaction.reply({
      content: `<@${targetUser.id}> のデータを削除しますか？`,
      components: [row],
      ephemeral: true
    });
  }
};