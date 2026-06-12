/**
 * Main bot module.
 * Sets up the Discord client, cron jobs, and routes commands.
 */

const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");

const { scrapeValues, loadItems } = require("./services/scraper");
const { setItems } = require("./services/matcher");
const { setItems: setAutocompleteItems, getAutocompleteSuggestions } = require("./services/autocomplete");
const { recordChanges } = require("./data/history");
const { postChangeNotification } = require("./services/notifier");
const { checkWatches } = require("./data/watchlist");

// Command handlers
const tradeCmd = require("./commands/trade");
const valueCmd = require("./commands/value");
const marketCmd = require("./commands/market");
const historyCmd = require("./commands/history");
const syncCmd = require("./commands/sync");
const helpCmd = require("./commands/help");
const aboutCmd = require("./commands/about");
const chartCmd = require("./commands/chart");
const subscribeCmd = require("./commands/subscribe");
const forecastCmd = require("./commands/forecast");
const watchCmd = require("./commands/watch");
const portfolioCmd = require("./commands/portfolio");
const healthCmd = require("./commands/health");
const compareCmd = require("./commands/compare");

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
setAutocompleteItems(items);

/** Timestamp of last sync (prevents double-sync within 5 minutes) */
let lastSyncTime = 0;

/**
 * Send DM alerts for triggered watchlist items.
 */
async function processWatchAlerts() {
  const triggered = checkWatches(items);
  const { formatVal } = require("./utils/format");

  for (const alert of triggered) {
    try {
      const user = await client.users.fetch(alert.userId);
      if (user) {
        const symbol = alert.condition === "above" ? "≥" : "≤";
        await user.send(
          `🔔 **Watch Alert!**\n\n` +
          `**${alert.itemName}** is now ${symbol} your target!\n` +
          `Target: ${formatVal(alert.targetValue)}\n` +
          `Current: ${formatVal(alert.currentValue)}\n\n` +
          `*This watch has been automatically removed.*`
        );
      }
    } catch (e) {
      console.error(`⚠️ Failed to DM user ${alert.userId}:`, e.message);
    }
  }
  if (triggered.length > 0) {
    console.log(`🔔 Sent ${triggered.length} watch alert(s)`);
  }
}

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
    setAutocompleteItems(items);
    recordChanges(changes);
    await postChangeNotification(client, changes);
    // Check watchlist alerts
    await processWatchAlerts();
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

  // Register slash commands on startup
  try {
    const { REST, Routes } = require("discord.js");
    const commands = require("../deploy-commands.js");
    // deploy-commands.js handles registration itself when required
    console.log("✅ Slash commands registered");
  } catch (e) {
    // Silently ignore — commands may already be registered
  }

  // Sync on startup (skip notification)
  console.log("🚀 Running initial value sync...");
  const { success } = await scrapeValues();
  if (success) {
    items = loadItems();
    setItems(items);
    setAutocompleteItems(items);
  }
});

// --- Command router ---
client.on("interactionCreate", async (interaction) => {
  // Handle autocomplete interactions
  if (interaction.isAutocomplete()) {
    const focusedOption = interaction.options.getFocused(true);
    const isTradeField = interaction.commandName === "trade";
    const suggestions = getAutocompleteSuggestions(focusedOption.value, isTradeField);
    await interaction.respond(suggestions).catch(() => {});
    return;
  }

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
      case "subscribe":
        await subscribeCmd.executeSubscribe(interaction);
        break;
      case "unsubscribe":
        await subscribeCmd.executeUnsubscribe(interaction);
        break;
      case "forecast":
        await forecastCmd.execute(interaction);
        break;
      case "watch":
        const watchSub = interaction.options.getSubcommand();
        if (watchSub === "add") await watchCmd.executeAdd(interaction);
        else if (watchSub === "remove") await watchCmd.executeRemove(interaction);
        else if (watchSub === "list") await watchCmd.executeList(interaction);
        break;
      case "portfolio":
        const pfSub = interaction.options.getSubcommand();
        if (pfSub === "view") await portfolioCmd.executeView(interaction, items);
        else if (pfSub === "add") await portfolioCmd.executeAdd(interaction, items);
        else if (pfSub === "remove") await portfolioCmd.executeRemove(interaction);
        else if (pfSub === "clear") await portfolioCmd.executeClear(interaction);
        break;
      case "health":
        await healthCmd.execute(interaction, items);
        break;
      case "compare":
        await compareCmd.execute(interaction);
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
