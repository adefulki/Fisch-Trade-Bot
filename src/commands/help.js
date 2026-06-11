/**
 * /help command — Show bot usage guide to the user (ephemeral).
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
    `📌 **COMMANDS**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `**\`/trade\`** — Analyze a trade`,
    `> \`/trade your_offer: 2 Nocturne, Scarwing their_offer: Evangeline\``,
    ``,
    `**\`/value\`** — Look up an item's value`,
    `> \`/value item: Evangeline\``,
    ``,
    `**\`/market\`** — Market analytics (top items, flips, trends)`,
    `> \`/market\` or \`/market days: 30\``,
    ``,
    `**\`/history\`** — Price history for an item`,
    `> \`/history item: Evangeline\` or \`/history item: c3 days: 14\``,
    ``,
    `**\`/sync\`** — Force refresh values from game.guide`,
    ``,
    `**\`/help\`** — Show this guide`,
    `**\`/about\`** — Bot info & creator`,
    `**\`/chart\`** — Price chart for an item`,
    `> \`/chart item: Evangeline\` or \`/chart item: c3 days: 14\``,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔢 **QUANTITY (left side only)**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `> \`3 Nocturne\` — number before name`,
    `> \`3x Nocturne\` — Nx before name`,
    `> \`4 curse 4\` → 4× Curse IV`,
    `> \`3 c3\` → 3× Curse III`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔍 **FLEXIBLE NAMES**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `> \`c3\` → Curse III | \`c4\` → Curse IV`,
    `> \`stb\` → Slime Trade Booth`,
    `> \`evan\` → Evangeline | \`crev\` → Cthulu's Revenge`,
    `> \`rb sera\` → Seraphic Rainbow`,
    `> \`slime booth\` → Slime Trade Booth`,
    `> \`heavy glory\` → Heavyblade of Glory`,
    `> \`pheaven\` → Puff of Heaven`,
    `> \`pearsickle\` → Pearsicle (typos ok!)`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 **VERDICT SCALE**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `> 🟢🟢 **BIG WIN** — Accept now!`,
    `> 🟢 **WIN** — Good trade, accept`,
    `> 🟡 **FAIR** — Roughly even`,
    `> 🔴 **LOSS** — Ask them to add`,
    `> 🔴🔴 **BIG LOSS** — Decline`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💡 **TIPS**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `• Values auto-update every hour from game.guide`,
    `• 📈 Rising = +10% value | 📉 Dropping = -12% value`,
    `• High demand = +10% | Low demand = -10%`,
    `• Bot suggests specific items to add if trade is unfair`,
    `• Use \`/market\` to find flip opportunities`,
    `• Use \`/history\` to check price trends before trading`,
  ].join("\n");

  await interaction.reply({ content: helpText, ephemeral: true });
}

module.exports = { execute };
