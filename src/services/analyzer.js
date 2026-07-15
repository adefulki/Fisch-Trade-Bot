/**
 * Local trade analyzer.
 * Calculates adjusted values using demand/trend multipliers and generates trade verdicts.
 */

const { DEMAND_MULTIPLIER, TREND_MULTIPLIER } = require("../utils/constants");
const { formatVal, trendEmoji } = require("../utils/format");

/**
 * Calculate the adjusted value for a single item based on its metrics.
 * Priority: TrueVal > Trade Hub > Proto estimate.
 * @param {object} item - Item object with trueVal, tradeHub, proto, demand, trend
 * @returns {{value: number, source: string, adjusted: number}} Base value, source label, and adjusted value
 */
function getAdjustedValue(item) {
  if (!item) return { value: 0, source: "Unknown", adjusted: 0 };

  let baseValue = 0;
  let source = "";

  if (item.trueVal && item.trueVal > 0) {
    baseValue = item.trueVal;
    source = "TrueVal";
  } else if (item.tradeHub && item.tradeHub > 0) {
    baseValue = item.tradeHub;
    source = "Trade Hub";
  } else if (item.proto && item.proto > 0) {
    const demandKey = item.demand || "Medium";
    const protoMultiplier =
      demandKey === "Very High" || demandKey === "High" || demandKey === "Limited" ? 2500 :
      demandKey === "Medium" ? 2000 : 1500;
    baseValue = item.proto * protoMultiplier;
    source = "Proto (est.)";
  } else {
    return { value: 0, source: "No data", adjusted: 0 };
  }

  const demandMult = DEMAND_MULTIPLIER[item.demand] || 1.0;
  const trendMult = TREND_MULTIPLIER[item.trend] || 1.0;
  const adjusted = Math.round(baseValue * demandMult * trendMult);

  return { value: baseValue, source, adjusted };
}

/**
 * Get the smartest available value for an item considering market data.
 * Priority: marketValue (if available and tradeCount > 50) > TrueVal > Trade Hub > Proto estimate.
 * This reflects real community trading prices when sufficient data exists.
 * @param {object} item - Item object with trueVal, tradeHub, proto, demand, trend, marketValue, tradeCount
 * @returns {{value: number, source: string, adjusted: number}} Base value, source label, and adjusted value
 */
function getSmartValue(item) {
  if (!item) return { value: 0, source: "Unknown", adjusted: 0 };

  // Prefer marketValue when available with sufficient trade volume
  if (item.marketValue && item.marketValue > 0 && item.tradeCount && item.tradeCount > 50) {
    const demandMult = DEMAND_MULTIPLIER[item.demand] || 1.0;
    const trendMult = TREND_MULTIPLIER[item.trend] || 1.0;
    const adjusted = Math.round(item.marketValue * demandMult * trendMult);
    return { value: item.marketValue, source: "Market Value", adjusted };
  }

  // Fall back to standard getAdjustedValue logic
  return getAdjustedValue(item);
}

/**
 * Determine the trade verdict based on total values of both sides.
 * @param {number} leftTotal - Total adjusted value of user's offer
 * @param {number} rightTotal - Total adjusted value of their offer
 * @returns {{verdict: string, emoji: string}} Verdict label and emoji
 */
function getVerdict(leftTotal, rightTotal) {
  if (leftTotal === 0 && rightTotal === 0) return { verdict: "FAIR", emoji: "🟡" };
  const diff = rightTotal - leftTotal;
  const avg = (leftTotal + rightTotal) / 2;
  if (avg === 0) return { verdict: "FAIR", emoji: "🟡" };
  const pct = (diff / avg) * 100;

  if (pct > 40) return { verdict: "BIG WIN", emoji: "🟢🟢" };
  if (pct > 15) return { verdict: "WIN", emoji: "🟢" };
  if (pct > -15) return { verdict: "FAIR", emoji: "🟡" };
  if (pct > -40) return { verdict: "LOSS", emoji: "🔴" };
  return { verdict: "BIG LOSS", emoji: "🔴🔴" };
}

/**
 * Find items from the database that could fill a specific value gap.
 * Shuffles candidates for variety — won't suggest the same items every time.
 * @param {number} neededValue - The value gap to fill
 * @param {Array} allItems - Full item database
 * @returns {Array} Suggested items with name and value
 */
