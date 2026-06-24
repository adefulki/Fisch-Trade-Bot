/**
 * Historical data storage and analytics.
 * Records price changes over time and provides market analytics queries.
 */

const fs = require("fs");
const path = require("path");
const { formatVal, parseValToNum } = require("../utils/format");

/** Directory for persistent data (Railway Volume or local) */
const DATA_DIR = process.env.VOLUME_PATH || path.join(__dirname, "..", "..", "data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

/**
 * Ensure the data directory exists.
 */
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load the full history from disk.
 * @returns {{snapshots: Array}} History object with snapshots array
 */
function loadHistory() {
  ensureDir();
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("⚠️ Failed to load history:", e.message);
  }
  return { snapshots: [] };
}

/**
 * Save history object to disk.
 * @param {object} history - The history object to save
 */
function saveHistory(history) {
  ensureDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history), "utf8");
}

/**
 * Record a set of changes as a new history snapshot.
 * Only saves if there are actual changes. Auto-prunes entries older than 90 days.
 * @param {object|null} changes - Changes object from scraper (updated, added, removed)
 */
function recordChanges(changes) {
  if (!changes) return;
  const totalChanges = changes.updated.length + changes.added.length + changes.removed.length;
  if (totalChanges === 0) return;

  const history = loadHistory();

  const snapshot = {
    timestamp: new Date().toISOString(),
    updated: changes.updated.map((item) => ({ name: item.name, changes: item.changes })),
    added: changes.added.map((item) => ({
      name: item.name, trueVal: item.trueVal, tradeHub: item.tradeHub,
      proto: item.proto, demand: item.demand, trend: item.trend,
    })),
    removed: changes.removed.map((item) => ({ name: item.name })),
  };

  history.snapshots.push(snapshot);

  // Prune entries older than 90 days
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  history.snapshots = history.snapshots.filter((s) => s.timestamp >= cutoff);

  // Purge bad snapshots (likely from partial scrapes)
  history.snapshots = history.snapshots.filter((s) => !s.removed || s.removed.length <= 100);

  saveHistory(history);
  console.log(`📜 Recorded history snapshot (${totalChanges} changes, ${history.snapshots.length} total entries)`);
}

/**
 * Get price change history for a specific item over the last N days.
 * @param {string} itemName - Exact item name to look up
 * @param {number} days - Number of days to look back (default 30)
 * @returns {Array<{timestamp: string, changes: Array}>} List of change entries
 */
function getItemHistory(itemName, days = 30) {
  const history = loadHistory();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const nameLower = itemName.toLowerCase();

  const entries = [];
  for (const snapshot of history.snapshots) {
    if (snapshot.timestamp < cutoff) continue;

    for (const item of snapshot.updated) {
      if (item.name.toLowerCase() === nameLower) {
        entries.push({ timestamp: snapshot.timestamp, changes: item.changes });
      }
    }

    for (const item of snapshot.added) {
      if (item.name.toLowerCase() === nameLower) {
        entries.push({ timestamp: snapshot.timestamp, changes: [{ field: "Added", before: "N/A", after: "New item" }] });
      }
    }
  }

  return entries;
}

/**
 * Generate market analytics from current items and historical data.
 * Includes top valued items, trends, gainers, losers, volatility, and flip opportunities.
 * @param {Array} currentItems - Current item database
 * @param {number} days - Number of days to analyze (default 7)
 * @returns {object} Analytics object with all computed metrics
 */
function getMarketAnalytics(currentItems, days = 7) {
  const history = loadHistory();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const recentSnapshots = history.snapshots.filter((s) => s.timestamp >= cutoff);

  // Count changes and net price movement per item
  const changeCount = {};
  const priceMovement = {};

  for (const snapshot of recentSnapshots) {
    for (const item of snapshot.updated) {
      changeCount[item.name] = (changeCount[item.name] || 0) + 1;
      for (const c of item.changes) {
        if (c.field === "TrueVal" || c.field === "Trade Hub") {
          const beforeNum = parseValToNum(c.before);
          const afterNum = parseValToNum(c.after);
          if (beforeNum > 0 && afterNum > 0) {
            if (!priceMovement[item.name]) priceMovement[item.name] = { total: 0, field: c.field };
            priceMovement[item.name].total += (afterNum - beforeNum);
          }
        }
      }
    }
    for (const item of snapshot.added) {
      changeCount[item.name] = (changeCount[item.name] || 0) + 1;
    }
  }

  // Most volatile items (most price changes)
  const mostVolatile = Object.entries(changeCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Biggest gainers
  const gainers = Object.entries(priceMovement)
    .filter(([_, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total).slice(0, 10)
    .map(([name, v]) => ({ name, gain: v.total, field: v.field }));

  // Biggest losers
  const losers = Object.entries(priceMovement)
    .filter(([_, v]) => v.total < 0)
    .sort((a, b) => a[1].total - b[1].total).slice(0, 10)
    .map(([name, v]) => ({ name, loss: v.total, field: v.field }));

  // Current market stats
  const rising = currentItems.filter((i) => i.trend === "Rising");
  const dropping = currentItems.filter((i) => i.trend === "Dropping");
  const highDemand = currentItems.filter((i) => i.demand === "High");
  const limited = currentItems.filter((i) => i.demand === "Limited");

  // Top 10 most valuable
  const topValue = [...currentItems]
    .filter((i) => i.trueVal && i.trueVal > 0)
    .sort((a, b) => b.trueVal - a.trueVal).slice(0, 10);

  // Best flip opportunities (High demand + gap between TrueVal and Trade Hub)
  const bestFlips = currentItems
    .filter((i) => i.trueVal && i.tradeHub && i.demand === "High" && i.trend !== "Dropping")
    .map((i) => ({ ...i, gap: i.trueVal - i.tradeHub, gapPct: ((i.trueVal - i.tradeHub) / i.tradeHub * 100) }))
    .filter((i) => i.gap > 0)
    .sort((a, b) => b.gapPct - a.gapPct).slice(0, 10);

  return {
    totalItems: currentItems.length,
    totalSnapshots: recentSnapshots.length,
    days, rising, dropping, highDemand, limited,
    topValue, bestFlips, mostVolatile, gainers, losers,
  };
}

module.exports = { recordChanges, getItemHistory, getMarketAnalytics, formatVal };
