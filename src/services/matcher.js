/**
 * Fuzzy item name matcher.
 * Supports aliases, abbreviations, partial words, condensed names, and typo tolerance.
 */

const { ALIASES, ROMAN_MAP } = require("../utils/constants");

/** @type {Array} Reference to the live items array, set via setItems() */
let items = [];

/**
 * Update the item list used for matching.
 * Called after each sync to keep matcher in sync with fresh data.
 * @param {Array} newItems - Array of item objects with .name property
 */
function setItems(newItems) {
  items = newItems;
}

/**
 * Normalize a query by expanding aliases and converting numbers to roman numerals.
 * @param {string} q - Raw query string (lowercase)
 * @returns {string} Normalized query ready for matching
 */
function normalizeQuery(q) {
  // Check alias table first
  const aliased = ALIASES[q.toLowerCase().trim()];
  if (aliased) return aliased.toLowerCase();

  // Convert trailing numbers to roman numerals (e.g. "curse 3" → "curse iii")
  const trailingNum = q.match(/^(.+?)\s*(\d+)$/);
  if (trailingNum) {
    const roman = ROMAN_MAP[trailingNum[2]];
    if (roman) {
      return `${trailingNum[1].trim()} ${roman}`;
    }
  }

  return q;
}

/**
 * Recursive helper: check if a query string can be split into prefixes of consecutive name words.
 * Used for condensed abbreviations like "crev" → "Cthulu's Revenge".
 * @param {string} query - The query to split
 * @param {string[]} nameWords - Array of words from item name
 * @param {number} qPos - Current position in query
 * @param {number} nPos - Current position in nameWords
 * @returns {boolean} True if query can be fully split across name words
 */
function trySplitMatch(query, nameWords, qPos, nPos) {
  if (qPos >= query.length) return nPos > 0;
  if (nPos >= nameWords.length) return false;

  const word = nameWords[nPos];
  for (let take = 1; take <= query.length - qPos; take++) {
    const chunk = query.substring(qPos, qPos + take);
    if (word.startsWith(chunk)) {
      if (qPos + take >= query.length) return true;
      if (trySplitMatch(query, nameWords, qPos + take, nPos + 1)) return true;
    } else {
      break;
    }
  }
  // Try skipping this name word (e.g. skip "of" in "Puff of Heaven")
  return trySplitMatch(query, nameWords, qPos, nPos + 1);
}

/**
 * Calculate the Levenshtein edit distance between two strings.
 * Used for typo tolerance matching.
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} The edit distance
 */
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Find an item by fuzzy matching a user query against the items database.
 * Matching priority: alias → exact → clean exact → all words → initials →
 * substring → sequential prefix → unordered prefix → single prefix →
 * condensed → levenshtein typo tolerance.
 * @param {string} query - User's input string
 * @returns {object|null} The matched item object, or null if not found
 */
