const fs = require('fs');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  data: {
    name: 'テスト'
  },

  async execute(interaction) {
    await interaction.reply({
      content: 'こんにちは！わたしはシモちゃんのペッパー君です！テストです',
    });
  }
};