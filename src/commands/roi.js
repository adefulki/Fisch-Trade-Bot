/**
 * /roi command — Show top items by Return on Investment.
 * ROI = (marketValue or trueVal) / cost in Robux.
 * Displays top 10 items sorted by ROI, value, or cost.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { getItems } = require("../services/matcher");
const { getSmartValue } = require("../services/analyzer");
const { formatVal } = require("../utils/format");

const PER_PAGE = 10;

/** Demand emoji mapping */
const DEMAND_EMOJI = {
  "Limited": "🔒",
  "Very High": "🔥",
  "High": "📈",
  "Medium": "➡️",
  "Low": "📉",
  "Very Low": "❄️",
  "-": "❓",
};

/**
 * Handle the /roi slash command interaction.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database (passed from bot.js)
 */
async function execute(interaction, items) {
  await interaction.deferReply();

  const sortBy = interaction.options.getString("sort") || "roi";
  const allItems = items || getItems();

  // Filter items that have cost data and a calculable value
  const roiItems = allItems
    .filter((item) => {
      if (!item.cost || item.cost <= 0) return false;
      const smart = getSmartValue(item);
      return smart.value > 0;
    })
    .map((item) => {
      const smart = getSmartValue(item);
      const roi = smart.value / item.cost;
      return {
        name: item.name,
        cost: item.cost,
        value: smart.value,
        valueSource: smart.source,
        roi,
        soldRate: item.soldRate,
        demand: item.demand || "-",
      };
    });

  if (roiItems.length === 0) {
    await interaction.editReply("⚠️ No items with both cost and value data found. Market data may not be loaded yet.");
    return;
  }

  // Sort based on option
  switch (sortBy) {
    case "value":
      roiItems.sort((a, b) => b.value - a.value);
      break;
    case "cost":
      roiItems.sort((a, b) => a.cost - b.cost);
      break;
    case "roi":
    default:
      roiItems.sort((a, b) => b.roi - a.roi);
      break;
  }

  const sorted = roiItems.slice(0, 50); // Cap at 50 for pagination
  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  let currentPage = 0;

  const SORT_LABELS = { roi: "ROI Multiplier", value: "Current Value", cost: "Robux Cost" };

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
      const demandIcon = DEMAND_EMOJI[item.demand] || "❓";
      const soldStr = item.soldRate !== null && item.soldRate !== undefined ? `${item.soldRate}%` : "N/A";
      return [
        `${medal} **${item.name}**`,
        `> 💎 Cost: ${item.cost.toLocaleString()} R$ | 💰 Value: ${formatVal(item.value)}`,
        `> 📊 ROI: **${item.roi.toFixed(1)}x** | ${demandIcon} ${item.demand} | Sold: ${soldStr}`,
      ].join("\n");
    });

    return new EmbedBuilder()
      .setTitle(`📈 TOP ROI — Sorted by ${SORT_LABELS[sortBy]}`)
      .setDescription(lines.join("\n\n"))
      .setColor(0x00ff88)
      .setFooter({ text: `Page ${currentPage + 1}/${totalPages} • ${sorted.length} items with ROI data` });
  }

  /**
   * Build navigation buttons.
   */
  function buildButtons() {
    if (totalPages <= 1) return null;
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("roi_prev").setLabel("◀").setStyle(ButtonStyle.Primary).setDisabled(currentPage === 0),
      new ButtonBuilder().setCustomId("roi_page").setLabel(`${currentPage + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("roi_next").setLabel("▶").setStyle(ButtonStyle.Primary).setDisabled(currentPage === totalPages - 1),
    );
  }

  const components = buildButtons() ? [buildButtons()] : [];
  const msg = await interaction.editReply({ embeds: [buildEmbed()], components });

  if (totalPages <= 1) return;

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 180000,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (btn) => {
    switch (btn.customId) {
      case "roi_prev": currentPage = Math.max(0, currentPage - 1); break;
      case "roi_next": currentPage = Math.min(totalPages - 1, currentPage + 1); break;
    }
    await btn.update({ embeds: [buildEmbed()], components: [buildButtons()] });
  });

  collector.on("end", async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("roi_prev").setLabel("◀").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("roi_page").setLabel(`${currentPage + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("roi_next").setLabel("▶").setStyle(ButtonStyle.Primary).setDisabled(true),
    );
    await msg.edit({ components: [disabledRow] }).catch(() => {});
  });
}

module.exports = { execute };
