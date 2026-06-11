/**
 * Formatting utilities for currency values and trend emojis.
 */

/**
 * Format a numeric value into human-readable currency string.
 * @param {number|null} num - The value to format
 * @returns {string} Formatted string like "S$ 4.50M", "S$ 300.0K", or "N/A"
 */
function formatVal(num) {
  if (num === null || num === undefined || num === 0) return "N/A";
  if (num >= 1000000) return `S$ ${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `S$ ${(num / 1000).toFixed(1)}K`;
  if (num < 0) {
    const abs = Math.abs(num);
    if (abs >= 1000000) return `-S$ ${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `-S$ ${(abs / 1000).toFixed(1)}K`;
    return `-S$ ${abs}`;
  }
  return `S$ ${num}`;
}

/**
 * Get the emoji representation for a trend value.
 * @param {string} trend - The trend string (Rising, Dropping, Stable, Unstable)
 * @returns {string} The corresponding emoji
 */
function trendEmoji(trend) {
  if (trend === "Rising") return "📈";
  if (trend === "Dropping") return "📉";
  if (trend === "Unstable") return "⚡";
  return "➡️";
}

/**
 * Parse a formatted value string back to a number.
 * @param {string} str - Formatted string like "S$ 4.5M" or "S$ 300K"
 * @returns {number} The numeric value, or 0 if unparseable
 */
function parseValToNum(str) {
  if (!str || str === "N/A") return 0;
  str = str.replace("S$", "").replace(/,/g, "").trim();
  if (str.includes("M")) return parseFloat(str) * 1000000;
  if (str.includes("K")) return parseFloat(str) * 1000;
  return parseFloat(str) || 0;
}

module.exports = { formatVal, trendEmoji, parseValToNum };
