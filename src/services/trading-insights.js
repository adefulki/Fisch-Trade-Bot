/**
 * Trading Insights service.
 * Scrapes real supply/demand data from game.guide Trading Hub.
 * Provides: Most Wanted, Most Offered, Most Traded, High Demand ratios.
 */

const axios = require("axios");
const cheerio = require("cheerio");

const TRADING_URL = "https://www.game.guide/trading/fisch";

/** Cache for trading insights (refreshed every 30 minutes) */
let insightsCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch and parse trading insights from game.guide Trading Hub.
 * Uses cache to avoid excessive requests.
 * @returns {object|null} Insights data or null on failure
 */
async function fetchTradingInsights() {
  const now = Date.now();
  if (insightsCache && (now - lastFetchTime) < CACHE_DURATION) {
    return insightsCache;
  }

  try {
    const { data: html } = await axios.get(TRADING_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    const pageText = $("body").text();

    const insights = {
      mostWanted: [],
      mostOffered: [],
      mostTraded: [],
      highDemand: [],
      stats: { listings: 0, tradesPerWeek: 0, totalTrades: 0 },
    };

    // Parse stats
    const listingsMatch = pageText.match(/([\d,.]+[KM]?)\s*listings/i);
    const tradesWeekMatch = pageText.match(/([\d,.]+[KM]?)\s*trades\s*\/\s*7d/i);
    const totalTradesMatch = pageText.match(/([\d,.]+[KM]?)\s*total/i);

    if (listingsMatch) insights.stats.listings = parseStatNumber(listingsMatch[1]);
    if (tradesWeekMatch) insights.stats.tradesPerWeek = parseStatNumber(tradesWeekMatch[1]);
    if (totalTradesMatch) insights.stats.totalTrades = parseStatNumber(totalTradesMatch[1]);

    // Parse "MOST WANTED" section
    const wantedMatch = pageText.match(/MOST\s*WANTED([\s\S]*?)MOST\s*OFFERED/i);
    if (wantedMatch) {
      const entries = wantedMatch[1].match(/([A-Z][A-Za-z\s''!&\-]+?)(\d{2,})/g);
      if (entries) {
        for (const entry of entries) {
          const m = entry.match(/([A-Za-z\s''!&\-]+?)(\d+)$/);
          if (m) {
            insights.mostWanted.push({ name: m[1].trim(), count: parseInt(m[2]) });
          }
        }
      }
    }

    // Parse "MOST OFFERED" section
    const offeredMatch = pageText.match(/MOST\s*OFFERED([\s\S]*?)MOST\s*TRADED/i);
    if (offeredMatch) {
      const entries = offeredMatch[1].match(/([A-Z][A-Za-z\s''!&\-]+?)(\d{2,})/g);
      if (entries) {
        for (const entry of entries) {
          const m = entry.match(/([A-Za-z\s''!&\-]+?)(\d+)$/);
          if (m) {
            insights.mostOffered.push({ name: m[1].trim(), count: parseInt(m[2]) });
          }
        }
      }
    }

    // Parse "MOST TRADED" section
    const tradedMatch = pageText.match(/MOST\s*TRADED([\s\S]*?)HIGH\s*DEMAND/i);
    if (tradedMatch) {
      const entries = tradedMatch[1].match(/([A-Z][A-Za-z\s''!&\-]+?)(\d{2,})/g);
      if (entries) {
        for (const entry of entries) {
          const m = entry.match(/([A-Za-z\s''!&\-]+?)(\d+)$/);
          if (m) {
            insights.mostTraded.push({ name: m[1].trim(), count: parseInt(m[2]) });
          }
        }
      }
    }

    // Parse "HIGH DEMAND" section (want:offer ratio)
    const highDemandMatch = pageText.match(/HIGH\s*DEMAND([\s\S]*?)(?:All|Filter|Page)/i);
    if (highDemandMatch) {
      const ratioEntries = highDemandMatch[1].match(/([A-Z][A-Za-z\s''!&\-]+?)(\d+:\d+)/g);
      if (ratioEntries) {
        for (const entry of ratioEntries) {
          const m = entry.match(/([A-Za-z\s''!&\-]+?)(\d+):(\d+)$/);
          if (m) {
            const wants = parseInt(m[2]);
            const offers = parseInt(m[3]);
            insights.highDemand.push({
              name: m[1].trim(),
              wants,
              offers,
              ratio: offers === 0 ? Infinity : wants / offers,
            });
          }
        }
      }
    }

    insightsCache = insights;
    lastFetchTime = now;
    console.log(`📊 Trading insights loaded: ${insights.mostWanted.length} wanted, ${insights.mostOffered.length} offered, ${insights.mostTraded.length} traded`);
    return insights;
  } catch (error) {
    console.error("⚠️ Failed to fetch trading insights:", error.message);
    return insightsCache; // Return stale cache if available
  }
}

/**
 * Parse a stat number like "440.6K" or "5.9K" or "24,600".
 * @param {string} str - The stat string
 * @returns {number}
 */
function parseStatNumber(str) {
  if (!str) return 0;
  str = str.replace(/,/g, "").trim();
  if (str.includes("M")) return Math.round(parseFloat(str) * 1000000);
  if (str.includes("K")) return Math.round(parseFloat(str) * 1000);
  return parseInt(str) || 0;
}

/**
 * Get supply/demand info for a specific item from cached insights.
 * @param {string} itemName - Item name to look up
 * @returns {{wanted: number|null, offered: number|null, traded: number|null, ratio: string|null}}
 */
function getItemSupplyDemand(itemName) {
  if (!insightsCache) return { wanted: null, offered: null, traded: null, ratio: null };

  const nameLower = itemName.toLowerCase();

  const wanted = insightsCache.mostWanted.find((i) => i.name.toLowerCase() === nameLower);
  const offered = insightsCache.mostOffered.find((i) => i.name.toLowerCase() === nameLower);
  const traded = insightsCache.mostTraded.find((i) => i.name.toLowerCase() === nameLower);
  const highDemand = insightsCache.highDemand.find((i) => i.name.toLowerCase() === nameLower);

  return {
    wanted: wanted ? wanted.count : null,
    offered: offered ? offered.count : null,
    traded: traded ? traded.count : null,
    ratio: highDemand ? `${highDemand.wants}:${highDemand.offers}` : null,
    isOversupplied: offered && wanted && offered.count > wanted.count * 2,
    isUndersupplied: wanted && (!offered || wanted.count > (offered.count || 0) * 3),
  };
}

/**
 * Get cached insights (does not fetch).
 * @returns {object|null}
 */
function getCachedInsights() {
  return insightsCache;
}

module.exports = { fetchTradingInsights, getItemSupplyDemand, getCachedInsights };
