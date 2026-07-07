/**
 * Shared runtime: project root, logger, cancellation-aware delay.
 * Single source of truth so the rest of the codebase never imports `core`
 * directly for these primitives.
 *
 * When used as an npm package (installed via `npm install github:…`), ROOT
 * auto-resolves to the package directory inside node_modules — no manual
 * `init(projectRoot)` call needed for the collection files.
 *
 * ENVROOT is separate: it points to wherever the consumer stores their
 * `environments/*.bru` credential files, which are never bundled into the
 * package.  Pass it via `init({ envPath })`.
 */

const path = require('path');

let ROOT    = path.resolve(__dirname, '..', '..');       // package / repo root
let ENVROOT = path.join(ROOT, 'environments');            // default: backward-compatible
let _log = defaultLog;
let _cancelCheck = null;
let _reauth = null;

function defaultLog(tag, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${String(tag).padEnd(8)}] ${msg}`);
}

/**
 * Initialise the shared runtime. Two call signatures:
 *
 *   init(projectRoot, logger)          — legacy, backward-compatible
 *   init({ envPath, logger })          — new: used when loaded as npm package
 *
 * @param {string | { envPath?: string, logger?: Function }} optsOrPath
 * @param {(tag: string, msg: string) => void} [logger]
 */
function init(optsOrPath, logger) {
  if (typeof optsOrPath === 'string') {
    // Legacy: init(projectRoot, logger)
    ROOT    = path.resolve(optsOrPath);
    ENVROOT = path.join(ROOT, 'environments');
    _log    = typeof logger === 'function' ? logger : defaultLog;
  } else if (optsOrPath && typeof optsOrPath === 'object') {
    // New: init({ envPath, logger })
    if (optsOrPath.envPath) ENVROOT = path.resolve(optsOrPath.envPath);
    const lg = optsOrPath.logger ?? logger;
    _log = typeof lg === 'function' ? lg : defaultLog;
  } else {
    _log = typeof logger === 'function' ? logger : defaultLog;
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

function getRoot() {
  return ROOT;
}

/** Returns the directory containing `environments/*.bru` credential files. */
function getEnvRoot() {
  return ENVROOT;
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
 * Register an async re-authentication callback (typically `() => doAuth(vars,
 * envName)`). `runBruRequest` invokes it once on a 401 so long-running
 * journeys survive token expiry instead of failing silently.
 */
function setReauth(fn) {
  _reauth = typeof fn === 'function' ? fn : null;
}

function hasReauth() {
  return typeof _reauth === 'function';
}

async function reauthenticate() {
  if (!_reauth) return false;
  await _reauth();
  return true;
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
  getEnvRoot,
  setCancelCheck,
  isCancelled,
  setReauth,
  hasReauth,
  reauthenticate,
  delay,
};

