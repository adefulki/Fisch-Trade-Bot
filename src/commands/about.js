/**
 * /about command — Show bot info and creator details.
 */

const { EmbedBuilder } = require("discord.js");

/**
 * Handle the /about slash command interaction.
 * @param {object} interaction - Discord interaction object
 */
async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("🐟 Fisch Trade Assistant")
    .setDescription("A Discord bot that analyzes trades for the Roblox game **Fisch** using live market data. Combines TrueVal, Trade Hub, Proto, Demand, and Trend into smart adjusted valuations powered by AI.")
    .setColor(0x1e90ff)
    .addFields(
      { name: "━━━━━━━━━━━━━━━━━━━━", value: "**⚖️ TRADING**", inline: false },
      { name: "Trade Analysis", value: "AI-powered with local fallback", inline: true },
      { name: "Value Lookup", value: "Instant item stats + history button", inline: true },
      { name: "Item Suggestions", value: "Recommends adds for unfair trades", inline: true },
      { name: "━━━━━━━━━━━━━━━━━━━━", value: "**📊 MARKET & ANALYTICS**", inline: false },
      { name: "Market Analytics", value: "Top items, flips, volatility", inline: true },
      { name: "Market Health", value: "Bullish/bearish sentiment index", inline: true },
      { name: "Trend Forecast", value: "Price prediction via regression", inline: true },
      { name: "━━━━━━━━━━━━━━━━━━━━", value: "**� TRACKING**", inline: false },
      { name: "Price Charts", value: "TrueVal + Trade Hub & Proto", inline: true },
      { name: "Price History", value: "90-day change tracking", inline: true },
      { name: "Portfolio + ROI", value: "Track holdings & profit/loss", inline: true },
      { name: "━━━━━━━━━━━━━━━━━━━━", value: "**🔔 ALERTS**", inline: false },
      { name: "Watchlist", value: "DM alerts when price hits target", inline: true },
      { name: "Notifications", value: "Channel alerts on value changes", inline: true },
      { name: "Auto-Sync", value: "Hourly updates from game.guide", inline: true },
      { name: "━━━━━━━━━━━━━━━━━━━━", value: "**👤 CREATOR**", inline: false },
      { name: "Discord", value: "<@456285930420961281> (`adefulkih`)", inline: true },
      { name: "Roblox", value: "RiseFromHell (`adefulkih`)", inline: true },
      { name: "GitHub", value: "[adefulki](https://github.com/adefulki)", inline: true },
    )
    .setFooter({ text: "Made with ❤️ for the Fisch trading community • Type /help for commands" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = { execute };
