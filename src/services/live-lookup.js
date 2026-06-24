/**
 * Live item lookup service.
 * Fetches individual item pages from game.guide when an item isn't in the database.
 */

const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Fetch live item data from an individual game.guide item page.
 * Used as fallback when the item isn't found in the scraped database.
 * @param {string} itemName - Item name to look up
 * @returns {object|null} Item data or null if not found
 */
async function fetchItemLive(itemName) {
  // Convert name to URL slug (e.g. "Cthulu's Revenge" → "cthulus-revenge")
  const slug = itemName
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const url = `https://www.game.guide/${slug}-value-fisch`;

  try {
    const { data: html } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    if (!html || html.length < 1000) return null;

    const $ = cheerio.load(html);
    const pageText = $("body").text();

    // Check if it's a valid item page
    if (!pageText.includes("DEMAND") && !pageText.includes("demand")) return null;

    // Parse values from page
    const trueValMatch = pageText.match(/S\$ VALUE\s*([\d,.]+[MK]?|N\/A)/i);
    const protoMatch = pageText.match(/PROTO VALUE\s*([\d,.]+[K]?|N\/A)/i);
    const demandMatch = pageText.match(/DEMAND\s*(Very Low|Very High|Low|Medium|High|Limited)/i);
    const trendMatch = pageText.match(/TREND\s*(Rising|Stable|Dropping|Unstable)/i);

    // Also try to get market value from trade data
    const marketMatch = pageText.match(/Market Value:\s*~?([\d,.]+[MK]?)/i);

    let trueVal = null;
    if (trueValMatch && trueValMatch[1] !== "N/A") {
      trueVal = parsePageValue(trueValMatch[1]);
    } else if (marketMatch) {
      trueVal = parsePageValue(marketMatch[1]);
    }

    let proto = null;
    if (protoMatch && protoMatch[1] !== "N/A") {
      proto = parseFloat(protoMatch[1].replace(/,/g, "")) || null;
      if (protoMatch[1].toUpperCase().includes("K")) {
        proto = parseFloat(protoMatch[1]) * 1000;
      }
    }

    return {
      name: itemName,
      trueVal,
      tradeHub: null,
      proto,
      demand: demandMatch ? demandMatch[1] : "-",
      trend: trendMatch ? trendMatch[1] : "-",
      source: "live",
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse a value string from the item page.
 * @param {string} str - Value like "553.4K" or "4.5M" or "553,400"
 * @returns {number|null}
 */
function parsePageValue(str) {
  if (!str || str === "N/A") return null;
  str = str.replace(/,/g, "").trim();
  if (str.includes("M")) return Math.round(parseFloat(str) * 1000000);
  if (str.includes("K")) return Math.round(parseFloat(str) * 1000);
  return parseInt(str) || null;
}

module.exports = { fetchItemLive };
