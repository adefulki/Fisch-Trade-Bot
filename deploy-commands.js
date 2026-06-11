require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Analyze a Fisch trade using AI (combines TrueVal, Trade Hub, Proto, Demand & Trend)")
    .addStringOption((option) =>
      option
        .setName("your_offer")
        .setDescription("Your items (comma-separated, e.g. 2 Nocturne, Scarwing)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("their_offer")
        .setDescription("Their items (comma-separated, e.g. Evangeline)")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("value")
    .setDescription("Look up a single Fisch item's value")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("Item name (e.g. Evangeline, c3, slime booth)")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("market")
    .setDescription("Show market analytics: top items, rising/dropping, best flips")
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days to analyze (default: 7)")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("history")
    .setDescription("Show price history for a specific item")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("Item name (e.g. Evangeline, c3)")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days to look back (default: 30)")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Manually sync values from game.guide"),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show bot commands and usage guide"),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Registering slash commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("✅ Slash commands registered successfully!");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
})();
