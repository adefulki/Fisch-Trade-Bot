/**
 * Subscription manager for value change notifications.
 * Stores channel IDs that want to receive alerts per server.
 */

const fs = require("fs");
const path = require("path");

/** Directory for persistent data */
const DATA_DIR = process.env.VOLUME_PATH || path.join(__dirname, "..", "..", "data");
const SUBS_FILE = path.join(DATA_DIR, "subscriptions.json");

/**
 * Ensure the data directory exists.
 */
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load all subscriptions from disk.
 * @returns {Array<{guildId: string, channelId: string, subscribedBy: string, subscribedAt: string}>}
 */
function loadSubscriptions() {
  ensureDir();
  try {
    if (fs.existsSync(SUBS_FILE)) {
      const raw = fs.readFileSync(SUBS_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("⚠️ Failed to load subscriptions:", e.message);
  }
  return [];
}

/**
 * Save subscriptions to disk.
 * @param {Array} subs - Array of subscription objects
 */
function saveSubscriptions(subs) {
  ensureDir();
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), "utf8");
}

/**
 * Subscribe a channel to receive value change notifications.
 * One subscription per guild. One notification per channel (no duplicates).
 * @param {string} guildId - Discord server ID
 * @param {string} channelId - Discord channel ID
 * @param {string} userId - User who subscribed
 * @returns {{success: boolean, replaced: boolean, message: string}}
 */
function subscribe(guildId, channelId, userId) {
  const subs = loadSubscriptions();

  // Check if this channel is already subscribed by another guild
  const channelExists = subs.find((s) => s.channelId === channelId && s.guildId !== guildId);
  if (channelExists) {
    // Same channel — just update the entry
  }

  // Check if this guild already has a subscription
  const existingIdx = subs.findIndex((s) => s.guildId === guildId);
  const replaced = existingIdx !== -1;

  if (replaced) {
    subs[existingIdx] = {
      guildId,
      channelId,
      subscribedBy: userId,
      subscribedAt: new Date().toISOString(),
    };
  } else {
    // Check if this channel is already receiving notifications (from another guild entry)
    const alreadyHasChannel = subs.find((s) => s.channelId === channelId);
    if (alreadyHasChannel) {
      return { success: true, replaced: false, message: "This channel is already receiving notifications." };
    }

    subs.push({
      guildId,
      channelId,
      subscribedBy: userId,
      subscribedAt: new Date().toISOString(),
    });
  }

  saveSubscriptions(subs);
  return { success: true, replaced, message: replaced ? "Subscription updated." : "Subscribed." };
}

/**
 * Unsubscribe a server from value change notifications.
 * @param {string} guildId - Discord server ID
 * @returns {boolean} True if was subscribed and now removed
 */
function unsubscribe(guildId) {
  const subs = loadSubscriptions();
  const before = subs.length;
  const filtered = subs.filter((s) => s.guildId !== guildId);
  saveSubscriptions(filtered);
  return filtered.length < before;
}

/**
 * Get all unique subscribed channel IDs (for posting notifications).
 * Deduplicates in case multiple guilds somehow share a channel.
 * @returns {string[]} Array of unique channel IDs
 */
function getSubscribedChannels() {
  const subs = loadSubscriptions();
  const unique = [...new Set(subs.map((s) => s.channelId))];
  return unique;
}

/**
 * Get subscription status for a specific server.
 * @param {string} guildId - Discord server ID
 * @returns {object|null} Subscription object or null
 */
function getSubscription(guildId) {
  const subs = loadSubscriptions();
  return subs.find((s) => s.guildId === guildId) || null;
}

module.exports = { subscribe, unsubscribe, getSubscribedChannels, getSubscription, loadSubscriptions };