function findItem(query) {
  const q = normalizeQuery(query.trim().toLowerCase());
  if (!q) return null;

  // 1. Exact match
  const exact = items.find((i) => i.name.toLowerCase() === q);
  if (exact) return exact;

  // 2. Exact match ignoring apostrophes/special chars
  const qClean = q.replace(/[''`\-]/g, "").replace(/\s+/g, " ");
  const exactClean = items.find(
    (i) => i.name.toLowerCase().replace(/[''`\-]/g, "").replace(/\s+/g, " ") === qClean
  );
  if (exactClean) return exactClean;

  // 3. All words in query appear in item name
  const qWords = q.split(/\s+/);
  const allWordsMatch = items.find((i) => {
    const nameLower = i.name.toLowerCase();
    const nameClean = nameLower.replace(/[''`\-]/g, "");
    return qWords.every((w) => nameLower.includes(w) || nameClean.includes(w));
  });
  if (allWordsMatch) return allWordsMatch;

  // 4. Initials abbreviation (e.g. "stb" → "Slime Trade Booth")
  const qNoSpace = q.replace(/\s+/g, "");
  if (qNoSpace.length >= 3) {
    const abbrMatch = items.find((i) => {
      const initials = i.name.split(/[\s\-]+/).map((w) => w[0]).join("").toLowerCase();
      return initials === qNoSpace;
    });
    if (abbrMatch) return abbrMatch;
  }

  // 5. Substring match
  const substring = items.find((i) => i.name.toLowerCase().includes(q));
  if (substring) return substring;
  const reverse = items.find((i) => q.includes(i.name.toLowerCase()));
  if (reverse) return reverse;

  // 6. Sequential prefix match (e.g. "cya demon" → "Cyanic Demonride")
  if (qWords.length >= 2) {
    const startsWith = items.find((i) => {
      const nameWords = i.name.toLowerCase().split(/[\s\-]+/);
      let qi = 0;
      for (const nw of nameWords) {
        if (qi < qWords.length && nw.startsWith(qWords[qi])) qi++;
      }
      return qi === qWords.length;
    });
    if (startsWith) return startsWith;
  }

  // 6b. Unordered prefix with short abbreviation support (e.g. "rb sera" → "Seraphic Rainbow")
  if (qWords.length >= 2) {
    const unorderedPrefix = items.find((i) => {
      const nameWords = i.name.toLowerCase().split(/[\s\-]+/);
      const used = new Set();
      return qWords.every((qw) => {
        const idx = nameWords.findIndex((nw, ni) => {
          if (used.has(ni)) return false;
          if (nw.startsWith(qw)) return true;
          // 2-char abbreviation: first char + another char in word
          if (qw.length === 2 && nw[0] === qw[0] && nw.includes(qw[1])) return true;
          // 3-char: first char + remaining chars appear in order
          if (qw.length === 3 && nw[0] === qw[0]) {
            let pos = 1;
            for (let ci = 1; ci < nw.length && pos < qw.length; ci++) {
              if (nw[ci] === qw[pos]) pos++;
            }
            if (pos === qw.length) return true;
          }
          return false;
        });
        if (idx !== -1) { used.add(idx); return true; }
        return false;
      });
    });
    if (unorderedPrefix) return unorderedPrefix;
  }

  // 7. Single word prefix match (e.g. "evan" → "Evangeline")
  if (qWords.length === 1 && q.length >= 3) {
    const startMatch = items.find((i) => {
      const nameWords = i.name.toLowerCase().split(/[\s\-]+/);
      return nameWords.some((w) => w.startsWith(q));
    });
    if (startMatch) return startMatch;
  }

  // 7b. Condensed multi-word abbreviation (e.g. "crev" → "Cthulu's Revenge")
  if (qWords.length === 1 && q.length >= 3) {
    const condensedMatch = items.find((i) => {
      const nameWords = i.name.toLowerCase().replace(/[''`]/g, "").split(/[\s\-]+/);
      if (nameWords.length < 2) return false;
      return trySplitMatch(q, nameWords, 0, 0);
    });
    if (condensedMatch) return condensedMatch;
  }

  // 8. Levenshtein typo tolerance
  let bestScore = Infinity;
  let bestItem = null;
  for (const item of items) {
    const nameLower = item.name.toLowerCase();
    const dist = levenshtein(q, nameLower);
    const threshold = Math.max(3, Math.floor(nameLower.length * 0.3));
    if (dist < threshold && dist < bestScore) {
      bestScore = dist;
      bestItem = item;
    }
  }
  if (bestItem) return bestItem;

  return null;
}

/**
 * Parse user input string into array of items with quantities.
 * Supports formats: "3 Nocturne", "3x Nocturne", "4 curse 4".
 * Quantity only on the left side of the item name.
 * @param {string} input - Comma-separated item string from user
 * @returns {Array<{query: string, data: object|null, qty: number}>} Parsed items
 */
function parseItemInput(input) {
  const entries = input.split(",").map((s) => s.trim()).filter(Boolean);
  const results = [];

  for (const entry of entries) {
    let qty = 1;
    let name = entry;

    // Pattern: "3x Nocturne" or "3X Nocturne"
    const prefixXMatch = entry.match(/^(\d+)\s*x\s+(.+)$/i);
    if (prefixXMatch) {
      qty = parseInt(prefixXMatch[1]);
      name = prefixXMatch[2].trim();
    } else {
      // Pattern: "2 Nocturne" (number + space + name)
      const prefixMatch = entry.match(/^(\d+)\s+(.+)$/);
      if (prefixMatch) {
        const testName = prefixMatch[2].trim();
        if (findItem(testName)) {
          qty = parseInt(prefixMatch[1]);
          name = testName;
        } else {
          name = entry;
        }
      }
    }

    // Clamp quantity
    qty = Math.max(1, Math.min(qty, 1000000));

    const data = findItem(name);
    results.push({ query: name, data, qty });
  }

  return results;
}

/**
 * Get the current items array.
 * @returns {Array} Current item database
 */
function getItems() {
  return items;
}

module.exports = { findItem, parseItemInput, setItems, getItems };

// --- Async version with live lookup fallback ---
const { fetchItemLive } = require("./live-lookup");

/**
 * Find an item with live fallback. If not in database, tries fetching from game.guide.
 * @param {string} query - User's input string
 * @returns {Promise<object|null>} The matched item object, or null if not found
 */
async function findItemWithFallback(query) {
  // Try local database first
  const local = findItem(query);
  if (local) return local;

  // Try live lookup from game.guide
  const q = query.trim();
  if (q.length < 2) return null;

  console.log(`🔍 Live lookup: "${q}" not in database, fetching from game.guide...`);
  const live = await fetchItemLive(q);
  if (live) {
    console.log(`✅ Live lookup found: ${live.name} (Demand: ${live.demand}, Trend: ${live.trend})`);
    // Add to items array so it's available for the rest of this session
    items.push(live);
  }
  return live;
}

module.exports.findItemWithFallback = findItemWithFallback;
