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
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("their_offer")
        .setDescription("Their items (comma-separated, e.g. Evangeline)")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName("value")
    .setDescription("Look up a single Fisch item's value")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("Item name (e.g. Evangeline, c3, slime booth)")
        .setRequired(true)
        .setAutocomplete(true)
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
    .setDescription("Show price chart + history for a specific item")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("Item name (e.g. Evangeline, c3)")
        .setRequired(true)
        .setAutocomplete(true)
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
  new SlashCommandBuilder()
    .setName("about")
    .setDescription("Show bot info and creator details"),
  new SlashCommandBuilder()
    .setName("chart")
    .setDescription("Show a price chart for an item's value over time")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("Item name (e.g. Evangeline, c3)")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days to chart (default: 30)")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("subscribe")
    .setDescription("Subscribe this channel to receive value change notifications")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to post notifications (default: current channel)")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("unsubscribe")
    .setDescription("Stop receiving value change notifications in this server"),
  new SlashCommandBuilder()
    .setName("forecast")
    .setDescription("Price trend forecast for an item")
    .addStringOption((option) =>
      option.setName("item").setDescription("Item name").setRequired(true).setAutocomplete(true)
    )
    .addIntegerOption((option) =>
      option.setName("days").setDescription("Days of history to analyze (default: 14)").setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("watch")
    .setDescription("Manage price alerts (watchlist)")
    .addSubcommand((sub) =>
      sub.setName("add").setDescription("Add a price alert")
        .addStringOption((o) => o.setName("item").setDescription("Item name").setRequired(true).setAutocomplete(true))
        .addStringOption((o) => o.setName("condition").setDescription("Alert when price goes...").setRequired(true).addChoices({ name: "Above", value: "above" }, { name: "Below", value: "below" }))
        .addNumberOption((o) => o.setName("price").setDescription("Target price (e.g. 5000000)").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("remove").setDescription("Remove a price alert")
        .addStringOption((o) => o.setName("item").setDescription("Item name").setRequired(true).setAutocomplete(true))
        .addStringOption((o) => o.setName("condition").setDescription("Which alert to remove").setRequired(false).addChoices({ name: "Above", value: "above" }, { name: "Below", value: "below" }, { name: "All", value: "all" }))
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Show your active watches")
    ),
  new SlashCommandBuilder()
    .setName("portfolio")
    .setDescription("Track your item holdings with ROI")
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View your portfolio")
    )
    .addSubcommand((sub) =>
      sub.setName("add").setDescription("Add item to portfolio")
        .addStringOption((o) => o.setName("item").setDescription("Item name").setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName("qty").setDescription("Quantity (default: 1)").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName("remove").setDescription("Remove item from portfolio")
        .addStringOption((o) => o.setName("item").setDescription("Item name").setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName("qty").setDescription("Quantity to remove (default: all)").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName("clear").setDescription("Clear your entire portfolio")
    ),
  new SlashCommandBuilder()
    .setName("health")
    .setDescription("Show overall market health index")
    .addIntegerOption((option) =>
      option.setName("days").setDescription("Days to analyze (default: 7)").setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("compare")
    .setDescription("Compare 2-5 items side by side with investment suggestion")
    .addStringOption((option) =>
      option.setName("items").setDescription("Items to compare (comma-separated, e.g. Evangeline, Nocturne, Curse IV)").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("top")
    .setDescription("Show top 100 most valuable items (paginated)")
    .addStringOption((option) =>
      option.setName("sort").setDescription("Sort by (default: grade)").setRequired(false)
        .addChoices(
          { name: "📊 Investment Grade", value: "grade" },
          { name: "💎 TrueVal (highest)", value: "trueval" },
          { name: "🏪 Trade Hub (highest)", value: "tradehub" },
          { name: "🪙 Proto (highest)", value: "proto" },
          { name: "🔥 Demand (highest)", value: "demand" },
          { name: "📈 Rising items", value: "rising" },
          { name: "📉 Dropping items", value: "dropping" },
        )
    ),
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
