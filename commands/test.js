const fs = require('fs');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  data: {
    name: 'test'
  },

  async execute(interaction) {
    await interaction.reply({
      content: 'こんにちは！わたしはシモちゃんのペッパー君です！',
    });
  }
};