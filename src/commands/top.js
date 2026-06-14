/**
 * /top command — Show top 100 most valuable items with pagination.
 * 10 items per page, navigation buttons.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { formatVal, trendEmoji } = require("../utils/format");

const PER_PAGE = 10;
const MAX_ITEMS = 100;

/**
 * Handle the /top slash command interaction.
 * @param {object} interaction - Discord interaction object
 * @param {Array} items - Current item database
 */
async function execute(interaction, items) {
  await interaction.deferReply();

  // Sort by TrueVal (fallback Trade Hub, then Proto estimate)
  const sorted = [...items]
    .map((item) => {
      let value = 0;
      if (item.trueVal && item.trueVal > 0) value = item.trueVal;
      else if (item.tradeHub && item.tradeHub > 0) value = item.tradeHub;
      else if (item.proto && item.proto > 0) value = item.proto * 2000;
      return { ...item, sortValue: value };
    })
    .filter((item) => item.sortValue > 0)
    .sort((a, b) => b.sortValue - a.sortValue)
    .slice(0, MAX_ITEMS);

  if (sorted.length === 0) {
    await interaction.editReply("⚠️ No items with values found.");
    return;
  }

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  let currentPage = 0;

  /**
   * Build embed for the current page.
   */
  function buildEmbed() {
    const start = currentPage * PER_PAGE;
    const end = Math.min(start + PER_PAGE, sorted.length);
    const pageItems = sorted.slice(start, end);

    const lines = pageItems.map((item, i) => {
      const rank = start + i + 1;
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
      const value = formatVal(item.sortValue);
      return `${medal} **${item.name}** — ${value} (${item.demand} | ${trendEmoji(item.trend)} ${item.trend})`;
    });

    return new EmbedBuilder()
      .setTitle(`🏆 TOP ${sorted.length} MOST VALUABLE ITEMS`)
      .setDescription(lines.join("\n"))
      .setColor(0xffd700)
      .setFooter({ text: `Page ${currentPage + 1}/${totalPages} • ${sorted.length} items • Source: game.guide` });
  }

  /**
   * Build navigation buttons.
   */
  function buildButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("top_first")
        .setLabel("⏮")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("top_prev")
        .setLabel("◀")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("top_page")
        .setLabel(`${currentPage + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("top_next")
        .setLabel("▶")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages - 1),
      new ButtonBuilder()
        .setCustomId("top_last")
        .setLabel("⏭")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages - 1),
    );
  }

  const msg = await interaction.editReply({ embeds: [buildEmbed()], components: [buildButtons()] });

  // Collect button interactions for 3 minutes
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 180000,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (btn) => {
    switch (btn.customId) {
      case "top_first": currentPage = 0; break;
      case "top_prev": currentPage = Math.max(0, currentPage - 1); break;
      case "top_next": currentPage = Math.min(totalPages - 1, currentPage + 1); break;
      case "top_last": currentPage = totalPages - 1; break;
    }
    await btn.update({ embeds: [buildEmbed()], components: [buildButtons()] });
  });

  collector.on("end", async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("top_first").setLabel("⏮").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("top_prev").setLabel("◀").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("top_page").setLabel(`${currentPage + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("top_next").setLabel("▶").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("top_last").setLabel("⏭").setStyle(ButtonStyle.Secondary).setDisabled(true),
    );
    await msg.edit({ components: [disabledRow] }).catch(() => {});
  });
}

module.exports = { execute };
