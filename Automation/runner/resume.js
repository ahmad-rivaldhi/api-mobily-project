/**
 * Resume helpers.
 *
 * "Resume" lets the user re-enter a journey at a specific step number after
 * an earlier failure. The tricky parts are:
 *   1. Skip steps below `resumeFrom`.
 *   2. But still re-run extract-* steps if the IDs they produce are missing
 *      (otherwise downstream notify steps blow up with `{{var}}` errors).
 *   3. Replay SV Provisioning-Completed once if we landed past it but the
 *      portal is still at "Provisioning Completed".
 */

const path = require('path');
const { log } = require('../lib/runtime');
const { httpRequest } = require('../lib/http');
const { buildOrderDetailUrl } = require('../lib/url-builder');
const {
  extractSubState,
  isNumericDbSvActionId,
  needsProvisioningNotifyBeforePendingUat,
} = require('../lib/state');
const { doNotification } = require('../lib/notifications');
const { doExtractSvActionId } = require('../lib/extractors');
const { getMissingOAProviderIds } = require('../providers/openaccess');

/**
 * Per-order IDs the user can explicitly pre-seed via opts (for resume).
 * Anything not in this list is treated as journey-private and never accepted
 * from outside the runner.
 */
const PRESEED_KEYS = [
  'authToken',
  'orderId',
  'serviceOrderId',
  'svActionId',
  'workOrderIdCpe',
  'workOrderIdMe',
  'odbPatchActionId',
  'networkCategory',
  'customerCategory',
  // OpenAccess external IDs (per-order, normally extracted from B2B)
  'stcSqId',
  'stcInstallationId',
  'itcInstallationId',
  'acesInstallationId',
  'dawiyatInstallationId',
];

/**
 * Per-order OpenAccess external IDs that must NEVER survive across journey
 * runs. They're tied to the specific order being processed; if the env file
 * still carries a value from a previous run, the extract step would short-
 * circuit and we'd notify with a stale ID.
 *
 * The user can still resume past extract by passing the ID explicitly via
 * opts — see `PRESEED_KEYS`.
 */
const PER_ORDER_OA_ID_KEYS = [
  'stcSqId',
  'stcInstallationId',
  'itcInstallationId',
  'acesInstallationId',
  'dawiyatInstallationId',
];

function mergePreseedVars(vars, opts) {
  for (const k of PRESEED_KEYS) {
    if (opts[k] !== undefined && opts[k] !== null && opts[k] !== '') {
      if (k === 'svActionId' && /^\d+$/.test(String(opts[k]))) {
        log(
          'WARN',
          `Ignoring numeric svActionId "${opts[k]}" (likely a DB row ID, not the SV reference like MOB-FTTH-xx). Will re-extract.`,
        );
        continue;
      }
      vars[k] = opts[k];
    }
  }
}

/**
 * Drop a stale numeric svActionId from `vars`. Env files / opts often hold
 * "168325" — using that against SingleView silently fires the wrong action,
 * so the runner forces a re-extract instead.
 */
function stripInvalidSvActionId(vars) {
  if (isNumericDbSvActionId(vars.svActionId)) {
    log(
      'WARN',
      `Removing numeric svActionId "${vars.svActionId}" from env/vars (use CustomerReference like MOB-FTTH-xx). Will re-extract.`,
    );
    delete vars.svActionId;
  }
}

/**
 * Drop OpenAccess per-order external IDs that came from the env file. They
 * were almost certainly written by a previous run and would cause the
 * extract step to short-circuit, sending the notification with a stale ID.
 *
 * The user can override this for resume by explicitly passing the ID via
 * `opts` — those values are preserved.
 */
function stripStaleOAProviderIds(vars, opts = {}) {
  for (const k of PER_ORDER_OA_ID_KEYS) {
    const explicitlyProvided =
      opts[k] != null && String(opts[k]).trim() !== '';
    if (explicitlyProvided) continue;
    if (vars[k]) {
      log(
        'WARN',
        `Dropping stale ${k}="${vars[k]}" from env (per-order ID — will re-extract from B2B for this run)`,
      );
      delete vars[k];
    }
  }
}

function shouldSkipStep(step, resumeFrom) {
  if (resumeFrom == null || resumeFrom <= 1) return false;
  if (step.step == null) return false;
  return step.step < resumeFrom;
}

/**
 * Last journey step# that still needs each extract type. If `resumeFrom` is
 * past this, the user is beyond that phase (e.g. resuming at Pre-Completion
 * must NOT poll ODB) — so we don't re-run the extract.
 */
