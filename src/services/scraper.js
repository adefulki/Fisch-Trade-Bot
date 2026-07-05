/**
 * Web scraper for game.guide Fisch value list.
 * Uses Puppeteer for JS-rendered content, with axios/cheerio fallback.
 * Fetches, parses cards, detects changes.
 */

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { formatVal } = require("../utils/format");

let puppeteer;
try {
  puppeteer = require("puppeteer");
} catch (e) {
  try {
    puppeteer = require("puppeteer-core");
  } catch (e2) {
    puppeteer = null;
  }
}

/** Path to the current values JSON file (supports Railway Volume) */
const DATA_DIR = process.env.VOLUME_PATH || path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "values.json");
const SOURCE_URL = "https://www.game.guide/fisch-value-list";

/**
 * Parse a value string like "S$ 4.5M", "S$ 300K", "S$ 1.57M" into a number.
 * @param {string} str - The value string to parse
 * @returns {number|null} Parsed number or null if N/A
 */
function parseValue(str) {
  if (!str || str === "N/A" || str === "TBD") return null;
  str = str.replace("S$", "").replace(/,/g, "").trim();
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
  str = str.replace(/,/g, "").trim();
  if (str.toUpperCase().includes("K")) {
    return parseFloat(str) * 1000 || null;
  }
  return parseFloat(str) || null;
}

/**
 * Compare two item objects and return a list of field-level changes.
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

// ────────────────────────────────────────────────────────────
// Page fetching (Puppeteer with axios fallback)
// ────────────────────────────────────────────────────────────

/**
 * Auto-scroll a Puppeteer page to trigger lazy-loaded content.
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight || totalHeight > 50000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
  await new Promise((r) => setTimeout(r, 2000));
}

/**
 * Fetch the page HTML using Puppeteer (handles JS-rendered pages).
 * Falls back to axios if Puppeteer is not installed.
 * @returns {string} Page HTML
 */
async function fetchPageHtml() {
  if (puppeteer) {
    console.log("🌐 Using Puppeteer for JS-rendered page...");
    let browser;
    try {
      const launchOptions = {
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      };
      if (process.env.CHROME_PATH) {
        launchOptions.executablePath = process.env.CHROME_PATH;
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36");
      await page.goto(SOURCE_URL, { waitUntil: "networkidle2", timeout: 60000 });

      // Wait for card content to appear
      await page.waitForFunction(
        () => document.body.innerText.includes("TrueVal") || document.querySelectorAll('[class*="card"]').length > 10,
        { timeout: 30000 }
      ).catch(() => console.log("⏱️ Timed out waiting for cards, using current content..."));

      // Scroll to load all lazy content
      await autoScroll(page);

      const html = await page.content();
      await browser.close();
      console.log(`📄 Got ${(html.length / 1024).toFixed(0)}KB of rendered HTML`);
      return html;
    } catch (error) {
      console.error("⚠️ Puppeteer failed, falling back to axios:", error.message);
      if (browser) await browser.close().catch(() => {});
    }
  } else {
    console.log("ℹ️ Puppeteer not installed — using axios (may miss JS-rendered content)");
  }

  // Fallback: axios
  const { data: html } = await axios.get(SOURCE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" },
    timeout: 30000,
  });
  console.log(`📄 Got ${(html.length / 1024).toFixed(0)}KB of HTML via axios`);
  return html;
}

// ────────────────────────────────────────────────────────────
// Main scraper
// ────────────────────────────────────────────────────────────

/**
 * Scrape the Fisch value list from game.guide.
 * Handles the new card design (2025+) where each card shows:
 *   - Demand/Trend at the top
 *   - Item name in the middle
 *   - TrueVal, Trade Hub, Proto as separate rows
 * @returns {{success: boolean, changes: object|null}}
 */
