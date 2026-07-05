/**
 * /compare command — Side-by-side comparison of 2-5 items.
 * Shows values, demand, trend, adjusted value, investment score,
 * value differences, and value-per-score efficiency.
 */

const { EmbedBuilder } = require("discord.js");
const { findItem } = require("../services/matcher");
const { getAdjustedValue } = require("../services/analyzer");
const { forecastItem } = require("../services/forecast");
const { formatVal, trendEmoji } = require("../utils/format");

/**
 * Score an item for investment quality (0-100).
 * Based on: demand, trend, value, proto, and forecast direction.
 * @param {object} item - Item data
 * @param {object|null} forecast - Forecast data (if available)
 * @returns {{score: number, reasons: string[]}}
 */
function scoreItem(item, forecast) {
  let score = 50;
  const reasons = [];

  // Demand scoring (+/- up to 20)
  if (item.demand === "Limited") { score += 20; reasons.push("Limited rarity"); }
  else if (item.demand === "Very High") { score += 18; reasons.push("Very High demand"); }
  else if (item.demand === "High") { score += 15; reasons.push("High demand"); }
  else if (item.demand === "Medium") { score += 0; }
  else if (item.demand === "Low") { score -= 10; reasons.push("Low demand"); }
  else if (item.demand === "Very Low") { score -= 20; reasons.push("Very low demand"); }

  // Trend scoring (+/- up to 20)
  if (item.trend === "Rising") { score += 20; reasons.push("Rising trend"); }
  else if (item.trend === "Stable") { score += 5; }
  else if (item.trend === "Dropping") { score -= 15; reasons.push("Dropping"); }
  else if (item.trend === "Unstable") { score -= 10; reasons.push("Unstable"); }

  // Value scoring (+/- up to 15)
  const val = item.trueVal || item.tradeHub || 0;
  if (val >= 3000000) { score += 15; reasons.push("Ultra-high value"); }
  else if (val >= 1000000) { score += 10; reasons.push("High value"); }
  else if (val >= 500000) { score += 5; }
  else if (val >= 100000) { score += 2; }
  else if (val > 0 && val < 10000) { score -= 5; reasons.push("Low value"); }

  // Proto scoring (+/- up to 10)
  const proto = item.proto || 0;
  if (proto >= 1000) { score += 10; reasons.push("Ultra-high proto"); }
  else if (proto >= 500) { score += 7; }
  else if (proto >= 100) { score += 4; }
  else if (proto >= 50) { score += 2; }
  else if (proto > 0 && proto < 10) { score -= 3; }

  // Forecast scoring (+/- up to 15)
  if (forecast) {
    if (forecast.direction === "Rising" && forecast.confidence !== "Low") {
      score += 15; reasons.push("Forecast: rising");
    } else if (forecast.direction === "Falling") {
      score -= 10; reasons.push("Forecast: falling");
    }
  }

  // Value presence scoring
  if (item.trueVal && item.tradeHub) { score += 3; }
  else if (!item.trueVal && !item.tradeHub) { score -= 5; reasons.push("No listed value"); }

  score = Math.max(0, Math.min(100, score));
  return { score, reasons };
}

/**
 * Get a letter grade from score.
 * @param {number} score - 0-100 score
 * @returns {string} Letter grade with emoji
 */
function getGrade(score) {
  if (score >= 85) return "🟢 S";
  if (score >= 70) return "🟢 A";
  if (score >= 55) return "🟡 B";
  if (score >= 40) return "🟡 C";
  if (score >= 25) return "🔴 D";
  return "🔴 F";
}

/**
 * Determine if an item is overpriced or underpriced based on value-per-score.
 * @param {number} adjustedValue - Item's adjusted value
 * @param {number} score - Item's investment score
 * @param {number} avgCostPerPoint - Average cost per score point across compared items
 * @returns {{label: string, emoji: string}}
 */
