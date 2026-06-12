/**
 * /portfolio command — Track item holdings with ROI.
 * Subcommands: view, add, remove, clear
 */

const { EmbedBuilder } = require("discord.js");
const { findItem } = require("../services/matcher");
const { addToPortfolio, removeFromPortfolio, getPortfolio, clearPortfolio } = require("../data/portfolio");
const { formatVal } = require("../utils/format");

/**
 * Handle /portfolio view — Show user's portfolio with ROI.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database
 */
async function executeView(interaction, items) {
  const portfolio = getPortfolio(interaction.user.id, items);

  if (portfolio.entries.length === 0) {
    await interaction.reply({
      content: "Your portfolio is empty.\nUse `/portfolio add item: [name] qty: [amount]` to add items.",
      ephemeral: true,
    });
    return;
  }

  const lines = portfolio.entries.map((e, i) => {
    const roiEmoji = e.roi >= 0 ? "📈" : "📉";
    const roiStr = e.roi >= 0 ? `+${formatVal(e.roi)}` : formatVal(e.roi);
    return `${i + 1}. **${e.itemName}** ×${e.qty} — ${formatVal(e.currentTotal)} (${roiEmoji} ${roiStr}, ${e.roiPct >= 0 ? "+" : ""}${e.roiPct.toFixed(1)}%)`;
  });

  const totalRoiEmoji = portfolio.totalROI >= 0 ? "📈" : "📉";
  const totalRoiStr = portfolio.totalROI >= 0 ? `+${formatVal(portfolio.totalROI)}` : formatVal(portfolio.totalROI);
  const color = portfolio.totalROI >= 0 ? 0x00ff00 : 0xff4500;

  const embed = new EmbedBuilder()
    .setTitle(`💼 Your Portfolio`)
    .setDescription(
      lines.join("\n") + "\n\n" +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**💰 Total Value:** ${formatVal(portfolio.totalCurrentValue)}\n` +
      `**📊 Total Invested:** ${formatVal(portfolio.totalBuyValue)}\n` +
      `**${totalRoiEmoji} Total ROI:** ${totalRoiStr} (${portfolio.totalROIPct >= 0 ? "+" : ""}${portfolio.totalROIPct.toFixed(1)}%)`
    )
    .setColor(color)
    .setFooter({ text: `${portfolio.entries.length} items tracked` });

  await interaction.reply({ embeds: [embed] });
}

/**
 * Handle /portfolio add — Add item to portfolio.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database
 */
async function executeAdd(interaction, items) {
  const query = interaction.options.getString("item");
  const qty = interaction.options.getInteger("qty") || 1;
  const item = findItem(query);

  if (!item) {
    await interaction.reply({ content: `⚠️ Item "${query}" not found.`, ephemeral: true });
    return;
  }

  const buyPrice = item.trueVal || item.tradeHub || 0;
  if (buyPrice === 0) {
    await interaction.reply({ content: `⚠️ **${item.name}** has no listed value. Cannot add to portfolio.`, ephemeral: true });
    return;
  }

  const result = addToPortfolio(interaction.user.id, item.name, qty, buyPrice);

  if (!result.success) {
    await interaction.reply({ content: `⚠️ ${result.message}`, ephemeral: true });
    return;
  }

  await interaction.reply({
    content: `✅ Added **${qty}× ${item.name}** to your portfolio at ${formatVal(buyPrice)} each.`,
    ephemeral: true,
  });
}

/**
 * Handle /portfolio remove — Remove item from portfolio.
 * @param {object} interaction - Discord interaction object
 */
async function executeRemove(interaction) {
  const query = interaction.options.getString("item");
  const qty = interaction.options.getInteger("qty") || null;
  const item = findItem(query);

  if (!item) {
    await interaction.reply({ content: `⚠️ Item "${query}" not found.`, ephemeral: true });
    return;
  }

  const removed = removeFromPortfolio(interaction.user.id, item.name, qty);

  if (removed) {
    await interaction.reply({ content: `✅ Removed **${item.name}** from your portfolio.`, ephemeral: true });
  } else {
    await interaction.reply({ content: `⚠️ **${item.name}** is not in your portfolio.`, ephemeral: true });
  }
}

/**
 * Handle /portfolio clear — Clear entire portfolio.
 * @param {object} interaction - Discord interaction object
 */
async function executeClear(interaction) {
  clearPortfolio(interaction.user.id);
  await interaction.reply({ content: "✅ Your portfolio has been cleared.", ephemeral: true });
}

module.exports = { executeView, executeAdd, executeRemove, executeClear };
