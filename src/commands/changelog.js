/**
 * /changelog command — Broadcast the latest changelog to all subscribed servers.
 * Restricted to bot owner only.
 */

const { EmbedBuilder, MessageFlags } = require("discord.js");
const { isBotOwner } = require("../utils/permissions");
const { getSubscribedChannels } = require("../data/subscriptions");

/** Latest changelog content */
const CHANGELOG = {
  version: "v2.1.0",
  date: "July 22, 2026",
  sections: [
    {
      title: "🆕 New Commands",
      items: [
        "`/similar` — Find items within a value range (trade alternatives)",
        "`/roi` — Top items by ROI (value ÷ Robux cost)",
        "`/liquidity` — Items ranked by ease of selling",
        "`/changelog` — Broadcast changelog to all servers",
      ],
    },
    {
      title: "📈 Trading Hub Insights",
      items: [
        "Real supply/demand from game.guide Trading Hub",
        "`/top` new sorts: 🎯 Most Wanted & 🔥 Hot (most traded)",
        "`/value` shows wanted/offered counts + oversupplied/undersupplied",
        "`/trade` warns about supply issues on traded items",
      ],
    },
    {
      title: "🛡️ Manipulation Detection",
      items: [
        "Detects: spikes, pump & dump, demand flips, fake trends, supply mismatch",
        "Confidence: Stable → Suspicious → Likely Manipulated",
        "Integrated into `/value`, `/trade`, `/compare`, `/history`",
      ],
    },
    {
      title: "📊 Market Data",
      items: [
        "Stock, Cost (Robux), Sold Rate, Market Value on `/value`",
        "🚨 Price Gap Warning when listed ≠ real market price (>30%)",
        "Smart Value: real trade data over manipulated TrueVal",
      ],
    },
    {
      title: "⚖️ Compare & Similar",
      items: [
        "`/compare` — value diff, price efficiency, stability warnings",
        "`/similar` — fair swaps, cheaper/pricier options with trade hints",
      ],
    },
    {
      title: "🐛 Fixes",
      items: [
        "\"Very High\" demand handling (color, multiplier, notifier)",
        "Scraper rewrite for game.guide 2025 redesign",
        "Trend parsing, N/A reduction, sync timeout fix",
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
