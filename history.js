const fs = require("fs");
const path = require("path");

// Use VOLUME_PATH env var for Railway Volume, fallback to local ./data
const DATA_DIR = process.env.VOLUME_PATH || path.join(__dirname, "data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

// Ensure directory exists
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load history from file
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

// Save history to file
function saveHistory(history) {
  ensureDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history), "utf8");
}

// Record a diff snapshot (only changed items)
function recordChanges(changes) {
  if (!changes) return;
  const totalChanges = changes.updated.length + changes.added.length + changes.removed.length;
  if (totalChanges === 0) return;

  const history = loadHistory();

  const snapshot = {
    timestamp: new Date().toISOString(),
    updated: changes.updated.map((item) => ({
      name: item.name,
      changes: item.changes,
    })),
    added: changes.added.map((item) => ({
      name: item.name,
      trueVal: item.trueVal,
      tradeHub: item.tradeHub,
      proto: item.proto,
      demand: item.demand,
      trend: item.trend,
    })),
    removed: changes.removed.map((item) => ({ name: item.name })),
  };

  history.snapshots.push(snapshot);

  // Keep max 90 days of history (prune old entries)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  history.snapshots = history.snapshots.filter((s) => s.timestamp >= ninetyDaysAgo);

  saveHistory(history);
  console.log(`📜 Recorded history snapshot (${totalChanges} changes, ${history.snapshots.length} total entries)`);
}

// Get price history for a specific item (last N days)
function getItemHistory(itemName, days = 30) {
  const history = loadHistory();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const nameLower = itemName.toLowerCase();

  const entries = [];
  for (const snapshot of history.snapshots) {
    if (snapshot.timestamp < cutoff) continue;

    // Check updated items
    for (const item of snapshot.updated) {
      if (item.name.toLowerCase() === nameLower) {
        entries.push({
          timestamp: snapshot.timestamp,
          changes: item.changes,
        });
      }
    }

    // Check added items
    for (const item of snapshot.added) {
      if (item.name.toLowerCase() === nameLower) {
        entries.push({
          timestamp: snapshot.timestamp,
          changes: [{ field: "Added", before: "N/A", after: "New item" }],
        });
      }
    }
  }

  return entries;
}

// Get market analytics
function getMarketAnalytics(currentItems, days = 7) {
  const history = loadHistory();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const recentSnapshots = history.snapshots.filter((s) => s.timestamp >= cutoff);

  // Count how many times each item changed
  const changeCount = {};
  const priceMovement = {}; // net movement per item

  for (const snapshot of recentSnapshots) {
    for (const item of snapshot.updated) {
      changeCount[item.name] = (changeCount[item.name] || 0) + 1;

      for (const c of item.changes) {
        if (c.field === "TrueVal" || c.field === "Trade Hub") {
          const beforeNum = parseValToNum(c.before);
          const afterNum = parseValToNum(c.after);
          if (beforeNum > 0 && afterNum > 0) {
            if (!priceMovement[item.name]) {
              priceMovement[item.name] = { total: 0, field: c.field };
            }
            priceMovement[item.name].total += (afterNum - beforeNum);
          }
        }
      }
    }

    for (const item of snapshot.added) {
      changeCount[item.name] = (changeCount[item.name] || 0) + 1;
    }
  }

  // Most volatile (most changes)
  const mostVolatile = Object.entries(changeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Biggest gainers
  const gainers = Object.entries(priceMovement)
    .filter(([_, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([name, v]) => ({ name, gain: v.total, field: v.field }));

  // Biggest losers
  const losers = Object.entries(priceMovement)
    .filter(([_, v]) => v.total < 0)
    .sort((a, b) => a[1].total - b[1].total)
    .slice(0, 10)
    .map(([name, v]) => ({ name, loss: v.total, field: v.field }));

  // Current market stats from live data
  const rising = currentItems.filter((i) => i.trend === "Rising");
  const dropping = currentItems.filter((i) => i.trend === "Dropping");
  const highDemand = currentItems.filter((i) => i.demand === "High");
  const limited = currentItems.filter((i) => i.demand === "Limited");

  // Top 10 most valuable (by TrueVal)
  const topValue = [...currentItems]
    .filter((i) => i.trueVal && i.trueVal > 0)
    .sort((a, b) => b.trueVal - a.trueVal)
    .slice(0, 10);

  // Best flips: High demand + Rising/Stable + big gap between TrueVal and Trade Hub
  const bestFlips = currentItems
    .filter((i) => i.trueVal && i.tradeHub && i.demand === "High" && i.trend !== "Dropping")
    .map((i) => ({ ...i, gap: i.trueVal - i.tradeHub, gapPct: ((i.trueVal - i.tradeHub) / i.tradeHub * 100) }))
    .filter((i) => i.gap > 0)
    .sort((a, b) => b.gapPct - a.gapPct)
    .slice(0, 10);

  return {
    totalItems: currentItems.length,
    totalSnapshots: recentSnapshots.length,
    days,
    rising,
    dropping,
    highDemand,
    limited,
    topValue,
    bestFlips,
    mostVolatile,
    gainers,
    losers,
  };
}

// Parse formatted value string back to number
function parseValToNum(str) {
  if (!str || str === "N/A") return 0;
  str = str.replace("S$", "").replace(/,/g, "").trim();
  if (str.includes("M")) return parseFloat(str) * 1000000;
  if (str.includes("K")) return parseFloat(str) * 1000;
  return parseFloat(str) || 0;
}

// Format number for display
function formatVal(num) {
  if (!num || num === 0) return "N/A";
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

module.exports = { recordChanges, getItemHistory, getMarketAnalytics, formatVal, loadHistory, DATA_DIR };
