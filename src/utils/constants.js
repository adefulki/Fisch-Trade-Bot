/**
 * Constants used across the application.
 * Includes demand/trend multipliers, aliases, and roman numeral mappings.
 */

/** Demand multipliers for adjusted value calculation */
const DEMAND_MULTIPLIER = {
  "Limited": 1.25,
  "High": 1.10,
  "Medium": 1.00,
  "Low": 0.90,
  "Very Low": 0.80,
  "-": 1.00,
};

/** Trend multipliers for adjusted value calculation */
const TREND_MULTIPLIER = {
  "Rising": 1.10,
  "Stable": 1.00,
  "Dropping": 0.88,
  "Unstable": 0.95,
  "-": 1.00,
};

/** Quick aliases for common item shorthand */
const ALIASES = {
  "c1": "Curse I",
  "c2": "Curse II",
  "c3": "Curse III",
  "c 3": "Curse III",
  "c4": "Curse IV",
  "c 4": "Curse IV",
  "curse 1": "Curse I",
  "curse 2": "Curse II",
  "curse 3": "Curse III",
  "curse 4": "Curse IV",
  "stb": "Slime Trade Booth",
  "rb": "Seraphic Rainbow",
};

/** Number to Roman numeral mapping */
const ROMAN_MAP = {
  "1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v",
  "6": "vi", "7": "vii", "8": "viii", "9": "ix", "10": "x",
};

module.exports = {
  DEMAND_MULTIPLIER,
  TREND_MULTIPLIER,
  ALIASES,
  ROMAN_MAP,
};
