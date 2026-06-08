const {
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const pool = require('../db');

const laneIcons = {
  TOP: '<:top:1513177035877519541>',
  JG: '<:jungle:1513177011445563402>',
  MID: '<:mid:1513176990201544795>',
  ADC: '<:bot:1513176967963480175>',
  SUP: '<:support:1513176932966203627>'
};

// ページ分割
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

module.exports = {
  data: {
    name: 'lol-list'
  },

  async execute(interaction) {
    const isAdmin = interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    const guildId = interaction.guild.id;

    // 🔥 DBから取得
    const result = await pool.query(
      `SELECT * FROM lol_users WHERE guild_id = $1`,
      [guildId]
    );

    let users = result.rows;

    // 🔥 非公開フィルター
    if (!isAdmin) {
      users = users.filter(u => u.public);
    }

    if (users.length === 0) {
      return interaction.reply({
        content: '表示できるデータがありません',
        ephemeral: true
      });
    }

    const pages = chunkArray(users, 5);
    let page = 0;

    // =========================
    // Embed生成
    // =========================
    const generateEmbed = (pageIndex) => {
      const embed = new EmbedBuilder()
        .setTitle(`LoL ID 一覧 (${pageIndex + 1}/${pages.length})`)
        .setColor(0x0099ff);

      pages[pageIndex].forEach(user => {
        const status = user.public ? '🟢公開' : '🔒非公開';

        const laneText = user.lanes?.length
          ? user.lanes.map(lane => laneIcons[lane] || lane).join(' ')
          : '未設定';

        embed.addFields({
          name: ' ',
          value:
            `DiscordID: <@${user.user_id}>\n` +
            `サモナーネーム: ${user.lol_id}\n` +
            `レーン: ${laneText}\n` +
            `${status}`,
          inline: false
        });
      });

      return embed;
    };

    // =========================
    // ボタン
    // =========================
    const getRow = (page) =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`list-prev-${page}`)
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),

        new ButtonBuilder()
          .setCustomId(`list-next-${page}`)
          .setLabel('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === pages.length - 1)
      );

    await interaction.reply({
      embeds: [generateEmbed(page)],
      components: [getRow(page)],
      ephemeral: true
    });
  },

  // =========================
  // ページボタン処理
  // =========================
  async handleButton(interaction) {

    if (
      !interaction.customId.startsWith('list-prev-') &&
      !interaction.customId.startsWith('list-next-')
    ) return false;

    if (interaction.replied || interaction.deferred) return true;

    const guildId = interaction.guild.id;

    const result = await pool.query(
      `SELECT * FROM lol_users WHERE guild_id = $1`,
      [guildId]
    );

    let users = result.rows;

    const isAdmin = interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    if (!isAdmin) {
      users = users.filter(u => u.public);
    }

    const pages = chunkArray(users, 5);

    let page = Number(interaction.customId.split('-')[2]);

    if (interaction.customId.startsWith('list-prev-')) page--;
    if (interaction.customId.startsWith('list-next-')) page++;

    // 再生成
    const embed = new EmbedBuilder()
      .setTitle(`LoL ID 一覧 (${page + 1}/${pages.length})`)
      .setColor(0x0099ff);

    pages[page].forEach(user => {
      const status = user.public ? '🟢公開' : '🔒非公開';

      const laneText = user.lanes?.length
        ? user.lanes.map(l => laneIcons[l] || l).join(' ')
        : '未設定';

      embed.addFields({
        name: ' ',
        value:
          `DiscordID: <@${user.user_id}>\n` +
          `サモナーネーム: ${user.lol_id}\n` +
          `レーン: ${laneText}\n` +
          `${status}`
      });
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`list-prev-${page}`)
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),

      new ButtonBuilder()
        .setCustomId(`list-next-${page}`)
        .setLabel('➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === pages.length - 1)
    );

    await interaction.update({
      embeds: [embed],
      components: [row]
    });

    return true;
  }
};