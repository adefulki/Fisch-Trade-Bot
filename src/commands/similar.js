/**
 * /similar command — Find items within a value range of a target item.
 * Shows items with similar adjusted value, sorted by closest match.
 * Useful for finding trade alternatives or items to add/swap.
 */

const { EmbedBuilder } = require("discord.js");
const { findItem } = require("../services/matcher");
const { getAdjustedValue, getSmartValue } = require("../services/analyzer");
const { formatVal, trendEmoji } = require("../utils/format");
const { getItems } = require("../services/matcher");

/**
 * Handle the /similar slash command interaction.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database
 */
async function execute(interaction, items) {
  await interaction.deferReply();

  const query = interaction.options.getString("item");
  const rangePercent = interaction.options.getInteger("range") || 30;

  const targetItem = findItem(query);
  if (!targetItem) {
    await interaction.editReply(`⚠️ Item "${query}" not found.`);
    return;
  }

  const targetVal = getSmartValue(targetItem);
  if (targetVal.adjusted <= 0) {
    await interaction.editReply(`⚠️ **${targetItem.name}** has no value data to compare against.`);
    return;
  }

  // Calculate range
  const rangeFactor = rangePercent / 100;
  const minValue = Math.round(targetVal.adjusted * (1 - rangeFactor));
  const maxValue = Math.round(targetVal.adjusted * (1 + rangeFactor));

  // Find items within range
  const allItems = items || getItems();
  const similar = allItems
    .filter((item) => {
      if (item.name.toLowerCase() === targetItem.name.toLowerCase()) return false;
      const val = getSmartValue(item);
      return val.adjusted >= minValue && val.adjusted <= maxValue;
    })
    .map((item) => {
      const val = getSmartValue(item);
      const diff = val.adjusted - targetVal.adjusted;
      const diffPct = ((diff / targetVal.adjusted) * 100).toFixed(0);
      return { item, val, diff, diffPct, absDiff: Math.abs(diff) };
    })
    .sort((a, b) => a.absDiff - b.absDiff)
    .slice(0, 15);

  if (similar.length === 0) {
    await interaction.editReply(
      `⚠️ No items found within ±${rangePercent}% of **${targetItem.name}** (${formatVal(targetVal.adjusted)}).\n` +
      `Try a larger range: \`/similar item: ${targetItem.name} range: 50\``
    );
    return;
  }

  // Build embed
  const lines = similar.map((s, i) => {
    const rank = i + 1;
    const diffStr = s.diff >= 0 ? `+${s.diffPct}%` : `${s.diffPct}%`;
    const diffEmoji = Math.abs(s.diffPct) <= 5 ? "🟢" : Math.abs(s.diffPct) <= 15 ? "🟡" : "🟠";

    // Trade hint
    let hint = "";
    if (Math.abs(s.diffPct) <= 10) {
      hint = " — fair 1:1 swap";
    } else if (s.diff > 0) {
      hint = " — they'd need to add";
    } else {
      hint = " — you'd need to add";
    }

    return [
      `**${rank}.** ${diffEmoji} **${s.item.name}** — ${formatVal(s.val.adjusted)} (${diffStr}${hint})`,
      `> ${s.item.demand} | ${trendEmoji(s.item.trend)} ${s.item.trend} | Proto: ${s.item.proto || "N/A"}`,
    ].join("\n");
  });

  // Category summary
  const fairSwaps = similar.filter((s) => Math.abs(s.diffPct) <= 10).length;
  const cheaper = similar.filter((s) => s.diff < 0).length;
  const pricier = similar.filter((s) => s.diff > 0).length;

  const summary = `Found **${similar.length}** items within ±${rangePercent}% of **${targetItem.name}** (${formatVal(targetVal.adjusted)})\n` +
    `🟢 ${fairSwaps} fair swaps | 📉 ${cheaper} cheaper | 📈 ${pricier} pricier\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━`;

  const embed = new EmbedBuilder()
    .setTitle(`🔄 Similar to ${targetItem.name}`)
    .setDescription(summary + "\n\n" + lines.join("\n\n"))
    .setColor(0x1e90ff)
    .setFooter({ text: `Range: ${formatVal(minValue)} — ${formatVal(maxValue)} | Use range: param to adjust` });

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
