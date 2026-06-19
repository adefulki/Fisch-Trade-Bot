/**
 * /monitor command — Set items to watch for W trade deals on the trading hub.
 * Subcommands: add, remove, list, clear
 */

const { EmbedBuilder } = require("discord.js");
const { findItem } = require("../services/matcher");
const { addMonitor, removeMonitor, getUserMonitors, clearMonitors } = require("../data/monitors");

/**
 * Handle /monitor add — Add items to monitor for trade deals.
 * @param {object} interaction - Discord interaction object
 */
async function executeAdd(interaction) {
  const input = interaction.options.getString("items");
  const names = input.split(",").map((s) => s.trim()).filter(Boolean);

  const resolved = [];
  const notFound = [];

  for (const name of names) {
    const item = findItem(name);
    if (item) {
      resolved.push(item.name);
    } else {
      notFound.push(name);
    }
  }

  if (resolved.length === 0) {
    await interaction.reply({ content: "⚠️ Could not find any of those items.", ephemeral: true });
    return;
  }

  const result = addMonitor(interaction.user.id, resolved);

  if (!result.success) {
    await interaction.reply({ content: `⚠️ ${result.message}`, ephemeral: true });
    return;
  }

  let desc = `✅ Now monitoring:\n${resolved.map((n) => `• **${n}**`).join("\n")}`;
  if (notFound.length > 0) {
    desc += `\n\n⚠️ Not found: ${notFound.join(", ")}`;
  }
  desc += `\n\n*You'll be DM'd when a W trade appears on game.guide for these items.*`;

  const embed = new EmbedBuilder()
    .setTitle("🔍 Trade Monitor")
    .setDescription(desc)
    .setColor(0x1e90ff)
    .setFooter({ text: result.message });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle /monitor remove — Remove items from monitor.
 * @param {object} interaction - Discord interaction object
 */
async function executeRemove(interaction) {
  const input = interaction.options.getString("items");
  const names = input.split(",").map((s) => s.trim()).filter(Boolean);

  const resolved = names.map((n) => {
    const item = findItem(n);
    return item ? item.name : n;
  });

  const removed = removeMonitor(interaction.user.id, resolved);

  if (removed) {
    await interaction.reply({ content: `✅ Removed from monitor list.`, ephemeral: true });
  } else {
    await interaction.reply({ content: `⚠️ Those items weren't in your monitor list.`, ephemeral: true });
  }
}

/**
 * Handle /monitor list — Show user's monitored items.
 * @param {object} interaction - Discord interaction object
 */
async function executeList(interaction) {
  const items = getUserMonitors(interaction.user.id);

  if (items.length === 0) {
    await interaction.reply({
      content: "You're not monitoring any items.\nUse `/monitor add items: Evangeline, Scarwing` to start.",
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 Your Trade Monitor (${items.length}/15)`)
    .setDescription(items.map((n, i) => `${i + 1}. **${n}**`).join("\n"))
    .setColor(0x1e90ff)
    .setFooter({ text: "You'll be DM'd when WIN trades appear for these items" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Handle /monitor clear — Clear all monitored items.
 * @param {object} interaction - Discord interaction object
 */
async function executeClear(interaction) {
  clearMonitors(interaction.user.id);
  await interaction.reply({ content: "✅ Monitor list cleared.", ephemeral: true });
}

module.exports = { executeAdd, executeRemove, executeList, executeClear };
