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

/**
 * Fixed pause before polling for the async "Create Service Order Response"
 * B2B message — Telflow needs a moment to emit it after WFM completion.
 */
const SERVICE_ORDER_WAIT_MS = 45000;

/**
 * Polling budgets (attempts × interval) for the async ID extractors. Kept
 * here so env-latency tuning happens in one place instead of per-module
 * magic numbers.
 */
const POLL = Object.freeze({
  serviceOrderId: { attempts: 8, intervalMs: 15000 },
  svActionId: { attempts: 8, intervalMs: 15000 },
  workOrderIds: { attempts: 6, intervalMs: 10000 },
  odbPatch: { attempts: 8, intervalMs: 15000 },
  oaProviderIds: { attempts: 10, intervalMs: 10000 },
});

module.exports = {
  NOTIFY_STEP_DELAY_MS,
  ME_NOTIFY_STEP_DELAY_MS,
  SERVICE_ORDER_WAIT_MS,
  POLL,
  isMeNotification,
  notifyDelayForFile,
};
