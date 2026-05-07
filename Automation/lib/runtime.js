/**
 * Shared runtime: project root, logger, cancellation-aware delay.
 * Single source of truth so the rest of the codebase never imports `core`
 * directly for these primitives.
 */

const path = require('path');

let ROOT = path.resolve(__dirname, '..', '..');
let _log = defaultLog;
let _cancelCheck = null;

function defaultLog(tag, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${String(tag).padEnd(8)}] ${msg}`);
}

/**
 * Initialise the shared runtime. Call once from the entry point (CLI runner /
 * web server) before invoking any journey logic.
 *
 * @param {string} projectRoot Absolute path to the repo root that contains
 *   `environments/`, `Authentication/`, etc.
 * @param {(tag: string, msg: string) => void} [logger] Optional injectable
 *   logger; defaults to `console.log` with timestamp + tag.
 */
function init(projectRoot, logger) {
  ROOT = path.resolve(projectRoot);
  _log = typeof logger === 'function' ? logger : defaultLog;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

function getRoot() {
  return ROOT;
}

function log(tag, msg) {
  _log(tag, msg);
}

function setCancelCheck(fn) {
  _cancelCheck = typeof fn === 'function' ? fn : null;
}

function isCancelled() {
  return typeof _cancelCheck === 'function' && _cancelCheck();
}

/**
 * Sleep for `ms` milliseconds. Cooperatively cancellable: if a cancel-check
 * callback is registered (`setCancelCheck`) and returns truthy, the wait
 * aborts by throwing `Error('Journey cancelled')`.
 */
async function delay(ms) {
  if (!_cancelCheck) return new Promise((r) => setTimeout(r, ms));
  const chunk = 1000;
  let remaining = ms;
  while (remaining > 0) {
    await new Promise((r) => setTimeout(r, Math.min(chunk, remaining)));
    remaining -= chunk;
    if (_cancelCheck()) throw new Error('Journey cancelled');
  }
}

module.exports = {
  init,
  log,
  getRoot,
  setCancelCheck,
  isCancelled,
  delay,
};
