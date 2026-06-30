const {
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const pool = require('../db');
const { laneIcons } = require('../config/icons');
const { getRankFromRiotId } = require('../utils/lolApi');
const { convertRankToScore } = require('../utils/rankUtils');

// =========================
// ピークランクの取得
// =========================
async function updatePeakIfNeeded(userData) {

  console.log("peakチェック:", userData.user_id);

  try {
    const rankData = await getRankFromRiotId(userData.lol_id);

    console.log("rankData:", rankData);

    if (typeof rankData !== 'object') return;

    const currentScore = convertRankToScore(rankData);
    const oldScore = userData.peak_score || 0;

    if (currentScore > oldScore) {

      await pool.query(`
        UPDATE lol_users
        SET peak_tier = $1,
            peak_rank = $2,
            peak_score = $3
        WHERE guild_id = $4 AND user_id = $5
      `, [
        rankData.tier,
        rankData.rank,
        currentScore,
        userData.guild_id,
        userData.user_id
      ]);

      console.log("🔥 peak更新成功");
    }

  } catch (e) {
    console.error("peak更新エラー:", e);
  }
}

// =========================
// サーバーに存在するユーザーだけ残す
// =========================
async function cleanUsers(guild, users) {
  const valid = [];

  for (const user of users) {
    try {
      await guild.members.fetch(user.user_id);
      valid.push(user);
    } catch {
      // 🔥 サーバーにいない → DB削除
      await pool.query(
        `DELETE FROM lol_users WHERE guild_id = $1 AND user_id = $2`,
        [guild.id, user.user_id]
      );

      console.log("削除:", user.user_id);
    }
  }

  return valid;
}

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

    await interaction.deferReply({ ephemeral: true });

    const isAdmin = interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    const guildId = interaction.guild.id;

    // 🔥 DB取得
    let result = await pool.query(
      `SELECT * FROM lol_users WHERE guild_id = $1`,
      [guildId]
    );

    let users = result.rows;

    // 🔥 サーバー外ユーザー削除
    users = await cleanUsers(interaction.guild, users);

    // 🔥 非公開フィルター
    if (!isAdmin) {
      users = users.filter(u => u.public);
    }

    if (users.length === 0) {
      return interaction.editReply({
        content: '表示できるデータがありません'
      });
    }

    users.slice(0, 10).forEach((user, index) => {
      setTimeout(() => {
        updatePeakIfNeeded(user);
      }, index * 500);
    });

    const pages = chunkArray(users, 5);
    let page = 0;

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
            `Discord: <@${user.user_id}>\n` +
            `サモナー: ${user.lol_id}\n` +
            `レーン: ${laneText}\n` +
            `${status}`
        });
      });

      return embed;
    };

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

    await interaction.editReply({
      embeds: [generateEmbed(page)],
      components: [getRow(page)]
    });
  },

  async handleButton(interaction) {

    if (
      !interaction.customId.startsWith('list-prev-') &&
      !interaction.customId.startsWith('list-next-')
    ) return false;

    const guildId = interaction.guild.id;

    let result = await pool.query(
      `SELECT * FROM lol_users WHERE guild_id = $1`,
      [guildId]
    );

    let users = result.rows;

    // 🔥 再クリーン
    users = await cleanUsers(interaction.guild, users);

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
          `Discord: <@${user.user_id}>\n` +
          `サモナー: ${user.lol_id}\n` +
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