/**
 * /chart command — Show a price chart for an item's historical value changes.
 * Generates a line chart image via QuickChart.io and embeds it.
 */

const { EmbedBuilder } = require("discord.js");
const { findItem } = require("../services/matcher");
const { getItemHistory, formatVal } = require("../data/history");
const { buildPriceChartUrl } = require("../services/chart");
const { trendEmoji } = require("../utils/format");

/**
 * Handle the /chart slash command interaction.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  await interaction.deferReply();

  const query = interaction.options.getString("item");
  const days = interaction.options.getInteger("days") || 30;
  const item = findItem(query);

  if (!item) {
    await interaction.editReply({
      content: `⚠️ Item "${query}" not found. Check spelling and try again.`,
    });
    return;
  }

  const entries = getItemHistory(item.name, days);

  if (entries.length < 2) {
    const embed = new EmbedBuilder()
      .setTitle(`📈 ${item.name} — Price Chart`)
      .setDescription(
        `Not enough data to generate a chart.\n\n` +
        `**Current:** TrueVal: ${formatVal(item.trueVal)} | Trade Hub: ${formatVal(item.tradeHub)}\n` +
        `**Changes recorded:** ${entries.length}\n\n` +
        `*Need at least 2 price changes to draw a chart. Data accumulates over time as values update.*`
      )
      .setColor(0x808080)
      .setFooter({ text: "Charts build up as the bot records value changes hourly" });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Build data points from history entries
  // Track the running value by applying changes
  const dataPoints = [];
  let currentVal = item.trueVal || item.tradeHub || 0;
  const valueField = item.trueVal ? "TrueVal" : "Trade Hub";

  // Collect values from history (oldest to newest)
  for (const entry of entries) {
    for (const change of entry.changes) {
      if (change.field === "TrueVal" || change.field === "Trade Hub") {
        const afterVal = parseValueFromFormatted(change.after);
        if (afterVal > 0) {
          const date = new Date(entry.timestamp).toLocaleDateString("en-GB", {
            timeZone: "Asia/Jakarta",
            day: "numeric",
            month: "short",
          });
          dataPoints.push({ date, value: afterVal });
        }
      }
    }
  }

  // Add current value as last point
  if (currentVal > 0) {
    dataPoints.push({ date: "Now", value: currentVal });
  }

  if (dataPoints.length < 2) {
    await interaction.editReply({
      content: `⚠️ Not enough price change data for **${item.name}** to generate a chart. Try again later.`,
    });
    return;
  }

  // Calculate stats
  const values = dataPoints.map((p) => p.value);
  const high = Math.max(...values);
  const low = Math.min(...values);
  const change = values[values.length - 1] - values[0];
  const changePct = ((change / values[0]) * 100).toFixed(1);
  const changeStr = change >= 0 ? `+${formatVal(change)} (+${changePct}%)` : `${formatVal(change)} (${changePct}%)`;

  // Generate chart URL
  const chartUrl = buildPriceChartUrl(item.name, dataPoints, valueField);

  const embed = new EmbedBuilder()
    .setTitle(`📈 ${item.name} — Price Chart (${days}d)`)
    .setImage(chartUrl)
    .setColor(change >= 0 ? 0x00ff00 : 0xff4500)
    .addFields(
      { name: "Current", value: formatVal(currentVal), inline: true },
      { name: "High", value: formatVal(high), inline: true },
      { name: "Low", value: formatVal(low), inline: true },
      { name: "Change", value: changeStr, inline: true },
      { name: "Demand", value: item.demand, inline: true },
      { name: "Trend", value: `${trendEmoji(item.trend)} ${item.trend}`, inline: true },
    )
    .setFooter({ text: `${dataPoints.length} data points • Source: game.guide` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

/**
 * Parse a formatted value string like "S$ 4.50M" back to number.
 * @param {string} str - Formatted value string
 * @returns {number} Numeric value
 */
function parseValueFromFormatted(str) {
  if (!str || str === "N/A") return 0;
  str = str.replace(/\*\*/g, "").replace("S$", "").replace(/,/g, "").trim();
  if (str.includes("M")) return parseFloat(str) * 1000000;
  if (str.includes("K")) return parseFloat(str) * 1000;
  return parseFloat(str) || 0;
}

module.exports = { execute };