function getPriceEfficiency(adjustedValue, score, avgCostPerPoint) {
  if (score === 0 || adjustedValue === 0) return { label: "No data", emoji: "❓" };
  const costPerPoint = adjustedValue / score;
  const ratio = costPerPoint / avgCostPerPoint;

  if (ratio <= 0.6) return { label: "Underpriced", emoji: "💎" };
  if (ratio <= 0.85) return { label: "Good value", emoji: "✅" };
  if (ratio <= 1.15) return { label: "Fair price", emoji: "➡️" };
  if (ratio <= 1.4) return { label: "Pricey", emoji: "⚠️" };
  return { label: "Overpriced", emoji: "🔴" };
}

/**
 * Handle the /compare slash command interaction.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  await interaction.deferReply();

  const input = interaction.options.getString("items");
  const names = input.split(",").map((s) => s.trim()).filter(Boolean);

  if (names.length < 2) {
    await interaction.editReply("⚠️ Please provide at least 2 items to compare (comma-separated).");
    return;
  }

  if (names.length > 5) {
    await interaction.editReply("⚠️ Maximum 5 items can be compared at once.");
    return;
  }

  // Look up items
  const itemsData = names.map((name) => {
    const item = findItem(name);
    return { query: name, item };
  });

  const notFound = itemsData.filter((d) => !d.item);
  if (notFound.length === itemsData.length) {
    await interaction.editReply("⚠️ Could not find any of those items. Check spelling.");
    return;
  }

  // Build comparison data
  const comparisons = itemsData
    .filter((d) => d.item)
    .map((d) => {
      const item = d.item;
      const val = getAdjustedValue(item);
      const forecast = forecastItem(item, 14, 7);
      const { score, reasons } = scoreItem(item, forecast);
      return { item, val, forecast, score, reasons, grade: getGrade(score) };
    });

  // Sort by score (best first)
  comparisons.sort((a, b) => b.score - a.score);

  // Calculate value comparison metrics
  const adjustedValues = comparisons.map((c) => c.val.adjusted).filter((v) => v > 0);
  const highestValue = Math.max(...adjustedValues, 0);
  const lowestValue = Math.min(...adjustedValues.filter((v) => v > 0), Infinity);
  const avgValue = adjustedValues.length > 0 ? adjustedValues.reduce((a, b) => a + b, 0) / adjustedValues.length : 0;

  // Calculate cost-per-score-point for efficiency comparison
  const validForEfficiency = comparisons.filter((c) => c.val.adjusted > 0 && c.score > 0);
  const avgCostPerPoint = validForEfficiency.length > 0
    ? validForEfficiency.reduce((sum, c) => sum + (c.val.adjusted / c.score), 0) / validForEfficiency.length
    : 0;

  // Build embed lines
  const lines = comparisons.map((c, i) => {
    const rank = i === 0 ? "👑" : `${i + 1}.`;
    const forecastStr = c.forecast
      ? `${c.forecast.direction === "Rising" ? "📈" : c.forecast.direction === "Falling" ? "📉" : "➡️"} ${c.forecast.dailyChangePct}%/day`
      : "—";

    // Value difference from highest
    let valueDiffStr = "";
    if (c.val.adjusted > 0 && highestValue > 0 && c.val.adjusted !== highestValue) {
      const diff = highestValue - c.val.adjusted;
      const pct = ((diff / highestValue) * 100).toFixed(0);
      valueDiffStr = ` (-${pct}% from top)`;
    } else if (c.val.adjusted === highestValue && adjustedValues.length > 1) {
      valueDiffStr = " 👆 Highest";
    }

    // Price efficiency
    const efficiency = avgCostPerPoint > 0
      ? getPriceEfficiency(c.val.adjusted, c.score, avgCostPerPoint)
      : { label: "", emoji: "" };
    const effStr = efficiency.label ? ` | ${efficiency.emoji} ${efficiency.label}` : "";

    return [
      `${rank} **${c.item.name}** — ${c.grade} (${c.score}/100)`,
      `> 💰 Adjusted: **${formatVal(c.val.adjusted)}**${valueDiffStr}`,
      `> TrueVal: ${formatVal(c.item.trueVal)} | Trade Hub: ${formatVal(c.item.tradeHub)} | Proto: ${c.item.proto || "N/A"}`,
      `> Demand: ${c.item.demand} | Trend: ${trendEmoji(c.item.trend)} ${c.item.trend} | Forecast: ${forecastStr}`,
      `> ${c.reasons.length > 0 ? c.reasons.join(", ") : "Neutral"}${effStr}`,
    ].join("\n");
  });

  // ─── Value Comparison Section ───
  let valueSection = "\n━━━━━━━━━━━━━━━━━━━━━━━━\n📊 **VALUE COMPARISON:**\n";

  if (comparisons.length === 2) {
    // Direct 1v1 comparison
    const a = comparisons[0];
    const b = comparisons[1];
    const aVal = a.val.adjusted;
    const bVal = b.val.adjusted;

    if (aVal > 0 && bVal > 0) {
      const diff = Math.abs(aVal - bVal);
      const higher = aVal >= bVal ? a : b;
      const lower = aVal >= bVal ? b : a;
      const pct = ((diff / lower.val.adjusted) * 100).toFixed(0);

      valueSection += `**${higher.item.name}** is worth **${formatVal(diff)}** more than **${lower.item.name}** (+${pct}%)\n`;

      // Trade fairness: would a 1:1 trade be fair?
      if (diff === 0) {
        valueSection += `🟡 A 1:1 trade would be **perfectly fair** in value.\n`;
      } else {
        const fairRatio = (aVal / bVal).toFixed(2);
        if (diff < avgValue * 0.15) {
          valueSection += `🟡 Close enough for a **fair 1:1 trade** (${pct}% gap).\n`;
        } else {
          valueSection += `⚠️ Value gap too large for 1:1. Ratio: **${fairRatio}:1**\n`;
          valueSection += `💡 ${lower.item.name} holder should add ~**${formatVal(diff)}** to balance.\n`;
        }
      }
    }
  } else {
    // Multi-item value spread
    if (highestValue > 0 && lowestValue < Infinity) {
      const spread = highestValue - lowestValue;
      const spreadPct = ((spread / avgValue) * 100).toFixed(0);
      valueSection += `Value range: ${formatVal(lowestValue)} → ${formatVal(highestValue)} (spread: ${formatVal(spread)}, ${spreadPct}%)\n`;
    }
  }

  // ─── Investment Suggestion ───
  let suggestion = "\n━━━━━━━━━━━━━━━━━━━━━━━━\n💡 **SUGGESTION:**\n";

  const best = comparisons[0];
  const worst = comparisons[comparisons.length - 1];

  // Best value-for-score item
  const bestEfficiency = validForEfficiency.length > 0
    ? validForEfficiency.reduce((best, c) => {
        const eff = c.val.adjusted / c.score;
        const bestEff = best.val.adjusted / best.score;
        return eff < bestEff ? c : best;
      })
    : null;

  if (best.score >= 70) {
    suggestion += `**${best.item.name}** is the best pick — ${best.reasons.join(", ")}.\n`;
  } else {
    suggestion += `No standout winner — all items are moderate.\n`;
  }

  // Highlight best value-for-money if different from best score
  if (bestEfficiency && bestEfficiency.item.name !== best.item.name && bestEfficiency.score >= 40) {
    suggestion += `💎 **${bestEfficiency.item.name}** offers the best value for its quality (underpriced relative to score).\n`;
  }

  if (worst.score < 40 && comparisons.length > 2) {
    suggestion += `🚫 Avoid **${worst.item.name}** — ${worst.reasons.join(", ")}.\n`;
  }

  // Swap suggestion
  const risingItem = comparisons.find((c) => c.item.trend === "Rising");
  const droppingItem = comparisons.find((c) => c.item.trend === "Dropping");
  if (risingItem && droppingItem && risingItem !== droppingItem) {
    suggestion += `💱 Trade **${droppingItem.item.name}** for **${risingItem.item.name}** — sell before it drops further.`;
  }

  // Not found warnings
  let notFoundStr = "";
  if (notFound.length > 0) {
    notFoundStr = `\n\n⚠️ Not found: ${notFound.map((n) => `"${n.query}"`).join(", ")}`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 Item Comparison (${comparisons.length} items)`)
    .setDescription(lines.join("\n\n") + valueSection + suggestion + notFoundStr)
    .setColor(0x1e90ff)
    .setFooter({ text: "Score = demand + trend + value + forecast | 💎 = underpriced for quality" });

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
