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
      { name: "━━━━━━━━━━━━━━━━━━━━━━━━", value: "**FEATURES**", inline: false },
      { name: "⚖️ Trade Analysis", value: "AI-powered with local fallback", inline: true },
      { name: "📊 Market Analytics", value: "Top items, flips, trends", inline: true },
      { name: "📜 Price History", value: "90-day change tracking", inline: true },
      { name: "🔄 Auto-Sync", value: "Hourly updates from game.guide", inline: true },
      { name: "🔔 Notifications", value: "Value change alerts", inline: true },
      { name: "🔍 Smart Search", value: "Fuzzy matching + aliases", inline: true },
      { name: "━━━━━━━━━━━━━━━━━━━━━━━━", value: "**CREATOR**", inline: false },
      { name: "👤 Discord", value: "<@456285930420961281> (`adefulkih`)", inline: true },
      { name: "🎮 Roblox", value: "[RiseFromHell](https://www.roblox.com/users/profile) (`adefulkih`)", inline: true },
      { name: "💻 GitHub", value: "[adefulki](https://github.com/adefulki)", inline: true },
      { name: "━━━━━━━━━━━━━━━━━━━━━━━━", value: "**LINKS**", inline: false },
      { name: "📈 Data Source", value: "[game.guide/fisch-value-list](https://www.game.guide/fisch-value-list)", inline: true },
      { name: "📖 Commands", value: "Type `/help` for usage guide", inline: true },
    )
    .setFooter({ text: "Made with ❤️ for the Fisch trading community" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = { execute };
