/**
 * /top command — Show top 100 items with configurable sort.
 * Shows all values (TrueVal, Trade Hub, Proto, Demand, Trend) with pagination.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { getAdjustedValue } = require("../services/analyzer");
const { forecastItem } = require("../services/forecast");
const { formatVal, trendEmoji } = require("../utils/format");

const PER_PAGE = 5;
const MAX_ITEMS = 100;

/** Sort option labels for embed title */
const SORT_LABELS = {
  grade: "Investment Grade",
  trueval: "TrueVal",
  tradehub: "Trade Hub",
  proto: "Proto",
  demand: "Demand",
  rising: "Rising Trend",
  dropping: "Dropping Trend",
};

/** Demand order for sorting (highest first) */
const DEMAND_ORDER = { "Limited": 6, "Very High": 5, "High": 4, "Medium": 3, "Low": 2, "Very Low": 1, "-": 0 };

/**
 * Score an item for investment quality (0-100).
 * @param {object} item - Item data
 * @returns {{score: number, grade: string}}
 */
function scoreItem(item) {
  let score = 50;

  // Demand
  if (item.demand === "Limited") score += 20;
  else if (item.demand === "Very High") score += 18;
  else if (item.demand === "High") score += 15;
  else if (item.demand === "Low") score -= 10;
  else if (item.demand === "Very Low") score -= 20;

  // Trend
  if (item.trend === "Rising") score += 20;
  else if (item.trend === "Stable") score += 5;
  else if (item.trend === "Dropping") score -= 15;
  else if (item.trend === "Unstable") score -= 10;

  // Value
  const val = item.trueVal || item.tradeHub || 0;
  if (val >= 3000000) score += 15;
  else if (val >= 1000000) score += 10;
  else if (val >= 500000) score += 5;
  else if (val >= 100000) score += 2;
  else if (val > 0 && val < 10000) score -= 5;

  // Proto
  const proto = item.proto || 0;
  if (proto >= 1000) score += 10;
  else if (proto >= 500) score += 7;
  else if (proto >= 100) score += 4;
  else if (proto >= 50) score += 2;
  else if (proto > 0 && proto < 10) score -= 3;

  // Value presence
  if (item.trueVal && item.tradeHub) score += 3;
  else if (!item.trueVal && !item.tradeHub) score -= 5;

  // Forecast
  const forecast = forecastItem(item, 14, 3);
  if (forecast) {
    if (forecast.direction === "Rising" && forecast.confidence !== "Low") score += 10;
    else if (forecast.direction === "Falling") score -= 8;
  }

  score = Math.max(0, Math.min(100, score));

  let grade;
  if (score >= 85) grade = "🟢 S";
  else if (score >= 70) grade = "🟢 A";
  else if (score >= 55) grade = "🟡 B";
  else if (score >= 40) grade = "🟡 C";
  else if (score >= 25) grade = "🔴 D";
  else grade = "🔴 F";

  return { score, grade };
}

/**
 * Sort items based on the selected sort option.
 * @param {Array} items - Items to sort
 * @param {string} sortBy - Sort option
 * @returns {Array} Sorted items (with score/grade attached)
 */
