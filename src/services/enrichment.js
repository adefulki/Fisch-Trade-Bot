/**
 * Item enrichment service.
 * Periodically fetches individual item detail pages to populate
 * Stock, Cost, Sold Rate, Market Value, and Trade Count.
 * Runs in batches to avoid overwhelming game.guide.
 */

const fs = require("fs");
const path = require("path");
const { fetchItemLive } = require("./live-lookup");
const { DATA_FILE } = require("./scraper");

/** How many items to enrich per batch (avoid rate limiting) */
const BATCH_SIZE = 10;

/** Delay between requests in ms (be polite to game.guide) */
const REQUEST_DELAY = 3000;

/**
 * Sleep helper.
 * @param {number} ms - Milliseconds to wait
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Enrich a batch of items with detail page data (stock, cost, soldRate, marketValue, tradeCount).
 * Prioritizes items missing this data, starting with highest-value items.
 * @param {Array} items - Full item database (will be mutated)
 * @param {number} batchSize - Number of items to process this run
 * @returns {{enriched: number, failed: number}} Results
 */
async function enrichBatch(items, batchSize = BATCH_SIZE) {
  // Prioritize: items missing market data, sorted by value (highest first)
  const needsEnrichment = items
    .filter((item) => {
      // Skip items that already have full market data
      if (item.stock !== null && item.stock !== undefined && item.soldRate !== null && item.soldRate !== undefined) {
        return false;
      }
      // Must have a name to look up
      return item.name && item.name.length >= 2;
    })
    .sort((a, b) => (b.trueVal || b.tradeHub || 0) - (a.trueVal || a.tradeHub || 0));

  if (needsEnrichment.length === 0) {
    console.log("✅ All items already enriched — nothing to do");
    return { enriched: 0, failed: 0 };
  }

  const batch = needsEnrichment.slice(0, batchSize);
  console.log(`📡 Enriching ${batch.length} items (${needsEnrichment.length} total need enrichment)...`);

  let enriched = 0;
  let failed = 0;

  for (const item of batch) {
    try {
      const detail = await fetchItemLive(item.name);
      if (detail) {
        // Merge detail data into the existing item
        if (detail.stock !== null && detail.stock !== undefined) item.stock = detail.stock;
        if (detail.cost !== null && detail.cost !== undefined) item.cost = detail.cost;
        if (detail.soldRate !== null && detail.soldRate !== undefined) item.soldRate = detail.soldRate;
        if (detail.marketValue !== null && detail.marketValue !== undefined) item.marketValue = detail.marketValue;
        if (detail.tradeCount !== null && detail.tradeCount !== undefined) item.tradeCount = detail.tradeCount;

        // Also update values if the detail page has fresher data
        if (detail.trueVal && detail.trueVal > 0) item.trueVal = detail.trueVal;
        if (detail.tradeHub && detail.tradeHub > 0) item.tradeHub = detail.tradeHub;
        if (detail.proto && detail.proto > 0) item.proto = detail.proto;
        if (detail.demand && detail.demand !== "-") item.demand = detail.demand;
        if (detail.trend && detail.trend !== "-") item.trend = detail.trend;

        enriched++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }

    // Be polite — wait between requests
    await sleep(REQUEST_DELAY);
  }

  // Save enriched data to disk
  if (enriched > 0) {
    saveItems(items);
    console.log(`📡 Enriched ${enriched} items (${failed} failed). ${needsEnrichment.length - batch.length} remaining.`);
  }

  return { enriched, failed };
}

/**
 * Save the updated items array to disk.
 * @param {Array} items - Item array to save
 */
function saveItems(items) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(DATA_FILE, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      source: "https://www.game.guide/fisch-value-list",
      count: items.length,
      items,
    }, null, 2), "utf8");
  } catch (e) {
    console.error("⚠️ Failed to save enriched data:", e.message);
  }
}

module.exports = { enrichBatch };
