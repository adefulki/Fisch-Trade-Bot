/**
 * Portfolio tracker data manager.
 * Users can track their item holdings and see total value + ROI.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.VOLUME_PATH || path.join(__dirname, "..", "..", "data");
const PORTFOLIO_FILE = path.join(DATA_DIR, "portfolios.json");

/**
 * Ensure data directory exists.
 */
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Load all portfolios from disk.
 * @returns {object} Map of userId → portfolio entries
 */
function loadPortfolios() {
  ensureDir();
  try {
    if (fs.existsSync(PORTFOLIO_FILE)) {
      return JSON.parse(fs.readFileSync(PORTFOLIO_FILE, "utf8"));
    }
  } catch (e) {
    console.error("⚠️ Failed to load portfolios:", e.message);
  }
  return {};
}

/**
 * Save portfolios to disk.
 * @param {object} portfolios - Portfolio data
 */
function savePortfolios(portfolios) {
  ensureDir();
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(portfolios, null, 2), "utf8");
}

/**
 * Add item(s) to a user's portfolio.
 * Records the buy price at time of adding.
 * @param {string} userId - Discord user ID
 * @param {string} itemName - Item name
 * @param {number} qty - Quantity
 * @param {number} buyPrice - Price at time of adding (per unit)
 * @returns {{success: boolean, message: string}}
 */
function addToPortfolio(userId, itemName, qty, buyPrice) {
  const portfolios = loadPortfolios();
  if (!portfolios[userId]) portfolios[userId] = [];

  // Check max items (25 per user)
  if (portfolios[userId].length >= 25) {
    return { success: false, message: "Portfolio full (max 25 items). Remove some first." };
  }

  // Check if item already exists — add to quantity
  const existing = portfolios[userId].find(
    (e) => e.itemName.toLowerCase() === itemName.toLowerCase()
  );

  if (existing) {
    // Average the buy price
    const totalOld = existing.buyPrice * existing.qty;
    const totalNew = buyPrice * qty;
    existing.qty += qty;
    existing.buyPrice = Math.round((totalOld + totalNew) / existing.qty);
    existing.updatedAt = new Date().toISOString();
  } else {
    portfolios[userId].push({
      itemName,
      qty,
      buyPrice,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  savePortfolios(portfolios);
  return { success: true, message: "Added to portfolio." };
}

/**
 * Remove item(s) from a user's portfolio.
 * @param {string} userId - Discord user ID
 * @param {string} itemName - Item name
 * @param {number|null} qty - Quantity to remove (null = remove all)
 * @returns {boolean} True if removed
 */
function removeFromPortfolio(userId, itemName, qty = null) {
  const portfolios = loadPortfolios();
  if (!portfolios[userId]) return false;

  const idx = portfolios[userId].findIndex(
    (e) => e.itemName.toLowerCase() === itemName.toLowerCase()
  );
  if (idx === -1) return false;

  if (qty === null || qty >= portfolios[userId][idx].qty) {
    portfolios[userId].splice(idx, 1);
  } else {
    portfolios[userId][idx].qty -= qty;
    portfolios[userId][idx].updatedAt = new Date().toISOString();
  }

  savePortfolios(portfolios);
  return true;
}

/**
 * Get a user's portfolio with current values calculated.
 * @param {string} userId - Discord user ID
 * @param {Array} items - Current item database
 * @returns {{entries: Array, totalBuyValue: number, totalCurrentValue: number, totalROI: number, totalROIPct: number}}
 */
function getPortfolio(userId, items) {
  const portfolios = loadPortfolios();
  const userPortfolio = portfolios[userId] || [];

  let totalBuyValue = 0;
  let totalCurrentValue = 0;

  const entries = userPortfolio.map((entry) => {
    const item = items.find((i) => i.name.toLowerCase() === entry.itemName.toLowerCase());
    const currentPrice = item ? (item.trueVal || item.tradeHub || 0) : 0;
    const currentTotal = currentPrice * entry.qty;
    const buyTotal = entry.buyPrice * entry.qty;
    const roi = currentTotal - buyTotal;
    const roiPct = buyTotal > 0 ? ((roi / buyTotal) * 100) : 0;

    totalBuyValue += buyTotal;
    totalCurrentValue += currentTotal;

    return {
      ...entry,
      currentPrice,
      currentTotal,
      buyTotal,
      roi,
      roiPct,
      found: !!item,
    };
  });

  const totalROI = totalCurrentValue - totalBuyValue;
  const totalROIPct = totalBuyValue > 0 ? ((totalROI / totalBuyValue) * 100) : 0;

  return { entries, totalBuyValue, totalCurrentValue, totalROI, totalROIPct };
}

/**
 * Clear a user's entire portfolio.
 * @param {string} userId - Discord user ID
 */
function clearPortfolio(userId) {
  const portfolios = loadPortfolios();
  delete portfolios[userId];
  savePortfolios(portfolios);
}

/**
 * Toggle trade deal watching for a user's portfolio.
 * @param {string} userId - Discord user ID
 * @param {boolean} enabled - Whether to enable watching
 */
function setPortfolioWatch(userId, enabled) {
  const portfolios = loadPortfolios();
  if (!portfolios[userId]) portfolios[userId] = [];
  // Store watch state in a special metadata entry
  if (!portfolios[`${userId}_meta`]) portfolios[`${userId}_meta`] = {};
  portfolios[`${userId}_meta`].watchEnabled = enabled;
  savePortfolios(portfolios);
}

/**
 * Check if a user has portfolio watching enabled.
 * @param {string} userId - Discord user ID
 * @returns {boolean}
 */
function isPortfolioWatchEnabled(userId) {
  const portfolios = loadPortfolios();
  const meta = portfolios[`${userId}_meta`];
  return meta ? meta.watchEnabled === true : false;
}

/**
 * Get all user IDs with portfolio watch enabled.
 * @returns {string[]} Array of user IDs
 */
function getWatchingUsers() {
  const portfolios = loadPortfolios();
  return Object.keys(portfolios)
    .filter((key) => key.endsWith("_meta") && portfolios[key].watchEnabled)
    .map((key) => key.replace("_meta", ""));
}

module.exports = { addToPortfolio, removeFromPortfolio, getPortfolio, clearPortfolio, setPortfolioWatch, isPortfolioWatchEnabled, getWatchingUsers };
