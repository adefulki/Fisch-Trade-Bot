/**
 * /chart command — Show price charts for an item.
 * Chart 1: TrueVal + Trade Hub (dual line)
 * Chart 2: Proto value (single line)
 */

const { EmbedBuilder } = require("discord.js");
const { findItem } = require("../services/matcher");
const { getItemHistory } = require("../data/history");
const { buildValueChartUrl, buildProtoChartUrl } = require("../services/chart");
const { formatVal, trendEmoji } = require("../utils/format");

/**
 * Handle the /chart slash command interaction.
 * Generates two charts: TrueVal+TradeHub and Proto.
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
      .setTitle(`📈 ${item.name} — Charts`)
      .setDescription(
        `Not enough data to generate charts.\n\n` +
        `**Current:** TrueVal: ${formatVal(item.trueVal)} | Trade Hub: ${formatVal(item.tradeHub)} | Proto: ${item.proto || "N/A"}\n` +
        `**Changes recorded:** ${entries.length}\n\n` +
        `*Need at least 2 price changes. Data accumulates over time.*`
      )
      .setColor(0x808080)
      .setFooter({ text: "Charts build up as the bot records value changes hourly" });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Build data points from history
  const valuePoints = []; // {date, trueVal, tradeHub}
  const protoPoints = []; // {date, proto}

  // Track running values
  let lastTrueVal = null;
  let lastTradeHub = null;
  let lastProto = null;

  for (const entry of entries) {
    const date = new Date(entry.timestamp).toLocaleDateString("en-GB", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
    });

    let valueChanged = false;
    let protoChanged = false;

    for (const change of entry.changes) {
      if (change.field === "TrueVal") {
        lastTrueVal = parseVal(change.after);
        valueChanged = true;
      }
      if (change.field === "Trade Hub") {
        lastTradeHub = parseVal(change.after);
        valueChanged = true;
      }
      if (change.field === "Proto") {
        lastProto = parseFloat(change.after) || null;
        protoChanged = true;
      }
    }

    if (valueChanged) {
      valuePoints.push({ date, trueVal: lastTrueVal, tradeHub: lastTradeHub });
    }
    if (protoChanged) {
      protoPoints.push({ date, proto: lastProto });
    }
  }

  // Add current values as last point
  if (valuePoints.length > 0) {
    valuePoints.push({ date: "Now", trueVal: item.trueVal, tradeHub: item.tradeHub });
  }
  if (protoPoints.length > 0) {
    protoPoints.push({ date: "Now", proto: item.proto });
  }

  const embeds = [];

  // Chart 1: TrueVal + Trade Hub
  if (valuePoints.length >= 2) {
    const chartUrl = await buildValueChartUrl(item.name, valuePoints);

    // Calculate stats
    const trueVals = valuePoints.map((p) => p.trueVal).filter(Boolean);
    const tradeHubs = valuePoints.map((p) => p.tradeHub).filter(Boolean);

    let statsLines = [];
    if (trueVals.length > 0) {
      const change = trueVals[trueVals.length - 1] - trueVals[0];
      const pct = ((change / trueVals[0]) * 100).toFixed(1);
      statsLines.push(`**TrueVal:** ${formatVal(item.trueVal)} (${change >= 0 ? "+" : ""}${formatVal(change)}, ${pct}%)`);
    }
    if (tradeHubs.length > 0) {
      const change = tradeHubs[tradeHubs.length - 1] - tradeHubs[0];
      const pct = ((change / tradeHubs[0]) * 100).toFixed(1);
      statsLines.push(`**Trade Hub:** ${formatVal(item.tradeHub)} (${change >= 0 ? "+" : ""}${formatVal(change)}, ${pct}%)`);
    }

    const valueEmbed = new EmbedBuilder()
      .setTitle(`📈 ${item.name} — Value Chart (${days}d)`)
      .setDescription(statsLines.join("\n") + `\n**Demand:** ${item.demand} | **Trend:** ${trendEmoji(item.trend)} ${item.trend}`)
      .setImage(chartUrl)
      .setColor(0x1e90ff);

    embeds.push(valueEmbed);
  }

  // Chart 2: Proto
  if (protoPoints.length >= 2) {
    const chartUrl = await buildProtoChartUrl(item.name, protoPoints);

    const protos = protoPoints.map((p) => p.proto).filter(Boolean);
    let protoStats = `**Proto:** ${item.proto || "N/A"}`;
    if (protos.length >= 2) {
      const change = protos[protos.length - 1] - protos[0];
      protoStats += ` (${change >= 0 ? "+" : ""}${change})`;
    }

    const protoEmbed = new EmbedBuilder()
      .setTitle(`🪙 ${item.name} — Proto Chart (${days}d)`)
      .setDescription(protoStats)
      .setImage(chartUrl)
      .setColor(0xffd700)
      .setFooter({ text: `${valuePoints.length + protoPoints.length} data points • Source: game.guide` });

    embeds.push(protoEmbed);
  }

  // If no charts could be generated
  if (embeds.length === 0) {
    embeds.push(
      new EmbedBuilder()
        .setTitle(`📈 ${item.name} — Charts`)
        .setDescription(
          `Not enough distinct value/proto changes to draw charts.\n\n` +
          `**Current:** TrueVal: ${formatVal(item.trueVal)} | Trade Hub: ${formatVal(item.tradeHub)} | Proto: ${item.proto || "N/A"}\n` +
          `**Changes recorded:** ${entries.length}\n\n` +
          `*Data accumulates over time as values change.*`
        )
        .setColor(0x808080)
    );
  } else {
    // Add footer to last embed if not already set
    if (!embeds[embeds.length - 1].data.footer) {
      embeds[embeds.length - 1].setFooter({ text: `Source: game.guide` });
    }
  }

  await interaction.editReply({ embeds });
}

/**
 * Parse formatted value string back to number.
 * @param {string} str - Formatted string like "S$ 4.50M"
 * @returns {number|null} Numeric value or null
 */
function parseVal(str) {
  if (!str || str === "N/A") return null;
  str = str.replace(/\*\*/g, "").replace("S$", "").replace(/,/g, "").trim();
  if (str.includes("M")) return parseFloat(str) * 1000000;
  if (str.includes("K")) return parseFloat(str) * 1000;
  return parseFloat(str) || null;
}

module.exports = { execute };
