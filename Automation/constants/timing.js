/**
 * Shared timing constants for journey automation.
 */

/** Pause after every notify step — gives laggy Dev/SIT envs time to process. */
const NOTIFY_STEP_DELAY_MS = 15000;

/**
 * Mesh Extender (ME) installation notifications need a bit more breathing room
 * than CPE/SV notifications, so they get a longer pause.
 */
const ME_NOTIFY_STEP_DELAY_MS = 20000;

/** `true` when the .bru file is a Mesh Extender WFM notification. */
function isMeNotification(file) {
  return typeof file === 'string' && file.includes('/WFM-ME/');
}

/** Post-notify pause for a given .bru file (ME steps run longer). */
function notifyDelayForFile(file) {
  return isMeNotification(file) ? ME_NOTIFY_STEP_DELAY_MS : NOTIFY_STEP_DELAY_MS;
}

module.exports = {
  NOTIFY_STEP_DELAY_MS,
  ME_NOTIFY_STEP_DELAY_MS,
  isMeNotification,
  notifyDelayForFile,
};
