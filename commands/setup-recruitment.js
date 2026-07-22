const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  data: {
    name: '募集ボタン設定'
  },

  async execute(interaction) {
    
    if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
      content: 'このコマンドは管理者のみ使用できます',
      ephemeral: true
    });
  }

    const button = new ButtonBuilder()
      .setCustomId('start-recruitment')
      .setLabel('募集する')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({
      content: '募集を開始するには以下のボタンをクリックしてください。',
      components: [row]
    });
  },

  // 👇 これ追加
  async handleButton(interaction) {

    if (interaction.customId !== 'start-recruitment') return false;

    // 🔥 lol-recruitment を呼び出す
    const command = interaction.client.commands.get('lol-recruitment');

    if (!command) return false;

    await command.execute(interaction);

    return true;
  }
};