const { 
  PermissionsBitField, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const laneIcons = {
  TOP: '<:top:1513177035877519541>',
  JG: '<:jungle:1513177011445563402>',
  MID: '<:mid:1513176990201544795>',
  ADC: '<:bot:1513176967963480175>',
  SUP: '<:support:1513176932966203627>'
};

const fs = require('fs');

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

    const filePath = './data/lolData.json';
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const users = isAdmin ? data : data.filter(d => d.public);

    if (users.length === 0) {
      return interaction.reply({
        content: '表示できるデータがありません',
        ephemeral: true
      });
    }

    // 👇 ここが重要
    const pages = chunkArray(users, 5);
    let page = 0;

    const generateEmbed = (pageIndex) => {
      const embed = new EmbedBuilder()
        .setTitle(`LoL ID 一覧 (${pageIndex + 1}/${pages.length})`)
        .setColor(0x0099ff);

      pages[pageIndex].forEach(user => {
        const status = user.public ? '🟢公開' : '🔒非公開';

    // 🔥 レーン取得（未設定対策つき）
    const laneText = user.lanes && user.lanes.length > 0
        ? user.lanes.map(lane => laneIcons[lane] || lane).join(' ')
        : '未設定';

    embed.addFields({
        name: '',
        value:
        `DiscordID: <@${user.userId}>\n` +
        `サモナーネーム: ${user.lolId}\n` +
        `レーン: ${laneText}\n` +
        `${status}`,
        inline: false
    });
      });

      return embed;
    };

    // 👇 ボタン
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`page-prev-${page}`)
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`page-next-${page}`)
        .setLabel('➡️')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [generateEmbed(page)],
      components: [row],
      ephemeral: true
    });
  }
};