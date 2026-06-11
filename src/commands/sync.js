/**
 * /sync command — Manually sync values from game.guide.
 */

const { scrapeValues, loadItems } = require("../services/scraper");
const { recordChanges } = require("../data/history");
const { postChangeNotification } = require("../services/notifier");
const { setItems } = require("../services/matcher");

/**
 * Handle the /sync slash command interaction.
 * @param {object} interaction - Discord interaction object
 * @param {object} context - Bot context with client and getItems/setItemsRef
 * @returns {Array|null} Updated items array, or null if failed
 */
async function execute(interaction, context) {
  await interaction.deferReply({ ephemeral: true });

  const { success, changes } = await scrapeValues();
  if (success) {
    const newItems = loadItems();
    setItems(newItems);
    context.setItems(newItems);
    recordChanges(changes);
    await postChangeNotification(context.client, changes);

    const totalChanges = changes ? (changes.updated.length + changes.added.length + changes.removed.length) : 0;
    await interaction.editReply(`✅ Values synced! Loaded ${newItems.length} items. ${totalChanges > 0 ? `(${totalChanges} changes detected)` : "(no changes)"}`);
  } else {
    await interaction.editReply("❌ Sync failed. Check bot logs for details.");
  }
}

module.exports = { execute };
