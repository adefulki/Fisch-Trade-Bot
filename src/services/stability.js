/**
 * Stability & Manipulation Detection Service.
 * Analyzes price history to detect suspicious activity and generate confidence scores.
 * 
 * Detection signals:
 *   - Rapid value spikes (50%+ in short period)
 *   - Frequent demand/trend flips
 *   - High volatility (many changes in short time)
 *   - Value oscillation (up then down repeatedly)
 */

const { getItemHistory } = require("../data/history");
const { parseValToNum } = require("../utils/format");

/**
 * Analyze an item for manipulation signals.
 * Returns a stability report with confidence score and warnings.
 * @param {object} item - Item data (name, trueVal, tradeHub, demand, trend, proto)
 * @param {number} days - Days to look back (default 14)
 * @returns {{confidence: string, score: number, warnings: string[], flags: string[]}}
 */
function analyzeStability(item, days = 14) {
  const history = getItemHistory(item.name, days);
  const warnings = [];
  const flags = [];
  let penaltyScore = 0;

  if (history.length === 0) {
    return { confidence: "Stable", score: 100, warnings: [], flags: [], volatility: 0 };
  }

  // ─── 1. Rapid value spikes ───
  const valueChanges = [];
  for (const entry of history) {
    for (const c of entry.changes) {
      if (c.field === "TrueVal" || c.field === "Trade Hub") {
        const before = parseValToNum(c.before);
        const after = parseValToNum(c.after);
        if (before > 0 && after > 0) {
          const pctChange = ((after - before) / before) * 100;
          valueChanges.push({ timestamp: entry.timestamp, field: c.field, before, after, pctChange });
        }
      }
    }
  }

  // Check for spikes (>50% increase in a single change)
  const bigSpikes = valueChanges.filter((c) => c.pctChange > 50);
  if (bigSpikes.length > 0) {
    penaltyScore += 25 * bigSpikes.length;
    flags.push("SPIKE");
    warnings.push(`⚠️ ${bigSpikes.length} sudden spike${bigSpikes.length > 1 ? "s" : ""} (>50% jump) in ${days}d`);
  }

  // Check for big drops followed by recovery (pump & dump pattern)
  const bigDrops = valueChanges.filter((c) => c.pctChange < -30);
  if (bigSpikes.length > 0 && bigDrops.length > 0) {
    penaltyScore += 30;
    flags.push("PUMP_DUMP");
    warnings.push("🚨 Pump & dump pattern detected (spike followed by crash)");
  }

  // ─── 2. Demand/Trend flips ───
  let demandFlips = 0;
  let trendFlips = 0;
  for (const entry of history) {
    for (const c of entry.changes) {
      if (c.field === "Demand") demandFlips++;
      if (c.field === "Trend") trendFlips++;
    }
  }

  if (demandFlips >= 3) {
    penaltyScore += 15 * (demandFlips - 2);
    flags.push("DEMAND_FLIP");
    warnings.push(`⚠️ Demand changed ${demandFlips} times in ${days}d (unstable)`);
  }

  if (trendFlips >= 3) {
    penaltyScore += 10 * (trendFlips - 2);
    flags.push("TREND_FLIP");
    warnings.push(`⚠️ Trend changed ${trendFlips} times in ${days}d`);
  }

  // ─── 3. High volatility (many changes overall) ───
  const totalChanges = history.length;
  const changesPerDay = totalChanges / days;

  if (changesPerDay >= 2) {
    penaltyScore += 20;
    flags.push("HIGH_VOLATILITY");
    warnings.push(`⚠️ Very high volatility: ${totalChanges} changes in ${days}d`);
  } else if (changesPerDay >= 1) {
    penaltyScore += 10;
    flags.push("VOLATILE");
    warnings.push(`⚠️ Volatile: ${totalChanges} changes in ${days}d`);
  }

  // ─── 4. Value oscillation (zigzag pattern) ───
  if (valueChanges.length >= 3) {
    let oscillations = 0;
    for (let i = 1; i < valueChanges.length; i++) {
      const prev = valueChanges[i - 1].pctChange;
      const curr = valueChanges[i].pctChange;
      // Direction reversal (up then down, or down then up)
      if ((prev > 5 && curr < -5) || (prev < -5 && curr > 5)) {
        oscillations++;
      }
    }
    if (oscillations >= 2) {
      penaltyScore += 15 * oscillations;
      flags.push("OSCILLATION");
      warnings.push(`⚠️ Price oscillating (${oscillations} reversals) — possible manipulation`);
    }
  }

  // ─── 5. Recent sudden trend change without value support ───
  if (item.trend === "Rising" && valueChanges.length > 0) {
    const recentChanges = valueChanges.filter((c) => {
      const age = Date.now() - new Date(c.timestamp).getTime();
      return age < 3 * 24 * 60 * 60 * 1000; // Last 3 days
    });
    const avgRecentChange = recentChanges.length > 0
      ? recentChanges.reduce((sum, c) => sum + c.pctChange, 0) / recentChanges.length
      : 0;

    // Marked as "Rising" but value isn't actually increasing much
    if (avgRecentChange < 5 && recentChanges.length > 0) {
      penaltyScore += 10;
      flags.push("FAKE_TREND");
      warnings.push("⚠️ Marked 'Rising' but recent value changes don't support it");
    }
  }

  // ─── Calculate final score ───
  const score = Math.max(0, Math.min(100, 100 - penaltyScore));

  let confidence;
  if (score >= 85) confidence = "Stable";
  else if (score >= 65) confidence = "Moderate";
  else if (score >= 40) confidence = "Suspicious";
  else confidence = "Likely Manipulated";

  return {
    confidence,
    score,
    warnings,
    flags,
    volatility: totalChanges,
    valueChanges: valueChanges.length,
  };
}

/**
 * Get a short inline warning string for embeds.
 * Returns empty string if item is stable.
 * @param {object} item - Item data
 * @returns {string} Warning string or empty
 */
function getStabilityWarning(item) {
  const report = analyzeStability(item);
  if (report.confidence === "Stable") return "";
  if (report.confidence === "Moderate") return "";

  const emoji = report.confidence === "Likely Manipulated" ? "🚨" : "⚠️";
  return `\n${emoji} **${report.confidence}** — ${report.warnings[0] || "Unusual activity detected"}`;
}

/**
 * Get a full stability block for detailed views.
 * @param {object} item - Item data
 * @returns {string} Multi-line warning block or empty string
 */
function getStabilityBlock(item) {
  const report = analyzeStability(item);
  if (report.confidence === "Stable") return "";

  const emoji = report.confidence === "Likely Manipulated" ? "🚨"
    : report.confidence === "Suspicious" ? "⚠️" : "ℹ️";

  let block = `\n${emoji} **Stability: ${report.confidence}** (${report.score}/100)`;
  for (const warning of report.warnings.slice(0, 3)) {
    block += `\n> ${warning}`;
  }

  if (report.confidence === "Likely Manipulated") {
    block += "\n> 💡 *Use caution — values may be artificially inflated.*";
  }

  return block;
}

/**
 * Get the confidence color modifier for embeds.
 * Returns a warning color if item is suspicious.
 * @param {object} item - Item data
 * @param {number} defaultColor - Default embed color
 * @returns {number} Color hex value
 */
function getStabilityColor(item, defaultColor) {
  const report = analyzeStability(item);
  if (report.confidence === "Likely Manipulated") return 0xff0000;
  if (report.confidence === "Suspicious") return 0xff8c00;
  return defaultColor;
}

module.exports = { analyzeStability, getStabilityWarning, getStabilityBlock, getStabilityColor };
