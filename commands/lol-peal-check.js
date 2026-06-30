const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const pool = require('../db');

module.exports = {
  data: {
    name: 'lol-peak-check'
  },

  async execute(interaction) {

    // 🔥 管理者チェック
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: 'このコマンドは管理者のみ使用できます',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await pool.query(`
      SELECT user_id, lol_id, peak_tier, peak_rank, peak_score
      FROM lol_users
      ORDER BY peak_score DESC NULLS LAST
    `);

    const users = result.rows;

    if (users.length === 0) {
      return interaction.editReply('データがありません');
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 ピークランク一覧')
      .setColor(0xFFD700);

    let text = '';

    users.forEach((user, i) => {
      const peak = user.peak_tier
        ? `${user.peak_tier} ${user.peak_rank}`
        : '未記録';

      text += `${i + 1}. <@${user.user_id}>\n`;
      text += `　ID: ${user.lol_id}\n`;
      text += `　Peak: ${peak}\n\n`;
    });

    embed.setDescription(text);

    await interaction.editReply({
      embeds: [embed]
    });
  }
};