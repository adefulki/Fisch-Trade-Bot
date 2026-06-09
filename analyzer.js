// Local trade analyzer - works WITHOUT AI
// Combines TrueVal, Trade Hub, Proto, Demand, and Trend into a smart adjusted value

// Demand multipliers
const DEMAND_MULTIPLIER = {
  "Limited": 1.25,
  "High": 1.10,
  "Medium": 1.00,
  "Low": 0.90,
  "Very Low": 0.80,
  "-": 1.00,
};

// Trend multipliers
const TREND_MULTIPLIER = {
  "Rising": 1.10,
  "Stable": 1.00,
  "Dropping": 0.88,
  "Unstable": 0.95,
  "-": 1.00,
};

// Calculate adjusted value for a single item
function getAdjustedValue(item) {
  if (!item) return { value: 0, source: "Unknown", adjusted: 0 };

  // Step 1: Determine base value (priority: TrueVal > Trade Hub > Proto estimate)
  let baseValue = 0;
  let source = "";

  if (item.trueVal && item.trueVal > 0) {
    baseValue = item.trueVal;
    source = "TrueVal";
  } else if (item.tradeHub && item.tradeHub > 0) {
    baseValue = item.tradeHub;
    source = "Trade Hub";
  } else if (item.proto && item.proto > 0) {
    // Estimate from Proto based on demand
    const demandKey = item.demand || "Medium";
    const protoMultiplier =
      demandKey === "High" || demandKey === "Limited" ? 2500 :
      demandKey === "Medium" ? 2000 : 1500;
    baseValue = item.proto * protoMultiplier;
    source = "Proto (est.)";
  } else {
    return { value: 0, source: "No data", adjusted: 0 };
  }

  // Step 2: Apply demand adjustment
  const demandMult = DEMAND_MULTIPLIER[item.demand] || 1.0;

  // Step 3: Apply trend adjustment
  const trendMult = TREND_MULTIPLIER[item.trend] || 1.0;

  // Step 4: Calculate final adjusted value
  const adjusted = Math.round(baseValue * demandMult * trendMult);

  return { value: baseValue, source, adjusted };
}

// Format currency
function formatVal(num) {
  if (num === null || num === undefined || num === 0) return "N/A";
  if (num >= 1000000) return `S$ ${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `S$ ${(num / 1000).toFixed(1)}K`;
  return `S$ ${num}`;
}

// Get trend emoji
function trendEmoji(trend) {
  if (trend === "Rising") return "📈";
  if (trend === "Dropping") return "📉";
  if (trend === "Unstable") return "⚡";
  return "➡️";
}

// Determine verdict
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

// Find items that could fill a value gap
// Returns a list of item suggestions that together cover the needed value
function suggestAdds(neededValue, allItems) {
  // Get all items with valid adjusted values, sorted by value descending
  const candidates = allItems
    .filter((i) => {
      const val = getAdjustedValue(i);
      return val.adjusted > 0 && val.adjusted <= neededValue * 1.2;
    })
    .map((i) => ({ name: i.name, value: getAdjustedValue(i).adjusted, demand: i.demand, trend: i.trend }))
    .sort((a, b) => b.value - a.value);

  if (candidates.length === 0) return [];

  const suggestions = [];
  let remaining = neededValue;

  // Try to find a single item that covers the gap
  const singleMatch = candidates.find(
    (c) => c.value >= remaining * 0.85 && c.value <= remaining * 1.15
  );
  if (singleMatch) {
    return [singleMatch];
  }

  // Otherwise pick items that together fill the gap (greedy)
  for (const candidate of candidates) {
    if (remaining <= 0) break;
    if (candidate.value <= remaining * 1.1) {
      suggestions.push(candidate);
      remaining -= candidate.value;
    }
    if (suggestions.length >= 3) break; // Max 3 suggestions
  }

  return suggestions;
}

// Generate recommendation with specific item suggestions
function getRecommendation(verdict, leftTotal, rightTotal, leftItems, rightItems, allItemsDB) {
  const diff = Math.abs(rightTotal - leftTotal);
  const diffFormatted = formatVal(diff);

  // Find notable items (rising/dropping)
  const allTradeItems = [...leftItems, ...rightItems].filter((i) => i.data);
  const rising = allTradeItems.filter((i) => i.data.trend === "Rising").map((i) => i.data.name);
  const dropping = allTradeItems.filter((i) => i.data.trend === "Dropping").map((i) => i.data.name);

  let trendNote = "";
  if (rising.length > 0) trendNote += ` 📈 ${rising.join(", ")} is rising in value.`;
  if (dropping.length > 0) trendNote += ` 📉 ${dropping.join(", ")} is dropping — sell sooner.`;

  // Items already in the trade (exclude from suggestions)
  const tradeItemNames = allTradeItems.map((i) => i.data.name.toLowerCase());

  // Get item suggestions from the DB
  let itemSuggestions = "";
  if (allItemsDB && (verdict === "LOSS" || verdict === "BIG LOSS" || verdict === "FAIR")) {
    // For LOSS/BIG LOSS: they need to add this much
    // For FAIR: to make it a WIN, they need to add ~20% of average
    const targetAdd = verdict === "FAIR"
      ? Math.round((leftTotal + rightTotal) / 2 * 0.2) // 20% to swing to WIN
      : diff;

    const availableItems = allItemsDB.filter(
      (i) => !tradeItemNames.includes(i.name.toLowerCase())
    );
    const suggestions = suggestAdds(targetAdd, availableItems);

    if (suggestions.length > 0) {
      const sugList = suggestions
        .map((s) => `**${s.name}** (${formatVal(s.value)})`)
        .join(", ");
      if (verdict === "FAIR") {
        itemSuggestions = `\n💡 **To make it a WIN:** Ask them to add ${sugList}.`;
      } else {
        itemSuggestions = `\n💡 **Ask them to add:** ${sugList} (≈ ${formatVal(targetAdd)} needed).`;
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

// Main analysis function - returns formatted Discord message
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

module.exports = { analyzeTradeLocally, getAdjustedValue, formatVal };
