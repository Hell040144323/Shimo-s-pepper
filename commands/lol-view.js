const fs = require('fs');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  data: {
    name: 'lol-view'
  },

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const userId = target.id;

    const isAdmin = interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    const filePath = './data/lolData.json';
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const userData = data.find(d => d.userId === userId);

    if (!userData) {
      return interaction.reply({
        content: 'このユーザーは登録していません',
        ephemeral: true
      });
    }

    if (!userData.public && !isAdmin) {
      return interaction.reply({
        content: 'このユーザーのIDは非公開です',
        ephemeral: true
      });
    }

    const status = userData.public ? '🟢公開' : '🔒非公開';

    const embed = new EmbedBuilder()
      .setTitle('LoL ID 詳細')
      .setColor(userData.public ? 0x00ff00 : 0xff0000)
      .addFields({
        name: '',
        value: `DiscordID: <@${userId}>\nサモナーネーム: ${userData.lolId}\n${status}`,
        inline: false
      });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};