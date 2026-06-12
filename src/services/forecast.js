/**
 * Trend forecasting service.
 * Uses linear regression on historical price data to predict future values.
 */

const { getItemHistory } = require("../data/history");
const { formatVal } = require("../utils/format");

/**
 * Calculate linear regression (y = mx + b) from data points.
 * @param {number[]} xValues - X axis values (e.g. days from start)
 * @param {number[]} yValues - Y axis values (e.g. prices)
 * @returns {{slope: number, intercept: number, r2: number}} Regression results
 */
function linearRegression(xValues, yValues) {
  const n = xValues.length;
  if (n < 2) return { slope: 0, intercept: yValues[0] || 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xValues[i];
    sumY += yValues[i];
    sumXY += xValues[i] * yValues[i];
    sumX2 += xValues[i] * xValues[i];
    sumY2 += yValues[i] * yValues[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared (coefficient of determination)
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    ssRes += (yValues[i] - predicted) ** 2;
    ssTot += (yValues[i] - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

  return { slope, intercept, r2 };
}

/**
 * Generate a price forecast for an item.
 * @param {object} item - Current item data
 * @param {number} days - Days of history to analyze
 * @param {number} forecastDays - Days ahead to predict
 * @returns {object|null} Forecast result or null if insufficient data
 */
function forecastItem(item, days = 14, forecastDays = 7) {
  const entries = getItemHistory(item.name, days);
  if (entries.length < 3) return null;

  // Collect price data points with timestamps
  const dataPoints = [];
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

  for (const entry of entries) {
    for (const change of entry.changes) {
      if (change.field === "TrueVal" || change.field === "Trade Hub") {
        const val = parseVal(change.after);
        if (val > 0) {
          const daysSinceStart = (new Date(entry.timestamp).getTime() - startTime) / (24 * 60 * 60 * 1000);
          dataPoints.push({ x: daysSinceStart, y: val, field: change.field });
        }
      }
    }
  }

  // Add current value
  const currentVal = item.trueVal || item.tradeHub || 0;
  if (currentVal > 0) {
    dataPoints.push({ x: days, y: currentVal, field: item.trueVal ? "TrueVal" : "Trade Hub" });
  }

  if (dataPoints.length < 3) return null;

  const xValues = dataPoints.map((p) => p.x);
  const yValues = dataPoints.map((p) => p.y);

  const { slope, intercept, r2 } = linearRegression(xValues, yValues);

  // Predict future values
  const predictions = [];
  for (let d = 1; d <= forecastDays; d++) {
    const predictedVal = Math.max(0, slope * (days + d) + intercept);
    predictions.push({ day: d, value: Math.round(predictedVal) });
  }

  // Calculate daily change rate
  const dailyChange = slope;
  const dailyChangePct = currentVal > 0 ? (slope / currentVal) * 100 : 0;

  // Confidence based on R² and data points
  let confidence = "Low";
  if (r2 > 0.7 && dataPoints.length >= 5) confidence = "High";
  else if (r2 > 0.4 && dataPoints.length >= 4) confidence = "Medium";

  // Direction
  let direction = "Stable";
  if (dailyChangePct > 0.5) direction = "Rising";
  else if (dailyChangePct < -0.5) direction = "Falling";

  return {
    itemName: item.name,
    currentVal,
    dataPoints: dataPoints.length,
    dailyChange: Math.round(dailyChange),
    dailyChangePct: dailyChangePct.toFixed(2),
    predictions,
    r2: r2.toFixed(3),
    confidence,
    direction,
    forecastDays,
  };
}

/**
 * Parse formatted value string back to number.
 * @param {string} str - Formatted string
 * @returns {number} Numeric value
 */
function parseVal(str) {
  if (!str || str === "N/A") return 0;
  str = str.replace(/\*\*/g, "").replace("S$", "").replace(/,/g, "").trim();
  if (str.includes("M")) return parseFloat(str) * 1000000;
  if (str.includes("K")) return parseFloat(str) * 1000;
  return parseFloat(str) || 0;
}

module.exports = { forecastItem, linearRegression };
