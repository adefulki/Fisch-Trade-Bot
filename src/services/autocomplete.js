/**
 * Autocomplete handler for item name inputs.
 * Provides up to 25 matching suggestions as the user types.
 */

const { ALIASES, ROMAN_MAP } = require("../utils/constants");

/** @type {Array} Reference to the live items array */
let items = [];

/**
 * Update the item list used for autocomplete.
 * @param {Array} newItems - Array of item objects
 */
function setItems(newItems) {
  items = newItems;
}

/**
 * Get autocomplete suggestions for a partial item query.
 * For /trade commands, handles comma-separated input by autocompleting the last item.
 * @param {string} input - Current user input
 * @param {boolean} isTradeField - Whether this is a /trade field (comma-separated)
 * @returns {Array<{name: string, value: string}>} Up to 25 suggestions
 */
function getAutocompleteSuggestions(input, isTradeField = false) {
  if (!input || input.trim() === "") {
    // Show top 25 most valuable items when empty
    return items
      .filter((i) => i.trueVal && i.trueVal > 0)
      .sort((a, b) => b.trueVal - a.trueVal)
      .slice(0, 25)
      .map((i) => ({ name: i.name, value: i.name }));
  }

  // For trade fields, autocomplete only the last item after the last comma
  let prefix = "";
  let query = input;
  if (isTradeField && input.includes(",")) {
    const lastComma = input.lastIndexOf(",");
    prefix = input.substring(0, lastComma + 1) + " ";
    query = input.substring(lastComma + 1).trim();
  }

  // Strip leading quantity (e.g. "3 noc" → search for "noc")
  let qtyPrefix = "";
  const qtyMatch = query.match(/^(\d+\s*x?\s+)(.+)$/i);
  if (qtyMatch) {
    qtyPrefix = qtyMatch[1];
    query = qtyMatch[2];
  }

  if (!query || query.trim() === "") {
    return items
      .filter((i) => i.trueVal && i.trueVal > 0)
      .sort((a, b) => b.trueVal - a.trueVal)
      .slice(0, 25)
      .map((i) => ({ name: i.name, value: prefix + qtyPrefix + i.name }));
  }

  const q = query.toLowerCase().trim();

  // Check aliases first
  const aliased = ALIASES[q];
  if (aliased) {
    const item = items.find((i) => i.name.toLowerCase() === aliased.toLowerCase());
    if (item) {
      return [{ name: item.name, value: prefix + qtyPrefix + item.name }];
    }
  }

  // Score and rank matches
  const scored = [];
  for (const item of items) {
    const nameLower = item.name.toLowerCase();
    const nameClean = nameLower.replace(/[''`\-]/g, "");
    let score = 0;

    // Exact match
    if (nameLower === q) { score = 100; }
    // Starts with query
    else if (nameLower.startsWith(q)) { score = 90; }
    // A word in the name starts with query
    else if (nameLower.split(/[\s\-]+/).some((w) => w.startsWith(q))) { score = 80; }
    // Query is contained in the name
    else if (nameLower.includes(q) || nameClean.includes(q)) { score = 70; }
    // All query words found in name
    else {
      const qWords = q.split(/\s+/);
      if (qWords.every((w) => nameLower.includes(w) || nameClean.includes(w))) { score = 60; }
    }

    if (score > 0) {
      scored.push({ item, score });
    }
  }

  // Sort by score descending, then by value (higher value first)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.item.trueVal || 0) - (a.item.trueVal || 0);
  });

  return scored.slice(0, 25).map((s) => ({
    name: s.item.name,
    value: prefix + qtyPrefix + s.item.name,
  }));
}

module.exports = { getAutocompleteSuggestions, setItems };
