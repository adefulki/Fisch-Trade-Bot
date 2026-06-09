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

    // Each item entry on game.guide follows the pattern:
    // "[Item Name] TrueVal: [X] Trade Hub: [X] Proto: [X] Demand: [X] Trend: [X]"
    // They are inside <a> tags linking to individual item pages
    $("a[href*='-value-fisch']").each((_, el) => {
      const text = $(el).text().trim();
      if (!text) return;

      // Extract values using regex
      const trueValMatch = text.match(/TrueVal:\s*(S\$\s*[\d.]+[MK]?|N\/A)/i);
      const tradeHubMatch = text.match(/Trade Hub:\s*(S\$\s*[\d.]+[MK]?|N\/A)/i);
      const protoMatch = text.match(/Proto:\s*([\d.]+\s*K?|N\/A|TBD)/i);
      const demandMatch = text.match(/Demand:\s*(Very Low|Low|Medium|High|Limited|-)/i);
      const trendMatch = text.match(/Trend:\s*(Rising|Stable|Dropping|Unstable|-)/i);

      if (!demandMatch && !trendMatch) return; // Not a valid item entry

      // Extract item name (everything before "TrueVal:")
      const nameMatch = text.match(/^(.+?)\s*TrueVal:/);
      if (!nameMatch) return;

      // The name is doubled in the text (e.g. "Evangeline Evangeline TrueVal:...")
      let rawName = nameMatch[1].trim();
      // Remove the duplicate: if name is "Xxx Xxx", take first half
      // But handle multi-word names like "Curse IV Curse IV"
      const half = Math.ceil(rawName.length / 2);
      const firstHalf = rawName.substring(0, half).trim();
      const secondHalf = rawName.substring(half).trim();
      
      // More robust: split and check if first half equals second half
      let itemName = rawName;
      if (rawName.length > 2) {
        // Try to find the point where the name repeats
        for (let i = 1; i <= Math.floor(rawName.length / 2) + 1; i++) {
          const candidate = rawName.substring(0, i).trim();
          const rest = rawName.substring(i).trim();
          if (candidate === rest) {
            itemName = candidate;
            break;
          }
        }
      }

      // Handle names starting with "NEW " prefix
      itemName = itemName.replace(/^NEW\s*/i, "").trim();
      // Handle names starting with "? " prefix  
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

      // Avoid duplicates (keep first occurrence which has higher value)
      const exists = items.find(
        (i) => i.name.toLowerCase() === item.name.toLowerCase()
      );
      if (!exists) {
        items.push(item);
      }
    });

    if (items.length < 10) {
      console.error(`⚠️ Only scraped ${items.length} items — something may be wrong. Keeping old data.`);
      return false;
    }

    // Save to JSON file
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
    return true;
  } catch (error) {
    console.error("❌ Scrape failed:", error.message);
    return false;
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

  // Fallback to hardcoded values
  const fallback = require("./values");
  console.log(`📦 Using fallback data (${fallback.length} items)`);
  return fallback;
}

module.exports = { scrapeValues, loadItems, DATA_FILE };
