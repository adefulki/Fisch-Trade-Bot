/**
 * /history command — Show price change history for a specific item.
 * Uses paginated embed if there are many changes.
 */

const { findItem } = require("../services/matcher");
const { getItemHistory, formatVal } = require("../data/history");
const { sendEmbed, sendPaginated } = require("../utils/discord");

/**
 * Handle the /history slash command interaction.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  const query = interaction.options.getString("item");
  const days = interaction.options.getInteger("days") || 30;
  const item = findItem(query);

  if (!item) {
    await interaction.reply({
      content: `⚠️ Item "${query}" not found. Check spelling and try again.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const entries = getItemHistory(item.name, days);

  const header = [
    `**Current:** TrueVal: ${formatVal(item.trueVal)} | Trade Hub: ${formatVal(item.tradeHub)} | Proto: ${item.proto || "N/A"} | Demand: ${item.demand} | Trend: ${item.trend}`,
    ``,
  ].join("\n");

  if (entries.length === 0) {
    const desc = header + `*No price changes recorded in the last ${days} days.*\n*History accumulates after the bot detects value changes.*`;
    await sendEmbed(interaction, {
      title: `📜 ${item.name} — Price History (${days}d)`,
      description: desc,
      color: 0x808080,
      footer: "History records every value change detected during sync",
    });
    return;
  }

  // Format all entries
  const formatted = entries.map((entry) => {
    const date = new Date(entry.timestamp).toLocaleString("en-GB", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const changeStr = entry.changes
      .map((c) => `${c.field}: ${c.before} → **${c.after}**`)
      .join(" | ");
    return `\`${date}\` ${changeStr}`;
  });

  // If few entries, show in single embed
  if (entries.length <= 15) {
    const desc = header + `━━━━━━━━━━━━━━━━━━━━━━━━\n📊 **${entries.length} changes recorded:**\n━━━━━━━━━━━━━━━━━━━━━━━━\n` + formatted.join("\n");
    await sendEmbed(interaction, {
      title: `📜 ${item.name} — Price History (${days}d)`,
      description: desc,
      color: 0x1e90ff,
      footer: "History records every value change detected during sync",
    });
  } else {
    // Paginate if many entries
    const perPage = 12;
    const pages = [];
    for (let i = 0; i < formatted.length; i += perPage) {
      const pageEntries = formatted.slice(i, i + perPage);
      const pageDesc = (i === 0 ? header + `━━━━━━━━━━━━━━━━━━━━━━━━\n📊 **${entries.length} changes recorded:**\n━━━━━━━━━━━━━━━━━━━━━━━━\n` : "") + pageEntries.join("\n");
      pages.push(pageDesc);
    }

    await sendPaginated(interaction, {
      title: `📜 ${item.name} — Price History (${days}d)`,
      pages,
      color: 0x1e90ff,
      footer: "Source: game.guide",
    });
  }
}

module.exports = { execute };
