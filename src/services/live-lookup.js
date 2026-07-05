/**
 * Live item lookup service.
 * Fetches individual item pages from game.guide when an item isn't in the database.
 * Supports new card-based page design (2025+).
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
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" },
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    if (!html || html.length < 500) return null;

    const $ = cheerio.load(html);
    const pageText = $("body").text();

    // Check if it's a valid item page (new or old format)
    if (!pageText.includes("TrueVal") && !pageText.includes("DEMAND") && !pageText.includes("demand")) return null;

    // ─── New format (2025 card design) ───
    // Values appear as "TrueVal: S$ 1.57M" or "TrueVal:S$ 1.57M"
    let trueVal = null;
    let tradeHub = null;
    let proto = null;
    let demand = "-";
    let trend = "-";

    // Try new format first
    const trueValMatch = pageText.match(/TrueVal:?\s*(S\$\s*[\d,.]+[MK]?|N\/A)/i);
    const tradeHubMatch = pageText.match(/Trade\s*Hub:?\s*(S\$\s*[\d,.]+[MK]?|N\/A)/i);
    const protoMatch = pageText.match(/Proto:?\s*([\d,.]+\s*K?|N\/A|TBD)/i);
    const demandMatch = pageText.match(/(Very Low|Very High|Low|Medium|High|Limited)/i);
    const trendMatch = pageText.match(/\b(Rising|Stable|Dropping|Unstable)\b/i);

    if (trueValMatch && trueValMatch[1] !== "N/A") {
      trueVal = parsePageValue(trueValMatch[1]);
    }
    if (tradeHubMatch && tradeHubMatch[1] !== "N/A") {
      tradeHub = parsePageValue(tradeHubMatch[1]);
    }
    if (protoMatch && protoMatch[1] !== "N/A" && protoMatch[1] !== "TBD") {
      const protoStr = protoMatch[1].replace(/,/g, "").trim();
      if (protoStr.toUpperCase().includes("K")) {
        proto = parseFloat(protoStr) * 1000;
      } else {
        proto = parseFloat(protoStr) || null;
      }
    }
    if (demandMatch) demand = demandMatch[1];
    if (trendMatch) trend = trendMatch[1];

    // ─── Legacy format fallback ───
    if (!trueVal && !tradeHub && !proto) {
      const legacyTrueVal = pageText.match(/S\$ VALUE\s*([\d,.]+[MK]?|N\/A)/i);
      const legacyProto = pageText.match(/PROTO VALUE\s*([\d,.]+[K]?|N\/A)/i);
      const marketMatch = pageText.match(/Market Value:\s*~?([\d,.]+[MK]?)/i);

      if (legacyTrueVal && legacyTrueVal[1] !== "N/A") {
        trueVal = parsePageValue(legacyTrueVal[1]);
      } else if (marketMatch) {
        trueVal = parsePageValue(marketMatch[1]);
      }

      if (legacyProto && legacyProto[1] !== "N/A") {
        const pStr = legacyProto[1].replace(/,/g, "");
        proto = pStr.toUpperCase().includes("K") ? parseFloat(pStr) * 1000 : parseFloat(pStr) || null;
      }

      const legacyDemand = pageText.match(/DEMAND\s*(Very Low|Very High|Low|Medium|High|Limited)/i);
      const legacyTrend = pageText.match(/TREND\s*(Rising|Stable|Dropping|Unstable)/i);
      if (legacyDemand && demand === "-") demand = legacyDemand[1];
      if (legacyTrend && trend === "-") trend = legacyTrend[1];
    }

    // Only return if we got at least something useful
    const hasValue = trueVal !== null || tradeHub !== null || proto !== null;
    const hasMetadata = demand !== "-" || trend !== "-";
    if (!hasValue && !hasMetadata) return null;

    return {
      name: itemName,
      trueVal,
      tradeHub,
      proto,
      demand,
      trend,
      source: "live",
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse a value string from the item page.
 * @param {string} str - Value like "553.4K" or "4.5M" or "553,400" or "S$ 1.57M"
 * @returns {number|null}
 */
function parsePageValue(str) {
  if (!str || str === "N/A") return null;
  str = str.replace("S$", "").replace(/,/g, "").trim();
  if (str.includes("M")) return Math.round(parseFloat(str) * 1000000);
  if (str.includes("K")) return Math.round(parseFloat(str) * 1000);
  return parseInt(str) || null;
}

module.exports = { fetchItemLive };
