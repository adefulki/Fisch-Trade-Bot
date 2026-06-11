/**
 * Entry point for the Fisch Trade Assistant Bot.
 * Loads environment variables and starts the bot.
 */

require("dotenv").config();
const { start } = require("./src/bot");

start();
