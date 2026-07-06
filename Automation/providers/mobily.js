/**
 * Mobily-infrastructure journey builders. The activation builder is the only
 * one that branches on `networkCategory` today (Phase 4B): RCY orders skip
 * the ODB patch, CONSUMER orders include it.
 */

const {
  resolveNetworkCategory,
  customerCategoryFor,
  requiresOdbPatch,
} = require('./network-category');
const {
  mobilyCreateOrderPath,
  wfmCpeStepPaths,
  WFM_STEP_09_CPE_COMPLETED,
  WFM_ME_STEPS,
  wfmMeInstallationStep,
  wfmMeUatCompletedStep,
  TMF641,
  SINGLEVIEW,
} = require('../constants/paths');
const { NOTIFY_STEP_DELAY_MS } = require('../constants/timing');

const WFM_CPE_STEPS = wfmCpeStepPaths();

function meCpeStep(stepNum, file) {
  return { step: stepNum, type: 'notify', file, delay: NOTIFY_STEP_DELAY_MS };
}

function buildWfmCpeAndMeSteps(stepNum, meCount) {
  const steps = WFM_CPE_STEPS.map((f) => meCpeStep(stepNum, f));
  if (meCount > 0) {
    for (const f of WFM_ME_STEPS) steps.push(meCpeStep(stepNum, f));
    steps.push(meCpeStep(stepNum, wfmMeInstallationStep(meCount)));
  }
  return steps;
}

function buildOdbPatchSteps(networkCategory) {
  if (!requiresOdbPatch(networkCategory)) return [];
  return [
    { step: 4, type: 'extractOdbPatchActionId' },
    { step: 5, type: 'notify', file: SINGLEVIEW.odbPatch, delay: NOTIFY_STEP_DELAY_MS },
  ];
}

function buildMobilyActivation(opts) {
  const meCount = opts.me || 0;
  const custType = opts.customerType || 'Regular-Customer';
  const payType = opts.paymentType || 'Postpaid';
  const createFile = mobilyCreateOrderPath(custType, payType, meCount);

  const networkCategory = resolveNetworkCategory(opts);
  const customerCategory = customerCategoryFor(networkCategory);

  return [
    {
      step: 2,
      type: 'create',
      file: createFile,
      vars: { networkCategory, customerCategory },
    },
    { step: 3, type: 'extractWorkOrderIds' },
    ...buildOdbPatchSteps(networkCategory),
    ...buildWfmCpeAndMeSteps(6, meCount),

    {
      step: 7,
      type: 'wait',
      ms: 45000,
      label: 'Waiting for Create Service Order Response to be generated',
    },
    { step: 7, type: 'extractServiceOrderId' },

    {
      step: 8,
      type: 'notify',
      file: TMF641.serviceOrderCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },

    { step: 9, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: 9, type: 'extractSvActionId' },

    {
      step: 10,
      type: 'notify',
      file: SINGLEVIEW.provisioningCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },

    { step: 11, type: 'waitForState', state: 'In Progress|Pending UAT' },

    { step: 12, type: 'notify', file: WFM_STEP_09_CPE_COMPLETED, delay: NOTIFY_STEP_DELAY_MS },
    ...(meCount > 0
      ? [
          {
            step: 12,
            type: 'notify',
            file: wfmMeUatCompletedStep(),
            delay: NOTIFY_STEP_DELAY_MS,
          },
        ]
      : []),

    { step: 13, type: 'waitForCpeInstallationPendingUat' },

    {
      step: 14,
      type: 'notify',
      file: SINGLEVIEW.uatCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },

    { step: 15, type: 'waitForState', state: 'In Progress|Pre-Completion' },

    {
      step: 16,
      type: 'notify',
      file: SINGLEVIEW.preCompletion,
      delay: NOTIFY_STEP_DELAY_MS,
    },

    { step: 17, type: 'waitForState', state: 'Completed' },
  ];
}

function buildMobilyFieldWork(createFile, opts) {
  const meCount = opts.me || 0;
  const networkCategory = resolveNetworkCategory(opts);
  const customerCategory = customerCategoryFor(networkCategory);

  return [
    { step: 2, type: 'create', file: createFile, vars: { networkCategory, customerCategory } },
    { step: 3, type: 'extractWorkOrderIds' },
    ...buildOdbPatchSteps(networkCategory),
    ...buildWfmCpeAndMeSteps(6, meCount),
    { step: 7, type: 'wait', ms: 45000, label: 'Waiting for Create Service Order Response' },
    { step: 7, type: 'extractServiceOrderId' },
    {
      step: 8,
      type: 'notify',
      file: TMF641.serviceOrderCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },
    { step: 9, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: 9, type: 'extractSvActionId' },
    {
      step: 10,
      type: 'notify',
      file: SINGLEVIEW.provisioningCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },
    { step: 11, type: 'waitForState', state: 'In Progress|Pending UAT' },
    { step: 12, type: 'notify', file: WFM_STEP_09_CPE_COMPLETED, delay: NOTIFY_STEP_DELAY_MS },
    ...(meCount > 0
      ? [
          {
            step: 12,
            type: 'notify',
            file: wfmMeUatCompletedStep(),
            delay: NOTIFY_STEP_DELAY_MS,
          },
        ]
      : []),

    { step: 13, type: 'waitForCpeInstallationPendingUat' },

    {
      step: 14,
      type: 'notify',
      file: SINGLEVIEW.uatCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },

    { step: 15, type: 'waitForState', state: 'In Progress|Pre-Completion' },
    {
      step: 16,
      type: 'notify',
      file: SINGLEVIEW.preCompletion,
      delay: NOTIFY_STEP_DELAY_MS,
    },

    { step: 17, type: 'waitForState', state: 'Completed' },
  ];
}

module.exports = {
  buildMobilyActivation,
  buildMobilyFieldWork,
};