async function scrapeValues() {
  console.log("🔄 Scraping Fisch values from game.guide...");

  try {
    const html = await fetchPageHtml();
    const $ = cheerio.load(html);
    const items = [];

    // ─── Method 1: Card containers with TrueVal data ───
    // Find elements containing "TrueVal" and walk up to find the card container
    const cardElements = new Set();

    $('*:contains("TrueVal")').each((_, el) => {
      const $el = $(el);
      // Only match leaf-ish elements (not the whole page body)
      if ($el.children().length > 20) return;

      // Walk up to find the card: look for a link to item page or a card-like wrapper
      const parentLink = $el.closest('a[href*="-value-fisch"]');
      if (parentLink.length) {
        cardElements.add(parentLink[0]);
        return;
      }
      // Check parent containers
      let container = $el;
      for (let i = 0; i < 5; i++) {
        container = container.parent();
        if (!container.length) break;
        if (container.find('a[href*="-value-fisch"]').length === 1) {
          cardElements.add(container[0]);
          break;
        }
      }
    });

    cardElements.forEach((el) => {
      const card = $(el);
      const cardText = card.text().trim();
      if (!cardText.includes("TrueVal")) return;

      // Extract values — flexible patterns for new card design
      const trueValMatch = cardText.match(/TrueVal:?\s*(S\$\s*[\d,.]+[MK]?|N\/A)/i);
      const tradeHubMatch = cardText.match(/Trade\s*Hub:?\s*(S\$\s*[\d,.]+[MK]?|N\/A)/i);
      const protoMatch = cardText.match(/Proto:?\s*([\d,.]+\s*K?|N\/A|TBD)/i);
      const demandMatch = cardText.match(/(Very Low|Very High|Low|Medium|High|Limited)/i);
      const trendMatch = cardText.match(/\b(Rising|Stable|Dropping|Unstable)\b/i);

      // Extract item name
      let itemName = "";

      // Strategy 1: heading element inside card
      const heading = card.find("h2, h3, h4, h5, [class*='name'], [class*='title']");
      if (heading.length) {
        itemName = heading.first().text().trim();
      }

      // Strategy 2: text before "TrueVal:"
      if (!itemName) {
        const nameMatch = cardText.match(/^([\s\S]*?)\s*TrueVal/);
        if (nameMatch) {
          let rawName = nameMatch[1].trim();
          // Remove time stamps like "10h ago"
          rawName = rawName.replace(/\d+[hmd]\s*ago/gi, "").trim();
          // Remove demand/trend words that appear before the name
          rawName = rawName.replace(/(Very Low|Very High|Low|Medium|High|Limited|Rising|Stable|Dropping|Unstable)/gi, "").trim();
          // Remove special chars / emoji
          rawName = rawName.replace(/[📈📉⚡➡️🕐⏰🔥⭐💎]/gu, "").trim();
          // Remove leading/trailing special chars
          rawName = rawName.replace(/^[\s\-—|]+|[\s\-—|]+$/g, "").trim();
          itemName = rawName;
        }
      }

      // Strategy 3: extract from the link href slug
      if (!itemName) {
        const link = card.is("a") ? card : card.find('a[href*="-value-fisch"]').first();
        const href = link.attr("href") || "";
        const slugMatch = href.match(/\/([^/]+)-value-fisch/);
        if (slugMatch) {
          itemName = slugMatch[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }

      itemName = cleanItemName(itemName);
      if (!itemName || itemName.length < 2) return;

      const item = {
        name: itemName,
        trueVal: trueValMatch ? parseValue(trueValMatch[1]) : null,
        tradeHub: tradeHubMatch ? parseValue(tradeHubMatch[1]) : null,
        proto: protoMatch ? parseProto(protoMatch[1]) : null,
        demand: demandMatch ? demandMatch[1] : "-",
        trend: trendMatch ? trendMatch[1] : "-",
      };

      if (!items.find((i) => i.name.toLowerCase() === item.name.toLowerCase())) {
        items.push(item);
      }
    });

    // ─── Method 2: Legacy inline text (older page format) ───
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
      if (items.find((i) => i.name.toLowerCase() === itemName.toLowerCase())) return;

      items.push({
        name: itemName,
        trueVal: trueValMatch ? parseValue(trueValMatch[1]) : null,
        tradeHub: tradeHubMatch ? parseValue(tradeHubMatch[1]) : null,
        proto: protoMatch ? parseProto(protoMatch[1]) : null,
        demand: demandMatch ? demandMatch[1] : "-",
        trend: trendMatch ? trendMatch[1] : "-",
      });
    });

    const fullCardCount = items.length;
    console.log(`📦 Parsed ${fullCardCount} full cards`);

    // ─── Method 3: List items (<li> with link + value) ───
    $("li").each((_, el) => {
      const link = $(el).find('a[href*="-value-fisch"]');
      if (!link.length) return;

      const name = link.text().trim();
      if (!name || name.length < 2) return;
      if (items.find((i) => i.name.toLowerCase() === name.toLowerCase())) return;

      const span = $(el).find("span");
      const valueText = span.text().trim();
      const value = parseInt(valueText.replace(/,/g, "")) || 0;

      const liText = $(el).text().trim();
      const demandMatch = liText.match(/(Very Low|Very High|Low|Medium|High|Limited)/i);
      const trendMatch = liText.match(/\b(Rising|Stable|Dropping|Unstable)\b/i);

      let trueVal = null;
      let proto = null;
      if (value >= 5000) trueVal = value;
      else if (value > 0) proto = value;

      const demand = demandMatch ? demandMatch[1] : "-";
      const trend = trendMatch ? trendMatch[1] : "-";

      const hasValue = trueVal !== null || proto !== null;
      const hasMetadata = demand !== "-" || trend !== "-";
      if (!hasValue && !hasMetadata) return;

      items.push({ name, trueVal, tradeHub: null, proto, demand, trend });
    });

    // ─── Method 4: Remaining links with parent context (catch stragglers) ───
    $('a[href*="-value-fisch"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href.includes("-value-fisch")) return;

      const name = $(el).text().trim();
      if (!name || name.length < 2) return;
      if (name.includes("TrueVal:") || name.includes("Demand:")) return;
      if (name.includes("Value List") || name.includes("Back to")) return;
      if (name.length > 50 || name.split(" ").length > 6) return;
      if (items.find((i) => i.name.toLowerCase() === name.toLowerCase())) return;

      // Check parent containers for data
      const container = $(el).parent().parent();
      const text = container.text().trim();
      const trueValMatch = text.match(/TrueVal:?\s*(S\$\s*[\d,.]+[MK]?)/i);
      const tradeHubMatch = text.match(/Trade\s*Hub:?\s*(S\$\s*[\d,.]+[MK]?)/i);
      const protoMatch = text.match(/Proto:?\s*([\d,.]+\s*K?)/i);
      const demandMatch = text.match(/(Very Low|Very High|Low|Medium|High|Limited)/i);
      const trendMatch = text.match(/\b(Rising|Stable|Dropping|Unstable)\b/i);

      const trueVal = trueValMatch ? parseValue(trueValMatch[1]) : null;
      const tradeHub = tradeHubMatch ? parseValue(tradeHubMatch[1]) : null;
      const proto = protoMatch ? parseProto(protoMatch[1]) : null;
      const demand = demandMatch ? demandMatch[1] : "-";
      const trend = trendMatch ? trendMatch[1] : "-";

      // Only add if there's at least ONE useful field
      const hasValue = trueVal !== null || tradeHub !== null || proto !== null;
      const hasMetadata = demand !== "-" || trend !== "-";
      if (!hasValue && !hasMetadata) return;

      items.push({ name, trueVal, tradeHub, proto, demand, trend });
    });

    // ─── Post-scrape: filter out all-N/A items ───
    const beforeFilter = items.length;
    const filtered = items.filter((item) => {
      const hasValue = item.trueVal !== null || item.tradeHub !== null || item.proto !== null;
      const hasMetadata = item.demand !== "-" || item.trend !== "-";
      return hasValue || hasMetadata;
    });
    items.length = 0;
    items.push(...filtered);

    if (beforeFilter - items.length > 0) {
      console.log(`🧹 Filtered out ${beforeFilter - items.length} items with no data`);
    }

    console.log(`📦 Total items: ${items.length} (${fullCardCount} full cards + ${items.length - fullCardCount} list/links)`);

    if (items.length < 50) {
      console.error(`⚠️ Only scraped ${items.length} items — site may have changed or JS didn't render. Keeping old data.`);
      if (!puppeteer) {
        console.error(`💡 Tip: Install puppeteer (npm i puppeteer) to handle JS-rendered pages.`);
      }
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

    // Safety: ignore removals (HTML can be inconsistent between loads)
    if (changes && changes.removed.length > 0) {
      console.log(`⏭️ Ignoring ${changes.removed.length} "removed" items (scrape variance)`);
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
      const total = changes.updated.length + changes.added.length;
      if (total > 0) console.log(`📊 Changes: ${changes.updated.length} updated, ${changes.added.length} added`);
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
