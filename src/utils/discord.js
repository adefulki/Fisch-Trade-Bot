/**
 * Discord utility helpers for embeds, message splitting, and pagination.
 * Discord limits: message = 2000 chars, embed description = 4096 chars, embed total = 6000 chars.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");

const MAX_MSG_LENGTH = 2000;
const MAX_EMBED_DESC = 4096;

/**
 * Send a reply using a rich embed. Supports long content by splitting into multiple embeds.
 * @param {object} interaction - Discord interaction object
 * @param {object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description (can be long, will split)
 * @param {number} [options.color] - Embed color (hex)
 * @param {string} [options.footer] - Footer text
 * @param {boolean} [options.ephemeral] - Whether the reply is ephemeral
 */
async function sendEmbed(interaction, { title, description, color = 0x1e90ff, footer, ephemeral = false }) {
  const chunks = splitText(description, MAX_EMBED_DESC - 100);

  const embeds = chunks.map((chunk, i) => {
    const embed = new EmbedBuilder()
      .setDescription(chunk)
      .setColor(color);

    if (i === 0 && title) embed.setTitle(title);
    if (i === chunks.length - 1 && footer) embed.setFooter({ text: footer });

    return embed;
  });

  // Discord allows max 10 embeds per message
  const embedBatches = [];
  for (let i = 0; i < embeds.length; i += 10) {
    embedBatches.push(embeds.slice(i, i + 10));
  }

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: embedBatches[0], ephemeral });
    for (let i = 1; i < embedBatches.length; i++) {
      await interaction.followUp({ embeds: embedBatches[i], ephemeral });
    }
  } else {
    await interaction.reply({ embeds: embedBatches[0], ephemeral });
    for (let i = 1; i < embedBatches.length; i++) {
      await interaction.followUp({ embeds: embedBatches[i], ephemeral });
    }
  }
}

/**
 * Send a paginated embed with Previous/Next buttons.
 * Each page is a separate embed description. Buttons auto-disable after 2 minutes.
 * @param {object} interaction - Discord interaction object
 * @param {object} options - Pagination options
 * @param {string} options.title - Embed title
 * @param {string[]} options.pages - Array of page content strings
 * @param {number} [options.color] - Embed color
 * @param {string} [options.footer] - Base footer text (page number appended)
 */
async function sendPaginated(interaction, { title, pages, color = 0x1e90ff, footer = "" }) {
  if (pages.length === 0) return;

  // If only one page, no buttons needed
  if (pages.length === 1) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(pages[0])
      .setColor(color)
      .setFooter({ text: `${footer}${footer ? " • " : ""}Page 1/1` });

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed] });
    }
    return;
  }

  let currentPage = 0;

  /**
   * Build embed for the current page.
   */
  function buildEmbed() {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(pages[currentPage])
      .setColor(color)
      .setFooter({ text: `${footer}${footer ? " • " : ""}Page ${currentPage + 1}/${pages.length}` });
  }

  /**
   * Build the action row with navigation buttons.
   */
  function buildButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("page_first")
        .setLabel("⏮")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("page_prev")
        .setLabel("◀")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("page_next")
        .setLabel("▶")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === pages.length - 1),
      new ButtonBuilder()
        .setCustomId("page_last")
        .setLabel("⏭")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === pages.length - 1),
    );
  }

  // Send initial message
  const msg = interaction.deferred || interaction.replied
    ? await interaction.editReply({ embeds: [buildEmbed()], components: [buildButtons()] })
    : await interaction.reply({ embeds: [buildEmbed()], components: [buildButtons()], fetchReply: true });

  // Collect button interactions for 2 minutes
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000, // 2 minutes
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (btnInteraction) => {
    switch (btnInteraction.customId) {
      case "page_first": currentPage = 0; break;
      case "page_prev": currentPage = Math.max(0, currentPage - 1); break;
      case "page_next": currentPage = Math.min(pages.length - 1, currentPage + 1); break;
      case "page_last": currentPage = pages.length - 1; break;
    }

    await btnInteraction.update({ embeds: [buildEmbed()], components: [buildButtons()] });
  });

  collector.on("end", async () => {
    // Disable buttons after timeout
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("page_first").setLabel("⏮").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("page_prev").setLabel("◀").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("page_next").setLabel("▶").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("page_last").setLabel("⏭").setStyle(ButtonStyle.Secondary).setDisabled(true),
    );
    await msg.edit({ components: [disabledRow] }).catch(() => {});
  });
}

/**
 * Split text into chunks that don't exceed maxLength, splitting on newlines.
 * @param {string} text - Text to split
 * @param {number} maxLength - Max characters per chunk
 * @returns {string[]} Array of text chunks
 */
function splitText(text, maxLength) {
  if (text.length <= maxLength) return [text];

  const lines = text.split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    if (line.length > maxLength) {
      if (current) { chunks.push(current); current = ""; }
      for (let i = 0; i < line.length; i += maxLength) {
        chunks.push(line.substring(i, i + maxLength));
      }
      continue;
    }

    if ((current + "\n" + line).length > maxLength) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? "\n" : "") + line;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}

/**
 * Send a long plain-text reply, splitting into multiple messages if needed.
 * @param {object} interaction - Discord interaction object
 * @param {string} content - Full message content
 * @param {object} options - Options like ephemeral
 */
async function sendLongReply(interaction, content, options = {}) {
  const messages = splitText(content, MAX_MSG_LENGTH - 50);

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: messages[0], ...options });
  } else {
    await interaction.reply({ content: messages[0], ...options });
  }

  for (let i = 1; i < messages.length; i++) {
    await interaction.followUp({ content: messages[i], ...options });
  }
}

module.exports = { sendEmbed, sendPaginated, sendLongReply, splitText, MAX_MSG_LENGTH, MAX_EMBED_DESC };
