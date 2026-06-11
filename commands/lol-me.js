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

const pool = require('../db');

const { getRankFromRiotId } = require('../utils/lolApi');

const { laneIcons, rankIcons } = require('../config/icons');

module.exports = {
  data: {
    name: 'lol-me'
  },

  // =========================
  // 表示
  // =========================
  async execute(interaction) {
    const result = await pool.query(
      `SELECT * FROM lol_users WHERE guild_id = $1 AND user_id = $2`,
      [interaction.guild.id, interaction.user.id]
    );

    const userData = result.rows[0];

    if (!userData) {
      return interaction.reply({
        content: 'まだ登録されていません',
        ephemeral: true
      });
    }

    const laneText = userData.lanes?.length
      ? userData.lanes.map(l => laneIcons[l] || l).join(' ')
      : '未設定';

    const status = userData.public ? '🟢公開' : '🔒非公開';

    const rankData = await getRankFromRiotId(userData.lol_id);
    console.log(rankData);

    let rankText = "取得失敗";

    if (typeof rankData === 'object') {
      const icon = rankIcons[rankData.tier] || '';
      rankText = `${icon} ${rankData.tier} ${rankData.rank} (${rankData.lp}LP)`;
    }else{
      rankText = rankData;
    }

    const embed = new EmbedBuilder()
      .setTitle('あなたのLoL ID')
      .setColor(userData.public ? 0x00ff00 : 0xff0000)
      .addFields({
        name: ' ',
        value:
          `DiscordID: <@${interaction.user.id}>\n` +
          `サモナーネーム: ${userData.lol_id}\n` +
          `レーン: ${laneText}\n` +
          `ランク:${rankText}\n` +
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
  // ボタン処理
  // =========================
  async handleButton(interaction) {

    // 編集開始
    if (interaction.customId === 'lol-me-edit') {
      if (interaction.replied || interaction.deferred) return true;

      const menu = new StringSelectMenuBuilder()
        .setCustomId('lol-me-edit-select')
        .setPlaceholder('編集内容を選択')
        .addOptions([
          { label: '名前変更', value: 'name' },
          { label: '公開設定', value: 'public' },
          { label: 'レーン変更', value: 'lane' }
        ]);

      await interaction.update({
        content: '編集する項目を選んでください',
        embeds: [],
        components: [new ActionRowBuilder().addComponents(menu)]
      });

      return true;
    }

    // 公開設定変更
    if (
      interaction.customId === 'lol-me-set-public' ||
      interaction.customId === 'lol-me-set-private'
    ) {
      const isPublic = interaction.customId === 'lol-me-set-public';

      await pool.query(
        `UPDATE lol_users SET public = $1 WHERE guild_id = $2 AND user_id = $3`,
        [isPublic, interaction.guild.id, interaction.user.id]
      );

      return this.showUpdatedCard(interaction);
    }

    return false;
  },

  // =========================
  // セレクト処理
  // =========================
  async handleSelect(interaction) {

    // 編集内容選択
    if (interaction.customId === 'lol-me-edit-select') {
      const value = interaction.values[0];

      // 名前変更
      if (value === 'name') {

        // 🔥 DBから現在の値取得
        const result = await pool.query(
          `SELECT * FROM lol_users WHERE guild_id = $1 AND user_id = $2`,
          [interaction.guild.id, interaction.user.id]
        );

        const userData = result.rows[0];

        let name = '';
        let tag = '';

        if (userData?.lol_id) {
          const parts = userData.lol_id.split('#');
          name = parts[0] || '';
          tag = parts[1] || '';
        }

        // 🔥 モーダル作成
        const modal = new ModalBuilder()
          .setCustomId('lol-me-name-modal')
          .setTitle('名前変更');

        const nameInput = new TextInputBuilder()
          .setCustomId('name')
          .setLabel('サモナーネーム')
          .setStyle(TextInputStyle.Short)
          .setValue(name); // 👈これが重要

        const tagInput = new TextInputBuilder()
          .setCustomId('tag')
          .setLabel('タグ（例:JP1）')
          .setStyle(TextInputStyle.Short)
          .setValue(tag); // 👈これも

        modal.addComponents(
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(tagInput)
        );

        await interaction.showModal(modal);
        return true;
      }

      // 公開設定
      if (value === 'public') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('lol-me-set-public')
            .setLabel('公開')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('lol-me-set-private')
            .setLabel('非公開')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({
          content: '公開設定を選択',
          components: [row]
        });

        return true;
      }

      // レーン変更
      if (value === 'lane') {
        const menu = new StringSelectMenuBuilder()
          .setCustomId('lol-me-lane-select')
          .setPlaceholder('レーンを選択')
          .setMinValues(1)
          .setMaxValues(5)
          .addOptions([
            { label: 'TOP', value: 'TOP', emoji: laneIcons.TOP },
            { label: 'JG', value: 'JG', emoji: laneIcons.JG },
            { label: 'MID', value: 'MID', emoji: laneIcons.MID },
            { label: 'ADC', value: 'ADC', emoji: laneIcons.ADC },
            { label: 'SUP', value: 'SUP', emoji: laneIcons.SUP }
          ]);

        await interaction.update({
          content: 'レーンを選択してください',
          components: [new ActionRowBuilder().addComponents(menu)]
        });

        return true;
      }
    }

    // レーン保存
    if (interaction.customId === 'lol-me-lane-select') {
      const lanes = interaction.values;

      await pool.query(
        `UPDATE lol_users SET lanes = $1 WHERE guild_id = $2 AND user_id = $3`,
        [lanes, interaction.guild.id, interaction.user.id]
      );

      return this.showUpdatedCard(interaction);
    }

    return false;
  },

  // =========================
  // モーダル処理
  // =========================
  async handleModal(interaction) {
    if (interaction.customId !== 'lol-me-name-modal') return false;

    console.log("LOL-ME");

    try {
      // 🔥 入力取得
      const name = interaction.fields.getTextInputValue('name');
      const tag = interaction.fields.getTextInputValue('tag');

      const fullId = `${name}#${tag}`;

      // 🔥 更新
      await pool.query(
        `UPDATE lol_users SET lol_id = $1 WHERE guild_id = $2 AND user_id = $3`,
        [fullId, interaction.guild.id, interaction.user.id]
      );

      // 🔥 更新後表示
      await this.showUpdatedCard(interaction);

      return true;

    } catch (error) {
      console.error(error);

      await interaction.reply({
        content: '更新中にエラーが発生しました',
        ephemeral: true
      });

      return true;
    }
  },

  // =========================
  // 共通：更新後カード表示
  // =========================
  async showUpdatedCard(interaction) {
    const result = await pool.query(
      `SELECT * FROM lol_users WHERE guild_id = $1 AND user_id = $2`,
      [interaction.guild.id, interaction.user.id]
    );

    const userData = result.rows[0];

    const laneText = userData.lanes?.length
      ? userData.lanes.map(l => laneIcons[l] || l).join(' ')
      : '未設定';

    const status = userData.public ? '🟢公開' : '🔒非公開';

    const rank = await getRankFromRiotId(userData.lol_id);


    const embed = new EmbedBuilder()
      .setTitle('更新完了')
      .setColor(userData.public ? 0x00ff00 : 0xff0000)
      .addFields({
        name: ' ',
        value:
          `DiscordID: <@${interaction.user.id}>\n` +
          `サモナーネーム: ${userData.lol_id}\n` +
          `レーン: ${laneText}\n` +
          `ランク:${rank}\n` +
          `${status}`
      });

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
};