/**
 * /market command — Show market analytics as multiple embeds.
 * No pagination — sends all sections as separate embeds in one message.
 * Uses embed descriptions (4096 chars each) to stay within limits.
 */

const { EmbedBuilder } = require("discord.js");
const { getMarketAnalytics, formatVal } = require("../data/history");

/**
 * Handle the /market slash command interaction.
 * Sends multiple embeds (up to 10 per message) covering all analytics sections.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database
 */
async function execute(interaction, items) {
  await interaction.deferReply();

  const days = interaction.options.getInteger("days") || 7;
  const analytics = getMarketAnalytics(items, days);

  const embeds = [];

  // Embed 1: Overview + Top 10
  const topLines = [`📦 **${analytics.totalItems}** items tracked | **${analytics.totalSnapshots}** price updates (${days}d)\n`];
  topLines.push(`🏆 **TOP 10 MOST VALUABLE**`);
  for (let i = 0; i < analytics.topValue.length; i++) {
    const item = analytics.topValue[i];
    topLines.push(`${i + 1}. **${item.name}** — ${formatVal(item.trueVal)} (${item.demand} | ${item.trend})`);
  }

  embeds.push(
    new EmbedBuilder()
      .setTitle(`📊 FISCH MARKET ANALYTICS (${days}d)`)
      .setDescription(topLines.join("\n"))
      .setColor(0x1e90ff)
  );

  // Embed 2: Rising & Dropping
  const trendLines = [];
  trendLines.push(`📈 **CURRENTLY RISING** (${analytics.rising.length})`);
  if (analytics.rising.length > 0) {
    for (const item of analytics.rising.slice(0, 8)) {
      trendLines.push(`• **${item.name}** — ${formatVal(item.trueVal)} (${item.demand})`);
    }
    if (analytics.rising.length > 8) trendLines.push(`*...and ${analytics.rising.length - 8} more*`);
  } else {
    trendLines.push(`*No items currently rising*`);
  }
  trendLines.push(``);
  trendLines.push(`📉 **CURRENTLY DROPPING** (${analytics.dropping.length})`);
  if (analytics.dropping.length > 0) {
    for (const item of analytics.dropping.slice(0, 8)) {
      trendLines.push(`• **${item.name}** — ${formatVal(item.trueVal)} (${item.demand})`);
    }
    if (analytics.dropping.length > 8) trendLines.push(`*...and ${analytics.dropping.length - 8} more*`);
  } else {
    trendLines.push(`*No items currently dropping*`);
  }

  embeds.push(
    new EmbedBuilder()
      .setDescription(trendLines.join("\n"))
      .setColor(0x1e90ff)
  );

  // Embed 3: Gainers, Losers, Volatility (from history) — only if data exists
  const histLines = [];
  let hasHistData = false;

  if (analytics.gainers.length > 0) {
    hasHistData = true;
    histLines.push(`🚀 **BIGGEST GAINERS** (${days}d)`);
    for (const item of analytics.gainers.slice(0, 5)) {
      histLines.push(`• **${item.name}** — +${formatVal(item.gain)} (${item.field})`);
    }
    histLines.push(``);
  }

  if (analytics.losers.length > 0) {
    hasHistData = true;
    histLines.push(`💀 **BIGGEST LOSERS** (${days}d)`);
    for (const item of analytics.losers.slice(0, 5)) {
      histLines.push(`• **${item.name}** — ${formatVal(item.loss)} (${item.field})`);
    }
    histLines.push(``);
  }

  if (analytics.mostVolatile.length > 0) {
    hasHistData = true;
    histLines.push(`⚡ **MOST VOLATILE** (${days}d)`);
    for (const item of analytics.mostVolatile.slice(0, 5)) {
      histLines.push(`• **${item.name}** — ${item.count} price changes`);
    }
  }

  if (hasHistData) {
    embeds.push(
      new EmbedBuilder()
        .setDescription(histLines.join("\n"))
        .setColor(0x1e90ff)
    );
  }

  // Embed 4: Best flips
  if (analytics.bestFlips.length > 0) {
    const flipLines = [`💰 **BEST FLIP OPPORTUNITIES**\nHigh demand, underpriced in Trade Hub\n`];
    for (const item of analytics.bestFlips.slice(0, 8)) {
      flipLines.push(`• **${item.name}** — Buy: ${formatVal(item.tradeHub)}, Worth: ${formatVal(item.trueVal)} (+${item.gapPct.toFixed(0)}%)`);
    }

    embeds.push(
      new EmbedBuilder()
        .setDescription(flipLines.join("\n"))
        .setColor(0x00ff00)
        .setFooter({ text: "Source: game.guide/fisch-value-list" })
    );
  } else {
    // Add footer to last embed
    embeds[embeds.length - 1].setFooter({ text: "Source: game.guide/fisch-value-list" });
  }

  // Discord allows max 10 embeds per message — we use at most 4
  await interaction.editReply({ embeds });
}

module.exports = { execute };
