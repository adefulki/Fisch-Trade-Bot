/**
 * /trade command — Analyze a trade between two players.
 * Uses AI when available, falls back to local formula-based analysis.
 * Output displayed as a rich embed.
 */

const { parseItemInput } = require("../services/matcher");
const { analyzeTrade } = require("../services/ai");
const { sendEmbed } = require("../utils/discord");
const { getStabilityWarning } = require("../services/stability");
const { getItemSupplyDemand } = require("../services/trading-insights");

/**
 * Handle the /trade slash command interaction.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database
 */
async function execute(interaction, items) {
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
  const { response, usedAI } = await analyzeTrade(leftItems, rightItems, items);
  const footer = usedAI ? "Powered by AI" : "⚡ Analyzed locally (AI quota reached)";

  // Check for manipulation warnings on traded items
  const allTradeItems = [...leftItems, ...rightItems].filter((i) => i.data);
  const stabilityWarnings = allTradeItems
    .map((i) => {
      const warning = getStabilityWarning(i.data);
      return warning ? `**${i.data.name}:** ${warning}` : "";
    })
    .filter(Boolean);

  // Check for supply/demand issues
  const supplyWarnings = allTradeItems
    .map((i) => {
      const sd = getItemSupplyDemand(i.data.name);
      if (sd.isOversupplied) return `**${i.data.name}:** ⚠️ Oversupplied — hard to sell at listed price`;
      if (sd.isUndersupplied) return `**${i.data.name}:** 💎 Undersupplied — high real demand`;
      return "";
    })
    .filter(Boolean);

  let stabilitySection = "";
  const allWarnings = [...stabilityWarnings, ...supplyWarnings];
  if (allWarnings.length > 0) {
    stabilitySection = "\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n🛡️ **WARNINGS:**\n" + allWarnings.join("\n");
  }

  // Determine color based on verdict
  let color = 0x808080; // grey default
  if (response.includes("BIG WIN")) color = 0x00ff00;
  else if (response.includes("WIN")) color = 0x90ee90;
  else if (response.includes("FAIR")) color = 0xffd700;
  else if (response.includes("BIG LOSS")) color = 0xff0000;
  else if (response.includes("LOSS")) color = 0xff6347;

  // Override color if manipulation detected
  if (stabilityWarnings.some((w) => w.includes("Likely Manipulated"))) color = 0xff0000;

  await sendEmbed(interaction, {
    title: "⚖️ FISCH TRADE ASSISTANT",
    description: response.replace("⚖️ **FISCH TRADE ASSISTANT**\n\n", "") + stabilitySection,
    color,
    footer,
  });
}

module.exports = { execute };
