const {
  EmbedBuilder
} = require('discord.js');

const teamRecruitments = new Map();
const pool = require('../db');
const { getRankFromRiotId } = require('../utils/lolApi');

// =========================
// ランク → 数値変換
// =========================
function convertRankToScore(rank) {
  const tierMap = {
    IRON: 1,
    BRONZE: 2,
    SILVER: 3,
    GOLD: 4,
    PLATINUM: 5,
    EMERALD: 6,
    DIAMOND: 7,
    MASTER: 8,
    GRANDMASTER: 9,
    CHALLENGER: 10
  };

  const rankMap = {
    IV: 1,
    III: 2,
    II: 3,
    I: 4
  };

  return (tierMap[rank.tier] || 0) * 10 + (rankMap[rank.rank] || 0);
}

// =========================
// チーム分け本体
// =========================
async function startTeamSplit(message, data) {

  const players = [];

  for (const id of data.participants) {

    const result = await pool.query(
      `SELECT * FROM lol_users WHERE user_id = $1`,
      [id]
    );

    const user = result.rows[0];

    let score = 0;
    let rankText = "未登録";

    if (user) {
      const rankData = await getRankFromRiotId(user.lol_id);

      if (typeof rankData === 'object') {
        score = convertRankToScore(rankData);
        rankText = `${rankData.tier} ${rankData.rank}`;
      }
    }

    players.push({
      id,
      score,
      rankText
    });
  }

  // 強い順
  players.sort((a, b) => b.score - a.score);

  const teamA = [];
  const teamB = [];

  let sumA = 0;
  let sumB = 0;

  for (const p of players) {
    if (sumA <= sumB) {
      teamA.push(p);
      sumA += p.score;
    } else {
      teamB.push(p);
      sumB += p.score;
    }
  }

  // =========================
  // 表示
  // =========================
  const embed = new EmbedBuilder()
    .setTitle('⚔️ チーム分け結果')
    .setColor(0x00AE86)
    .addFields(
      {
        name: `🔵 Team A (${sumA})`,
        value: teamA.map(p =>
          `<@${p.id}> (${p.rankText})`
        ).join('\n') || 'なし'
      },
      {
        name: `🔴 Team B (${sumB})`,
        value: teamB.map(p =>
          `<@${p.id}> (${p.rankText})`
        ).join('\n') || 'なし'
      }
    );

  await message.channel.send({ embeds: [embed] });
}

// =========================
// コマンド
// =========================
module.exports = {
  data: {
    name: 'team-recruit'
  },

  async execute(interaction) {

    const count = interaction.options.getInteger('count');

    if (!count || count < 2) {
      return interaction.reply({
        content: '人数は2以上にしてね',
        ephemeral: true
      });
    }

    const message = await interaction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎮 チーム分け募集')
          .setDescription(`参加はリアクション！ (${count}人)`)
          .addFields({
            name: '現在',
            value: `0/${count}`
          })
          .setColor(0x0099ff)
      ]
    });

    await message.react('✅');

    // 🔥 作成者も参加させる
    teamRecruitments.set(message.id, {
      ownerId: interaction.user.id,
      participants: [interaction.user.id],
      max: count,
      started: false
    });

    await interaction.reply({
      content: 'チーム募集を作成したよ！',
      ephemeral: true
    });
  },

  // =========================
  // リアクション処理
  // =========================
  async handleReactionAdd(reaction, user) {

    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();

    const data = teamRecruitments.get(reaction.message.id);
    if (!data) return;

    // 追加
    if (!data.participants.includes(user.id)) {
      data.participants.push(user.id);
    }

    // 表示更新
    await reaction.message.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎮 チーム分け募集')
          .setDescription('参加はリアクション！')
          .addFields({
            name: '現在',
            value: `${data.participants.length}/${data.max}`
          })
          .setColor(0x0099ff)
      ]
    });

    // =========================
    // 人数到達
    // =========================
    if (data.participants.length >= data.max && !data.started) {

      data.started = true;

      await reaction.message.channel.send('⚙️ チーム分け中...');

      await startTeamSplit(reaction.message, data);

      teamRecruitments.delete(reaction.message.id);
    }
  }
};