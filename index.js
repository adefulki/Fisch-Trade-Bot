require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cron = require("node-cron");
const { scrapeValues, loadItems } = require("./scraper");
const { analyzeTradeLocally } = require("./analyzer");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Live item data (reloaded after each sync)
let items = loadItems();

// Track if AI is available (disable temporarily on quota errors)
let aiDisabledUntil = 0;

// Common aliases and shorthand mappings for Fisch items
const ALIASES = {
  "c1": "Curse I",
  "c2": "Curse II",
  "c3": "Curse III",
  "c 3": "Curse III",
  "c4": "Curse IV",
  "c 4": "Curse IV",
  "curse 1": "Curse I",
  "curse 2": "Curse II",
  "curse 3": "Curse III",
  "curse 4": "Curse IV",
  "stb": "Slime Trade Booth",
  "rb": "Seraphic Rainbow",
};

// Normalize input: expand aliases and convert number suffixes to roman numerals
function normalizeQuery(q) {
  // Check alias table first
  const aliased = ALIASES[q.toLowerCase().trim()];
  if (aliased) return aliased.toLowerCase();

  // Convert trailing numbers to roman numerals for "curse"-like items
  // e.g. "curse 3" → "curse iii", "c3" handled by alias above
  const romanMap = { "1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v", "6": "vi", "7": "vii", "8": "viii", "9": "ix", "10": "x" };
  const trailingNum = q.match(/^(.+?)\s*(\d+)$/);
  if (trailingNum) {
    const roman = romanMap[trailingNum[2]];
    if (roman) {
      return `${trailingNum[1].trim()} ${roman}`;
    }
  }

  return q;
}

// Recursive helper: check if query string can be split into prefixes of consecutive name words
// e.g. "crev" with ["cthulus", "revenge"] → "c" starts "cthulus" + "rev" starts "revenge" ✓
function trySplitMatch(query, nameWords, qPos, nPos) {
  if (qPos >= query.length) return nPos > 0; // consumed all chars, matched at least one split
  if (nPos >= nameWords.length) return false; // ran out of name words

  const word = nameWords[nPos];
  // Try taking 1 to remaining chars from query as prefix of current name word
  for (let take = 1; take <= query.length - qPos; take++) {
    const chunk = query.substring(qPos, qPos + take);
    if (word.startsWith(chunk)) {
      // Move to next name word with remaining query
      if (qPos + take >= query.length) return true; // fully consumed
      if (trySplitMatch(query, nameWords, qPos + take, nPos + 1)) return true;
    } else {
      break; // no point trying longer chunks if shorter doesn't match
    }
  }
  // Also try skipping this name word (e.g. skip "of" in "Heavyblade of Glory")
  return trySplitMatch(query, nameWords, qPos, nPos + 1);
}

