/**
 * /changelog command — Show the latest changelog.
 * Restricted to bot owner only.
 */

const { EmbedBuilder, MessageFlags } = require("discord.js");
const { isBotOwner } = require("../utils/permissions");

/** Latest changelog content */
const CHANGELOG = {
  version: "v2.0.0",
  date: "July 15, 2026",
  sections: [
    {
      title: "🆕 New Commands",
      items: [
        "`/roi` — Top items by ROI (value ÷ Robux cost)",
        "`/liquidity` — Items ranked by ease of selling",
        "`/changelog` — View latest bot changes (admin only)",
      ],
    },
    {
      title: "🛡️ Manipulation Detection",
      items: [
        "Detects: spikes, pump & dump, demand flips, oscillation, fake trends",
        "Confidence: Stable → Suspicious → Likely Manipulated",
        "Integrated into `/value`, `/trade`, `/compare`, `/history`",
      ],
    },
    {
      title: "📊 Market Data",
      items: [
        "Stock, Cost (Robux), Sold Rate from item detail pages",
        "Community Market Value from active trades",
        "🚨 Price Gap Warning when listed ≠ market price (>30% diff)",
        "Smart Value: uses real trade data over possibly-manipulated TrueVal",
      ],
    },
    {
      title: "⚖️ Compare Overhaul",
      items: [
        "Value difference display (% from top, exact gap)",
        "Price efficiency: 💎 Underpriced → 🔴 Overpriced",
        "Trade fairness for 2 items, value spread for 3-5",
        "Scarcity scoring (stock + sold rate)",
      ],
    },
    {
      title: "🌐 Scraper Rewrite",
      items: [
        "Puppeteer support for JS-rendered game.guide",
        "New card layout parser (2025 redesign)",
        "Filters out all-N/A items",
      ],
    },
    {
      title: "🐛 Fixes",
      items: [
        "\"Very High\" demand: color, multiplier, notifier ordering",
        "`/sync` timeout crash prevention",
        "Trend parsing for new card design",
      ],
    },
  ],
};

/**
 * Handle the /changelog slash command interaction.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  if (!isBotOwner(interaction.user.id)) {
    await interaction.reply({
      content: "⚠️ Only the bot owner can use this command.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const description = CHANGELOG.sections.map((section) => {
    const items = section.items.map((item) => `• ${item}`).join("\n");
    return `**${section.title}**\n${items}`;
  }).join("\n\n");

  const embed = new EmbedBuilder()
    .setTitle(`📋 Changelog — ${CHANGELOG.version}`)
    .setDescription(description)
    .setColor(0x5865f2)
    .setFooter({ text: `Released: ${CHANGELOG.date}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
