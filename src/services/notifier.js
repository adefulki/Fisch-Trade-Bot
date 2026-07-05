/**
 * Discord channel notification service.
 * Posts value change notifications as embeds to all subscribed channels.
 */

const { EmbedBuilder } = require("discord.js");
const { getSubscribedChannels } = require("../data/subscriptions");
const { formatVal } = require("../utils/format");

/**
 * Parse a formatted value string like "S$ 1.00M", "S$ 998.0K", "N/A" to a number.
 * @param {string} str - Formatted value string
 * @returns {number} Numeric value
 */
function parseNotifValue(str) {
  if (!str || str === "N/A") return 0;
  str = str.replace(/\*\*/g, "").replace("S$", "").replace(/,/g, "").trim();
  if (str.includes("M")) return parseFloat(str) * 1000000;
  if (str.includes("K")) return parseFloat(str) * 1000;
  return parseFloat(str) || 0;
}

/**
 * Build embed(s) from detected changes.
 * Separates into VALUE UP, VALUE DOWN, and OTHER sections.
 * @param {object} changes - Changes object from scraper
 * @returns {EmbedBuilder[]|null} Array of embeds, or null if no changes
 */
function buildChangeEmbeds(changes) {
  if (!changes) return null;
  const totalChanges = changes.updated.length + changes.added.length + changes.removed.length;
  if (totalChanges === 0) return null;

  const timestamp = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const embeds = [];

  // Separate updated items into UP / DOWN / OTHER
  let goingUp = [], goingDown = [], other = [];

  if (changes.updated.length > 0) {
    for (const item of changes.updated) {
      let hasUp = false, hasDown = false;
      for (const c of item.changes) {
        if (c.field === "TrueVal" || c.field === "Trade Hub" || c.field === "Proto") {
          const beforeNum = parseNotifValue(c.before);
          const afterNum = parseNotifValue(c.after);
          if (afterNum > beforeNum) hasUp = true;
          if (afterNum < beforeNum) hasDown = true;
        }
        if (c.field === "Trend") {
          if (c.after === "Rising") hasUp = true;
          if (c.after === "Dropping") hasDown = true;
        }
        if (c.field === "Demand") {
          const order = ["Very Low", "Low", "Medium", "High", "Very High", "Limited"];
          if (order.indexOf(c.after) > order.indexOf(c.before)) hasUp = true;
          if (order.indexOf(c.after) < order.indexOf(c.before)) hasDown = true;
        }
      }

      const changeStr = item.changes.map((c) => `${c.field}: ${c.before} → **${c.after}**`).join(" | ");
      const entry = `• **${item.name}** — ${changeStr}`;

      if (hasUp && !hasDown) goingUp.push(entry);
      else if (hasDown && !hasUp) goingDown.push(entry);
      else other.push(entry);
    }
  }

  // Main embed
  const mainEmbed = new EmbedBuilder()
    .setTitle("📢 FISCH VALUE UPDATE")
    .setColor(0x1e90ff)
    .setFooter({ text: `Source: game.guide/fisch-value-list • ${timestamp} WIB` })
    .setTimestamp();

  const descLines = [];

  // New items section
  if (changes.added.length > 0) {
    descLines.push(`🆕 **NEW ITEMS** (${changes.added.length})`);
    for (const item of changes.added.slice(0, 5)) {
      descLines.push(`• **${item.name}** — TrueVal: ${formatVal(item.trueVal)} | Demand: ${item.demand} | Trend: ${item.trend}`);
    }
    if (changes.added.length > 5) descLines.push(`*...and ${changes.added.length - 5} more*`);
    descLines.push(``);
  }

  // Value UP section
  if (goingUp.length > 0) {
    descLines.push(`📈 **VALUE UP** (${goingUp.length})`);
    for (const e of goingUp.slice(0, 10)) descLines.push(e);
    if (goingUp.length > 10) descLines.push(`*...and ${goingUp.length - 10} more*`);
    descLines.push(``);
  }

  // Value DOWN section
  if (goingDown.length > 0) {
    descLines.push(`📉 **VALUE DOWN** (${goingDown.length})`);
    for (const e of goingDown.slice(0, 10)) descLines.push(e);
    if (goingDown.length > 10) descLines.push(`*...and ${goingDown.length - 10} more*`);
    descLines.push(``);
  }

  // Other changes
  if (other.length > 0) {
    descLines.push(`🔄 **OTHER CHANGES** (${other.length})`);
    for (const e of other.slice(0, 5)) descLines.push(e);
    if (other.length > 5) descLines.push(`*...and ${other.length - 5} more*`);
    descLines.push(``);
  }

  // Removed items
  if (changes.removed.length > 0) {
    descLines.push(`❌ **REMOVED** (${changes.removed.length})`);
    for (const item of changes.removed.slice(0, 3)) descLines.push(`• ${item.name}`);
    if (changes.removed.length > 3) descLines.push(`*...and ${changes.removed.length - 3} more*`);
  }

  const description = descLines.join("\n");

  // If description fits in one embed (4096 char limit)
  if (description.length <= 4000) {
    mainEmbed.setDescription(description);
    embeds.push(mainEmbed);
  } else {
    // Split into multiple embeds
    const chunks = [];
    let current = "";
    for (const line of descLines) {
      if ((current + "\n" + line).length > 3900) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? "\n" : "") + line;
      }
    }
    if (current) chunks.push(current);

    for (let i = 0; i < chunks.length; i++) {
      const embed = new EmbedBuilder()
        .setDescription(chunks[i])
        .setColor(0x1e90ff);
      if (i === 0) embed.setTitle("📢 FISCH VALUE UPDATE");
      if (i === chunks.length - 1) embed.setFooter({ text: `Source: game.guide/fisch-value-list • ${timestamp} WIB` });
      embeds.push(embed);
    }
  }

  return embeds;
}

/**
 * Post value change notifications as embeds to all subscribed channels.
 * Includes the NOTIFICATION_CHANNEL_ID from env + all /subscribe channels.
 * @param {object} client - Discord.js client instance
 * @param {object|null} changes - Changes object from scraper
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

  const embeds = buildChangeEmbeds(changes);
  if (!embeds || embeds.length === 0) {
    console.log("📢 No embeds to send");
    return;
  }

  // Collect unique channel IDs (Set prevents duplicates)
  const channelIds = new Set();

  // All subscribed channels (this is the primary source)
  const subscribedChannels = getSubscribedChannels();
  for (const id of subscribedChannels) {
    channelIds.add(id);
  }

  // Env-configured channel ONLY if no subscriptions exist (legacy fallback)
  if (channelIds.size === 0) {
    const envChannel = process.env.NOTIFICATION_CHANNEL_ID;
    if (envChannel && envChannel !== "paste_your_channel_id_here" && envChannel.length > 10) {
      channelIds.add(envChannel);
    }
  }

  if (channelIds.size === 0) {
    console.log("⚠️ No notification channels configured — skipping");
    return;
  }

  console.log(`📢 Posting embed notifications to ${channelIds.size} unique channel(s):`, [...channelIds]);

  let successCount = 0;
  let failCount = 0;

  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        failCount++;
        continue;
      }
      await channel.send({ embeds });
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`⚠️ Failed to post to channel ${channelId}:`, error.message);
    }
  }

  console.log(`📢 Notifications sent: ${successCount} success, ${failCount} failed`);
}

module.exports = { postChangeNotification };
