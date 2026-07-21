const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('テスト')
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
    .setDescription('ロール設定を表示するコマンド（管理者用）'),

  new SlashCommandBuilder()
    .setName('募集作成')
    .setDescription('LoL募集の埋め込みを作成するコマンド'),

  new SlashCommandBuilder()
    .setName('team-recruitment')
    .setDescription('チーム分けを実施するコマンド')
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('募集人数')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('lol-peak-check')
    .setDescription('全員のピークランクを確認するコマンド（管理者専用）'),


  new SlashCommandBuilder()
    .setName('lol-team')
    .setDescription('メンバーを指定してチーム分け')
    .addUserOption(o => o.setName('user1').setDescription('プレイヤー').setRequired(true))
    .addUserOption(o => o.setName('user2').setDescription('プレイヤー').setRequired(true))
    .addUserOption(o => o.setName('user3').setDescription('プレイヤー'))
    .addUserOption(o => o.setName('user4').setDescription('プレイヤー'))
    .addUserOption(o => o.setName('user5').setDescription('プレイヤー'))
    .addUserOption(o => o.setName('user6').setDescription('プレイヤー'))
    .addUserOption(o => o.setName('user7').setDescription('プレイヤー'))
    .addUserOption(o => o.setName('user8').setDescription('プレイヤー'))
    .addUserOption(o => o.setName('user9').setDescription('プレイヤー'))
    .addUserOption(o => o.setName('user10').setDescription('プレイヤー'))

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