// Smart fuzzy match item name from database
// Handles: "slime booth" → "Slime Trade Booth", "hbog" → "Heavyblade of Glory", etc.
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

  // 3. Query is contained in item name (e.g. "slime booth" in "Slime Trade Booth")
  //    Check if ALL words in query appear in the item name (also try with special chars stripped)
  const qWords = q.split(/\s+/);
  const allWordsMatch = items.find((i) => {
    const nameLower = i.name.toLowerCase();
    const nameClean = nameLower.replace(/[''`\-]/g, "");
    return qWords.every((w) => nameLower.includes(w) || nameClean.includes(w));
  });
  if (allWordsMatch) return allWordsMatch;

  // 4. Abbreviation/initials match (e.g. "hbog" → "Heavyblade of Glory")
  const qNoSpace = q.replace(/\s+/g, "");
  if (qNoSpace.length >= 3) {
    const abbrMatch = items.find((i) => {
      const initials = i.name
        .split(/[\s\-]+/)
        .map((w) => w[0])
        .join("")
        .toLowerCase();
      return initials === qNoSpace;
    });
    if (abbrMatch) return abbrMatch;
  }

  // 5. Simple substring: query inside name or name inside query
  const substring = items.find((i) => i.name.toLowerCase().includes(q));
  if (substring) return substring;
  const reverse = items.find((i) => q.includes(i.name.toLowerCase()));
  if (reverse) return reverse;

  // 6. Match if query words are prefixes of item name words IN SEQUENCE
  // e.g. "cya demon" → "Cyanic Demonride"
  if (qWords.length >= 2) {
    const startsWith = items.find((i) => {
      const nameWords = i.name.toLowerCase().split(/[\s\-]+/);
      let qi = 0;
      for (const nw of nameWords) {
        if (qi < qWords.length && nw.startsWith(qWords[qi])) {
          qi++;
        }
      }
      return qi === qWords.length;
    });
    if (startsWith) return startsWith;
  }

  // 6b. Match if query words are prefixes of ANY item name words (unordered)
  // e.g. "rb sera" → "Seraphic Rainbow" (rb=rainbow, sera=seraphic)
  // For short query words (2-3 chars), also try matching first+last char or first 2 chars
  if (qWords.length >= 2) {
    const unorderedPrefix = items.find((i) => {
      const nameWords = i.name.toLowerCase().split(/[\s\-]+/);
      const used = new Set();
      return qWords.every((qw) => {
        const idx = nameWords.findIndex((nw, ni) => {
          if (used.has(ni)) return false;
          // Standard prefix match
          if (nw.startsWith(qw)) return true;
          // Short abbreviation: 2 chars = first char + another char in word
          if (qw.length === 2 && nw[0] === qw[0] && nw.includes(qw[1])) return true;
          // 3 chars: first char matches + remaining chars appear in order
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

  // 7. Single word partial start match (e.g. "evan" → "Evangeline")
  if (qWords.length === 1 && q.length >= 3) {
    const startMatch = items.find((i) => {
      const nameWords = i.name.toLowerCase().split(/[\s\-]+/);
      return nameWords.some((w) => w.startsWith(q));
    });
    if (startMatch) return startMatch;
  }

  // 7b. Condensed multi-word abbreviation (single query word split across name words)
  // e.g. "crev" → "Cthulu's Revenge" (c=Cthulu's, rev=Revenge)
  // Try all possible splits of the query across the item name words
  if (qWords.length === 1 && q.length >= 3) {
    const condensedMatch = items.find((i) => {
      const nameWords = i.name.toLowerCase().replace(/[''`]/g, "").split(/[\s\-]+/);
      if (nameWords.length < 2) return false;
      // Try splitting q into parts that match the start of each name word
      return trySplitMatch(q, nameWords, 0, 0);
    });
    if (condensedMatch) return condensedMatch;
  }

  // 8. Levenshtein-like scoring for typo tolerance (only for short distance)
  let bestScore = Infinity;
  let bestItem = null;
  for (const item of items) {
    const nameLower = item.name.toLowerCase();
    const dist = levenshtein(q, nameLower);
    // Allow up to 30% of name length as typo tolerance
    const threshold = Math.max(3, Math.floor(nameLower.length * 0.3));
    if (dist < threshold && dist < bestScore) {
      bestScore = dist;
      bestItem = item;
    }
  }
  if (bestItem) return bestItem;

  return null;
}

// Simple Levenshtein distance
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

// Parse item input with quantity support
// Supports: "2 Nocturne", "3x Nocturne" (quantity only on the LEFT side)
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
        // Only treat as quantity if the rest matches an item
        const testName = prefixMatch[2].trim();
        if (findItem(testName)) {
          qty = parseInt(prefixMatch[1]);
          name = testName;
        }
        // Otherwise treat entire string as item name (e.g. "4 curse 4" → qty=4, name="curse 4")
        // Try: strip the leading number, check if remaining matches
        else {
          // It might be "3 c3" → qty=3, name="c3"
          // Or "4 curse 4" → qty=4, name="curse 4"
          // Already handled above since testName = "c3" or "curse 4"
          // If findItem didn't match, keep entire entry as name (no quantity)
          name = entry;
        }
      }
    }

    // Clamp quantity to reasonable range
    qty = Math.max(1, Math.min(qty, 1000000));

    const data = findItem(name);
    results.push({ query: name, data, qty });
  }

  return results;
}

// Format item data for AI prompt
function formatItemForAI(item) {
  return [
    `Name: ${item.name}`,
    `TrueVal: ${item.trueVal ? `S$ ${item.trueVal.toLocaleString()}` : "N/A"}`,
    `Trade Hub: ${item.tradeHub ? `S$ ${item.tradeHub.toLocaleString()}` : "N/A"}`,
    `Proto: ${item.proto !== null ? item.proto : "N/A"}`,
    `Demand: ${item.demand}`,
    `Trend: ${item.trend}`,
  ].join(" | ");
}

