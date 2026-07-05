/**
 * Web scraper for game.guide Fisch value list.
 * Fetches, parses (cards + list items), detects changes.
 */

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { formatVal } = require("../utils/format");

/** Path to the current values JSON file (supports Railway Volume) */
const DATA_DIR = process.env.VOLUME_PATH || path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "values.json");
const SOURCE_URL = "https://www.game.guide/fisch-value-list";

/**
 * Parse a value string like "S$ 4.5M", "S$ 300K" into a number.
 * @param {string} str - The value string to parse
 * @returns {number|null} Parsed number or null if N/A
 */
function parseValue(str) {
  if (!str || str === "N/A" || str === "TBD") return null;
  str = str.replace("S$", "").trim();
  if (str.includes("M")) return Math.round(parseFloat(str) * 1000000);
  if (str.includes("K")) return Math.round(parseFloat(str) * 1000);
  return parseInt(str) || null;
}

/**
 * Parse a proto value string (can be "4K", "2.5K", or plain "725").
 * @param {string} str - The proto string to parse
 * @returns {number|null} Parsed proto value or null
 */
function parseProto(str) {
  if (!str || str === "N/A" || str === "TBD") return null;
  str = str.trim();
  if (str.toUpperCase().includes("K")) {
    return parseFloat(str) * 1000 || null;
  }
  return parseFloat(str) || null;
}

/**
 * Compare two item objects and return a list of field-level changes.
 * @param {object} oldItem - Previous item state
 * @param {object} newItem - Current item state
 * @returns {Array<{field: string, before: string, after: string}>} List of changes
 */
function compareItem(oldItem, newItem) {
  const changes = [];
  if (oldItem.trueVal !== newItem.trueVal)
    changes.push({ field: "TrueVal", before: formatVal(oldItem.trueVal), after: formatVal(newItem.trueVal) });
  if (oldItem.tradeHub !== newItem.tradeHub)
    changes.push({ field: "Trade Hub", before: formatVal(oldItem.tradeHub), after: formatVal(newItem.tradeHub) });
  if (oldItem.proto !== newItem.proto)
    changes.push({ field: "Proto", before: oldItem.proto !== null ? String(oldItem.proto) : "N/A", after: newItem.proto !== null ? String(newItem.proto) : "N/A" });
  if (oldItem.demand !== newItem.demand)
    changes.push({ field: "Demand", before: oldItem.demand, after: newItem.demand });
  if (oldItem.trend !== newItem.trend)
    changes.push({ field: "Trend", before: oldItem.trend, after: newItem.trend });
  return changes;
}

/**
 * Detect all differences between old and new item lists.
 * @param {Array} oldItems - Previous item list
 * @param {Array} newItems - Current item list
 * @returns {{updated: Array, added: Array, removed: Array}} Categorized changes
 */
function detectChanges(oldItems, newItems) {
  const changes = { updated: [], added: [], removed: [] };
  const oldMap = new Map(oldItems.map((i) => [i.name.toLowerCase(), i]));
  const newMap = new Map(newItems.map((i) => [i.name.toLowerCase(), i]));

  for (const newItem of newItems) {
    const oldItem = oldMap.get(newItem.name.toLowerCase());
    if (!oldItem) {
      changes.added.push(newItem);
    } else {
      const diffs = compareItem(oldItem, newItem);
      if (diffs.length > 0) changes.updated.push({ name: newItem.name, changes: diffs });
    }
  }

  for (const oldItem of oldItems) {
    if (!newMap.has(oldItem.name.toLowerCase())) {
      changes.removed.push({ name: oldItem.name });
    }
  }

  return changes;
}

/**
 * Extract item name from doubled text (e.g. "Evangeline Evangeline" → "Evangeline").
 * @param {string} rawName - Raw name text (possibly doubled)
 * @returns {string} Clean item name
 */
function cleanItemName(rawName) {
  let itemName = rawName;
  if (rawName.length > 2) {
    for (let i = 1; i <= Math.floor(rawName.length / 2) + 1; i++) {
      const candidate = rawName.substring(0, i).trim();
      const rest = rawName.substring(i).trim();
      if (candidate === rest) { itemName = candidate; break; }
    }
  }
  itemName = itemName.replace(/^NEW\s*/i, "").trim();
  itemName = itemName.replace(/^\?\s*/, "").trim();
  return itemName;
}

