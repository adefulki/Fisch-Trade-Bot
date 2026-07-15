/**
 * /value command — Look up a single item's full stats and adjusted value.
 * Includes a "View History" button that shows price history when clicked.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { findItem, findItemWithFallback } = require("../services/matcher");
const { getAdjustedValue } = require("../services/analyzer");
const { getItemHistory, formatVal: histFormatVal } = require("../data/history");
const { formatVal, trendEmoji } = require("../utils/format");
const { buildValueChartUrl } = require("../services/chart");
const { getStabilityBlock, getStabilityColor } = require("../services/stability");

/**
 * Handle the /value slash command interaction.
 * Shows item stats with a button to view history.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  const query = interaction.options.getString("item");

  // Try local first, then live fallback
  let item = findItem(query);
  if (!item) {
    await interaction.deferReply();
    item = await findItemWithFallback(query);
    if (!item) {
      await interaction.editReply({
        content: `⚠️ Item "${query}" not found in database or game.guide.`,
      });
      return;
    }
  }

  const val = getAdjustedValue(item);

  // Color based on demand (overridden if manipulation detected)
  const colors = { "Very High": 0x00ff88, "High": 0x00ff00, "Limited": 0xffd700, "Medium": 0x1e90ff, "Low": 0xff8c00, "Very Low": 0xff4500 };
  const baseColor = colors[item.demand] || 0x808080;
  const color = getStabilityColor(item, baseColor);

  // Stability analysis
  const stabilityBlock = getStabilityBlock(item);

  const embed = new EmbedBuilder()
    .setTitle(`🔍 ${item.name}`)
    .setColor(color)
    .addFields(
      { name: "TrueVal", value: item.trueVal ? `S$ ${item.trueVal.toLocaleString()}` : "N/A", inline: true },
      { name: "Trade Hub", value: item.tradeHub ? `S$ ${item.tradeHub.toLocaleString()}` : "N/A", inline: true },
      { name: "Proto", value: item.proto !== null ? item.proto.toLocaleString() : "N/A", inline: true },
      { name: "Demand", value: item.demand, inline: true },
      { name: "Trend", value: `${trendEmoji(item.trend)} ${item.trend}`, inline: true },
      { name: "💰 Adjusted Value", value: `${formatVal(val.adjusted)} *(${val.source} × demand × trend)*`, inline: false },
    )
    .setFooter({ text: "Source: game.guide/fisch-value-list" });

  // Add Stock/Cost/Sold Rate if available
  const marketFields = [];
  if (item.stock !== null && item.stock !== undefined) {
    marketFields.push({ name: "📦 Stock", value: item.stock.toLocaleString(), inline: true });
  }
  if (item.cost !== null && item.cost !== undefined) {
    marketFields.push({ name: "💎 Cost", value: `${item.cost.toLocaleString()} Robux`, inline: true });
  }
  if (item.soldRate !== null && item.soldRate !== undefined) {
    const rateEmoji = item.soldRate >= 90 ? "🔥" : item.soldRate >= 60 ? "✅" : item.soldRate >= 30 ? "⚠️" : "❄️";
    marketFields.push({ name: `${rateEmoji} Sold Rate`, value: `${item.soldRate}%`, inline: true });
  }
  if (marketFields.length > 0) {
    embed.addFields(...marketFields);
  }

  // Add scarcity/ROI info if we have both stock and value data
  if (item.stock && item.cost && val.adjusted > 0) {
    const availableStock = item.soldRate ? Math.round(item.stock * (1 - item.soldRate / 100)) : null;
    const scarcityNote = availableStock !== null && availableStock === 0
      ? "🔒 **Sold out** — no longer available from source"
      : availableStock !== null
        ? `~${availableStock.toLocaleString()} remaining from source`
        : "";
    if (scarcityNote) {
      embed.addFields({ name: "📊 Market Info", value: scarcityNote, inline: false });
    }
  }

  // Show Market Value (community trade price) if available
  if (item.marketValue) {
    const mvStr = formatVal(item.marketValue);
    const tradeStr = item.tradeCount ? ` (${item.tradeCount.toLocaleString()} trades)` : "";
    // Compare market value to TrueVal for price accuracy
    let accuracyNote = "";
    if (item.trueVal && item.marketValue) {
      const diff = ((item.trueVal - item.marketValue) / item.marketValue * 100).toFixed(0);
      if (Math.abs(diff) > 20) {
        accuracyNote = diff > 0
          ? ` — ⚠️ TrueVal is ${diff}% higher than market`
          : ` — 💎 Trading ${Math.abs(diff)}% above TrueVal`;
      }
    }
    embed.addFields({ name: "🏪 Community Market Value", value: `${mvStr}${tradeStr}${accuracyNote}`, inline: false });

    // Prominent price gap warning when marketValue differs from trueVal by more than 30%
    if (item.trueVal && item.marketValue) {
      const gapPct = Math.abs(item.trueVal - item.marketValue) / Math.max(item.trueVal, item.marketValue);
      if (gapPct > 0.3) {
        const listedStr = formatVal(item.trueVal);
        const marketStr = formatVal(item.marketValue);
        embed.addFields({
          name: "🚨 Price Gap Warning",
          value: `**Listed ${listedStr} but trades at ~${marketStr}.** Real value is likely closer to market price.`,
          inline: false,
        });
      }
    }
  }

  if (stabilityBlock) {
    embed.addFields({ name: "🛡️ Stability", value: stabilityBlock, inline: false });
  }

  // Add "View History" button
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`value_history_${item.name}`)
      .setLabel("📜 View History")
      .setStyle(ButtonStyle.Secondary),
  );

  const replyFn = interaction.deferred
    ? (opts) => interaction.editReply(opts)
    : (opts) => interaction.reply(opts);

  const msg = await replyFn({ embeds: [embed], components: [row], fetchReply: true });

  // Listen for button click (2 minutes)
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (btn) => {
    if (!btn.customId.startsWith("value_history_")) return;

    const entries = getItemHistory(item.name, 30);

    if (entries.length === 0) {
      await btn.reply({
        content: `📜 **${item.name}** — No price changes recorded in the last 30 days.\n*History builds up as values change.*`,
        ephemeral: true,
      });
      return;
    }

    // Build chart
    const valuePoints = [];
    for (const entry of entries) {
      let trueVal = null;
      let tradeHub = null;
      let changed = false;
      for (const change of entry.changes) {
        if (change.field === "TrueVal") { trueVal = parseVal(change.after); changed = true; }
        if (change.field === "Trade Hub") { tradeHub = parseVal(change.after); changed = true; }
      }
      if (changed) {
        const date = new Date(entry.timestamp).toLocaleDateString("en-GB", {
          timeZone: "Asia/Jakarta", day: "numeric", month: "short",
        });
        valuePoints.push({ date, trueVal, tradeHub });
      }
    }

    if (valuePoints.length > 0) {
      valuePoints.push({ date: "Now", trueVal: item.trueVal, tradeHub: item.tradeHub });
    }

    const chartUrl = valuePoints.length >= 2
      ? await buildValueChartUrl(item.name, valuePoints)
      : null;

    // Format recent changes (newest first)
    const recentChanges = [...entries].reverse().slice(0, 8).map((entry) => {
      const date = new Date(entry.timestamp).toLocaleString("en-GB", {
        timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const changeStr = entry.changes.map((c) => `${c.field}: ${c.before} → **${c.after}**`).join(" | ");
      return `\`${date}\` ${changeStr}`;
    });

    const histEmbed = new EmbedBuilder()
      .setTitle(`📜 ${item.name} — History (30d)`)
      .setDescription(
        `**${entries.length} changes recorded:**\n\n` +
        recentChanges.join("\n") +
        (entries.length > 8 ? `\n\n*...${entries.length - 8} older changes not shown. Use \`/history item: ${item.name}\` for full view.*` : "")
      )
      .setColor(color)
      .setFooter({ text: "Source: game.guide" });

    if (chartUrl) histEmbed.setImage(chartUrl);

    await btn.reply({ embeds: [histEmbed], ephemeral: true });
  });

  collector.on("end", async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`value_history_${item.name}`)
        .setLabel("📜 View History")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );
    await msg.edit({ components: [disabledRow] }).catch(() => {});
  });
}

/**
 * Parse formatted value string back to number.
 * @param {string} str - Formatted string
 * @returns {number} Numeric value
 */
function parseVal(str) {
  if (!str || str === "N/A") return 0;
  str = str.replace(/\*\*/g, "").replace("S$", "").replace(/,/g, "").trim();
  if (str.includes("M")) return parseFloat(str) * 1000000;
  if (str.includes("K")) return parseFloat(str) * 1000;
  return parseFloat(str) || 0;
}

module.exports = { execute };