// Build the AI prompt
function buildPrompt(leftItems, rightItems) {
  const leftData = leftItems
    .map((item, i) => {
      if (item.data) {
        const qtyStr = item.qty > 1 ? ` (Qty: ${item.qty})` : "";
        return `  ${i + 1}. ${formatItemForAI(item.data)}${qtyStr}`;
      }
      return `  ${i + 1}. "${item.query}" — NOT FOUND IN DATABASE`;
    })
    .join("\n");

  const rightData = rightItems
    .map((item, i) => {
      if (item.data) {
        const qtyStr = item.qty > 1 ? ` (Qty: ${item.qty})` : "";
        return `  ${i + 1}. ${formatItemForAI(item.data)}${qtyStr}`;
      }
      return `  ${i + 1}. "${item.query}" — NOT FOUND IN DATABASE`;
    })
    .join("\n");

  return `You are an expert trade analyst for the Roblox game "Fisch". Analyze this trade using ALL available metrics.

VALUATION RULES:
- TrueVal = the "real" market value based on confirmed trades
- Trade Hub = average asking price in trade hubs (can be inflated or deflated)
- Proto = proto value (a community-agreed unit; higher = more valuable)
- Demand: Very Low < Low < Medium < High < Limited (Limited = extremely rare, nearly untradeable)
- Trend: Rising (value increasing), Stable (holding), Dropping (losing value), Unstable (volatile)

HOW TO EVALUATE:
1. Use TrueVal as the primary value anchor when available
2. If TrueVal is N/A, use Trade Hub value
3. If both are N/A, estimate from Proto (Proto * ~2000-3000 for high demand, Proto * ~1500 for low demand)
4. ADJUST values based on Demand: High demand items trade ABOVE listed value (add 5-15%), Low demand items trade BELOW (subtract 5-15%)
5. ADJUST for Trend: Rising items are worth MORE than listed (add 5-10%), Dropping items are worth LESS (subtract 5-10%)
6. Items with "Limited" demand are extremely rare and may command premium overpay
7. If an item has (Qty: X), multiply its adjusted value by X for the total

LEFT SIDE (User's Offer):
${leftData}

RIGHT SIDE (Their Offer):
${rightData}

Respond in EXACTLY this Discord markdown format (no code blocks, no extra text):

⚖️ **FISCH TRADE ASSISTANT**

**📦 YOUR OFFER**
• [Item Name] — [Adjusted Value] (Demand: [X] | Trend: [emoji] [X])
[repeat for each item]
**Total Adjusted Value: [sum]**

**🎁 THEIR OFFER**
• [Item Name] — [Adjusted Value] (Demand: [X] | Trend: [emoji] [X])
[repeat for each item]
**Total Adjusted Value: [sum]**

━━━━━━━━━━━━━━━━━━━━━━━━
📊 **VERDICT:** [emoji] **[BIG WIN / WIN / FAIR / LOSS / BIG LOSS]** [emoji]

📝 **RECOMMENDATION:**
[1-3 sentences. If WIN/BIG WIN: tell them to accept. If LOSS/BIG LOSS: explain the gap and suggest 1-3 specific items (by name and value) the other side should add to make it fair. If FAIR: suggest 1-2 specific items they could add to push it into a WIN. Always mention Rising or Dropping items.]

Use these emojis: 📈 for Rising, 📉 for Dropping, ➡️ for Stable, ⚡ for Unstable. Use 🟢🟢 for BIG WIN, 🟢 for WIN, 🟡 for FAIR, 🔴 for LOSS, 🔴🔴 for BIG LOSS.`;
}

// Try AI analysis with fallback to local
async function analyzeTrade(leftItems, rightItems) {
  const now = Date.now();

  // If AI is temporarily disabled (quota hit), use local immediately
  if (now < aiDisabledUntil) {
    console.log("⚡ AI quota cooldown active, using local analyzer");
    return { response: analyzeTradeLocally(leftItems, rightItems, items), usedAI: false };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = buildPrompt(leftItems, rightItems);
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    return { response, usedAI: true };
  } catch (error) {
    // Check if it's a rate limit error
    if (error.status === 429) {
      // Extract retry delay or default to 60 seconds
      const retryMatch = error.message.match(/retry in ([\d.]+)s/i);
      const retryDelay = retryMatch ? parseFloat(retryMatch[1]) * 1000 : 60000;

      // Disable AI for the cooldown period (minimum 5 minutes to avoid repeated hits)
      const cooldown = Math.max(retryDelay, 5 * 60 * 1000);
      aiDisabledUntil = now + cooldown;
      console.log(`⚠️ AI quota exceeded. Disabled for ${Math.round(cooldown / 1000)}s. Using local analyzer.`);
    } else {
      console.error("AI Error (non-quota):", error.message);
    }

    // Fallback to local analyzer
    return { response: analyzeTradeLocally(leftItems, rightItems, items), usedAI: false };
  }
}

// --- Cron Job: Sync values every 1 hour ---
cron.schedule("0 * * * *", async () => {
  console.log("⏰ Cron triggered: syncing values...");
  const success = await scrapeValues();
  if (success) {
    items = loadItems();
  }
});