/**
 * Scrape the Fisch value list from game.guide.
 * Uses two parsing methods:
 *   1. Full cards (class cos-unit-card) — has all data
 *   2. List items (<li> with link + span) — has name + value only
 * @returns {{success: boolean, changes: object|null}} Success status and detected changes
 */
async function scrapeValues() {
  console.log("🔄 Scraping Fisch values from game.guide...");

  try {
    const { data: html } = await axios.get(SOURCE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 30000,
    });

    const $ = cheerio.load(html);
    const items = [];

    // Method 1: Full cards with all data (TrueVal, Trade Hub, Proto, Demand, Trend)
    $('a[href*="-value-fisch"]').each((_, el) => {
      const text = $(el).text().trim();
      if (!text || !text.includes("Demand:")) return;

      const trueValMatch = text.match(/TrueVal:\s*(S\$\s*[\d.]+[MK]?|N\/A)/i);
      const tradeHubMatch = text.match(/Trade Hub:\s*(S\$\s*[\d.]+[MK]?|N\/A)/i);
      const protoMatch = text.match(/Proto:\s*([\d.]+\s*K?|N\/A|TBD)/i);
      const demandMatch = text.match(/Demand:\s*(Very Low|Very High|Low|Medium|High|Limited|-)/i);
      const trendMatch = text.match(/Trend:\s*(Rising|Stable|Dropping|Unstable|-)/i);

      if (!demandMatch && !trendMatch) return;

      const nameMatch = text.match(/^(.+?)\s*TrueVal:/);
      if (!nameMatch) return;

      const itemName = cleanItemName(nameMatch[1].trim());
      if (!itemName || itemName.length < 2) return;

      const item = {
        name: itemName,
        trueVal: trueValMatch ? parseValue(trueValMatch[1]) : null,
        tradeHub: tradeHubMatch ? parseValue(tradeHubMatch[1]) : null,
        proto: protoMatch ? parseProto(protoMatch[1]) : null,
        demand: demandMatch ? demandMatch[1] : "-",
        trend: trendMatch ? trendMatch[1] : "-",
      };

      const exists = items.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
      if (!exists) items.push(item);
    });

    const fullCardCount = items.length;
    console.log(`📦 Parsed ${fullCardCount} full cards`);

    // Method 2: List items (name + value in <li> tags)
    $("li").each((_, el) => {
      const link = $(el).find('a[href*="-value-fisch"]');
      if (!link.length) return;

      const name = link.text().trim();
      if (!name || name.length < 2) return;

      // Skip if already parsed from full cards
      if (items.find((i) => i.name.toLowerCase() === name.toLowerCase())) return;

      // Try to extract value from span or any sibling text
      const span = $(el).find("span");
      const valueText = span.text().trim();
      const value = parseInt(valueText.replace(/,/g, "")) || 0;

      // Try to extract demand/trend from list item context
      const liText = $(el).text().trim();
      const demandMatch = liText.match(/Demand:\s*(Very Low|Very High|Low|Medium|High|Limited|-)/i);
      const trendMatch = liText.match(/Trend:\s*(Rising|Stable|Dropping|Unstable|-)/i);

      // Determine if value is TrueVal or Proto based on magnitude
      let trueVal = null;
      let proto = null;
      if (value >= 5000) {
        trueVal = value;
      } else if (value > 0) {
        proto = value;
      }

      const demand = demandMatch ? demandMatch[1] : "-";
      const trend = trendMatch ? trendMatch[1] : "-";

      // Only add if we have at least some useful info
      const hasValue = trueVal !== null || proto !== null;
      const hasMetadata = demand !== "-" || trend !== "-";
      if (!hasValue && !hasMetadata) return;

      items.push({
        name,
        trueVal,
        tradeHub: null,
        proto,
        demand,
        trend,
      });
    });

    // Method 3: All remaining links — only add if we can extract at least SOME data
    // Previously this added all links with all-null values, causing massive N/A entries
    $('a[href*="-value-fisch"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href.includes("-value-fisch")) return;

      const name = $(el).text().trim();
      if (!name || name.length < 2 || name.includes("TrueVal:") || name.includes("Demand:")) return;
      // Skip navigation/UI links
      if (name.includes("Value List") || name.includes("Back to")) return;
      // Skip generic/long text that's clearly not an item name
      if (name.length > 50 || name.split(" ").length > 6) return;

      // Skip if already exists
      if (items.find((i) => i.name.toLowerCase() === name.toLowerCase())) return;

      // Try to extract any surrounding context (parent element text)
      const parentText = $(el).parent().text().trim();
      const demandMatch = parentText.match(/Demand:\s*(Very Low|Very High|Low|Medium|High|Limited|-)/i);
      const trendMatch = parentText.match(/Trend:\s*(Rising|Stable|Dropping|Unstable|-)/i);
      const trueValMatch = parentText.match(/TrueVal:\s*(S\$\s*[\d.]+[MK]?)/i);
      const tradeHubMatch = parentText.match(/Trade Hub:\s*(S\$\s*[\d.]+[MK]?)/i);
      const protoMatch = parentText.match(/Proto:\s*([\d.]+\s*K?)/i);

      const trueVal = trueValMatch ? parseValue(trueValMatch[1]) : null;
      const tradeHub = tradeHubMatch ? parseValue(tradeHubMatch[1]) : null;
      const proto = protoMatch ? parseProto(protoMatch[1]) : null;
      const demand = demandMatch ? demandMatch[1] : "-";
      const trend = trendMatch ? trendMatch[1] : "-";

      // Only add if we have at least ONE piece of useful data
      const hasValue = trueVal !== null || tradeHub !== null || proto !== null;
      const hasMetadata = demand !== "-" || trend !== "-";
      if (!hasValue && !hasMetadata) return;

      items.push({
        name,
        trueVal,
        tradeHub,
        proto,
        demand,
        trend,
      });
    });

    // Post-scrape filter: remove items with ALL null values and no metadata
    const beforeFilter = items.length;
    const filteredItems = items.filter((item) => {
      const hasValue = item.trueVal !== null || item.tradeHub !== null || item.proto !== null;
      const hasMetadata = item.demand !== "-" || item.trend !== "-";
      return hasValue || hasMetadata;
    });

    // Replace items array content with filtered results
    items.length = 0;
    items.push(...filteredItems);

    const removedCount = beforeFilter - items.length;
    if (removedCount > 0) {
      console.log(`🧹 Filtered out ${removedCount} items with no data (all N/A)`);
    }

    console.log(`📦 Total items: ${items.length} (${fullCardCount} full + ${items.length - fullCardCount} list)`);

    if (items.length < 100) {
      console.error(`⚠️ Only scraped ${items.length} items (expected 500+) — partial load, keeping old data.`);
      return { success: false, changes: null };
    }

    // Load old data for comparison
    let oldItems = [];
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        oldItems = JSON.parse(raw).items || [];
      }
    } catch (e) { /* No old data */ }

    const changes = oldItems.length > 0 ? detectChanges(oldItems, items) : null;

    // Safety check: never report removals — game.guide HTML is inconsistent between loads
    if (changes && changes.removed.length > 0) {
      console.log(`⏭️ Ignoring ${changes.removed.length} "removed" items (scrape variance, not real removals)`);
      changes.removed = [];
    }

    // Save new data
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(DATA_FILE, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      source: SOURCE_URL,
      count: items.length,
      items,
    }, null, 2), "utf8");

    console.log(`✅ Synced ${items.length} items from game.guide (${new Date().toLocaleString()})`);
    if (changes) {
      const total = changes.updated.length + changes.added.length + changes.removed.length;
      if (total > 0) console.log(`📊 Changes: ${changes.updated.length} updated, ${changes.added.length} added, ${changes.removed.length} removed`);
    }

    return { success: true, changes };
  } catch (error) {
    console.error("❌ Scrape failed:", error.message);
    return { success: false, changes: null };
  }
}

/**
 * Load items from the saved JSON file. Falls back to hardcoded values.
 * @returns {Array} Array of item objects
 */
function loadItems() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const data = JSON.parse(raw);
      console.log(`📦 Loaded ${data.count} items (last synced: ${data.lastUpdated})`);
      return data.items;
    }
  } catch (e) {
    console.error("⚠️ Failed to load JSON data, using fallback:", e.message);
  }
  const fallback = require("../../values");
  console.log(`📦 Using fallback data (${fallback.length} items)`);
  return fallback;
}

module.exports = { scrapeValues, loadItems, DATA_FILE };