function sortItems(items, sortBy) {
  // Filter items that have at least some value
  let filtered = items.filter((item) => item.trueVal || item.tradeHub || (item.proto && item.proto > 0));

  // Attach score/grade to all items (needed for display)
  filtered = filtered.map((item) => {
    const { score, grade } = scoreItem(item);
    const val = getAdjustedValue(item);
    return { ...item, score, grade, adjustedValue: val.adjusted };
  });

  switch (sortBy) {
    case "trueval":
      return filtered.filter((i) => i.trueVal > 0).sort((a, b) => b.trueVal - a.trueVal);
    case "tradehub":
      return filtered.filter((i) => i.tradeHub > 0).sort((a, b) => b.tradeHub - a.tradeHub);
    case "proto":
      return filtered.filter((i) => i.proto > 0).sort((a, b) => b.proto - a.proto);
    case "demand":
      return filtered.sort((a, b) => {
        const diff = (DEMAND_ORDER[b.demand] || 0) - (DEMAND_ORDER[a.demand] || 0);
        if (diff !== 0) return diff;
        return (b.trueVal || 0) - (a.trueVal || 0); // Secondary sort by value
      });
    case "rising":
      return filtered
        .filter((i) => i.trend === "Rising")
        .sort((a, b) => (b.trueVal || 0) - (a.trueVal || 0));
    case "dropping":
      return filtered
        .filter((i) => i.trend === "Dropping")
        .sort((a, b) => (b.trueVal || 0) - (a.trueVal || 0));
    case "grade":
    default:
      return filtered.sort((a, b) => b.score - a.score);
  }
}

/**
 * Handle the /top slash command interaction.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database
 */
async function execute(interaction, items) {
  await interaction.deferReply();

  const sortBy = interaction.options.getString("sort") || "grade";
  const sorted = sortItems(items, sortBy).slice(0, MAX_ITEMS);

  if (sorted.length === 0) {
    await interaction.editReply(`⚠️ No items found for sort: **${SORT_LABELS[sortBy] || sortBy}**.`);
    return;
  }

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  let currentPage = 0;

  /**
   * Build embed for the current page.
   */
  function buildEmbed() {
    const start = currentPage * PER_PAGE;
    const end = Math.min(start + PER_PAGE, sorted.length);
    const pageItems = sorted.slice(start, end);

    const lines = pageItems.map((item, i) => {
      const rank = start + i + 1;
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `**#${rank}**`;
      return [
        `${medal} **${item.name}** — ${item.grade} (${item.score}/100)`,
        `> TrueVal: ${formatVal(item.trueVal)} | Trade Hub: ${formatVal(item.tradeHub)} | Proto: ${item.proto || "N/A"}`,
        `> Demand: ${item.demand} | Trend: ${trendEmoji(item.trend)} ${item.trend} | Adj: ${formatVal(item.adjustedValue)}`,
      ].join("\n");
    });

    return new EmbedBuilder()
      .setTitle(`🏆 TOP ${sorted.length} — Sorted by ${SORT_LABELS[sortBy] || sortBy}`)
      .setDescription(lines.join("\n\n"))
      .setColor(0xffd700)
      .setFooter({ text: `Page ${currentPage + 1}/${totalPages} • Source: game.guide` });
  }

  /**
   * Build navigation buttons.
   */
  function buildButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("top_first").setLabel("⏮").setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
      new ButtonBuilder().setCustomId("top_prev").setLabel("◀").setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
      new ButtonBuilder().setCustomId("top_page").setLabel(`${currentPage + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("top_next").setLabel("▶").setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalPages - 1),
      new ButtonBuilder().setCustomId("top_last").setLabel("⏭").setStyle(ButtonStyle.Secondary).setDisabled(currentPage === totalPages - 1),
    );
  }

  const msg = await interaction.editReply({ embeds: [buildEmbed()], components: [buildButtons()] });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 180000,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (btn) => {
    switch (btn.customId) {
      case "top_first": currentPage = 0; break;
      case "top_prev": currentPage = Math.max(0, currentPage - 1); break;
      case "top_next": currentPage = Math.min(totalPages - 1, currentPage + 1); break;
      case "top_last": currentPage = totalPages - 1; break;
    }
    await btn.update({ embeds: [buildEmbed()], components: [buildButtons()] });
  });

  collector.on("end", async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("top_first").setLabel("⏮").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("top_prev").setLabel("◀").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("top_page").setLabel(`${currentPage + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("top_next").setLabel("▶").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("top_last").setLabel("⏭").setStyle(ButtonStyle.Secondary).setDisabled(true),
    );
    await msg.edit({ components: [disabledRow] }).catch(() => {});
  });
}

module.exports = { execute };
