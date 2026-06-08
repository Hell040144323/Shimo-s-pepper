const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const laneIcons = {
  TOP: '<:top:1513177035877519541>',
  JG: '<:jungle:1513177011445563402>',
  MID: '<:mid:1513176990201544795>',
  ADC: '<:bot:1513176967963480175>',
  SUP: '<:support:1513176932966203627>'
};

const pool = require('../db');


module.exports = {
  data: {
    name: 'lol-register'
  },

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('lol-register')
      .setTitle('サモナーネーム登録');

    const input = new TextInputBuilder()
      .setCustomId('lolIdInput')
      .setLabel('サモナーネームを入力してください')
      .setStyle(TextInputStyle.Short);
    const tagInput = new TextInputBuilder()
      .setCustomId('lolTagInput')
      .setLabel('タグラインを入力してください（例:1234 ※＃は不要）')
      .setStyle(TextInputStyle.Short);

    const row1 = new ActionRowBuilder().addComponents(input);
    const row2 = new ActionRowBuilder().addComponents(tagInput);
    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const lolId = interaction.fields.getTextInputValue('lolIdInput');
    const tag = interaction.fields.getTextInputValue('lolTagInput');

    const fullId = `${lolId}#${tag}`;

    const publicButton = new ButtonBuilder()
      .setCustomId(`lol-public-${fullId}`)
      .setLabel('公開')
      .setStyle(ButtonStyle.Success);

    const privateButton = new ButtonBuilder()
      .setCustomId(`lol-private-${fullId}`)
      .setLabel('非公開')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(publicButton, privateButton);

    await interaction.reply({
      content: `ID: ${fullId}\n公開しますか？`,
      components: [row],
      ephemeral: true
    });

  },

  // =========================
  // ボタン処理（公開/非公開 → レーン選択）
  // =========================
  async handleButton(interaction) {

    // 🔥 他のボタン完全無視
    if (
      !interaction.customId.startsWith('lol-public-') &&
      !interaction.customId.startsWith('lol-private-')
    ) return false;

    // 🔥 すでに返信済みなら止める
    if (interaction.replied || interaction.deferred) return true;


    const [prefix, type, ...rest] = interaction.customId.split('-');

    const lolId = rest.join('-');
    const userId = interaction.user.id;

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`lane-final-${userId}-${lolId}-${type}`)
      .setPlaceholder('レーンを選択してください')
      .setMinValues(1)
      .setMaxValues(5)
      .addOptions([
        { label: 'TOP', value: 'TOP', emoji: laneIcons.TOP || undefined },
        { label: 'JG', value: 'JG', emoji: laneIcons.JG || undefined },
        { label: 'MID', value: 'MID', emoji: laneIcons.MID || undefined },
        { label: 'ADC', value: 'ADC', emoji: laneIcons.ADC || undefined },
        { label: 'SUP', value: 'SUP', emoji: laneIcons.SUP || undefined }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.update({
      content: `ID: ${lolId}\nレーンを選択してください`,
      components: [row]
    });

    return true;
  },
async handleSelect(interaction) {
  if (!interaction.customId.startsWith('lane-final-')) return false;

  const [, , userId, ...rest] = interaction.customId.split('-');
  const type = rest.pop();
  const lolId = rest.join('-');
  const lanes = interaction.values;
  const guildId = interaction.guild.id;

  await pool.query(
    `INSERT INTO lol_users (guild_id, user_id, lol_id, public, lanes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (guild_id, user_id)
     DO UPDATE SET lol_id = $3, public = $4, lanes = $5`,
    [guildId, userId, lolId, type === 'public', lanes]
  );

  const member = await interaction.guild.members.fetch(interaction.user.id);

  // ⚠ サーバーごとに分岐推奨
  if (!member.roles.cache.has('1512873027275329548')) {
    await member.roles.add('1513264955330400286');
  }

  await interaction.reply({
    content: `登録完了！\nID: ${lolId}\nレーン: ${lanes.join(', ')}`,
    ephemeral: true
  });

  return true;
}
};