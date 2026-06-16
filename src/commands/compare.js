/**
 * /compare command — Side-by-side comparison of 2-5 items.
 * Shows values, demand, trend, adjusted value, and investment suggestion.
 */

const { EmbedBuilder } = require("discord.js");
const { findItem } = require("../services/matcher");
const { getAdjustedValue } = require("../services/analyzer");
const { forecastItem } = require("../services/forecast");
const { formatVal, trendEmoji } = require("../utils/format");

/**
 * Score an item for investment quality (0-100).
 * Based on: demand, trend, value, and forecast direction.
 * @param {object} item - Item data
 * @param {object|null} forecast - Forecast data (if available)
 * @returns {{score: number, reasons: string[]}}
 */
function scoreItem(item, forecast) {
  let score = 50; // Start neutral
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

  // Value scoring (+/- up to 15) — higher value items are generally better investments
  const val = item.trueVal || item.tradeHub || 0;
  if (val >= 3000000) { score += 15; reasons.push("Ultra-high value"); }
  else if (val >= 1000000) { score += 10; reasons.push("High value"); }
  else if (val >= 500000) { score += 5; }
  else if (val >= 100000) { score += 2; }
  else if (val > 0 && val < 10000) { score -= 5; reasons.push("Low value"); }

  // Proto scoring (+/- up to 10) — higher proto = more community-valued
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

  // Clamp
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

  // Build embed
  const lines = comparisons.map((c, i) => {
    const rank = i === 0 ? "👑" : `${i + 1}.`;
    const forecastStr = c.forecast
      ? `${c.forecast.direction === "Rising" ? "📈" : c.forecast.direction === "Falling" ? "📉" : "➡️"} ${c.forecast.dailyChangePct}%/day`
      : "—";

    return [
      `${rank} **${c.item.name}** — ${c.grade} (${c.score}/100)`,
      `> Value: ${formatVal(c.val.adjusted)} | Demand: ${c.item.demand} | Trend: ${trendEmoji(c.item.trend)} ${c.item.trend}`,
      `> TrueVal: ${formatVal(c.item.trueVal)} | Trade Hub: ${formatVal(c.item.tradeHub)} | Proto: ${c.item.proto || "N/A"}`,
      `> Forecast: ${forecastStr}`,
      `> ${c.reasons.length > 0 ? c.reasons.join(", ") : "Neutral"}`,
    ].join("\n");
  });

  // Investment suggestion
  const best = comparisons[0];
  const worst = comparisons[comparisons.length - 1];
  let suggestion = "";

  if (comparisons.length >= 2) {
    suggestion = `\n━━━━━━━━━━━━━━━━━━━━━━━━\n💡 **SUGGESTION:**\n`;

    if (best.score >= 70) {
      suggestion += `**${best.item.name}** is the best pick — ${best.reasons.join(", ")}.\n`;
    } else {
      suggestion += `No standout winner — all items are moderate.\n`;
    }

    if (worst.score < 40 && comparisons.length > 2) {
      suggestion += `Avoid **${worst.item.name}** — ${worst.reasons.join(", ")}.`;
    }

    // If one is rising and another dropping, suggest swap
    const risingItem = comparisons.find((c) => c.item.trend === "Rising");
    const droppingItem = comparisons.find((c) => c.item.trend === "Dropping");
    if (risingItem && droppingItem && risingItem !== droppingItem) {
      suggestion += `\n💱 Consider trading **${droppingItem.item.name}** for **${risingItem.item.name}** — sell before it drops further.`;
    }
  }

  // Not found warnings
  let notFoundStr = "";
  if (notFound.length > 0) {
    notFoundStr = `\n\n⚠️ Not found: ${notFound.map((n) => `"${n.query}"`).join(", ")}`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 Item Comparison (${comparisons.length} items)`)
    .setDescription(lines.join("\n\n") + suggestion + notFoundStr)
    .setColor(0x1e90ff)
    .setFooter({ text: "Score based on demand + trend + forecast • Higher = better investment" });

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
