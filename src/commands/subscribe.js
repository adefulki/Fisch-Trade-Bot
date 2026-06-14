/**
 * /subscribe and /unsubscribe commands — Manage value change notifications for a server.
 * Only server owner or bot owner can subscribe/unsubscribe.
 */

const { EmbedBuilder } = require("discord.js");
const { subscribe, unsubscribe, getSubscription } = require("../data/subscriptions");
const { isAdmin } = require("../utils/permissions");

/**
 * Handle the /subscribe slash command.
 * Subscribes the current (or specified) channel to receive value change alerts.
 * @param {object} interaction - Discord interaction object
 */
async function executeSubscribe(interaction) {
  // Only server owner or bot owner can subscribe
  if (!isAdmin(interaction)) {
    await interaction.reply({
      content: "⚠️ Only the **server owner** can subscribe to notifications.",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.options.getChannel("channel") || interaction.channel;

  // Verify it's a text channel
  if (!channel.isTextBased()) {
    await interaction.reply({
      content: "⚠️ Please select a text channel.",
      ephemeral: true,
    });
    return;
  }

  const { replaced } = subscribe(interaction.guildId, channel.id, interaction.user.id);

  const embed = new EmbedBuilder()
    .setTitle("🔔 Notifications Subscribed")
    .setDescription(
      `Value change alerts will be posted to <#${channel.id}>.\n\n` +
      `When item values change on game.guide, this channel will receive:\n` +
      `> 📈 Items going up in value\n` +
      `> 📉 Items going down in value\n` +
      `> 🆕 New items added\n\n` +
      (replaced ? `*Previous subscription replaced.*` : `*Use \`/unsubscribe\` to stop notifications.*`)
    )
    .setColor(0x00ff00)
    .setFooter({ text: `Subscribed by ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * Handle the /unsubscribe slash command.
 * Removes this server's notification subscription.
 * @param {object} interaction - Discord interaction object
 */
async function executeUnsubscribe(interaction) {
  // Only server owner or bot owner can unsubscribe
  if (!isAdmin(interaction)) {
    await interaction.reply({
      content: "⚠️ Only the **server owner** can unsubscribe from notifications.",
      ephemeral: true,
    });
    return;
  }

  const removed = unsubscribe(interaction.guildId);

  if (removed) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔕 Notifications Unsubscribed")
          .setDescription("This server will no longer receive value change alerts.")
          .setColor(0xff4500),
      ],
    });
  } else {
    await interaction.reply({
      content: "This server doesn't have an active subscription.",
      ephemeral: true,
    });
  }
}

module.exports = { executeSubscribe, executeUnsubscribe };
