const { SlashCommandBuilder,EmbedBuilder } = require('discord.js');
const pool = require('../db');

module.exports = {
    async execute(interaction) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: 'このコマンドは管理者のみ使用できます',
                ephemeral: true
            });
        }
        const guildId = interaction.guild.id;

        const result = await pool.query(
            `SELECT role_id FROM guild_settings WHERE guild_id = $1`,
            [guildId]
        );

        const roleId = result.rows[0]?.role_id;

        let roleText = '未設定';

        if (roleId) {
            const role = interaction.guild.roles.cache.get(roleId);
            roleText = role ? `<@${roleId}>` : '設定されたロールが見つかりません';
        }

        const embed = new EmbedBuilder()
            .setTitle('⚙サーバー設定')
            .setColor(0x00AE86)
            .addFields({
                name: '登録完了後に付与するロール',
                value: roleText,
                inline: false
            });

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};