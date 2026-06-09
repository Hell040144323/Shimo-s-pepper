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
    name: 'setup-tutorial'
  },

  async execute(interaction) {
    
    if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
      content: 'このコマンドは管理者のみ使用できます',
      ephemeral: true
    });
  }

    const button = new ButtonBuilder()
      .setCustomId('start-register')
      .setLabel('登録する')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({
      content: '登録を開始するには以下のボタンをクリックしてください。',
      components: [row]
    });
  },

  // 👇 これ追加
  async handleButton(interaction) {

    if (interaction.customId !== 'start-register') return false;

    // 🔥 lol-register を呼び出す
    const command = interaction.client.commands.get('lol-register');

    if (!command) return false;

    await command.execute(interaction);

    return true;
  }
};