const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('test')
    .setDescription('Helloを返すコマンド（テスト用※削除予定）'),

  new SlashCommandBuilder()
    .setName('lol-register')
    .setDescription('サモナーネームを登録するコマンド'),

  new SlashCommandBuilder()
    .setName('lol-list')
    .setDescription('登録されたサモナーネームを表示するコマンド'),

  new SlashCommandBuilder()
    .setName('lol-me')
    .setDescription('自分の登録したサモナーネームを表示するコマンド'),

  new SlashCommandBuilder()
    .setName('lol-delete')
    .setDescription('LoL IDを削除')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('削除したいユーザー（管理者用）')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('lol-view')
    .setDescription('指定ユーザーのLoL IDを見る')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('見たいユーザー')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('setup-tutorial')
    .setDescription('セットアップチュートリアルを表示するコマンド'),
  new SlashCommandBuilder()
  .setName('set-role')
  .setDescription('登録完了後に付与するロールを設定（管理者用）')
  .addRoleOption(option =>
    option
      .setName('role')
      .setDescription('付与するロール')
      .setRequired(true)
  )

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands('1512872375526490122'),
      { body: commands }
    );
    console.log('コマンド登録完了');
  } catch (error) {
    console.error(error);
  }
})();