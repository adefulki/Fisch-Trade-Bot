/**
 * /market command — Show market analytics with pagination.
 * Pages: Overview, Rising/Dropping, Gainers/Losers, Volatility & Flips.
 */

const { getMarketAnalytics, formatVal } = require("../data/history");
const { sendPaginated } = require("../utils/discord");

/**
 * Handle the /market slash command interaction.
 * Displays paginated market analytics with navigation buttons.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database
 */
async function execute(interaction, items) {
  await interaction.deferReply();

  const days = interaction.options.getInteger("days") || 7;
  const analytics = getMarketAnalytics(items, days);

  const pages = [];

  // Page 1: Overview + Top 10
  const page1Lines = [
    `📦 **${analytics.totalItems}** items tracked | **${analytics.totalSnapshots}** price updates (${days}d)`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🏆 **TOP 10 MOST VALUABLE**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];
  for (let i = 0; i < analytics.topValue.length; i++) {
    const item = analytics.topValue[i];
    page1Lines.push(`> ${i + 1}. **${item.name}** — ${formatVal(item.trueVal)} (${item.demand} | ${item.trend})`);
  }
  pages.push(page1Lines.join("\n"));

  // Page 2: Rising & Dropping
  const page2Lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📈 **CURRENTLY RISING** (${analytics.rising.length})`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];
  if (analytics.rising.length > 0) {
    for (const item of analytics.rising.slice(0, 10)) {
      page2Lines.push(`> • **${item.name}** — ${formatVal(item.trueVal)} (${item.demand})`);
    }
    if (analytics.rising.length > 10) page2Lines.push(`> *...and ${analytics.rising.length - 10} more*`);
  } else {
    page2Lines.push(`> *No items currently rising*`);
  }
  page2Lines.push(``);
  page2Lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
  page2Lines.push(`📉 **CURRENTLY DROPPING** (${analytics.dropping.length})`);
  page2Lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
  if (analytics.dropping.length > 0) {
    for (const item of analytics.dropping.slice(0, 10)) {
      page2Lines.push(`> • **${item.name}** — ${formatVal(item.trueVal)} (${item.demand})`);
    }
    if (analytics.dropping.length > 10) page2Lines.push(`> *...and ${analytics.dropping.length - 10} more*`);
  } else {
    page2Lines.push(`> *No items currently dropping*`);
  }
  pages.push(page2Lines.join("\n"));

  // Page 3: Gainers & Losers (from history)
  const page3Lines = [];
  if (analytics.gainers.length > 0) {
    page3Lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    page3Lines.push(`🚀 **BIGGEST GAINERS** (${days}d)`);
    page3Lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    for (const item of analytics.gainers.slice(0, 10)) {
      page3Lines.push(`> • **${item.name}** — +${formatVal(item.gain)} (${item.field})`);
    }
  } else {
    page3Lines.push(`> *No gainers recorded yet (need more history data)*`);
  }
  page3Lines.push(``);
  if (analytics.losers.length > 0) {
    page3Lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    page3Lines.push(`💀 **BIGGEST LOSERS** (${days}d)`);
    page3Lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    for (const item of analytics.losers.slice(0, 10)) {
      page3Lines.push(`> • **${item.name}** — ${formatVal(item.loss)} (${item.field})`);
    }
  } else {
    page3Lines.push(`> *No losers recorded yet (need more history data)*`);
  }
  pages.push(page3Lines.join("\n"));

  // Page 4: Volatility & Flips
  const page4Lines = [];
  if (analytics.mostVolatile.length > 0) {
    page4Lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    page4Lines.push(`⚡ **MOST VOLATILE** (${days}d)`);
    page4Lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    for (const item of analytics.mostVolatile.slice(0, 10)) {
      page4Lines.push(`> • **${item.name}** — ${item.count} price changes`);
    }
  } else {
    page4Lines.push(`> *No volatility data yet (need more history)*`);
  }
  page4Lines.push(``);
  if (analytics.bestFlips.length > 0) {
    page4Lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    page4Lines.push(`💰 **BEST FLIP OPPORTUNITIES**`);
    page4Lines.push(`High demand, underpriced in Trade Hub`);
    page4Lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    for (const item of analytics.bestFlips.slice(0, 10)) {
      page4Lines.push(`> • **${item.name}** — Buy: ${formatVal(item.tradeHub)}, Worth: ${formatVal(item.trueVal)} (+${item.gapPct.toFixed(0)}%)`);
    }
  } else {
    page4Lines.push(`> *No flip opportunities found*`);
  }
  pages.push(page4Lines.join("\n"));

  await sendPaginated(interaction, {
    title: `📊 FISCH MARKET ANALYTICS (${days}d)`,
    pages,
    color: 0x1e90ff,
    footer: "Source: game.guide/fisch-value-list",
  });
}

module.exports = { execute };
