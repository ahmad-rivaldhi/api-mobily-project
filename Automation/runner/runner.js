/**
 * Top-level journey runner. Loads env vars, authenticates, builds the step
 * list from the registry, then iterates the steps via the dispatcher.
 *
 * The runner itself stays small: it owns ordering, resume mechanics, and
 * the `onStep` callback used by the toolkit to broadcast progress. Every
 * domain-specific concern (notifications, extractors, providers) is
 * delegated, keeping this file under ~150 lines (Single Responsibility).
 */

const path = require('path');
const { log, setReauth } = require('../lib/runtime');
const { parseEnvFile } = require('../lib/env-bru');
const { doAuth } = require('../lib/auth');
const { JOURNEYS } = require('../journeys/registry');
const {
  parseResumeFrom,
  mergePreseedVars,
  stripInvalidSvActionId,
  stripStalePerOrderIds,
  shouldSkipStep,
  shouldForceExtractOnResume,
  logResumeFirstExecutableSteps,
  maybeReplayProvisioningNotifyIfSkipped,
  maybeReplayUatNotifyIfSkipped,
} = require('./resume');
const { executeStep } = require('./step-executor');

/**
 * @param {string} journeyName
 * @param {string} envName
 * @param {object} [opts]
 * @param {number} [opts.me]
 * @param {string} [opts.customerType]    Regular-Customer | Royal-Customer
 * @param {string} [opts.networkCategory] FTTH Consumer | FTTH RCY (override)
 * @param {string} [opts.paymentType]     Postpaid | Prepaid
 * @param {number} [opts.resumeFrom]      1-based: skip steps below this number
 * @param {string} [opts.authToken]
 * @param {string} [opts.orderId]
 * @param {string} [opts.serviceOrderId]
 * @param {string} [opts.svActionId]
 * @param {string} [opts.workOrderIdCpe]
 * @param {string} [opts.workOrderIdMe]
 * @param {string} [opts.odbPatchActionId]
 * @param {(info: { journeyName, envName, step, vars }) => void | Promise<void>} [onStep]
 */
async function runJourney(journeyName, envName, opts = {}, onStep) {
  const resumeFrom = parseResumeFrom(opts.resumeFrom != null ? opts.resumeFrom : 1);

  log('START', `Journey: ${journeyName}`);
  log('START', `Env: ${envName} | ME: ${opts.me || 0} | Payment: ${opts.paymentType || 'Postpaid'}`);
  if (resumeFrom > 1) log('START', `Resume from step: ${resumeFrom}`);
  log('START', '='.repeat(60));

  const journeyFn = JOURNEYS[journeyName];
  if (!journeyFn) {
    throw new Error(`Unknown journey: "${journeyName}". Available: ${Object.keys(JOURNEYS).join(', ')}`);
  }

  const vars = parseEnvFile(envName);
  // Order matters: strip stale per-order IDs first so opts win on resume.
  stripStalePerOrderIds(vars, opts);
  mergePreseedVars(vars, opts);
  stripInvalidSvActionId(vars);

  const steps = journeyFn(opts);
  const activeSteps = steps.filter((s) => !shouldSkipStep(s, resumeFrom));
  const notifyCount = activeSteps.filter((s) => s.type === 'notify').length;

  if (resumeFrom <= 1 || !vars.authToken) {
    await doAuth(vars, envName);
  } else {
    log('AUTH', 'Skipping auth (resumeFrom > 1 and authToken present)');
  }

  // Allow the HTTP layer to recover from token expiry mid-journey.
  setReauth(() => doAuth(vars, envName));

  if (resumeFrom > 1) {
    log(
      'DEBUG',
      `Resume vars: orderId=${vars.orderId || 'MISSING'}, svActionId=${vars.svActionId || 'MISSING'}, authToken=${vars.authToken ? 'present' : 'MISSING'}`,
    );
  }

  logResumeFirstExecutableSteps(steps, resumeFrom, vars, journeyName);
  await maybeReplayProvisioningNotifyIfSkipped(steps, resumeFrom, vars);
  await maybeReplayUatNotifyIfSkipped(steps, resumeFrom, vars);

  const ctx = { opts, notifyNum: 0, notifyCount };

  for (const step of steps) {
    const skip = shouldSkipStep(step, resumeFrom);
    const forceExtract = skip && shouldForceExtractOnResume(step, resumeFrom, vars, journeyName);
    if (skip && !forceExtract) continue;
    if (forceExtract) {
      log('BRIDGE', `Resume: running skipped ${step.type} (required ID not pre-seeded)`);
    }

    log(
      'RUN',
      `Step ${step.step} [${step.type}]${step.file ? ' ' + path.basename(step.file, '.bru') : ''}${
        step.state ? ' state=' + step.state : ''
      }`,
    );

    if (typeof onStep === 'function') {
      await onStep({ journeyName, envName, step, vars });
    }

    await executeStep(step, vars, ctx);
  }

  log('DONE', '='.repeat(60));
  log('DONE', 'All journey steps executed without a fatal error.');
  log('DONE', 'Verify the final order state in the portal / Detect before treating it as COMPLETED.');
  log('DONE', `  orderId:          ${vars.orderId || 'N/A'}`);
  log('DONE', `  serviceOrderId:   ${vars.serviceOrderId || 'N/A'}`);
  log('DONE', `  svActionId:       ${vars.svActionId || 'N/A'}`);
  log('DONE', `  workOrderIdCpe:   ${vars.workOrderIdCpe || 'N/A'}`);
  log('DONE', `  workOrderIdMe:    ${vars.workOrderIdMe || 'N/A'}`);
  log('DONE', `  odbPatchActionId: ${vars.odbPatchActionId || 'N/A'}`);
  log('DONE', `  networkCategory:  ${vars.networkCategory || 'N/A'}`);
  log('DONE', `  customerCategory: ${vars.customerCategory || 'N/A'}`);
}

module.exports = {
  runJourney,
};
