require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Analyze a Fisch trade using AI (combines TrueVal, Trade Hub, Proto, Demand & Trend)")
    .addStringOption((option) =>
      option
        .setName("your_offer")
        .setDescription("Your items (comma-separated, e.g. Nocturne, Scarwing)")
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
        .setDescription("Item name (e.g. Evangeline)")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Manually sync values from game.guide (admin only)"),
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