client.on("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Sync on startup
  console.log("🚀 Running initial value sync...");
  const success = await scrapeValues();
  if (success) {
    items = loadItems();
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "trade") {
    await interaction.deferReply();

    const leftInput = interaction.options.getString("your_offer");
    const rightInput = interaction.options.getString("their_offer");

    // Parse items with quantity support
    const leftItems = parseItemInput(leftInput);
    const rightItems = parseItemInput(rightInput);

    // Check if any items were found
    const allNotFound = leftItems.every((i) => !i.data) && rightItems.every((i) => !i.data);
    if (allNotFound) {
      await interaction.editReply(
        "⚠️ Could not find any of those items in the database. Please check your spelling and try again.\n" +
        "**Tip:** Use item names like `Evangeline`, `Nocturne`, `Scarwing`, etc."
      );
      return;
    }

    // Analyze (tries AI first, falls back to local)
    const { response, usedAI } = await analyzeTrade(leftItems, rightItems);

    // Add footer indicating method used
    const footer = usedAI ? "" : "\n\n`⚡ Analyzed locally (AI quota reached)`";
    const finalResponse = response + footer;

    if (finalResponse.length > 2000) {
      await interaction.editReply(finalResponse.substring(0, 1997) + "...");
    } else {
      await interaction.editReply(finalResponse);
    }
  }

  // Manual sync command
  if (interaction.commandName === "sync") {
    await interaction.deferReply({ ephemeral: true });
    const success = await scrapeValues();
    if (success) {
      items = loadItems();
      await interaction.editReply(`✅ Values synced! Loaded ${items.length} items.`);
    } else {
      await interaction.editReply("❌ Sync failed. Check bot logs for details.");
    }
  }

  // Value lookup command
  if (interaction.commandName === "value") {
    const query = interaction.options.getString("item");
    const item = findItem(query);

    if (!item) {
      await interaction.reply({
        content: `⚠️ Item "${query}" not found. Check spelling and try again.`,
        ephemeral: true,
      });
      return;
    }

    const { analyzeTradeLocally: _, getAdjustedValue, formatVal } = require("./analyzer");
    const val = getAdjustedValue(item);

    const response = [
      `🔍 **${item.name}**`,
      ``,
      `**TrueVal:** ${item.trueVal ? `S$ ${item.trueVal.toLocaleString()}` : "N/A"}`,
      `**Trade Hub:** ${item.tradeHub ? `S$ ${item.tradeHub.toLocaleString()}` : "N/A"}`,
      `**Proto:** ${item.proto !== null ? item.proto.toLocaleString() : "N/A"}`,
      `**Demand:** ${item.demand}`,
      `**Trend:** ${item.trend === "Rising" ? "📈" : item.trend === "Dropping" ? "📉" : item.trend === "Unstable" ? "⚡" : "➡️"} ${item.trend}`,
      ``,
      `**💰 Adjusted Value:** ${formatVal(val.adjusted)} *(${val.source} × demand × trend)*`,
    ].join("\n");

    await interaction.reply(response);
  }

  // Help command
  if (interaction.commandName === "help") {
    const helpText = [
      `🐟 **FISCH TRADE ASSISTANT — USER GUIDE**`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📌 **COMMANDS**`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `**\`/trade\`** — Analyze a trade`,
      `> \`/trade your_offer: 2 Nocturne, Scarwing their_offer: Evangeline\``,
      ``,
      `**\`/value\`** — Look up an item's value`,
      `> \`/value item: Evangeline\``,
      ``,
      `**\`/sync\`** — Force refresh values from game.guide`,
      ``,
      `**\`/help\`** — Show this guide`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔢 **QUANTITY (left side only)**`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `> \`3 Nocturne\` — number before name`,
      `> \`3x Nocturne\` — Nx before name`,
      `> \`4 curse 4\` → 4× Curse IV`,
      `> \`3 c3\` → 3× Curse III`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔍 **FLEXIBLE NAMES**`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `You don't need exact names! Examples:`,
      `> \`c3\` → Curse III`,
      `> \`c4\` → Curse IV`,
      `> \`stb\` → Slime Trade Booth`,
      `> \`evan\` → Evangeline`,
      `> \`crev\` → Cthulu's Revenge`,
      `> \`rb sera\` → Seraphic Rainbow`,
      `> \`slime booth\` → Slime Trade Booth`,
      `> \`heavy glory\` → Heavyblade of Glory`,
      `> \`pheaven\` → Puff of Heaven`,
      `> \`pearsickle\` → Pearsicle (typos ok!)`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📊 **VERDICT SCALE**`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `> 🟢🟢 **BIG WIN** — Accept now!`,
      `> 🟢 **WIN** — Good trade, accept`,
      `> 🟡 **FAIR** — Roughly even`,
      `> 🔴 **LOSS** — Ask them to add`,
      `> 🔴🔴 **BIG LOSS** — Decline`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💡 **TIPS**`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `• Values auto-update every hour from game.guide`,
      `• 📈 Rising items are worth more than listed`,
      `• 📉 Dropping items are worth less than listed`,
      `• High demand = +10% | Low demand = -10%`,
      `• Bot suggests specific items to add if trade is unfair`,
      `• Raw value shown + adjusted value if demand/trend differs`,
    ].join("\n");

    await interaction.reply({ content: helpText, ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