function suggestAdds(neededValue, allItems) {
  const candidates = allItems
    .filter((i) => {
      const val = getAdjustedValue(i);
      return val.adjusted > 0 && val.adjusted <= neededValue * 1.5 && i.demand !== "-" && i.demand !== "Very Low";
    })
    .map((i) => ({ name: i.name, value: getAdjustedValue(i).adjusted, demand: i.demand, trend: i.trend }));

  if (candidates.length === 0) return [];

  // Shuffle for variety
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Try single item matches (within 85-115% of needed)
  const singleMatches = candidates.filter(
    (c) => c.value >= neededValue * 0.85 && c.value <= neededValue * 1.15
  );
  if (singleMatches.length > 0) {
    return [singleMatches[Math.floor(Math.random() * Math.min(singleMatches.length, 5))]];
  }

  // Greedy multi-item (from shuffled list)
  const suggestions = [];
  let remaining = neededValue;
  for (const candidate of candidates) {
    if (remaining <= 0) break;
    if (candidate.value <= remaining * 1.2 && candidate.value >= remaining * 0.15) {
      suggestions.push(candidate);
      remaining -= candidate.value;
    }
    if (suggestions.length >= 3) break;
  }

  return suggestions;
}

/**
 * Generate a recommendation message based on the verdict.
 * Includes item suggestions for LOSS/FAIR verdicts.
 * @param {string} verdict - The verdict string
 * @param {number} leftTotal - User's total adjusted value
 * @param {number} rightTotal - Their total adjusted value
 * @param {Array} leftItems - User's parsed items
 * @param {Array} rightItems - Their parsed items
 * @param {Array} allItemsDB - Full item database for suggestions
 * @returns {string} Formatted recommendation text
 */
function getRecommendation(verdict, leftTotal, rightTotal, leftItems, rightItems, allItemsDB) {
  const diff = Math.abs(rightTotal - leftTotal);
  const diffFormatted = formatVal(diff);

  const allTradeItems = [...leftItems, ...rightItems].filter((i) => i.data);
  const rising = allTradeItems.filter((i) => i.data.trend === "Rising").map((i) => i.data.name);
  const dropping = allTradeItems.filter((i) => i.data.trend === "Dropping").map((i) => i.data.name);

  let trendNote = "";
  if (rising.length > 0) trendNote += ` 📈 ${rising.join(", ")} is rising in value.`;
  if (dropping.length > 0) trendNote += ` 📉 ${dropping.join(", ")} is dropping — sell sooner.`;

  // Item suggestions — two options: for FAIR and for WIN
  let itemSuggestions = "";
  if (allItemsDB && (verdict === "LOSS" || verdict === "BIG LOSS" || verdict === "FAIR")) {
    const tradeItemNames = allTradeItems.map((i) => i.data.name.toLowerCase());
    const availableItems = allItemsDB.filter(
      (i) => !tradeItemNames.includes(i.name.toLowerCase())
    );

    if (verdict === "FAIR") {
      // For FAIR: suggest what they could add to make it a WIN for you
      const winTarget = Math.round((leftTotal + rightTotal) / 2 * 0.2);
      const winSuggestions = suggestAdds(winTarget, availableItems);
      if (winSuggestions.length > 0) {
        const sugList = winSuggestions.map((s) => `**${s.name}** (${formatVal(s.value)})`).join(", ");
        itemSuggestions = `\n💡 **To make it a WIN:** Ask them to add ${sugList}.`;
      }
    } else {
      // For LOSS/BIG LOSS: two options
      const fairTarget = diff;
      const winTarget = diff + Math.round(leftTotal * 0.15);

      const fairSuggestions = suggestAdds(fairTarget, availableItems);
      const winSuggestions = suggestAdds(winTarget, availableItems);

      if (fairSuggestions.length > 0) {
        const fairList = fairSuggestions.map((s) => `**${s.name}** (${formatVal(s.value)})`).join(", ");
        itemSuggestions += `\n🟡 **For FAIR trade:** Ask them to add ${fairList}`;
      }
      if (winSuggestions.length > 0) {
        const winList = winSuggestions.map((s) => `**${s.name}** (${formatVal(s.value)})`).join(", ");
        itemSuggestions += `\n🟢 **For a WIN:** Ask them to add ${winList}`;
      }
    }
  }

  switch (verdict) {
    case "BIG WIN":
      return `Accept immediately! You're getting ~${diffFormatted} more in adjusted value.${trendNote}`;
    case "WIN":
      return `Solid trade in your favor. Accept before they change their mind.${trendNote}`;
    case "FAIR":
      return `Trade is roughly even. Accept if you prefer their items or demand/trend favors them.${trendNote}${itemSuggestions}`;
    case "LOSS":
      return `You're underpaid by ~${diffFormatted}. Ask them to add more to make it fair.${trendNote}${itemSuggestions}`;
    case "BIG LOSS":
      return `Major value gap (~${diffFormatted} short). Decline or demand significant adds.${trendNote}${itemSuggestions}`;
    default:
      return `Unable to fully determine.${trendNote}`;
  }
}

