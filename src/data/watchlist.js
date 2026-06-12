/**
 * Watchlist data manager.
 * Users can set price alerts for specific items.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.VOLUME_PATH || path.join(__dirname, "..", "..", "data");
const WATCHLIST_FILE = path.join(DATA_DIR, "watchlist.json");

/**
 * Ensure data directory exists.
 */
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Load all watchlist entries from disk.
 * @returns {Array<{userId: string, itemName: string, condition: string, targetValue: number, createdAt: string}>}
 */
function loadWatchlist() {
  ensureDir();
  try {
    if (fs.existsSync(WATCHLIST_FILE)) {
      return JSON.parse(fs.readFileSync(WATCHLIST_FILE, "utf8"));
    }
  } catch (e) {
    console.error("⚠️ Failed to load watchlist:", e.message);
  }
  return [];
}

/**
 * Save watchlist to disk.
 * @param {Array} entries - Watchlist entries
 */
function saveWatchlist(entries) {
  ensureDir();
  fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(entries, null, 2), "utf8");
}

/**
 * Add a watch entry for a user.
 * Max 10 watches per user.
 * @param {string} userId - Discord user ID
 * @param {string} itemName - Item name
 * @param {string} condition - "above" or "below"
 * @param {number} targetValue - Target price to trigger alert
 * @returns {{success: boolean, message: string}}
 */
function addWatch(userId, itemName, condition, targetValue) {
  const entries = loadWatchlist();
  const userEntries = entries.filter((e) => e.userId === userId);

  if (userEntries.length >= 10) {
    return { success: false, message: "You have reached the maximum of 10 watches. Remove one first." };
  }

  // Check for duplicate
  const exists = userEntries.find(
    (e) => e.itemName.toLowerCase() === itemName.toLowerCase() && e.condition === condition
  );
  if (exists) {
    // Update existing
    exists.targetValue = targetValue;
    exists.createdAt = new Date().toISOString();
    saveWatchlist(entries);
    return { success: true, message: "Watch updated." };
  }

  entries.push({
    userId,
    itemName,
    condition,
    targetValue,
    createdAt: new Date().toISOString(),
  });

  saveWatchlist(entries);
  return { success: true, message: "Watch added." };
}

/**
 * Remove a watch entry for a user.
 * @param {string} userId - Discord user ID
 * @param {string} itemName - Item name
 * @param {string} condition - "above" or "below" (or "all" to remove both)
 * @returns {boolean} True if removed
 */
function removeWatch(userId, itemName, condition) {
  const entries = loadWatchlist();
  const before = entries.length;
  const filtered = entries.filter((e) => {
    if (e.userId !== userId) return true;
    if (e.itemName.toLowerCase() !== itemName.toLowerCase()) return true;
    if (condition === "all") return false;
    return e.condition !== condition;
  });
  saveWatchlist(filtered);
  return filtered.length < before;
}

/**
 * Get all watches for a specific user.
 * @param {string} userId - Discord user ID
 * @returns {Array} User's watch entries
 */
function getUserWatches(userId) {
  return loadWatchlist().filter((e) => e.userId === userId);
}

/**
 * Check all watches against current item values and return triggered alerts.
 * Removes triggered watches after alerting.
 * @param {Array} items - Current item database
 * @returns {Array<{userId: string, itemName: string, condition: string, targetValue: number, currentValue: number}>}
 */
function checkWatches(items) {
  const entries = loadWatchlist();
  const triggered = [];
  const remaining = [];

  for (const watch of entries) {
    const item = items.find((i) => i.name.toLowerCase() === watch.itemName.toLowerCase());
    if (!item) { remaining.push(watch); continue; }

    const currentVal = item.trueVal || item.tradeHub || 0;
    let isTriggered = false;

    if (watch.condition === "above" && currentVal >= watch.targetValue) {
      isTriggered = true;
    } else if (watch.condition === "below" && currentVal <= watch.targetValue) {
      isTriggered = true;
    }

    if (isTriggered) {
      triggered.push({ ...watch, currentValue: currentVal });
    } else {
      remaining.push(watch);
    }
  }

  // Remove triggered watches
  if (triggered.length > 0) {
    saveWatchlist(remaining);
  }

  return triggered;
}

module.exports = { addWatch, removeWatch, getUserWatches, checkWatches, loadWatchlist };
