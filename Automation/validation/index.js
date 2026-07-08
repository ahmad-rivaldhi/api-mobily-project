/**
 * Activity-validation entrypoint: loads per-journey expectation files and
 * re-exports the pure validator.
 *
 * Expectation files live at `<expectationsDir>/<journeyName>.js` (directory
 * centralised in `constants/paths.js`). Validation is opt-in: a journey with no
 * file returns `null` and is skipped by the runner.
 */

const fs = require('fs');
const path = require('path');

const { VALIDATION } = require('../constants/paths');
const { validateActivities, normalizeActivity } = require('./validate-activities');

// __dirname = Automation/validation; expectationsDir is relative to Automation/.
const EXPECTATIONS_DIR = path.join(__dirname, '..', VALIDATION.expectationsDir);

/** Only allow safe journey ids as filenames (defence-in-depth vs traversal). */
function safeJourneyName(name) {
  return typeof name === 'string' && /^[a-z0-9][a-z0-9-]*$/i.test(name);
}

/**
 * @param {string} journeyName
 * @returns {object|null} the expectation object, or null if none/invalid.
 */
function getExpectationForJourney(journeyName) {
  if (!safeJourneyName(journeyName)) return null;
  const file = path.join(EXPECTATIONS_DIR, `${journeyName}.js`);
  if (!fs.existsSync(file)) return null;
  try {
    const mod = require(file);
    return mod && mod.default ? mod.default : mod;
  } catch {
    return null;
  }
}

module.exports = {
  getExpectationForJourney,
  validateActivities,
  normalizeActivity,
  EXPECTATIONS_DIR,
};
