/**
 * /sync command — Manually sync values from game.guide.
 * Restricted to bot owner only.
 */

const { scrapeValues, loadItems } = require("../services/scraper");
const { recordChanges } = require("../data/history");
const { postChangeNotification } = require("../services/notifier");
const { setItems } = require("../services/matcher");
const { setItems: setAutocompleteItems } = require("../services/autocomplete");
const { isBotOwner } = require("../utils/permissions");

/**
 * Handle the /sync slash command interaction.
 * Only the bot owner can run this command.
 * @param {object} interaction - Discord interaction object
 * @param {object} context - Bot context with client and setItems
 */
async function execute(interaction, context) {
  // Owner-only check
  if (!isBotOwner(interaction.user.id)) {
    await interaction.reply({
      content: "⚠️ Only the bot owner can use this command.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const { success, changes } = await scrapeValues();
    if (success) {
      const newItems = loadItems();
      setItems(newItems);
      setAutocompleteItems(newItems);
      context.setItems(newItems);
      recordChanges(changes);
      await postChangeNotification(context.client, changes);

      const totalChanges = changes ? (changes.updated.length + changes.added.length + changes.removed.length) : 0;
      await interaction.editReply(`✅ Values synced! Loaded ${newItems.length} items. ${totalChanges > 0 ? `(${totalChanges} changes detected)` : "(no changes)"}`);
    } else {
      await interaction.editReply("❌ Sync failed. Check bot logs for details.");
    }
  } catch (error) {
    console.error("❌ /sync error:", error.message);
    // Try to respond — if interaction expired, it'll silently fail
    await interaction.editReply(`❌ Sync error: ${error.message}`).catch(() => {});
  }
}

module.exports = { execute };
