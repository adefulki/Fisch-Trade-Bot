/**
 * /top command — Show top 100 items sorted by investment grade.
 * Shows all values (TrueVal, Trade Hub, Proto, Demand, Trend) with pagination.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { getAdjustedValue } = require("../services/analyzer");
const { forecastItem } = require("../services/forecast");
const { formatVal, trendEmoji } = require("../utils/format");

const PER_PAGE = 5;
const MAX_ITEMS = 100;

/**
 * Score an item for investment quality (0-100).
 * Same logic as /compare.
 * @param {object} item - Item data
 * @returns {{score: number, grade: string}}
 */
function scoreItem(item) {
  let score = 50;

  // Demand
  if (item.demand === "Limited") score += 20;
  else if (item.demand === "High") score += 15;
  else if (item.demand === "Low") score -= 10;
  else if (item.demand === "Very Low") score -= 20;

  // Trend
  if (item.trend === "Rising") score += 20;
  else if (item.trend === "Stable") score += 5;
  else if (item.trend === "Dropping") score -= 15;
  else if (item.trend === "Unstable") score -= 10;

  // Value presence
  if (item.trueVal && item.tradeHub) score += 5;
  else if (!item.trueVal && !item.tradeHub) score -= 5;

  // Forecast bonus (quick check)
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
 * Handle the /top slash command interaction.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database
 */
async function execute(interaction, items) {
  await interaction.deferReply();

  // Score and sort all items with values
  const scored = items
    .filter((item) => item.trueVal || item.tradeHub || (item.proto && item.proto > 0))
    .map((item) => {
      const { score, grade } = scoreItem(item);
      const val = getAdjustedValue(item);
      return { ...item, score, grade, adjustedValue: val.adjusted };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ITEMS);

  if (scored.length === 0) {
    await interaction.editReply("⚠️ No items with values found.");
    return;
  }

  const totalPages = Math.ceil(scored.length / PER_PAGE);
  let currentPage = 0;

  /**
   * Build embed for the current page.
   */
  function buildEmbed() {
    const start = currentPage * PER_PAGE;
    const end = Math.min(start + PER_PAGE, scored.length);
    const pageItems = scored.slice(start, end);

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
      .setTitle(`🏆 TOP ${scored.length} ITEMS (by Investment Grade)`)
      .setDescription(lines.join("\n\n"))
      .setColor(0xffd700)
      .setFooter({ text: `Page ${currentPage + 1}/${totalPages} • Sorted by score (demand + trend + forecast) • Source: game.guide` });
  }

  /**
   * Build navigation buttons.
   */
  function buildButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("top_first")
        .setLabel("⏮")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("top_prev")
        .setLabel("◀")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("top_page")
        .setLabel(`${currentPage + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("top_next")
        .setLabel("▶")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages - 1),
      new ButtonBuilder()
        .setCustomId("top_last")
        .setLabel("⏭")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages - 1),
    );
  }

  const msg = await interaction.editReply({ embeds: [buildEmbed()], components: [buildButtons()] });

  // Collect button interactions for 3 minutes
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
