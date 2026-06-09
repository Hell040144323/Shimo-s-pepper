const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-role')
    .setDescription('登録完了後に付与するロールを設定')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('付与するロール')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
      content: 'このコマンドは管理者のみ使用できます',
      ephemeral: true
    });
  }
  
    const role = interaction.options.getRole('role');
    const guildId = interaction.guild.id;

    await pool.query(
      `INSERT INTO guild_settings (guild_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (guild_id)
       DO UPDATE SET role_id = $2`,
      [guildId, role.id]
    );

    await interaction.reply({
      content: `✅ ロール設定完了: ${role.name}`,
      ephemeral: true
    });
  }
};