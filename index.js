const { Client, GatewayIntentBits, Events, Partials } = require('discord.js');
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

  if (user.bot) return;

  if (reaction.partial) await reaction.fetch();

  const data = recruitments.get(reaction.message.id);
  if (!data) return;

  if (!data.paraticipants.includes(user.id)) {
    data.paraticipants.push(user.id);
  }

  const embed = new EmbedBuilder()
    .setTitle('🎮LoL募集')
    .setDescription(`参加するにはリアクションを押してください`)
    .addFields(
      { name: '募集人数', value: interaction.options.getString('count'), inline: true },
      { name: '募集主', value: `<@${interaction.user.id}>`, inline: true },
      { name: '現在の参加者数', value: `${data.paraticipants.length}/${data.max}`, inline: true }
    )
    .setColor(0x00AE86);

  await reaction.message.edit({ embeds: [embed] });

  if (data.paraticipants.length >= data.max) {

    const finishEmbed = new EmbedBuilder()
      .setTitle('✅募集締め切り')
      .setDescription(`募集が定員に達したため締め切られました`)
      .setColor(0xff0000);
    await reaction.message.react({ embeds: [finishEmbed] });

    try {
      await data.interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle('参加者リスト')
            .addFields({
              name: '参加者',
              value: data.paraticipants.map(id => `<@${id}>`).join('\n')
            })
            .setColor(0x00AE86)
        ],
        ephemeral: true
      });
    } catch (error) {
      console.error('interection期限切れ:', error);
    }
    await reavtion.message.delete();
    recruitments.delete(reaction.message.id);
  }
});
client.login(process.env.DISCORD_BOT_TOKEN);