/**
 * Permission utilities.
 * Checks if a user is authorized to run admin commands.
 */

/** Bot creator/owner Discord ID */
const BOT_OWNER_ID = "456285930420961281";

/**
 * Check if a user is the bot owner (you).
 * @param {string} userId - Discord user ID
 * @returns {boolean}
 */
function isBotOwner(userId) {
  return userId === BOT_OWNER_ID;
}

/**
 * Check if a user is the server owner.
 * @param {object} interaction - Discord interaction object
 * @returns {boolean}
 */
function isServerOwner(interaction) {
  if (!interaction.guild) return false;
  return interaction.guild.ownerId === interaction.user.id;
}

/**
 * Check if a user can run admin commands (/sync, /subscribe, /unsubscribe).
 * Allowed: bot owner OR server owner.
 * @param {object} interaction - Discord interaction object
 * @returns {boolean}
 */
function isAdmin(interaction) {
  return isBotOwner(interaction.user.id) || isServerOwner(interaction);
}

module.exports = { isBotOwner, isServerOwner, isAdmin, BOT_OWNER_ID };
