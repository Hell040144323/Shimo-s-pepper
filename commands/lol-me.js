const fs = require('fs');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

// レーンアイコン
const laneIcons = {
  TOP: '<:top:1513177035877519541>',
  JG: '<:jungle:1513177011445563402>',
  MID: '<:mid:1513176990201544795>',
  ADC: '<:bot:1513176967963480175>',
  SUP: '<:support:1513176932966203627>'
};

module.exports = {
  data: {
    name: 'lol-me'
  },

  // =========================
  // 表示
  // =========================
  async execute(interaction) {
    const data = JSON.parse(fs.readFileSync('./data/lolData.json', 'utf8'));

    const userId = interaction.user.id;
    const userData = data.find(d => d.userId === userId);

    if (!userData) {
      return interaction.reply({
        content: 'まだ登録されていません',
        ephemeral: true
      });
    }

    const status = userData.public ? '🟢公開' : '🔒非公開';

    const laneText = userData.lanes?.length
      ? userData.lanes.map(l => laneIcons[l] || l).join(' ')
      : '未設定';

    const embed = new EmbedBuilder()
      .setTitle('あなたのLoL ID')
      .setColor(userData.public ? 0x00ff00 : 0xff0000)
      .addFields({
        name: ' ',
        value:
          `DiscordID: <@${userId}>\n` +
          `サモナーネーム: ${userData.lolId}\n` +
          `レーン: ${laneText}\n` +
          `${status}`
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('lol-me-edit')
        .setLabel('編集')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  },

  // =========================
  // ボタン
  // =========================
  async handleButton(interaction) {

    // 編集メニュー
    if (interaction.customId === 'lol-me-edit') {

      const menu = new StringSelectMenuBuilder()
        .setCustomId('lol-me-edit-select')
        .setPlaceholder('編集する項目を選択')
        .addOptions([
          { label: 'サモナーネーム', value: 'name', emoji: '🎮' },
          { label: 'レーン', value: 'lane', emoji: '🛣️' },
          { label: '公開設定', value: 'public', emoji: '🔓' }
        ]);

      await interaction.reply({
        content: '編集する項目を選択してください',
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
      });

      return true;
    }

    // 公開設定ボタン
    if (interaction.customId === 'lol-me-set-public' || interaction.customId === 'lol-me-set-private') {

      const data = JSON.parse(fs.readFileSync('./data/lolData.json', 'utf8'));
      const userData = data.find(d => d.userId === interaction.user.id);
      if (!userData) return true;

      userData.public = (interaction.customId === 'lol-me-set-public');

      fs.writeFileSync('./data/lolData.json', JSON.stringify(data, null, 2));

      if (interaction.customId === 'lol-me-set-public' || interaction.customId === 'lol-me-set-private') {

        const filePath = './data/lolData.json';
        let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        const userId = interaction.user.id;
        const userData = data.find(d => d.userId === userId);
        if (!userData) return true;

        // 更新
        userData.public = (interaction.customId === 'lol-me-set-public');

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        const status = userData.public ? '🟢公開' : '🔒非公開';

        const laneText = userData.lanes?.length
          ? userData.lanes.map(l => laneIcons[l] || l).join(' ')
          : '未設定';

        const embed = new EmbedBuilder()
          .setTitle('更新完了')
          .setColor(userData.public ? 0x00ff00 : 0xff0000)
          .addFields({
            name: ' ',
            value:
              `DiscordID: <@${userId}>\n` +
              `サモナーネーム: ${userData.lolId}\n` +
              `レーン: ${laneText}\n` +
              `${status}`
          });

        // 🔥 編集ボタンつける（これ大事）
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('lol-me-edit')
            .setLabel('編集')
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.update({
          content: '',
          embeds: [embed],
          components: [row]
        });

        return true;
      }

      return true;
    }

    // 公開/非公開 → レーン選択（名前変更後）
    if (
      interaction.customId.startsWith('lol-me-public-') ||
      interaction.customId.startsWith('lol-me-private-')
    ) {

      const [, , type, ...rest] = interaction.customId.split('-');
      const lolId = rest.join('-');

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`lol-me-lane-${interaction.user.id}-${lolId}-${type}`)
        .setPlaceholder('レーンを選択')
        .setMinValues(1)
        .setMaxValues(5)
        .addOptions([
          { label: 'TOP', value: 'TOP', emoji: { id: '1513177035877519541' } },
          { label: 'JG', value: 'JG', emoji: { id: '1513177011445563402' } },
          { label: 'MID', value: 'MID', emoji: { id: '1513176990201544795' } },
          { label: 'ADC', value: 'ADC', emoji: { id: '1513176967963480175' } },
          { label: 'SUP', value: 'SUP', emoji: { id: '1513176932966203627' } }
        ]);

      await interaction.update({
        content: `ID: ${lolId}\nレーンを選択してください`,
        components: [new ActionRowBuilder().addComponents(menu)]
      });

      return true;
    }

    return false;
  },

  // =========================
  // セレクト
  // =========================
  async handleSelect(interaction) {

    // 編集メニュー分岐
    if (interaction.customId === 'lol-me-edit-select') {

      const choice = interaction.values[0];

      // 名前編集
      if (choice === 'name') {
        const modal = new ModalBuilder()
          .setCustomId('lol-edit-modal')
          .setTitle('サモナーネーム編集');
        const data = JSON.parse(fs.readFileSync('./data/lolData.json', 'utf8'));
        const userData = data.find(d => d.userId === interaction.user.id);

        // 分解
        let currentName = '';
        let currentTag = '';

        if (userData?.lolId) {
          const split = userData.lolId.split('#');
          currentName = split[0] || '';
          currentTag = split[1] || '';
        }

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('lolNameInput')
              .setLabel('サモナーネーム')
              .setStyle(TextInputStyle.Short)
              .setValue(currentName)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('lolTagInput')
              .setLabel('タグライン')
              .setStyle(TextInputStyle.Short)
              .setValue(currentTag)
          )
        );

        await interaction.showModal(modal);
        return true;
      }

      // レーン編集
      if (choice === 'lane') {
        const data = JSON.parse(fs.readFileSync('./data/lolData.json', 'utf8'));
        const userData = data.find(d => d.userId === interaction.user.id);
        const selectedLanes = userData?.lanes || [];

        const menu = new StringSelectMenuBuilder()
          .setCustomId(`lol-me-lane-${interaction.user.id}-${userData.lolId}-${userData.public ? 'public' : 'private'}`)
          .setPlaceholder('レーンを選択')
          .setMinValues(0)
          .setMaxValues(5)
          .addOptions([
            { label: 'TOP', value: 'TOP', emoji: { id: '1513177035877519541' }, default: selectedLanes.includes('TOP') },
            { label: 'JG', value: 'JG', emoji: { id: '1513177011445563402' }, default: selectedLanes.includes('JG') },
            { label: 'MID', value: 'MID', emoji: { id: '1513176990201544795' }, default: selectedLanes.includes('MID') },
            { label: 'ADC', value: 'ADC', emoji: { id: '1513176967963480175' }, default: selectedLanes.includes('ADC') },
            { label: 'SUP', value: 'SUP', emoji: { id: '1513176932966203627' }, default: selectedLanes.includes('SUP') }
          ]);

        await interaction.update({
          content: 'レーンを選択してください',
          components: [new ActionRowBuilder().addComponents(menu)]
        });

        return true;
      }

      // 公開設定
      if (choice === 'public') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lol-me-set-public').setLabel('公開').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('lol-me-set-private').setLabel('非公開').setStyle(ButtonStyle.Danger)
        );

        await interaction.update({
          content: '公開設定を選択してください',
          components: [row]
        });

        return true;
      }
    }

    // レーン保存
    if (interaction.customId.startsWith('lol-me-lane-')) {

      const parts = interaction.customId.split('-');
      const userId = parts[3];
      const type = parts[parts.length - 1];
      const lolId = parts.slice(4, parts.length - 1).join('-');
      let data = JSON.parse(fs.readFileSync('./data/lolData.json', 'utf8'));
      const existing = data.find(d => d.userId === userId);

      // 👇ここがポイント
      const lanes = interaction.values.length > 0
        ? interaction.values
        : existing?.lanes || [];


      const index = data.findIndex(d => d.userId === userId);

      const newEntry = {
        userId,
        lolId,
        public: (type === 'public'),
        lanes
      };

      if (index !== -1) data[index] = newEntry;
      else data.push(newEntry);

      fs.writeFileSync('./data/lolData.json', JSON.stringify(data, null, 2));

      const laneText = lanes.map(l => laneIcons[l] || l).join(' ');
      const status = type === 'public' ? '🟢公開' : '🔒非公開';

      const embed = new EmbedBuilder()
        .setTitle('更新完了')
        .setColor(type === 'public' ? 0x00ff00 : 0xff0000)
        .addFields({
          name: ' ',
          value:
            `DiscordID: <@${userId}>\n` +
            `サモナーネーム: ${lolId}\n` +
            `レーン: ${laneText}\n` +
            `${status}`
        });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('lol-me-edit')
          .setLabel('編集')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.update({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });

      return true;
    }

    return false;
  },

  // =========================
  // モーダル
  // =========================
  async handleModal(interaction) {

    if (interaction.customId !== 'lol-edit-modal') return;

    const name = interaction.fields.getTextInputValue('lolNameInput');
    const tag = interaction.fields.getTextInputValue('lolTagInput');

    const fullId = `${name}#${tag}`;

    const userId = interaction.user.id;

    const filePath = './data/lolData.json';
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const index = data.findIndex(d => d.userId === userId);

    if (index === -1) return;

    // 👇既存データを保持
    data[index].lolId = fullId;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // 👇現在の状態で表示
    const userData = data[index];

    const laneText = userData.lanes?.length
      ? userData.lanes.map(l => laneIcons[l] || l).join(' ')
      : '未設定';

    const status = userData.public ? '🟢公開' : '🔒非公開';

    const embed = new EmbedBuilder()
      .setTitle('更新完了')
      .setColor(userData.public ? 0x00ff00 : 0xff0000)
      .addFields({
        name: ' ',
        value:
          `DiscordID: <@${userId}>\n` +
          `サモナーネーム: ${fullId}\n` +
          `レーン: ${laneText}\n` +
          `${status}`
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('lol-me-edit')
        .setLabel('編集')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.update({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });

    return true;
  }

};