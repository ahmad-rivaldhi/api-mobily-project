/**
 * Provider-agnostic journey builders. These compose the generic patterns
 * shared across providers (simple order, suspend, failure, maintenance,
 * OpenAccess field-work).
 */

const {
  wfmCpeStepPaths,
  WFM_STEP_09_CPE_COMPLETED,
  WFM_ME_STEPS,
  wfmMeInstallationStep,
  wfmMeUatCompletedStep,
  TMF641,
  SINGLEVIEW,
} = require('../constants/paths');
const { NOTIFY_STEP_DELAY_MS, SERVICE_ORDER_WAIT_MS } = require('../constants/timing');

const WFM_CPE_STEPS = wfmCpeStepPaths();

function notifyStep(stepNum, file, delay = NOTIFY_STEP_DELAY_MS) {
  return { step: stepNum, type: 'notify', file, delay };
}

function buildWfmCpeAndMe(stepNum, meCount) {
  const out = WFM_CPE_STEPS.map((f) => notifyStep(stepNum, f));
  if (meCount > 0) {
    for (const f of WFM_ME_STEPS) out.push(notifyStep(stepNum, f));
    out.push(notifyStep(stepNum, wfmMeInstallationStep(meCount)));
  }
  return out;
}

/** OpenAccess field-work pattern: create → workOrderIds → WFM → service order → TMF641 → completion (no ODB). */
function buildOAFieldWork(createFile, opts) {
  const meCount = opts.me || 0;
  return [
    { step: 2, type: 'create', file: createFile },
    { step: 3, type: 'extractWorkOrderIds' },
    ...buildWfmCpeAndMe(4, meCount),
    { step: 5, type: 'wait', ms: SERVICE_ORDER_WAIT_MS, label: 'Waiting for Create Service Order Response' },
    { step: 5, type: 'extractServiceOrderId' },
    {
      step: 6,
      type: 'notify',
      file: TMF641.serviceOrderCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },
    { step: 7, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: 7, type: 'extractSvActionId' },
    {
      step: 8,
      type: 'notify',
      file: SINGLEVIEW.provisioningCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },
    { step: 9, type: 'waitForState', state: 'In Progress|Pending UAT' },
    { step: 10, type: 'notify', file: WFM_STEP_09_CPE_COMPLETED, delay: NOTIFY_STEP_DELAY_MS },
    ...(meCount > 0
      ? [
          {
            step: 10,
            type: 'notify',
            file: wfmMeUatCompletedStep(),
            delay: NOTIFY_STEP_DELAY_MS,
          },
        ]
      : []),
    { step: 11, type: 'waitForCpeInstallationPendingUat' },
    {
      step: 12,
      type: 'notify',
      file: SINGLEVIEW.uatCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },
    { step: 13, type: 'waitForState', state: 'In Progress|Pre-Completion' },
    {
      step: 14,
      type: 'notify',
      file: SINGLEVIEW.preCompletion,
      delay: NOTIFY_STEP_DELAY_MS,
    },
    { step: 15, type: 'waitForState', state: 'Completed' },
  ];
}

/** Simple order: create + optional TMF641 + wait for completion. */
function buildSimpleOrder(createFile, opts) {
  const tmf641 = opts._tmf641File || null;
  const steps = [{ step: 2, type: 'create', file: createFile }];
  if (tmf641) {
    steps.push({ step: 3, type: 'wait', ms: 30000, label: 'Waiting for service order' });
    steps.push({ step: 3, type: 'extractServiceOrderId' });
    steps.push({ step: 4, type: 'notify', file: tmf641, delay: NOTIFY_STEP_DELAY_MS });
    steps.push({ step: 5, type: 'waitForState', state: 'Completed' });
  } else {
    steps.push({ step: 3, type: 'waitForState', state: 'Completed' });
  }
  return steps;
}

/** Suspend with optional OpenAccess service order. */
function buildSuspendOrder(createFile, oaServiceOrderFile, opts) {
  const steps = [{ step: 2, type: 'create', file: createFile }];
  if (oaServiceOrderFile) {
    steps.push({ step: 3, type: 'wait', ms: 30000, label: 'Waiting for service order' });
    steps.push({ step: 3, type: 'extractServiceOrderId' });
    steps.push({ step: 4, type: 'notify', file: oaServiceOrderFile, delay: NOTIFY_STEP_DELAY_MS });
    steps.push({ step: 5, type: 'waitForState', state: 'Completed' });
  } else {
    steps.push({ step: 3, type: 'waitForState', state: 'Completed' });
  }
  return steps;
}

/** Installation failure: send a single failure notification on an existing order. */
function buildFailureJourney(failureFile) {
  return [
    { step: 2, type: 'notify', file: failureFile, delay: NOTIFY_STEP_DELAY_MS },
    { step: 3, type: 'waitForState', state: 'Installation Failure|Failed' },
  ];
}

/** Maintenance: just create the order (subsequent close/reopen happens via toolkit). */
function buildMaintenanceOrder(createFile) {
  return [{ step: 2, type: 'create', file: createFile }];
}

module.exports = {
  buildWfmCpeAndMe,
  buildOAFieldWork,
  buildSimpleOrder,
  buildSuspendOrder,
  buildFailureJourney,
  buildMaintenanceOrder,
};
