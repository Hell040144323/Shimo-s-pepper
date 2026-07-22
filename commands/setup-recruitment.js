const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');
const pool = require('../db');

module.exports = {
  data: {
    name: '募集ボタン設定'
  },

  async execute(interaction) {
    
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: 'このコマンドは管理者のみ使用できます',
      ephemeral: true
    });
  }

  const channel = interaction.options.getChannel('channel');

  if(!channel){
    return interaction.reply({
      content: 'チャンネルを指定してください',
      ephemeral: true
    });
  }
  await pool.query(
      `
      INSERT INTO guild_settings (guild_id, recruit_channel_id)
      VALUES ($1, $2)
      ON CONFLICT (guild_id)
      DO UPDATE SET recruit_channel_id = $2
      `,
      [interaction.guild.id, channel.id]
    );

    await interaction.reply({
      content: `募集チャンネルを <#${channel.id}> に設定したよ！`,
      ephemeral: true
    });

    const button = new ButtonBuilder()
      .setCustomId('start-recruitment')
      .setLabel('募集する')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.followUp({
      content: '募集を開始するには以下のボタンをクリックしてください。',
      components: [row]
    });
  },

  // 👇 これ追加
  async handleButton(interaction) {

    if (interaction.customId !== 'start-recruitment') return false;

    const command = interaction.client.commands.get('募集作成');

    if (!command) return false;

    await command.execute(interaction);

    return true;
  }
};