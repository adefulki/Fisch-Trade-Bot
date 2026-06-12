/**
 * /health command — Show overall market health index.
 */

const { EmbedBuilder } = require("discord.js");
const { getMarketHealth } = require("../services/market-health");

/**
 * Handle the /health slash command interaction.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database
 */
async function execute(interaction, items) {
  await interaction.deferReply();

  const days = interaction.options.getInteger("days") || 7;
  const health = getMarketHealth(items, days);

  // Build sentiment bar
  const barLength = 20;
  const normalized = (health.sentimentScore + 100) / 200; // 0 to 1
  const filled = Math.round(normalized * barLength);
  const bar = "🟥".repeat(Math.max(0, 10 - filled)) +
    "🟨".repeat(Math.min(filled, 10) - Math.max(0, filled - 10)) +
    "🟩".repeat(Math.max(0, filled - 10));

  // Simpler visual bar
  const simpleBar = "█".repeat(filled) + "░".repeat(barLength - filled);

  const embed = new EmbedBuilder()
    .setTitle(`🏥 FISCH MARKET HEALTH`)
    .setColor(health.color)
    .setDescription([
      `## ${health.emoji} ${health.status}`,
      ``,
      `**Sentiment Score:** ${health.sentimentScore > 0 ? "+" : ""}${health.sentimentScore}/100`,
      `\`Bearish [${simpleBar}] Bullish\``,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📊 **Market Breakdown** (${days}d)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `📈 Rising: **${health.rising}** items`,
      `📉 Dropping: **${health.dropping}** items`,
      `➡️ Stable: **${health.stable}** items`,
      ``,
      `🚀 Gainers: **${health.gainersCount}** | 💀 Losers: **${health.losersCount}**`,
      `🔥 High Demand: **${health.highDemand}** | ⭐ Limited: **${health.limited}**`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ **Activity:** ${health.activity} (${health.totalChanges} price updates in ${days}d)`,
      `📦 **Total Items Tracked:** ${health.totalItems}`,
    ].join("\n"))
    .setFooter({ text: "Based on current trends + historical price movements" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
