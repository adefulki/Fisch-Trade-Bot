/**
 * Monitor list data manager.
 * Users set which items they want to find deals for.
 * The scanner checks listings and notifies when a W trade appears.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.VOLUME_PATH || path.join(__dirname, "..", "..", "data");
const MONITORS_FILE = path.join(DATA_DIR, "monitors.json");

/**
 * Ensure data directory exists.
 */
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Load all monitors from disk.
 * @returns {Array<{userId: string, items: string[], createdAt: string}>}
 */
function loadMonitors() {
  ensureDir();
  try {
    if (fs.existsSync(MONITORS_FILE)) {
      return JSON.parse(fs.readFileSync(MONITORS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("⚠️ Failed to load monitors:", e.message);
  }
  return [];
}

/**
 * Save monitors to disk.
 * @param {Array} monitors - Monitor entries
 */
function saveMonitors(monitors) {
  ensureDir();
  fs.writeFileSync(MONITORS_FILE, JSON.stringify(monitors, null, 2), "utf8");
}

/**
 * Add items to a user's monitor list.
 * Max 15 items per user.
 * @param {string} userId - Discord user ID
 * @param {string[]} itemNames - Item names to monitor
 * @returns {{success: boolean, message: string}}
 */
function addMonitor(userId, itemNames) {
  const monitors = loadMonitors();
  let userMonitor = monitors.find((m) => m.userId === userId);

  if (!userMonitor) {
    userMonitor = { userId, items: [], createdAt: new Date().toISOString() };
    monitors.push(userMonitor);
  }

  // Add new items (deduplicate)
  for (const name of itemNames) {
    const lower = name.toLowerCase();
    if (!userMonitor.items.some((i) => i.toLowerCase() === lower)) {
      userMonitor.items.push(name);
    }
  }

  // Max 15 items
  if (userMonitor.items.length > 15) {
    return { success: false, message: "Maximum 15 monitored items. Remove some first." };
  }

  saveMonitors(monitors);
  return { success: true, message: `Monitoring ${userMonitor.items.length} items.` };
}

/**
 * Remove items from a user's monitor list.
 * @param {string} userId - Discord user ID
 * @param {string[]} itemNames - Item names to remove
 * @returns {boolean} True if any were removed
 */
function removeMonitor(userId, itemNames) {
  const monitors = loadMonitors();
  const userMonitor = monitors.find((m) => m.userId === userId);
  if (!userMonitor) return false;

  const before = userMonitor.items.length;
  const removeSet = new Set(itemNames.map((n) => n.toLowerCase()));
  userMonitor.items = userMonitor.items.filter((i) => !removeSet.has(i.toLowerCase()));

  saveMonitors(monitors);
  return userMonitor.items.length < before;
}

/**
 * Get a user's monitored items.
 * @param {string} userId - Discord user ID
 * @returns {string[]} List of monitored item names
 */
function getUserMonitors(userId) {
  const monitors = loadMonitors();
  const userMonitor = monitors.find((m) => m.userId === userId);
  return userMonitor ? userMonitor.items : [];
}

/**
 * Get all users with their monitored items (for batch processing).
 * @returns {Array<{userId: string, items: string[]}>}
 */
function getAllMonitors() {
  return loadMonitors();
}

/**
 * Clear a user's entire monitor list.
 * @param {string} userId - Discord user ID
 */
function clearMonitors(userId) {
  const monitors = loadMonitors();
  const idx = monitors.findIndex((m) => m.userId === userId);
  if (idx !== -1) monitors.splice(idx, 1);
  saveMonitors(monitors);
}

module.exports = { addMonitor, removeMonitor, getUserMonitors, getAllMonitors, clearMonitors };