function maxResumeStillNeedsExtract(journeyName, stepType) {
  // OA Provider Activation flow (provider-side, no WFM/UAT):
  //   step 3 = extractOAProviderIds (or 5 for STC stcInstallationId)
  //   step 6 = extractServiceOrderId (or 7 for STC)
  //   step 8 = extractSvActionId (or 9 for STC)
  //   last SV step = 11 (or 12 for STC)
  const oa = new Set([
    'dawiyat-activation',
    'stc-activation',
    'itc-activation',
    'aces-activation',
  ]);
  if (oa.has(journeyName)) {
    if (journeyName === 'stc-activation') {
      if (stepType === 'extractOAProviderIds') return 8;
      if (stepType === 'extractServiceOrderId') return 8;
      if (stepType === 'extractSvActionId') return 12;
      return null;
    }
    if (stepType === 'extractOAProviderIds') return 6;
    if (stepType === 'extractServiceOrderId') return 7;
    if (stepType === 'extractSvActionId') return 11;
    return null;
  }
  const mobilyFw = new Set([
    'mobily-activation',
    'mobily-relocation',
    'mobily-device-swap-cpe',
    'mobily-device-swap-hag',
    'mobily-rewiring',
  ]);
  if (mobilyFw.has(journeyName)) {
    if (stepType === 'extractOdbPatchActionId') return 5;
    if (stepType === 'extractWorkOrderIds') return 6;
    if (stepType === 'extractServiceOrderId') return 8;
    if (stepType === 'extractSvActionId') return 16;
    return null;
  }
  return null;
}

/** Re-run a skipped extract step if the ID it produces isn't pre-seeded. */
function shouldForceExtractOnResume(step, resumeFrom, vars, journeyName) {
  if (!shouldSkipStep(step, resumeFrom)) return false;
  if (!vars.orderId) return false;
  const maxNeed = maxResumeStillNeedsExtract(journeyName, step.type);
  if (maxNeed != null && resumeFrom > maxNeed) return false;
  switch (step.type) {
    case 'extractOAProviderIds':
      return getMissingOAProviderIds(step.provider, vars).length > 0;
    case 'extractSvActionId':
      return !vars.svActionId || isNumericDbSvActionId(vars.svActionId);
    case 'extractServiceOrderId':
      return !vars.serviceOrderId;
    case 'extractWorkOrderIds':
      return !vars.workOrderIdCpe;
    case 'extractOdbPatchActionId':
      return !vars.odbPatchActionId;
    default:
      return false;
  }
}

function parseResumeFrom(raw) {
  if (raw == null || raw === '') return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Invalid resumeFrom: ${JSON.stringify(raw)} (expected integer ≥ 1)`);
  }
  return Math.floor(n);
}

function logResumeFirstExecutableSteps(steps, resumeFrom, vars, journeyName) {
  if (resumeFrom <= 1) return;
  const names = [];
  for (const step of steps) {
    if (shouldSkipStep(step, resumeFrom) && !shouldForceExtractOnResume(step, resumeFrom, vars, journeyName)) {
      continue;
    }
    const kind = step.type || '?';
    const sn = step.step != null ? String(step.step) : '?';
    const file = step.file ? path.basename(step.file) : step.state || step.label || '';
    names.push(`${kind}@${sn}${file ? ` (${file})` : ''}`);
    if (names.length >= 5) break;
  }
  if (names.length) {
    log('START', `Resume will execute first (up to 5): ${names.join(' → ')}`);
  }
}

/**
 * If the user resumed past the SV Provisioning-Completed notify step but
 * the order is still at "Provisioning Completed" sub-state, replay it once
 * before the main loop so the rest of the journey can progress.
 */
async function maybeReplayProvisioningNotifyIfSkipped(steps, resumeFrom, vars) {
  if (resumeFrom <= 1) return;
  const prov = steps.find(
    (s) => s.type === 'notify' && s.file && s.file.includes('Provisioning-Completed.bru'),
  );
  if (!prov || prov.step == null) return;
  if (!shouldSkipStep(prov, resumeFrom)) return;
  if (vars._svProvisioningCompletedOk) return;
  if (!vars.orderId) {
    log('WARN', 'Resume skipped Provisioning-Completed step but orderId is missing — cannot replay');
    return;
  }

  let subState = null;
  try {
    const detailRes = await httpRequest('GET', buildOrderDetailUrl(vars), {
      Authorization: `Bearer ${vars.authToken}`,
    });
    const data = detailRes.body?.data || detailRes.body;
    subState = extractSubState(data);
  } catch (e) {
    log('WARN', `Resume provisioning replay: could not read order detail: ${e.message}`);
    return;
  }
  if (!needsProvisioningNotifyBeforePendingUat(subState, 'Pending UAT')) return;

  log(
    'BRIDGE',
    'Resume skipped SV Provisioning-Completed step but order is still at Provisioning Completed — sending notify now',
  );
  if (!vars.svActionId) await doExtractSvActionId(vars);
  const res = await doNotification(vars, prov.file);
  if (!res.ok) {
    throw new Error(
      `SV Provisioning-Completed failed (${res.status}) on resume replay. ${JSON.stringify(res.body).slice(0, 300)}`,
    );
  }
}

module.exports = {
  PRESEED_KEYS,
  PER_ORDER_OA_ID_KEYS,
  mergePreseedVars,
  stripInvalidSvActionId,
  stripStaleOAProviderIds,
  shouldSkipStep,
  shouldForceExtractOnResume,
  parseResumeFrom,
  logResumeFirstExecutableSteps,
  maybeReplayProvisioningNotifyIfSkipped,
  maxResumeStillNeedsExtract,
};
