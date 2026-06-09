const { Client, GatewayIntentBits, Events, Partials, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const commands = new Map();
const recruitments = require('./recruitments');

// コマンド読み込み
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.set(command.data.name, command);
}


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

client.commands = commands; // コマンドをクライアントにセット
// 起動
client.once(Events.ClientReady, () => {
  console.log(`ログイン成功: ${client.user.tag}`);
});

//DB接続
const pool = require('./db');

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lol_users (
      guild_id TEXT,
      user_id TEXT,
      lol_id TEXT,
      public BOOLEAN,
      lanes TEXT[],
      PRIMARY KEY (guild_id, user_id)
    );
  `);
})();

// イベント処理
client.on(Events.InteractionCreate, async interaction => {
  try {

    console.log("TOKEN:", process.env.DISCORD_BOT_TOKEN);

    // =========================
    // スラッシュコマンド
    // =========================
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);
      return;
    }
    console.log(interaction.customId);

    // =========================
    // モーダル
    // =========================
    if (interaction.isModalSubmit()) {

      // register専用
      if (interaction.customId === 'lol-register') {
        const command = commands.get('lol-register');
        if (command && command.handleModal) {
          await command.handleModal(interaction);
        }
        return;
      }

      // lol-me編集
      if (interaction.customId === 'lol-edit-modal') {
        const command = commands.get('lol-me');
        if (command && command.handleModal) {
          await command.handleModal(interaction);
        }
        return;
      }
    }
    // =========================
    // ボタン
    // =========================
    if (interaction.isButton()) {

      // 各コマンドに処理を任せる
      for (const command of commands.values()) {
        if (command.handleButton) {
          const handled = await command.handleButton(interaction);
          if (handled) return;
        }
      }
    }

    // =========================
    // セレクトメニュー
    // =========================
    if (interaction.isStringSelectMenu()) {

      for (const command of commands.values()) {
        if (command.handleSelect) {
          const handled = await command.handleSelect(interaction);
          if (handled) return;
        }
      }
    }




  } catch (error) {
    console.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'エラーが発生しました', ephemeral: true });
    } else {
      await interaction.reply({ content: 'エラーが発生しました', ephemeral: true });
    }
  }
});
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  for (const command of commands.values()) {
    if (command.handleReactionAdd) {
      await command.handleReactionAdd(reaction, user);
    }
  }
});
client.on(Events.MessageReactionRemove, async (reaction, user) => {

  for (const command of commands.values()) {
    if (command.handleReactionRemove) {
      await command.handleReactionRemove(reaction, user);
    }
  }
});
client.login(process.env.DISCORD_BOT_TOKEN);