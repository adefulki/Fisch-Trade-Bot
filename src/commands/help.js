/**
 * /help command — Show bot usage guide organized by category as embed (ephemeral).
 */

const { EmbedBuilder } = require("discord.js");

/**
 * Handle the /help slash command interaction.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🐟 FISCH TRADE ASSISTANT")
    .setColor(0x1e90ff)
    .setDescription([
      `**⚖️ TRADING**`,
      `\`/trade\` — Analyze a trade`,
      `\`/value\` — Look up an item's value + history button`,
      ``,
      `**📊 MARKET & ANALYTICS**`,
      `\`/market\` — Top items, flips, trends`,
      `\`/health\` — Market health (bullish/bearish)`,
      `\`/forecast\` — Price prediction`,
      `\`/compare\` — Compare 2-5 items side by side`,
      `\`/top\` — Top 100 most valuable (paginated)`,
      ``,
      `**📈 HISTORY & CHARTS**`,
      `\`/history\` — Price chart + change log`,
      `\`/chart\` — TrueVal, Trade Hub & Proto charts`,
      ``,
      `**💼 PORTFOLIO & ALERTS**`,
      `\`/portfolio view\` — Holdings + ROI`,
      `\`/portfolio add\` — Track an item`,
      `\`/watch add\` — Price alert (DM when target hit)`,
      `\`/watch list\` — View your alerts`,
      ``,
      `**🔔 NOTIFICATIONS**`,
      `\`/subscribe\` — Value alerts in a channel`,
      `\`/unsubscribe\` — Stop alerts`,
      ``,
      `**ℹ️ OTHER**`,
      `\`/sync\` · \`/help\` · \`/about\``,
    ].join("\n"))
    .addFields(
      {
        name: "🔢 Quantity (left side only)",
        value: "`3 Nocturne` · `3x Scarwing` · `4 curse 4` · `3 c3`",
        inline: false,
      },
      {
        name: "🔍 Flexible Names (autocomplete enabled)",
        value: "`c3` → Curse III · `evan` → Evangeline · `crev` → Cthulu's Revenge\n`slime booth` → Slime Trade Booth · `rb sera` → Seraphic Rainbow\nTypos ok! `pearsickle` → Pearsicle",
        inline: false,
      },
      {
        name: "📊 Verdict Scale",
        value: "🟢🟢 BIG WIN · 🟢 WIN · 🟡 FAIR · 🔴 LOSS · 🔴🔴 BIG LOSS",
        inline: false,
      },
    )
    .setFooter({ text: "Values auto-update hourly • Use /about for bot info" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { execute };
