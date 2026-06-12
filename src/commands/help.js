/**
 * /help command — Show bot usage guide organized by category (ephemeral).
 */

/**
 * Handle the /help slash command interaction.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  const helpText = [
    `🐟 **FISCH TRADE ASSISTANT — USER GUIDE**`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚖️ **TRADING**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `**\`/trade\`** — Analyze a trade`,
    `> \`/trade your_offer: 2 Nocturne, Scarwing their_offer: Evangeline\``,
    `**\`/value\`** — Look up an item's value`,
    `> \`/value item: Evangeline\``,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 **MARKET & ANALYTICS**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `**\`/market\`** — Top items, flips, trends`,
    `> \`/market\` or \`/market days: 30\``,
    `**\`/health\`** — Market health index (bullish/bearish)`,
    `**\`/forecast\`** — Price prediction for an item`,
    `> \`/forecast item: Evangeline\``,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📈 **HISTORY & CHARTS**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `**\`/history\`** — Price chart + change log`,
    `> \`/history item: Evangeline\` or \`/history item: c3 days: 14\``,
    `**\`/chart\`** — TrueVal + Trade Hub & Proto charts`,
    `> \`/chart item: Evangeline\``,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💼 **PORTFOLIO & ALERTS**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `**\`/portfolio view\`** — See your holdings + ROI`,
    `**\`/portfolio add\`** — Track an item you own`,
    `> \`/portfolio add item: Nocturne qty: 2\``,
    `**\`/portfolio remove\`** — Remove from portfolio`,
    `**\`/watch add\`** — Set a price alert (DM)`,
    `> \`/watch add item: Evangeline condition: above price: 5000000\``,
    `**\`/watch list\`** — View your alerts`,
    `**\`/watch remove\`** — Cancel an alert`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔔 **NOTIFICATIONS**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `**\`/subscribe\`** — Get value alerts in a channel`,
    `**\`/unsubscribe\`** — Stop alerts for this server`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `ℹ️ **OTHER**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `**\`/sync\`** — Force refresh values`,
    `**\`/help\`** — This guide`,
    `**\`/about\`** — Bot info & creator`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔢 **QUANTITY** (left side only)`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `> \`3 Nocturne\` | \`3x Nocturne\` | \`4 curse 4\` | \`3 c3\``,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔍 **FLEXIBLE NAMES** (autocomplete enabled)`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `> \`c3\` → Curse III | \`c4\` → Curse IV | \`stb\` → Slime Trade Booth`,
    `> \`evan\` → Evangeline | \`crev\` → Cthulu's Revenge`,
    `> \`slime booth\` → Slime Trade Booth | \`rb sera\` → Seraphic Rainbow`,
    `> \`pearsickle\` → Pearsicle (typos ok!)`,
  ].join("\n");

  await interaction.reply({ content: helpText, ephemeral: true });
}

module.exports = { execute };
