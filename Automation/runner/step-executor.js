/**
 * Single-step executor. The runner walks the journey's step list and hands
 * each step to `executeStep`, which dispatches on `step.type` to the right
 * action.
 *
 * Adding a new step type only touches this dispatcher (Open/Closed: the
 * journey builders just emit a new `type` value, the runner doesn't change).
 *
 * `executeStep` is also where we surface a structured "VARS" log line for
 * notify steps â€” listing the IDs the runner is about to send so the user
 * can see exactly which `externalId` / `serviceOrderId` / etc. is on the
 * wire (the request itself is logged by `runBruRequest`).
 */

const path = require('path');
const { log, delay } = require('../lib/runtime');
const { doCreateOrder, doNotification } = require('../lib/notifications');
const {
  doExtractServiceOrderId,
  doExtractSvActionId,
  doExtractWorkOrderIds,
  doExtractOdbPatchActionId,
} = require('../lib/extractors');
const { notifyDelayForFile } = require('../constants/timing');
const { doWaitForCpeInstallationPendingUat } = require('../lib/b2b');
const { doWaitForOrderState } = require('../lib/state');
const { doExtractOpenAccessProviderIds } = require('../providers/openaccess');

/**
 * Notify steps reference IDs through `{{var}}` placeholders. When the user
 * triggers an OA installation notification we surface the candidate values
 * so the audit log shows *which* externalId the request will use â€” without
 * having to grep the .bru file.
 */
function logCandidateExternalIdsForNotify(step, vars) {
  if (!step.file) return;
  const file = step.file;
  const candidates = [];
  const push = (key) => {
    if (vars[key]) candidates.push(`${key}=${vars[key]}`);
  };

  if (file.includes('/STC/Service Qualification - Notification/')) push('stcSqId');
  if (file.includes('/STC/OA ONT Installation - Notification/')) push('stcInstallationId');
  if (file.includes('/ITC/OA ONT Installation - Notification/')) push('itcInstallationId');
  if (file.includes('/ACES/OA ONT Installation - Notification/')) push('acesInstallationId');
  if (file.includes('/DOWIYAT/OA ONT Installation - Notification/')) push('dawiyatInstallationId');
  if (file.includes('/Order-Completion/') || file.includes('/Custom-Notifications/')) push('svActionId');
  if (file.includes('/TMF641-Notifications/')) push('serviceOrderId');
  if (file.includes('/WFM-CPE/')) push('workOrderIdCpe');
  if (file.includes('/WFM-ME/')) push('workOrderIdMe');
  if (file.includes('/ODB-Patch-Notification')) push('odbPatchActionId');

  if (candidates.length) {
    log('VARS', `Will send â†’ ${candidates.join(', ')}`);
  }
}

const STEP_HANDLERS = {
  async create(step, vars) {
    if (step.vars && typeof step.vars === 'object') {
      Object.assign(vars, step.vars);
    }
    await doCreateOrder(vars, step.file);
  },

  async extractWorkOrderIds(step, vars, ctx) {
    await doExtractWorkOrderIds(vars, ctx.opts);
  },

  async extractOAProviderIds(step, vars) {
    await doExtractOpenAccessProviderIds(vars, step.provider, step);
  },

  async notify(step, vars, ctx) {
    ctx.notifyNum += 1;
    log('PROGRESS', `[${ctx.notifyNum}/${ctx.notifyCount}]`);
    logCandidateExternalIdsForNotify(step, vars);

    const nRes = await doNotification(vars, step.file);
    if (!nRes.ok) {
      log(
        'ERROR',
        `Notify ${path.basename(step.file, '.bru')} FAILED: HTTP ${nRes.status} â€” ${JSON.stringify(nRes.body).slice(0, 300)}`,
      );
    } else {
      log('OK', `Notify ${path.basename(step.file, '.bru')} => HTTP ${nRes.status}`);
    }
    if (step.file && step.file.includes('Provisioning-Completed.bru') && !nRes.ok) {
      throw new Error(
        `SV Provisioning-Completed failed (${nRes.status}). Cannot continue. ${JSON.stringify(nRes.body).slice(0, 300)}`,
      );
    }
    const notifyDelay = notifyDelayForFile(step.file);
    log('WAIT', `Pausing ${notifyDelay / 1000}s after notification...`);
    await delay(notifyDelay);
  },

  async wait(step) {
    log('WAIT', `${step.label} (${step.ms / 1000}s)...`);
    await delay(step.ms);
  },

  async extractServiceOrderId(step, vars) {
    await doExtractServiceOrderId(vars);
  },

  async extractSvActionId(step, vars) {
    await doExtractSvActionId(vars);
    log('DEBUG', `After extractSvActionId: svActionId=${vars.svActionId || 'STILL MISSING'}`);
  },

  async extractOdbPatchActionId(step, vars) {
    await doExtractOdbPatchActionId(vars);
  },

  async waitForCpeInstallationPendingUat(step, vars) {
    await doWaitForCpeInstallationPendingUat(vars);
  },

  async waitForState(step, vars) {
    await doWaitForOrderState(vars, step.state);
  },
};

async function executeStep(step, vars, ctx) {
  const handler = STEP_HANDLERS[step.type];
  if (!handler) return;
  await handler(step, vars, ctx);
}

module.exports = {
  executeStep,
  STEP_HANDLERS,
};

