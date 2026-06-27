const fs = require('fs');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const pool = require('../db');
const { laneIcons, rankIcons } = require('../config/icons');

module.exports = {
  data: {
    name: 'lol-view'
  },

  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('target');

    if (!target) {
      return interaction.reply({
        content: 'ユーザーを指定してください',
        ephemeral: true
      });
    }

    const isAdmin = interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    // =========================
    // DB取得
    // =========================
    const result = await pool.query(
      `SELECT * FROM lol_users WHERE guild_id = $1 AND user_id = $2`,
      [interaction.guild.id, target.id]
    );

    const userData = result.rows[0];

    if (!userData) {
      return interaction.reply({
        content: 'このユーザーは登録していません',
        ephemeral: true
      });
    }

    // =========================
    // 非公開チェック
    // =========================
    if (!userData.public && !isAdmin) {
      return interaction.reply({
        content: 'このユーザーの情報は非公開です',
        ephemeral: true
      });
    }

    // =========================
    // レーン表示
    // =========================
    const laneText = userData.lanes?.length
      ? userData.lanes.map(l => laneIcons[l] || l).join(' ')
      : '未設定';

    const status = userData.public ? '🟢公開' : '🔒非公開';

    // =========================
    // ランク取得
    // =========================
    let rankText = '取得失敗';

    try {
      const rankData = await getRankFromRiotId(userData.lol_id);

      if (typeof rankData === 'object') {
        rankText = `${rankData.tier} ${rankData.rank} (${rankData.lp}LP)`;
      } else {
        rankText = rankData;
      }
    } catch {
      rankText = '取得失敗';
    }

    // =========================
    // 表示
    // =========================
    const embed = new EmbedBuilder()
      .setTitle('🔍 LoLプレイヤー情報')
      .setColor(userData.public ? 0x00ff00 : 0xff0000)
      .addFields({
        name: '',
        value:
          `👤 Discord: <@${target.id}>\n` +
          `🎮 サモナー: ${userData.lol_id}\n` +
          `🧭 レーン: ${laneText}\n` +
          `🏆 ランク: ${rankText}\n` +
          `${status}`
      });

    await interaction.editReply({
      embeds: [embed],
      ephemeral: true
    });
  }
};