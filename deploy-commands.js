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
  ),
  new SlashCommandBuilder()
    .setName('config')
    .setDescription('セットアップチュートリアルを表示するコマンド'),

    new SlashCommandBuilder()
    .setName('create-recruitment')
    .setDescription('LoL募集の埋め込みを作成するコマンド（管理者用）')
    .addStringOption(option =>
      option
        .setName('count')
        .setDescription('募集人数')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('募集内容（例: ランク/メイヘム/ノーマル/雑談）')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('time')
        .setDescription('募集期間（分）')
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