/**
 * /value command — Look up a single item's full stats and adjusted value.
 * Displayed as a compact rich embed.
 */

const { EmbedBuilder } = require("discord.js");
const { findItem } = require("../services/matcher");
const { getAdjustedValue } = require("../services/analyzer");
const { formatVal, trendEmoji } = require("../utils/format");

/**
 * Handle the /value slash command interaction.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  const query = interaction.options.getString("item");
  const item = findItem(query);

  if (!item) {
    await interaction.reply({
      content: `⚠️ Item "${query}" not found. Check spelling and try again.`,
      ephemeral: true,
    });
    return;
  }

  const val = getAdjustedValue(item);

  // Color based on demand
  const colors = { "High": 0x00ff00, "Limited": 0xffd700, "Medium": 0x1e90ff, "Low": 0xff8c00, "Very Low": 0xff4500 };
  const color = colors[item.demand] || 0x808080;

  const embed = new EmbedBuilder()
    .setTitle(`🔍 ${item.name}`)
    .setColor(color)
    .addFields(
      { name: "TrueVal", value: item.trueVal ? `S$ ${item.trueVal.toLocaleString()}` : "N/A", inline: true },
      { name: "Trade Hub", value: item.tradeHub ? `S$ ${item.tradeHub.toLocaleString()}` : "N/A", inline: true },
      { name: "Proto", value: item.proto !== null ? item.proto.toLocaleString() : "N/A", inline: true },
      { name: "Demand", value: item.demand, inline: true },
      { name: "Trend", value: `${trendEmoji(item.trend)} ${item.trend}`, inline: true },
      { name: "💰 Adjusted Value", value: `${formatVal(val.adjusted)} *(${val.source} × demand × trend)*`, inline: false },
    )
    .setFooter({ text: "Source: game.guide/fisch-value-list" });

  await interaction.reply({ embeds: [embed] });
}

module.exports = { execute };
