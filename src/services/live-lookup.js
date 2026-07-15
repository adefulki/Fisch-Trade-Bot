/**
 * Live item lookup service.
 * Fetches individual item pages from game.guide when an item isn't in the database.
 * Extracts: Value, Proto, Demand, Trend, Stock, Cost, Sold Rate.
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

    if (!pageText.includes("TrueVal") && !pageText.includes("Value") && !pageText.includes("demand")) return null;

    let trueVal = null;
    let tradeHub = null;
    let proto = null;
    let demand = "-";
    let trend = "-";
    let stock = null;
    let cost = null;
    let soldRate = null;

    // ─── Value extraction ───
    const trueValMatch = pageText.match(/(?:TrueVal|S\$\s*VALUE|Value):?\s*(S?\$?\s*[\d,.]+[MK]?|N\/A)/i);
    const tradeHubMatch = pageText.match(/Trade\s*Hub:?\s*(S?\$?\s*[\d,.]+[MK]?|N\/A)/i);
    const protoMatch = pageText.match(/Proto(?:\s*Value)?:?\s*([\d,.]+\s*K?|N\/A|TBD)/i);
    const demandMatch = pageText.match(/Demand:?\s*(Very Low|Very High|Limited|Low|Medium|High)/i);
    const trendMatch = pageText.match(/Trend:?\s*(Rising|Dropping|Unstable|Stable)/i);

    // ─── Stock, Cost, Sold Rate extraction ───
    const stockMatch = pageText.match(/Stock:?\s*([\d,]+)/i);
    const costMatch = pageText.match(/Cost:?\s*([\d,]+)\s*Robux/i);
    const soldRateMatch = pageText.match(/Sold\s*Rate:?\s*([\d.]+)%/i);

    if (trueValMatch && trueValMatch[1] !== "N/A") {
      trueVal = parsePageValue(trueValMatch[1]);
    }
    if (tradeHubMatch && tradeHubMatch[1] !== "N/A") {
      tradeHub = parsePageValue(tradeHubMatch[1]);
    }
    if (protoMatch && protoMatch[1] !== "N/A" && protoMatch[1] !== "TBD") {
      const protoStr = protoMatch[1].replace(/,/g, "").trim();
      proto = protoStr.toUpperCase().includes("K") ? parseFloat(protoStr) * 1000 : parseFloat(protoStr) || null;
    }
    if (demandMatch) demand = demandMatch[1];
    if (trendMatch) trend = trendMatch[1];
    if (stockMatch) stock = parseInt(stockMatch[1].replace(/,/g, "")) || null;
    if (costMatch) cost = parseInt(costMatch[1].replace(/,/g, "")) || null;
    if (soldRateMatch) soldRate = parseFloat(soldRateMatch[1]) || null;

    // ─── Market Value from active trades (real community price) ───
    let marketValue = null;
    let tradeCount = null;
    const marketMatch = pageText.match(/Market\s*Value:?\s*~?([\d,.]+[MK]?)\s*\((\d+)\s*trades?\)/i);
    if (marketMatch) {
      marketValue = parsePageValue(marketMatch[1]);
      tradeCount = parseInt(marketMatch[2]) || null;
    }

    // ─── Fallback: try without labels (detail page has "Value:" not "TrueVal:") ───
    if (!trueVal && !tradeHub) {
      const valMatch = pageText.match(/Value:?\s*S\$\s*([\d,.]+[MK]?)/i);
      if (valMatch) trueVal = parsePageValue(valMatch[1]);
    }

    if (!demand || demand === "-") {
      const dm = pageText.match(/(Very Low|Very High|Limited|Low|Medium|High)/i);
      if (dm) demand = dm[1];
    }
    if (!trend || trend === "-") {
      const tm = pageText.match(/(Rising|Dropping|Unstable|Stable)/i);
      if (tm) trend = tm[1];
    }

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
      stock,
      cost,
      soldRate,
      marketValue,
      tradeCount,
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
