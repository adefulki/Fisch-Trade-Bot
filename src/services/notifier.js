/**
 * Discord channel notification service.
 * Posts value change notifications to all subscribed channels + the env-configured channel.
 */

const { formatChangesMessage } = require("./scraper");
const { getSubscribedChannels } = require("../data/subscriptions");

/**
 * Post value change notifications to all subscribed channels.
 * Includes the NOTIFICATION_CHANNEL_ID from env + all /subscribe channels.
 * Skips silently if no changes or no channels configured.
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

  const messages = formatChangesMessage(changes);
  if (!messages || messages.length === 0) {
    console.log("📢 No formatted messages to send");
    return;
  }

  // Collect all channel IDs to notify
  const channelIds = new Set();

  // Add env-configured channel (legacy/owner channel)
  const envChannel = process.env.NOTIFICATION_CHANNEL_ID;
  if (envChannel && envChannel !== "paste_your_channel_id_here") {
    channelIds.add(envChannel);
  }

  // Add all subscribed channels
  const subscribedChannels = getSubscribedChannels();
  for (const id of subscribedChannels) {
    channelIds.add(id);
  }

  if (channelIds.size === 0) {
    console.log("⚠️ No notification channels configured — skipping");
    return;
  }

  console.log(`📢 Posting notifications to ${channelIds.size} channel(s)...`);

  let successCount = 0;
  let failCount = 0;

  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        failCount++;
        continue;
      }
      for (const msg of messages) {
        await channel.send(msg);
      }
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`⚠️ Failed to post to channel ${channelId}:`, error.message);
    }
  }

  console.log(`📢 Notifications sent: ${successCount} success, ${failCount} failed`);
}

module.exports = { postChangeNotification };
