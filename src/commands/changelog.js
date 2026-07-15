/**
 * /changelog command — Broadcast the latest changelog to all subscribed servers.
 * Restricted to bot owner only.
 */

const { EmbedBuilder, MessageFlags } = require("discord.js");
const { isBotOwner } = require("../utils/permissions");
const { getSubscribedChannels } = require("../data/subscriptions");

/** Latest changelog content */
const CHANGELOG = {
  version: "v2.0.0",
  date: "July 15, 2026",
  sections: [
    {
      title: "🆕 New Commands",
      items: [
        "`/roi` — Top items by ROI (value ÷ Robux cost)",
        "`/liquidity` — Items ranked by ease of selling",
        "`/changelog` — View latest bot changes",
      ],
    },
    {
      title: "🛡️ Manipulation Detection",
      items: [
        "Detects: spikes, pump & dump, demand flips, oscillation, fake trends",
        "Confidence: Stable → Suspicious → Likely Manipulated",
        "Integrated into `/value`, `/trade`, `/compare`, `/history`",
      ],
    },
    {
      title: "📊 Market Data",
      items: [
        "Stock, Cost (Robux), Sold Rate from item detail pages",
        "Community Market Value from active trades",
        "🚨 Price Gap Warning when listed ≠ market price (>30% diff)",
        "Smart Value: uses real trade data over possibly-manipulated TrueVal",
      ],
    },
    {
      title: "⚖️ Compare Overhaul",
      items: [
        "Value difference display (% from top, exact gap)",
        "Price efficiency: 💎 Underpriced → 🔴 Overpriced",
        "Trade fairness for 2 items, value spread for 3-5",
        "Scarcity scoring (stock + sold rate)",
      ],
    },
    {
      title: "🌐 Scraper Rewrite",
      items: [
        "Puppeteer support for JS-rendered game.guide",
        "New card layout parser (2025 redesign)",
        "Filters out all-N/A items",
      ],
    },
    {
      title: "🐛 Fixes",
      items: [
        "\"Very High\" demand: color, multiplier, notifier ordering",
        "`/sync` timeout crash prevention",
        "Trend parsing for new card design",
      ],
    },
  ],
};

/**
 * Build the changelog embed.
 * @returns {EmbedBuilder}
 */
function buildChangelogEmbed() {
  const description = CHANGELOG.sections.map((section) => {
    const items = section.items.map((item) => `• ${item}`).join("\n");
    return `**${section.title}**\n${items}`;
  }).join("\n\n");

  return new EmbedBuilder()
    .setTitle(`📋 Changelog — ${CHANGELOG.version}`)
    .setDescription(description)
    .setColor(0x5865f2)
    .setFooter({ text: `Released: ${CHANGELOG.date} • Fisch Trade Assistant` })
    .setTimestamp();
}

/**
 * Handle the /changelog slash command interaction.
 * Broadcasts changelog to all subscribed channels.
 * @param {object} interaction - Discord interaction object
 * @param {object} context - Bot context with client
 */
async function execute(interaction, context) {
  if (!isBotOwner(interaction.user.id)) {
    await interaction.reply({
      content: "⚠️ Only the bot owner can use this command.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const embed = buildChangelogEmbed();
  const client = context ? context.client : interaction.client;
  const channels = getSubscribedChannels();

  let sent = 0;
  let failed = 0;

  for (const channelId of channels) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        await channel.send({ embeds: [embed] });
        sent++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }

  // Also post in the current channel (public) if not already subscribed
  const currentChannelId = interaction.channelId;
  if (!channels.includes(currentChannelId)) {
    try {
      const channel = await client.channels.fetch(currentChannelId);
      if (channel) {
        await channel.send({ embeds: [embed] });
        sent++;
      }
    } catch (e) { /* ignore */ }
  }

  await interaction.editReply(
    `✅ Changelog broadcasted to **${sent}** channel${sent !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}.`
  );
}

module.exports = { execute };
