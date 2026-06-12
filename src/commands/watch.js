/**
 * /watch command — Manage price alerts (watchlist).
 * Subcommands: add, remove, list
 */

const { EmbedBuilder } = require("discord.js");
const { findItem } = require("../services/matcher");
const { addWatch, removeWatch, getUserWatches } = require("../data/watchlist");
const { formatVal } = require("../utils/format");

/**
 * Handle /watch add — Add a price alert.
 * @param {object} interaction - Discord interaction object
 */
async function executeAdd(interaction) {
  const query = interaction.options.getString("item");
  const condition = interaction.options.getString("condition");
  const target = interaction.options.getNumber("price");
  const item = findItem(query);

  if (!item) {
    await interaction.reply({ content: `⚠️ Item "${query}" not found.`, ephemeral: true });
    return;
  }

  const result = addWatch(interaction.user.id, item.name, condition, target);

  if (!result.success) {
    await interaction.reply({ content: `⚠️ ${result.message}`, ephemeral: true });
    return;
  }

  const currentVal = item.trueVal || item.tradeHub || 0;
  const embed = new EmbedBuilder()
    .setTitle("🔔 Watch Added")
    .setDescription(
      `**${item.name}**\n` +
      `Alert when: ${condition === "above" ? "≥" : "≤"} **${formatVal(target)}**\n` +
      `Current value: ${formatVal(currentVal)}\n\n` +
      `*You'll be DM'd when the condition is met.*`
    )
    .setColor(condition === "above" ? 0x00ff00 : 0xff4500)
    .setFooter({ text: result.message });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle /watch remove — Remove a price alert.
 * @param {object} interaction - Discord interaction object
 */
async function executeRemove(interaction) {
  const query = interaction.options.getString("item");
  const condition = interaction.options.getString("condition") || "all";
  const item = findItem(query);

  if (!item) {
    await interaction.reply({ content: `⚠️ Item "${query}" not found.`, ephemeral: true });
    return;
  }

  const removed = removeWatch(interaction.user.id, item.name, condition);

  if (removed) {
    await interaction.reply({ content: `✅ Watch removed for **${item.name}**.`, ephemeral: true });
  } else {
    await interaction.reply({ content: `⚠️ No active watch found for **${item.name}**.`, ephemeral: true });
  }
}

/**
 * Handle /watch list — Show all active watches for the user.
 * @param {object} interaction - Discord interaction object
 */
async function executeList(interaction) {
  const watches = getUserWatches(interaction.user.id);

  if (watches.length === 0) {
    await interaction.reply({
      content: "You have no active watches.\nUse `/watch add item: [name] condition: above/below price: [value]` to create one.",
      ephemeral: true,
    });
    return;
  }

  const lines = watches.map((w, i) => {
    const symbol = w.condition === "above" ? "≥" : "≤";
    return `${i + 1}. **${w.itemName}** — Alert when ${symbol} ${formatVal(w.targetValue)}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`🔔 Your Watchlist (${watches.length}/10)`)
    .setDescription(lines.join("\n"))
    .setColor(0x1e90ff)
    .setFooter({ text: "Alerts are sent via DM when conditions are met" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { executeAdd, executeRemove, executeList };
