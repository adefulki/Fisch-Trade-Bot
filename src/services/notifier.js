/**
 * Discord channel notification service.
 * Posts value change notifications to a configured channel.
 */

const { formatChangesMessage } = require("./scraper");

/**
 * Post value change notifications to the configured Discord channel.
 * Skips silently if no changes, no channel configured, or channel not accessible.
 * @param {object} client - Discord.js client instance
 * @param {object|null} changes - Changes object from scraper (updated, added, removed)
 */
async function postChangeNotification(client, changes) {
  if (!changes) {
    console.log("📢 No changes to notify");
    return;
  }

  const totalChanges = changes.updated.length + changes.added.length + changes.removed.length;
  if (totalChanges === 0) {
    console.log("📢 No changes to notify (0 total)");
    return;
  }

  const channelId = process.env.NOTIFICATION_CHANNEL_ID;
  if (!channelId || channelId === "paste_your_channel_id_here") {
    console.log("⚠️ NOTIFICATION_CHANNEL_ID not set in .env — skipping notification");
    return;
  }

  const messages = formatChangesMessage(changes);
  if (!messages || messages.length === 0) {
    console.log("📢 No formatted messages to send");
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error("⚠️ Notification channel not found:", channelId);
      return;
    }
    if (!channel.isTextBased()) {
      console.error("⚠️ Channel is not a text channel:", channelId);
      return;
    }
    for (const msg of messages) {
      await channel.send(msg);
    }
    console.log(`📢 Posted value change notification (${totalChanges} changes) to #${channel.name}`);
  } catch (error) {
    console.error("⚠️ Failed to post notification:", error.message);
  }
}

module.exports = { postChangeNotification };
