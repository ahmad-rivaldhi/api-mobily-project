/**
 * Provider-agnostic journey builders. These compose the generic patterns
 * shared across providers (simple order, suspend, failure, maintenance,
 * OpenAccess field-work).
 *
 * All builders return arrays of step descriptors with the same shape
 * (`{ step, type, file?, state?, delay?, ... }`) so the runner / step
 * executor can treat every journey identically (Liskov substitution).
 */

const { wfmCpeStepPaths, WFM_STEP_09_CPE_COMPLETED } = require('../constants/paths');

const WFM_CPE_STEPS = wfmCpeStepPaths();

const WFM_ME_BASE = [
  '13-Shared-Workflows/WFM-ME-Workflow/Step-01-ME-1000-OK.bru',
  '13-Shared-Workflows/WFM-ME-Workflow/Step-02-ME-Ready.bru',
  '13-Shared-Workflows/WFM-ME-Workflow/Step-03-ME-Acknowledged.bru',
  '13-Shared-Workflows/WFM-ME-Workflow/Step-04-ME-Accepted.bru',
  '13-Shared-Workflows/WFM-ME-Workflow/Step-05-ME-Trip-Started.bru',
  '13-Shared-Workflows/WFM-ME-Workflow/Step-06-ME-Customer-Premises.bru',
  '13-Shared-Workflows/WFM-ME-Workflow/Step-07-ME-In-Work.bru',
];

function notifyStep(stepNum, file, delay = 5000) {
  return { step: stepNum, type: 'notify', file, delay };
}

function buildWfmCpeAndMe(stepNum, meCount) {
  const out = WFM_CPE_STEPS.map((f) => notifyStep(stepNum, f));
  if (meCount > 0) {
    for (const f of WFM_ME_BASE) out.push(notifyStep(stepNum, f));
    out.push(
      notifyStep(stepNum, `13-Shared-Workflows/WFM-ME-Workflow/Step-08-ME-Installation-Completed-${meCount}-ME.bru`),
    );
  }
  return out;
}

/** OpenAccess field-work pattern: create â†’ workOrderIds â†’ WFM â†’ service order â†’ TMF641 â†’ completion (no ODB). */
function buildOAFieldWork(createFile, opts) {
  const meCount = opts.me || 0;
  return [
    { step: 2, type: 'create', file: createFile },
    { step: 3, type: 'extractWorkOrderIds' },
    ...buildWfmCpeAndMe(4, meCount),
    { step: 5, type: 'wait', ms: 45000, label: 'Waiting for Create Service Order Response' },
    { step: 5, type: 'extractServiceOrderId' },
    {
      step: 6,
      type: 'notify',
      file: '13-Shared-Workflows/TMF641-Notifications/Service-Order-Completed.bru',
      delay: 0,
    },
    { step: 7, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: 7, type: 'extractSvActionId' },
    {
      step: 8,
      type: 'notify',
      file: '13-Shared-Workflows/SingleView-Integration/Order-Completion/Provisioning-Completed.bru',
      delay: 5000,
    },
    { step: 9, type: 'waitForState', state: 'In Progress|Pending UAT' },
    { step: 10, type: 'notify', file: WFM_STEP_09_CPE_COMPLETED, delay: 5000 },
    ...(meCount > 0
      ? [
          {
            step: 10,
            type: 'notify',
            file: '13-Shared-Workflows/WFM-ME-Workflow/Step-09-ME-UAT-Completed.bru',
            delay: 5000,
          },
        ]
      : []),
    { step: 11, type: 'waitForState', state: 'In Progress|UAT Completed' },
    {
      step: 12,
      type: 'notify',
      file: '13-Shared-Workflows/SingleView-Integration/Order-Completion/UAT-Completed.bru',
      delay: 5000,
    },
    { step: 13, type: 'waitForState', state: 'In Progress|Pre-Completion' },
    {
      step: 14,
      type: 'notify',
      file: '13-Shared-Workflows/SingleView-Integration/Order-Completion/Pre-Completion.bru',
      delay: 5000,
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
    steps.push({ step: 4, type: 'notify', file: tmf641, delay: 0 });
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
    steps.push({ step: 4, type: 'notify', file: oaServiceOrderFile, delay: 5000 });
    steps.push({ step: 5, type: 'waitForState', state: 'Completed' });
  } else {
    steps.push({ step: 3, type: 'waitForState', state: 'Completed' });
  }
  return steps;
}

/** Installation failure: send a single failure notification on an existing order. */
function buildFailureJourney(failureFile) {
  return [
    { step: 2, type: 'notify', file: failureFile, delay: 0 },
    { step: 3, type: 'waitForState', state: 'Installation Failure|Failed' },
  ];
}

/** Maintenance: just create the order (subsequent close/reopen happens via toolkit). */
function buildMaintenanceOrder(createFile) {
  return [{ step: 2, type: 'create', file: createFile }];
}

module.exports = {
  buildOAFieldWork,
  buildSimpleOrder,
  buildSuspendOrder,
  buildFailureJourney,
  buildMaintenanceOrder,
};