/**
 * Analyze a trade locally using formula-based valuation.
 * Returns a formatted Discord message with verdict and recommendations.
 * @param {Array} leftItems - User's parsed items
 * @param {Array} rightItems - Their parsed items
 * @param {Array} allItemsDB - Full item database for suggestions
 * @returns {string} Formatted Discord message
 */
function analyzeTradeLocally(leftItems, rightItems, allItemsDB) {
  let leftTotal = 0;
  let rightTotal = 0;
  const leftLines = [];
  const rightLines = [];

  for (const item of leftItems) {
    const qty = item.qty || 1;
    if (item.data) {
      const val = getAdjustedValue(item.data);
      const totalForItem = val.adjusted * qty;
      leftTotal += totalForItem;
      const rawTotal = val.value * qty;
      const qtyStr = qty > 1 ? ` ×${qty}` : "";
      const adjNote = val.value !== val.adjusted ? ` → Adj: ${formatVal(val.adjusted * qty)}` : "";
      leftLines.push(
        `• **${item.data.name}**${qtyStr} — ${formatVal(rawTotal)}${adjNote} (${val.source} | Demand: ${item.data.demand} | ${trendEmoji(item.data.trend)} ${item.data.trend})`
      );
      // Market value warning if significantly different from trueVal
      const mvWarning = getMarketValueWarning(item.data);
      if (mvWarning) leftLines.push(mvWarning);
    } else {
      leftLines.push(`• ⚠️ **${item.query}** — *Not found in database*`);
    }
  }

  for (const item of rightItems) {
    const qty = item.qty || 1;
    if (item.data) {
      const val = getAdjustedValue(item.data);
      const totalForItem = val.adjusted * qty;
      rightTotal += totalForItem;
      const rawTotal = val.value * qty;
      const qtyStr = qty > 1 ? ` ×${qty}` : "";
      const adjNote = val.value !== val.adjusted ? ` → Adj: ${formatVal(val.adjusted * qty)}` : "";
      rightLines.push(
        `• **${item.data.name}**${qtyStr} — ${formatVal(rawTotal)}${adjNote} (${val.source} | Demand: ${item.data.demand} | ${trendEmoji(item.data.trend)} ${item.data.trend})`
      );
      // Market value warning if significantly different from trueVal
      const mvWarning = getMarketValueWarning(item.data);
      if (mvWarning) rightLines.push(mvWarning);
    } else {
      rightLines.push(`• ⚠️ **${item.query}** — *Not found in database*`);
    }
  }

  const { verdict, emoji } = getVerdict(leftTotal, rightTotal);
  const recommendation = getRecommendation(verdict, leftTotal, rightTotal, leftItems, rightItems, allItemsDB);

  return [
    `⚖️ **FISCH TRADE ASSISTANT**`,
    ``,
    `**📦 YOUR OFFER**`,
    leftLines.join("\n"),
    `**Total Adjusted Value: ${formatVal(leftTotal)}**`,
    ``,
    `**🎁 THEIR OFFER**`,
    rightLines.join("\n"),
    `**Total Adjusted Value: ${formatVal(rightTotal)}**`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 **VERDICT:** ${emoji} **${verdict}** ${emoji}`,
    ``,
    `📝 **RECOMMENDATION:**`,
    recommendation,
  ].join("\n");
}

/**
 * Generate a market value warning line if marketValue differs significantly from trueVal.
 * @param {object} item - Item data object
 * @returns {string|null} Warning line or null if no significant difference
 */
function getMarketValueWarning(item) {
  if (!item || !item.marketValue || !item.trueVal) return null;
  const diff = Math.abs(item.marketValue - item.trueVal) / item.trueVal;
  if (diff > 0.3) {
    const direction = item.marketValue < item.trueVal ? "lower" : "higher";
    return `  ⚠️ *Market trades ~${formatVal(item.marketValue)} (${direction} than listed value)*`;
  }
  return null;
}

module.exports = { analyzeTradeLocally, getAdjustedValue, getSmartValue, getMarketValueWarning, formatVal };
