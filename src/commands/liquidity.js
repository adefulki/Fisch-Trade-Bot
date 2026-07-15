/**
 * /liquidity command — Show items ranked by how easy they are to sell.
 * Liquidity score calculated from: tradeCount, soldRate, and demand level.
 * Displays top 15 most liquid items and bottom 5 least liquid.
 */

const { EmbedBuilder } = require("discord.js");
const { getItems } = require("../services/matcher");
const { getSmartValue } = require("../services/analyzer");
const { formatVal } = require("../utils/format");

/** Demand weight for liquidity scoring */
const DEMAND_WEIGHT = {
  "Limited": 90,
  "Very High": 85,
  "High": 70,
  "Medium": 50,
  "Low": 25,
  "Very Low": 10,
  "-": 0,
};

/**
 * Calculate a liquidity score for an item (0-100).
 * Higher = easier to sell.
 * @param {object} item - Item data
 * @returns {number} Liquidity score
 */
function calculateLiquidity(item) {
  let score = 0;

  // Trade count component (0-40 points) — more trades = more liquid
  if (item.tradeCount && item.tradeCount > 0) {
    // 200+ trades = max score, logarithmic scale
    const tradeScore = Math.min(40, (Math.log10(item.tradeCount) / Math.log10(200)) * 40);
    score += tradeScore;
  }

  // Sold rate component (0-35 points) — higher sold rate = more liquid
  if (item.soldRate !== null && item.soldRate !== undefined) {
    score += (item.soldRate / 100) * 35;
  }

  // Demand component (0-25 points)
  score += (DEMAND_WEIGHT[item.demand] || 0) * 0.25;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Get liquidity grade emoji + label.
 * @param {number} score - Liquidity score (0-100)
 * @returns {string} Grade string
 */
function getLiquidityGrade(score) {
  if (score >= 80) return "🟢 Very Liquid";
  if (score >= 60) return "🟢 Liquid";
  if (score >= 40) return "🟡 Moderate";
  if (score >= 20) return "🟠 Low Liquidity";
  return "🔴 Illiquid";
}

/**
 * Handle the /liquidity slash command interaction.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database (passed from bot.js)
 */
async function execute(interaction, items) {
  await interaction.deferReply();

  const allItems = items || getItems();

  // Filter items that have at least some liquidity data
  const scoredItems = allItems
    .filter((item) => {
      // Must have at least one of: tradeCount, soldRate, or demand != "-"
      return (item.tradeCount && item.tradeCount > 0) ||
        (item.soldRate !== null && item.soldRate !== undefined) ||
        (item.demand && item.demand !== "-");
    })
    .map((item) => {
      const score = calculateLiquidity(item);
      const smart = getSmartValue(item);
      return {
        name: item.name,
        score,
        grade: getLiquidityGrade(score),
        tradeCount: item.tradeCount || 0,
        soldRate: item.soldRate,
        demand: item.demand || "-",
        value: smart.value,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (scoredItems.length === 0) {
    await interaction.editReply("⚠️ No items with liquidity data found. Market data may not be loaded yet.");
    return;
  }

  const embeds = [];

  // Top 15 most liquid
  const top15 = scoredItems.slice(0, 15);
  const topLines = top15.map((item, i) => {
    const rank = i + 1;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `**#${rank}**`;
    const soldStr = item.soldRate !== null && item.soldRate !== undefined ? `${item.soldRate}%` : "N/A";
    const tradeStr = item.tradeCount > 0 ? item.tradeCount.toLocaleString() : "N/A";
    return `${medal} **${item.name}** — Score: **${item.score}**/100\n> ${item.grade} | Trades: ${tradeStr} | Sold: ${soldStr} | Demand: ${item.demand} | ${formatVal(item.value)}`;
  });

  embeds.push(
    new EmbedBuilder()
      .setTitle("💧 LIQUIDITY RANKINGS — Easiest to Sell")
      .setDescription(topLines.join("\n\n"))
      .setColor(0x00bfff)
  );

  // Bottom 5 least liquid (only if we have enough items)
  if (scoredItems.length > 15) {
    const bottom5 = scoredItems.slice(-5).reverse();
    const bottomLines = bottom5.map((item) => {
      const soldStr = item.soldRate !== null && item.soldRate !== undefined ? `${item.soldRate}%` : "N/A";
      const tradeStr = item.tradeCount > 0 ? item.tradeCount.toLocaleString() : "N/A";
      return `❌ **${item.name}** — Score: **${item.score}**/100\n> ${item.grade} | Trades: ${tradeStr} | Sold: ${soldStr} | Demand: ${item.demand}`;
    });

    embeds.push(
      new EmbedBuilder()
        .setTitle("🧊 HARDEST TO SELL")
        .setDescription(bottomLines.join("\n\n"))
        .setColor(0xff4500)
        .setFooter({ text: "Source: game.guide • Liquidity = tradeCount + soldRate + demand" })
    );
  } else {
    embeds[0].setFooter({ text: "Source: game.guide • Liquidity = tradeCount + soldRate + demand" });
  }

  await interaction.editReply({ embeds });
}

module.exports = { execute };
