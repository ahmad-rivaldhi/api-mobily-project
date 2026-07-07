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
  needsUatNotifyBeforePreCompletion,
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

/**
 * Mobily per-order IDs extracted from the order detail / B2B during a run.
 * Just like the OA IDs, an env file will typically still carry the value
 * from the *previous* order. If we don't drop it on resume, the extract step
 * short-circuits (its `!vars.x` guard sees a truthy stale value) and the WFM
 * / TMF641 notifications fire against a work/service order that belongs to a
 * different order — the runner appears to "resume the wrong order".
 *
 * The user can still resume past extract by passing the ID explicitly via
 * opts — see `PRESEED_KEYS`.
 */
const PER_ORDER_MOBILY_ID_KEYS = [
  'workOrderIdCpe',
  'workOrderIdMe',
  'serviceOrderId',
  'odbPatchActionId',
];

/** All per-order IDs that must never survive from a stale env into a resume. */
const PER_ORDER_STALE_KEYS = [...PER_ORDER_OA_ID_KEYS, ...PER_ORDER_MOBILY_ID_KEYS];

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
 * Drop per-order IDs (OpenAccess external IDs + Mobily work/service/ODB IDs)
 * that came from the env file. They were almost certainly written by a
 * previous run and would cause the extract step to short-circuit, sending the
 * notification with a stale ID tied to a different order.
 *
 * The user can override this for resume by explicitly passing the ID via
 * `opts` — those values are preserved.
 */
function stripStalePerOrderIds(vars, opts = {}) {
  for (const k of PER_ORDER_STALE_KEYS) {
    const explicitlyProvided =
      opts[k] != null && String(opts[k]).trim() !== '';
    if (explicitlyProvided) continue;
    if (vars[k]) {
      log(
        'WARN',
        `Dropping stale ${k}="${vars[k]}" from env (per-order ID — will re-extract for this run)`,
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
 * Resume extract ceilings: the last journey step# that still needs each
 * extract type. If `resumeFrom` is past the ceiling, the user is beyond that
 * phase (e.g. resuming at Pre-Completion must NOT poll ODB) so the extract is
 * not re-run.
 *
 * Centralised as data (instead of scattered per-journey if/else) keyed by a
 * "flow profile". Notes on the mobily-fieldwork numbers:
 *   - workOrderIdCpe is used by WFM CPE steps (6) AND WFM Step-09 (12), so a
 *     resume up to step 12 may still need it re-extracted.
 */
const RESUME_EXTRACT_CEILINGS = Object.freeze({
  // OA provider activation (provider-side, no WFM/UAT)
  'oa-standard': {
    extractOAProviderIds: 6,
    extractServiceOrderId: 7,
    extractSvActionId: 11,
  },
  // STC runs one step longer than the other OA providers
  'oa-stc': {
    extractOAProviderIds: 8,
    extractServiceOrderId: 8,
    extractSvActionId: 12,
  },
  'mobily-fieldwork': {
    extractOdbPatchActionId: 5,
    extractWorkOrderIds: 12,
    extractServiceOrderId: 8,
    extractSvActionId: 16,
  },
});

const RESUME_PROFILE_BY_JOURNEY = Object.freeze({
  'dawiyat-activation': 'oa-standard',
  'itc-activation': 'oa-standard',
  'aces-activation': 'oa-standard',
  'stc-activation': 'oa-stc',
  'mobily-activation': 'mobily-fieldwork',
  'mobily-relocation': 'mobily-fieldwork',
  'mobily-device-swap-cpe': 'mobily-fieldwork',
  'mobily-device-swap-hag': 'mobily-fieldwork',
  'mobily-rewiring': 'mobily-fieldwork',
});

function maxResumeStillNeedsExtract(journeyName, stepType) {
  const profile = RESUME_PROFILE_BY_JOURNEY[journeyName];
  if (!profile) return null;
  const ceiling = RESUME_EXTRACT_CEILINGS[profile][stepType];
  return ceiling == null ? null : ceiling;
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

/**
 * If the user resumed past the SV UAT-Completed notify step but the order is
 * still at "UAT Completed", replay it once before waiting for Pre-Completion.
 */
async function maybeReplayUatNotifyIfSkipped(steps, resumeFrom, vars) {
  if (resumeFrom <= 1) return;
  const uat = steps.find(
    (s) => s.type === 'notify' && s.file && s.file.includes('UAT-Completed.bru'),
  );
  if (!uat || uat.step == null) return;
  if (!shouldSkipStep(uat, resumeFrom)) return;
  if (vars._svUatCompletedOk) return;
  if (!vars.orderId) {
    log('WARN', 'Resume skipped UAT-Completed step but orderId is missing — cannot replay');
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
    log('WARN', `Resume UAT replay: could not read order detail: ${e.message}`);
    return;
  }
  if (!needsUatNotifyBeforePreCompletion(subState, 'Pre-Completion')) return;

  log(
    'BRIDGE',
    'Resume skipped SV UAT-Completed step but order is still at UAT Completed — sending notify now',
  );
  if (!vars.svActionId) await doExtractSvActionId(vars);
  const res = await doNotification(vars, uat.file);
  if (!res.ok) {
    throw new Error(
      `SV UAT-Completed failed (${res.status}) on resume replay. ${JSON.stringify(res.body).slice(0, 300)}`,
    );
  }
}

module.exports = {
  PRESEED_KEYS,
  PER_ORDER_OA_ID_KEYS,
  PER_ORDER_MOBILY_ID_KEYS,
  PER_ORDER_STALE_KEYS,
  mergePreseedVars,
  stripInvalidSvActionId,
  stripStalePerOrderIds,
  shouldSkipStep,
  shouldForceExtractOnResume,
  parseResumeFrom,
  logResumeFirstExecutableSteps,
  maybeReplayProvisioningNotifyIfSkipped,
  maybeReplayUatNotifyIfSkipped,
  maxResumeStillNeedsExtract,
};
