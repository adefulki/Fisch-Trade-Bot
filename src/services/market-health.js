/**
 * Market Health Index calculator.
 * Analyzes overall market direction based on current trends and recent price movements.
 */

const { getMarketAnalytics } = require("../data/history");

/**
 * Calculate overall market health index.
 * @param {Array} items - Current item database
 * @param {number} days - Days to analyze (default 7)
 * @returns {object} Market health data
 */
function getMarketHealth(items, days = 7) {
  const analytics = getMarketAnalytics(items, days);

  // Count items by trend
  const rising = items.filter((i) => i.trend === "Rising").length;
  const dropping = items.filter((i) => i.trend === "Dropping").length;
  const stable = items.filter((i) => i.trend === "Stable").length;
  const totalWithTrend = rising + dropping + stable;

  // Calculate sentiment score (-100 to +100)
  // Based on: ratio of rising vs dropping, gainers vs losers from history
  let sentimentScore = 0;

  if (totalWithTrend > 0) {
    // Trend ratio contributes up to ±50
    sentimentScore += ((rising - dropping) / totalWithTrend) * 50;
  }

  // Historical gainers vs losers contributes up to ±30
  const gainersCount = analytics.gainers.length;
  const losersCount = analytics.losers.length;
  const totalMovers = gainersCount + losersCount;
  if (totalMovers > 0) {
    sentimentScore += ((gainersCount - losersCount) / totalMovers) * 30;
  }

  // Demand distribution contributes up to ±20
  const highDemand = items.filter((i) => i.demand === "High" || i.demand === "Limited").length;
  const lowDemand = items.filter((i) => i.demand === "Low" || i.demand === "Very Low").length;
  const totalDemand = highDemand + lowDemand;
  if (totalDemand > 0) {
    sentimentScore += ((highDemand - lowDemand) / totalDemand) * 20;
  }

  // Clamp to -100 to +100
  sentimentScore = Math.max(-100, Math.min(100, Math.round(sentimentScore)));

  // Determine market status
  let status, emoji, color;
  if (sentimentScore > 30) { status = "Bullish"; emoji = "🟢"; color = 0x00ff00; }
  else if (sentimentScore > 10) { status = "Slightly Bullish"; emoji = "🟢"; color = 0x90ee90; }
  else if (sentimentScore > -10) { status = "Neutral"; emoji = "🟡"; color = 0xffd700; }
  else if (sentimentScore > -30) { status = "Slightly Bearish"; emoji = "🔴"; color = 0xff8c00; }
  else { status = "Bearish"; emoji = "🔴"; color = 0xff0000; }

  // Market activity level
  const totalChanges = analytics.totalSnapshots;
  let activity;
  if (totalChanges > 20) activity = "Very Active";
  else if (totalChanges > 10) activity = "Active";
  else if (totalChanges > 3) activity = "Moderate";
  else activity = "Quiet";

  return {
    sentimentScore,
    status,
    emoji,
    color,
    activity,
    rising,
    dropping,
    stable,
    totalItems: items.length,
    highDemand: items.filter((i) => i.demand === "High").length,
    limited: items.filter((i) => i.demand === "Limited").length,
    gainersCount,
    losersCount,
    totalChanges,
    days,
  };
}

module.exports = { getMarketHealth };
