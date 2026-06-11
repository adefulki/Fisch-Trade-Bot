/**
 * /history command — Show price chart + change history for an item.
 * Combines chart image with paginated history entries.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { findItem } = require("../services/matcher");
const { getItemHistory, formatVal } = require("../data/history");
const { buildValueChartUrl, buildProtoChartUrl } = require("../services/chart");
const { trendEmoji } = require("../utils/format");

/**
 * Handle the /history slash command interaction.
 * Shows chart + history combined with pagination for long histories.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  const query = interaction.options.getString("item");
  const days = interaction.options.getInteger("days") || 30;
  const item = findItem(query);

  if (!item) {
    await interaction.reply({
      content: `⚠️ Item "${query}" not found. Check spelling and try again.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const entries = getItemHistory(item.name, days);

  // Build chart data points
  const valuePoints = []; // {date, trueVal, tradeHub}
  const valueField = item.trueVal ? "TrueVal" : "Trade Hub";

  for (const entry of entries) {
    const date = new Date(entry.timestamp).toLocaleDateString("en-GB", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
    });

    let trueVal = null;
    let tradeHub = null;
    let changed = false;

    for (const change of entry.changes) {
      if (change.field === "TrueVal") {
        trueVal = parseValueFromFormatted(change.after);
        changed = true;
      }
      if (change.field === "Trade Hub") {
        tradeHub = parseValueFromFormatted(change.after);
        changed = true;
      }
    }

    if (changed) {
      valuePoints.push({ date, trueVal, tradeHub });
    }
  }

  // Add current value as last point
  const currentVal = item.trueVal || item.tradeHub || 0;
  if (currentVal > 0 && valuePoints.length > 0) {
    valuePoints.push({ date: "Now", trueVal: item.trueVal, tradeHub: item.tradeHub });
  }

  // Calculate stats
  let statsText = "";
  if (valuePoints.length >= 2) {
    const trueVals = valuePoints.map((p) => p.trueVal).filter(Boolean);
    const tradeHubs = valuePoints.map((p) => p.tradeHub).filter(Boolean);
    const allVals = [...trueVals, ...tradeHubs];
    if (allVals.length > 0) {
      const high = Math.max(...allVals);
      const low = Math.min(...allVals);
      const main = trueVals.length > 0 ? trueVals : tradeHubs;
      const change = main[main.length - 1] - main[0];
      const changePct = ((change / main[0]) * 100).toFixed(1);
      const changeStr = change >= 0 ? `+${formatVal(change)} (+${changePct}%)` : `${formatVal(change)} (${changePct}%)`;
      statsText = `📊 High: ${formatVal(high)} | Low: ${formatVal(low)} | Change: ${changeStr}`;
    }
  }

  // Generate chart URLs
  const chartUrl = valuePoints.length >= 2 ? buildValueChartUrl(item.name, valuePoints) : null;

  // Build proto data points
  const protoPoints = [];
  for (const entry of entries) {
    for (const change of entry.changes) {
      if (change.field === "Proto") {
        const date = new Date(entry.timestamp).toLocaleDateString("en-GB", {
          timeZone: "Asia/Jakarta", day: "numeric", month: "short",
        });
        protoPoints.push({ date, proto: parseFloat(change.after) || null });
      }
    }
  }
  if (protoPoints.length > 0 && item.proto) {
    protoPoints.push({ date: "Now", proto: item.proto });
  }
  const protoChartUrl = protoPoints.length >= 2 ? buildProtoChartUrl(item.name, protoPoints) : null;

  // Build header info
  const headerLines = [
    `**TrueVal:** ${formatVal(item.trueVal)} | **Trade Hub:** ${formatVal(item.tradeHub)} | **Proto:** ${item.proto || "N/A"}`,
    `**Demand:** ${item.demand} | **Trend:** ${trendEmoji(item.trend)} ${item.trend}`,
  ];
  if (statsText) headerLines.push(``);
  if (statsText) headerLines.push(statsText);

  // Color based on overall trend
  let color = 0x1e90ff;
  if (valuePoints.length >= 2) {
    const trueVals = valuePoints.map((p) => p.trueVal).filter(Boolean);
    const main = trueVals.length > 0 ? trueVals : valuePoints.map((p) => p.tradeHub).filter(Boolean);
    if (main.length >= 2) {
      if (main[main.length - 1] > main[0]) color = 0x00ff00;
      else if (main[main.length - 1] < main[0]) color = 0xff4500;
    }
  }

  // No history case
  if (entries.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle(`📜 ${item.name} — History (${days}d)`)
      .setDescription(
        headerLines.join("\n") + "\n\n" +
        `*No price changes recorded in the last ${days} days.*\n` +
        `*History accumulates as the bot detects value changes every hour.*`
      )
      .setColor(0x808080)
      .setFooter({ text: "Source: game.guide" });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Format history entries (newest first for display)
  const formatted = [...entries].reverse().map((entry) => {
    const date = new Date(entry.timestamp).toLocaleString("en-GB", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const changeStr = entry.changes
      .map((c) => `${c.field}: ${c.before} → **${c.after}**`)
      .join(" | ");
    return `\`${date}\` ${changeStr}`;
  });

  // Build pages
  const perPage = 8;
  const pages = [];
  for (let i = 0; i < formatted.length; i += perPage) {
    pages.push(formatted.slice(i, i + perPage).join("\n"));
  }

  let currentPage = 0;

  /**
   * Build embed for the current page.
   */
  function buildEmbed() {
    const desc = headerLines.join("\n") + "\n\n" +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 **${entries.length} changes recorded:**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      pages[currentPage];

    const embed = new EmbedBuilder()
      .setTitle(`📜 ${item.name} — History (${days}d)`)
      .setDescription(desc)
      .setColor(color)
      .setFooter({ text: `Page ${currentPage + 1}/${pages.length} • Source: game.guide` });

    if (chartUrl) embed.setImage(chartUrl);

    return embed;
  }

  /**
   * Build all embeds for current page (main + optional proto chart).
   */
  function buildEmbeds() {
    const embeds = [buildEmbed()];
    if (protoChartUrl) {
      embeds.push(
        new EmbedBuilder()
          .setTitle(`🪙 ${item.name} — Proto Chart (${days}d)`)
          .setImage(protoChartUrl)
          .setColor(0xffd700)
      );
    }
    return embeds;
  }

  // If single page, no buttons needed
  if (pages.length === 1) {
    await interaction.editReply({ embeds: buildEmbeds() });
    return;
  }

  /**
   * Build navigation buttons.
   */
  function buildButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("hist_prev").setLabel("◀ Prev").setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
      new ButtonBuilder().setCustomId("hist_next").setLabel("Next ▶").setStyle(ButtonStyle.Primary).setDisabled(currentPage === pages.length - 1),
    );
  }

  const msg = await interaction.editReply({ embeds: buildEmbeds(), components: [buildButtons()] });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (btn) => {
    if (btn.customId === "hist_prev") currentPage = Math.max(0, currentPage - 1);
    if (btn.customId === "hist_next") currentPage = Math.min(pages.length - 1, currentPage + 1);
    await btn.update({ embeds: buildEmbeds(), components: [buildButtons()] });
  });

  collector.on("end", async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("hist_prev").setLabel("◀ Prev").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("hist_next").setLabel("Next ▶").setStyle(ButtonStyle.Primary).setDisabled(true),
    );
    await msg.edit({ components: [disabledRow] }).catch(() => {});
  });
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
