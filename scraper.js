const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data", "values.json");
const SOURCE_URL = "https://www.game.guide/fisch-value-list";

// Parse value strings like "S$ 4.5M", "S$ 300K", "N/A"
function parseValue(str) {
  if (!str || str === "N/A" || str === "TBD") return null;
  str = str.replace("S$", "").trim();
  if (str.includes("M")) return Math.round(parseFloat(str) * 1000000);
  if (str.includes("K")) return Math.round(parseFloat(str) * 1000);
  return parseInt(str) || null;
}

// Parse proto value (can be "4K", "2.5K", or plain "725", "8.3")
function parseProto(str) {
  if (!str || str === "N/A" || str === "TBD") return null;
  str = str.trim();
  if (str.toUpperCase().includes("K")) {
    return parseFloat(str) * 1000 || null;
  }
  return parseFloat(str) || null;
}

// Format value for display
function formatVal(num) {
  if (num === null || num === undefined) return "N/A";
  if (num >= 1000000) return `S$ ${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `S$ ${(num / 1000).toFixed(1)}K`;
  return `S$ ${num}`;
}

// Compare two items and return list of changes
function compareItem(oldItem, newItem) {
  const changes = [];

  if (oldItem.trueVal !== newItem.trueVal) {
    changes.push({ field: "TrueVal", before: formatVal(oldItem.trueVal), after: formatVal(newItem.trueVal) });
  }
  if (oldItem.tradeHub !== newItem.tradeHub) {
    changes.push({ field: "Trade Hub", before: formatVal(oldItem.tradeHub), after: formatVal(newItem.tradeHub) });
  }
  if (oldItem.proto !== newItem.proto) {
    changes.push({ field: "Proto", before: oldItem.proto !== null ? String(oldItem.proto) : "N/A", after: newItem.proto !== null ? String(newItem.proto) : "N/A" });
  }
  if (oldItem.demand !== newItem.demand) {
    changes.push({ field: "Demand", before: oldItem.demand, after: newItem.demand });
  }
  if (oldItem.trend !== newItem.trend) {
    changes.push({ field: "Trend", before: oldItem.trend, after: newItem.trend });
  }

  return changes;
}

// Detect differences between old and new item lists
function detectChanges(oldItems, newItems) {
  const changes = {
    updated: [],  // { name, changes: [{ field, before, after }] }
    added: [],    // { name, ...item }
    removed: [],  // { name }
  };

  const oldMap = new Map(oldItems.map((i) => [i.name.toLowerCase(), i]));
  const newMap = new Map(newItems.map((i) => [i.name.toLowerCase(), i]));

  // Check for updates and new items
  for (const newItem of newItems) {
    const key = newItem.name.toLowerCase();
    const oldItem = oldMap.get(key);

    if (!oldItem) {
      changes.added.push(newItem);
    } else {
      const diffs = compareItem(oldItem, newItem);
      if (diffs.length > 0) {
        changes.updated.push({ name: newItem.name, changes: diffs });
      }
    }
  }

  // Check for removed items
  for (const oldItem of oldItems) {
    const key = oldItem.name.toLowerCase();
    if (!newMap.has(key)) {
      changes.removed.push({ name: oldItem.name });
    }
  }

  return changes;
}

async function scrapeValues() {
  console.log("🔄 Scraping Fisch values from game.guide...");

  try {
    const { data: html } = await axios.get(SOURCE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 30000,
    });

    const $ = cheerio.load(html);
    const items = [];

    $("a[href*='-value-fisch']").each((_, el) => {
      const text = $(el).text().trim();
      if (!text) return;

      const trueValMatch = text.match(/TrueVal:\s*(S\$\s*[\d.]+[MK]?|N\/A)/i);
      const tradeHubMatch = text.match(/Trade Hub:\s*(S\$\s*[\d.]+[MK]?|N\/A)/i);
      const protoMatch = text.match(/Proto:\s*([\d.]+\s*K?|N\/A|TBD)/i);
      const demandMatch = text.match(/Demand:\s*(Very Low|Low|Medium|High|Limited|-)/i);
      const trendMatch = text.match(/Trend:\s*(Rising|Stable|Dropping|Unstable|-)/i);

      if (!demandMatch && !trendMatch) return;

      const nameMatch = text.match(/^(.+?)\s*TrueVal:/);
      if (!nameMatch) return;

      let rawName = nameMatch[1].trim();
      let itemName = rawName;
      if (rawName.length > 2) {
        for (let i = 1; i <= Math.floor(rawName.length / 2) + 1; i++) {
          const candidate = rawName.substring(0, i).trim();
          const rest = rawName.substring(i).trim();
          if (candidate === rest) {
            itemName = candidate;
            break;
          }
        }
      }

      itemName = itemName.replace(/^NEW\s*/i, "").trim();
      itemName = itemName.replace(/^\?\s*/, "").trim();

      if (!itemName || itemName.length < 2) return;

      const item = {
        name: itemName,
        trueVal: trueValMatch ? parseValue(trueValMatch[1]) : null,
        tradeHub: tradeHubMatch ? parseValue(tradeHubMatch[1]) : null,
        proto: protoMatch ? parseProto(protoMatch[1]) : null,
        demand: demandMatch ? demandMatch[1] : "-",
        trend: trendMatch ? trendMatch[1] : "-",
      };

      const exists = items.find(
        (i) => i.name.toLowerCase() === item.name.toLowerCase()
      );
      if (!exists) {
        items.push(item);
      }
    });

    if (items.length < 10) {
      console.error(`⚠️ Only scraped ${items.length} items — something may be wrong. Keeping old data.`);
      return { success: false, changes: null };
    }

    // Load old data for comparison
    let oldItems = [];
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        const data = JSON.parse(raw);
        oldItems = data.items || [];
      }
    } catch (e) {
      // No old data, treat all as new
    }

    // Detect changes
    const changes = oldItems.length > 0 ? detectChanges(oldItems, items) : null;

    // Save new data
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const output = {
      lastUpdated: new Date().toISOString(),
      source: SOURCE_URL,
      count: items.length,
      items: items,
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2), "utf8");
    console.log(`✅ Synced ${items.length} items from game.guide (${new Date().toLocaleString()})`);

    if (changes) {
      const totalChanges = changes.updated.length + changes.added.length + changes.removed.length;
      console.log(`📊 Changes detected: ${changes.updated.length} updated, ${changes.added.length} added, ${changes.removed.length} removed`);
    }

    return { success: true, changes };
  } catch (error) {
    console.error("❌ Scrape failed:", error.message);
    return { success: false, changes: null };
  }
}

// Load items from JSON file (falls back to hardcoded values.js)
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

  const fallback = require("./values");
  console.log(`📦 Using fallback data (${fallback.length} items)`);
  return fallback;
}

// Format changes into Discord message(s)
function formatChangesMessage(changes) {
  if (!changes) return null;

  const totalChanges = changes.updated.length + changes.added.length + changes.removed.length;
  if (totalChanges === 0) return null;

  const lines = [];
  lines.push(`📢 **FISCH VALUE UPDATE** — ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} WIB`);
  lines.push(``);

  // New items
  if (changes.added.length > 0) {
    lines.push(`🆕 **NEW ITEMS** (${changes.added.length})`);
    for (const item of changes.added.slice(0, 10)) {
      lines.push(`> • **${item.name}** — TrueVal: ${formatVal(item.trueVal)} | Trade Hub: ${formatVal(item.tradeHub)} | Proto: ${item.proto || "N/A"} | Demand: ${item.demand} | Trend: ${item.trend}`);
    }
    if (changes.added.length > 10) {
      lines.push(`> *...and ${changes.added.length - 10} more*`);
    }
    lines.push(``);
  }

  // Updated items (only show significant changes)
  if (changes.updated.length > 0) {
    lines.push(`📈 **VALUE CHANGES** (${changes.updated.length})`);
    for (const item of changes.updated.slice(0, 15)) {
      const changeStr = item.changes
        .map((c) => `${c.field}: ${c.before} → **${c.after}**`)
        .join(" | ");
      lines.push(`> • **${item.name}** — ${changeStr}`);
    }
    if (changes.updated.length > 15) {
      lines.push(`> *...and ${changes.updated.length - 15} more*`);
    }
    lines.push(``);
  }

  // Removed items
  if (changes.removed.length > 0) {
    lines.push(`❌ **REMOVED** (${changes.removed.length})`);
    for (const item of changes.removed.slice(0, 5)) {
      lines.push(`> • ${item.name}`);
    }
    if (changes.removed.length > 5) {
      lines.push(`> *...and ${changes.removed.length - 5} more*`);
    }
    lines.push(``);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*Source: game.guide/fisch-value-list*`);

  // Split into chunks if too long for Discord (2000 char limit)
  const fullMessage = lines.join("\n");
  if (fullMessage.length <= 2000) {
    return [fullMessage];
  }

  // Split into multiple messages
  const messages = [];
  let current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > 1900) {
      messages.push(current);
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) messages.push(current);
  return messages;
}

module.exports = { scrapeValues, loadItems, formatChangesMessage, DATA_FILE };
