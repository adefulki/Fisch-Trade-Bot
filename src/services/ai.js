/**
 * AI-powered trade analysis using Google Gemini.
 * Falls back to local analyzer when quota is exceeded.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { analyzeTradeLocally } = require("./analyzer");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/** Timestamp until which AI is disabled (after quota error) */
let aiDisabledUntil = 0;

/**
 * Format a single item's data into a string for the AI prompt.
 * @param {object} item - Item object with all value fields
 * @returns {string} Formatted string for AI consumption
 */
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

/**
 * Build the complete AI prompt for trade analysis.
 * @param {Array} leftItems - User's parsed items
 * @param {Array} rightItems - Their parsed items
 * @returns {string} Complete prompt for Gemini
 */
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

/**
 * Analyze a trade using AI with automatic local fallback.
 * If Gemini quota is exceeded, switches to local mode for 5+ minutes.
 * @param {Array} leftItems - User's parsed items
 * @param {Array} rightItems - Their parsed items
 * @param {Array} allItems - Full item database (for local fallback)
 * @returns {{response: string, usedAI: boolean}} Analysis result and method used
 */
async function analyzeTrade(leftItems, rightItems, allItems) {
  const now = Date.now();

  // If AI is temporarily disabled, use local immediately
  if (now < aiDisabledUntil) {
    console.log("⚡ AI quota cooldown active, using local analyzer");
    return { response: analyzeTradeLocally(leftItems, rightItems, allItems), usedAI: false };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = buildPrompt(leftItems, rightItems);
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    return { response, usedAI: true };
  } catch (error) {
    if (error.status === 429) {
      const retryMatch = error.message.match(/retry in ([\d.]+)s/i);
      const retryDelay = retryMatch ? parseFloat(retryMatch[1]) * 1000 : 60000;
      const cooldown = Math.max(retryDelay, 5 * 60 * 1000);
      aiDisabledUntil = now + cooldown;
      console.log(`⚠️ AI quota exceeded. Disabled for ${Math.round(cooldown / 1000)}s. Using local analyzer.`);
    } else {
      console.error("AI Error (non-quota):", error.message);
    }

    return { response: analyzeTradeLocally(leftItems, rightItems, allItems), usedAI: false };
  }
}

module.exports = { analyzeTrade };
