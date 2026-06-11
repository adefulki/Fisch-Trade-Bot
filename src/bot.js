/**
 * Main bot module.
 * Sets up the Discord client, cron jobs, and routes commands.
 */

const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");

const { scrapeValues, loadItems } = require("./services/scraper");
const { setItems } = require("./services/matcher");
const { recordChanges } = require("./data/history");
const { postChangeNotification } = require("./services/notifier");

// Command handlers
const tradeCmd = require("./commands/trade");
const valueCmd = require("./commands/value");
const marketCmd = require("./commands/market");
const historyCmd = require("./commands/history");
const syncCmd = require("./commands/sync");
const helpCmd = require("./commands/help");
const aboutCmd = require("./commands/about");
const chartCmd = require("./commands/chart");

/** Discord client with required intents */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

/** Live item data (reloaded after each sync) */
let items = loadItems();
setItems(items);

/** Timestamp of last sync (prevents double-sync within 5 minutes) */
let lastSyncTime = 0;

/**
 * Sync values from game.guide and post notifications.
 * Includes a 5-minute cooldown to prevent duplicate syncs.
 */
async function syncAndNotify() {
  const now = Date.now();
  if (now - lastSyncTime < 5 * 60 * 1000) {
    console.log("⏭️ Skipping sync — ran less than 5 minutes ago");
    return;
  }
  lastSyncTime = now;

  const { success, changes } = await scrapeValues();
  if (success) {
    items = loadItems();
    setItems(items);
    recordChanges(changes);
    await postChangeNotification(client, changes);
  }
}

// --- Cron Job: Sync values every 1 hour ---
cron.schedule("0 * * * *", async () => {
  console.log("⏰ Cron triggered: syncing values...");
  await syncAndNotify();
});

// --- Bot ready event ---
client.on("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Sync on startup (skip notification)
  console.log("🚀 Running initial value sync...");
  const { success } = await scrapeValues();
  if (success) {
    items = loadItems();
    setItems(items);
  }
});

// --- Command router ---
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const context = {
    client,
    setItems: (newItems) => { items = newItems; },
  };

  try {
    switch (interaction.commandName) {
      case "trade":
        await tradeCmd.execute(interaction, items);
        break;
      case "value":
        await valueCmd.execute(interaction);
        break;
      case "market":
        await marketCmd.execute(interaction, items);
        break;
      case "history":
        await historyCmd.execute(interaction);
        break;
      case "sync":
        await syncCmd.execute(interaction, context);
        break;
      case "help":
        await helpCmd.execute(interaction);
        break;
      case "about":
        await aboutCmd.execute(interaction);
        break;
      case "chart":
        await chartCmd.execute(interaction);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`❌ Error in /${interaction.commandName}:`, error.message);
    const reply = interaction.deferred || interaction.replied
      ? interaction.editReply.bind(interaction)
      : interaction.reply.bind(interaction);
    await reply({ content: "❌ An error occurred. Please try again.", ephemeral: true }).catch(() => {});
  }
});

/**
 * Start the bot by logging into Discord.
 */
function start() {
  client.login(process.env.DISCORD_TOKEN);
}

module.exports = { start };
