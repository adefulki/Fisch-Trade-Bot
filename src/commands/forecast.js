/**
 * /forecast command — Show price trend forecast for an item.
 */

const { EmbedBuilder } = require("discord.js");
const { findItem } = require("../services/matcher");
const { forecastItem } = require("../services/forecast");
const { formatVal, trendEmoji } = require("../utils/format");

/**
 * Handle the /forecast slash command interaction.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  const query = interaction.options.getString("item");
  const days = interaction.options.getInteger("days") || 14;
  const item = findItem(query);

  if (!item) {
    await interaction.reply({ content: `⚠️ Item "${query}" not found.`, ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const forecast = forecastItem(item, days, 7);

  if (!forecast) {
    const embed = new EmbedBuilder()
      .setTitle(`🔮 ${item.name} — Forecast`)
      .setDescription(`Not enough historical data to generate a forecast.\n\n*Need at least 3 price changes. Data accumulates over time.*`)
      .setColor(0x808080);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const dirEmoji = forecast.direction === "Rising" ? "📈" : forecast.direction === "Falling" ? "📉" : "➡️";
  const color = forecast.direction === "Rising" ? 0x00ff00 : forecast.direction === "Falling" ? 0xff4500 : 0xffd700;

  // Build prediction table
  const predLines = forecast.predictions.map((p) => {
    const diff = p.value - forecast.currentVal;
    const diffStr = diff >= 0 ? `+${formatVal(diff)}` : formatVal(diff);
    return `Day ${p.day}: **${formatVal(p.value)}** (${diffStr})`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`🔮 ${item.name} — Price Forecast`)
    .setColor(color)
    .setDescription([
      `**Current:** ${formatVal(forecast.currentVal)}`,
      `**Trend:** ${dirEmoji} ${forecast.direction}`,
      `**Daily Change:** ${forecast.dailyChange >= 0 ? "+" : ""}${formatVal(forecast.dailyChange)} (${forecast.dailyChangePct}%/day)`,
      `**Confidence:** ${forecast.confidence} (R² = ${forecast.r2})`,
      `**Data Points:** ${forecast.dataPoints} price changes over ${days}d`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📅 **${forecast.forecastDays}-Day Prediction:**`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ...predLines,
    ].join("\n"))
    .setFooter({ text: `⚠️ Predictions are estimates based on recent trends. Actual values may vary.` });

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
