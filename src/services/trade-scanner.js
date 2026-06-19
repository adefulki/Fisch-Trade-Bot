/**
 * Trade listing scanner.
 * Scrapes live trade listings from game.guide/trading/fisch
 * and finds W (win) trades for monitored items.
 */

const axios = require("axios");
const cheerio = require("cheerio");

const TRADE_HUB_URL = "https://www.game.guide/trading/fisch";

/**
 * Scrape current trade listings from game.guide trading hub.
 * Extracts: offering items, wanting items, win/lose percentage, listing URL.
 * @returns {Array<{offering: string[], wanting: string[], verdict: string, percentage: number, url: string, trader: string}>}
 */
async function scrapeTradeListings() {
  console.log("🔍 Scanning trade listings from game.guide...");

  try {
    const { data: html } = await axios.get(TRADE_HUB_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      timeout: 20000,
    });

    // game.guide renders via JS, try fetching rendered version
    // The listings are in <a> tags linking to /trading/listing/
    const $ = cheerio.load(html);
    const listings = [];

    $('a[href*="/trading/listing/"]').each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (!text || !href) return;

      // Parse listing text — format varies:
      // "TraderName ... TRADE WIN +28% 340K → 265K OFFERING [items] WANTS [items]"
      // "TraderName ... TRADE LOSE -16% ... OFFERING [items] WANTS [items]"
      // "TraderName ... TRADE OPEN TO OFFERS ... OFFERING [items] WANTS Offers"

      const listing = parseListing(text, href);
      if (listing) listings.push(listing);
    });

    console.log(`🔍 Scanned ${listings.length} trade listings`);
    return listings;
  } catch (error) {
    console.error("❌ Trade scan failed:", error.message);
    return [];
  }
}

/**
 * Parse a single listing text into structured data.
 * @param {string} text - Raw listing text
 * @param {string} href - Listing URL path
 * @returns {object|null} Parsed listing or null
 */
function parseListing(text, href) {
  // Detect verdict (WIN/LOSE/FAIR)
  let verdict = "unknown";
  let percentage = 0;

  const winMatch = text.match(/WIN\s*\+(\d+)%/i);
  const loseMatch = text.match(/LOSE\s*-(\d+)%/i);

  if (winMatch) {
    verdict = "WIN";
    percentage = parseInt(winMatch[1]);
  } else if (loseMatch) {
    verdict = "LOSE";
    percentage = -parseInt(loseMatch[1]);
  } else if (text.includes("OPEN TO OFFERS")) {
    verdict = "OPEN";
  }

  // Extract offering and wanting items
  // Pattern: "OFFERING [items] WANTS [items]"
  const offeringMatch = text.match(/OFFERING\s+(.+?)\s+WANTS\s+(.+?)$/i);
  if (!offeringMatch) return null;

  const offeringRaw = offeringMatch[1].trim();
  const wantingRaw = offeringMatch[2].trim();

  // Items are repeated (name appears twice in the text: "Evangeline Evangeline")
  // Split and deduplicate
  const offering = extractItemNames(offeringRaw);
  const wanting = extractItemNames(wantingRaw);

  if (offering.length === 0) return null;

  // Extract trader name (first word before "Trader" or status)
  const traderMatch = text.match(/^(.+?)\s+(New Trader|Trader|Pro Trader|Veteran Trader)/i);
  const trader = traderMatch ? traderMatch[1].trim() : "Unknown";

  return {
    offering,
    wanting,
    verdict,
    percentage,
    url: `https://www.game.guide${href}`,
    trader,
  };
}

/**
 * Extract item names from a raw listing string.
 * Items appear doubled (e.g. "Evangeline Evangeline The Reaper The Reaper").
 * Also handles "x2", "x3" quantities.
 * @param {string} raw - Raw item string
 * @returns {string[]} Array of item names
 */
function extractItemNames(raw) {
  if (!raw || raw === "Offers" || raw === "Adds") return [];

  // Remove quantity markers and "Adds"
  raw = raw.replace(/\bAdds\b/gi, "").trim();

  // Known items will be matched against the database later
  // For now, split by double-name pattern or known separators
  // Items appear as "ItemName ItemName" (duplicated)
  const names = [];
  const words = raw.split(/\s+/);

  let i = 0;
  while (i < words.length) {
    // Try to find where an item name repeats
    // Check increasing window sizes
    let found = false;
    for (let len = 1; len <= Math.min(4, words.length - i); len++) {
      const candidate = words.slice(i, i + len).join(" ");
      const next = words.slice(i + len, i + len + len).join(" ");
      if (candidate === next && candidate.length > 1) {
        // Handle "x2" after the name
        const afterIdx = i + len + len;
        let qty = 1;
        if (afterIdx < words.length && words[afterIdx].match(/^x\d+$/i)) {
          qty = parseInt(words[afterIdx].replace(/x/i, ""));
          i = afterIdx + 1;
        } else {
          i = i + len + len;
        }
        for (let q = 0; q < qty; q++) names.push(candidate);
        found = true;
        break;
      }
    }
    if (!found) {
      // Single word that doesn't repeat — might be part of a longer name or "Adds"
      i++;
    }
  }

  return names;
}

/**
 * Find trade deals relevant to a user's portfolio items.
 * Matches when someone WANTS items the user owns AND it's a WIN trade for the giver.
 * Example: User owns Final Census + Seastrum. Listing wants those and offers Curse IV at WIN +61%.
 * → User should be alerted (they can give their items and get something worth much more).
 * @param {Array} listings - Scraped trade listings
 * @param {Array} portfolioItems - Item names the user owns
 * @returns {Array} Matching listings with deal type
 */
function findDealsForUser(listings, portfolioItems) {
  const ownedNames = portfolioItems.map((i) => i.toLowerCase());

  return listings
    .filter((listing) => {
      // They WANT my items and it's a WIN for the giver (me)
      // "WIN +X%" on game.guide means the person OFFERING gets more value
      // So if they're offering Curse IV and want my Final Census + Seastrum at WIN +61%,
      // it means giving Final+Seastrum gets me Curse IV (a win for me)
      if (listing.verdict === "WIN" && listing.percentage >= 15) {
        const theyWantMyItems = listing.wanting.some((wanted) =>
          ownedNames.some((owned) =>
            wanted.toLowerCase().includes(owned) || owned.includes(wanted.toLowerCase())
          )
        );
        if (theyWantMyItems) return true;
      }

      // OPEN trades that want my items (negotiable deals)
      if (listing.verdict === "OPEN") {
        const theyWantMyItems = listing.wanting.some((wanted) =>
          ownedNames.some((owned) =>
            wanted.toLowerCase().includes(owned) || owned.includes(wanted.toLowerCase())
          )
        );
        if (theyWantMyItems) return true;
      }

      return false;
    })
    .map((listing) => ({
      ...listing,
      dealType: listing.verdict === "WIN" ? "sell" : "negotiate",
    }));
}

module.exports = { scrapeTradeListings, findDealsForUser };
