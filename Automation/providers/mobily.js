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
  WFM_STEP_09_CPE_COMPLETED,
  wfmMeUatCompletedStep,
  TMF641,
  SINGLEVIEW,
} = require('../constants/paths');
const { NOTIFY_STEP_DELAY_MS, SERVICE_ORDER_WAIT_MS } = require('../constants/timing');
// WFM CPE/ME notify sequence is shared with the OA field-work builder — single
// source of truth in journeys/builders.js (no cyclic import: builders only
// depends on constants).
const { buildWfmCpeAndMe } = require('../journeys/builders');

function buildOdbPatchSteps(networkCategory) {
  if (!requiresOdbPatch(networkCategory)) return [];
  return [
    { step: 4, type: 'extractOdbPatchActionId' },
    { step: 5, type: 'notify', file: SINGLEVIEW.odbPatch, delay: NOTIFY_STEP_DELAY_MS },
  ];
}

/**
 * New activation is structurally identical to Mobily field-work — it only
 * differs in how the create file is chosen (from customer/payment/ME opts).
 * Delegate to the field-work builder so the step sequence lives in one place.
 */
function buildMobilyActivation(opts) {
  const meCount = opts.me || 0;
  const custType = opts.customerType || 'Regular-Customer';
  const payType = opts.paymentType || 'Postpaid';
  const createFile = mobilyCreateOrderPath(custType, payType, meCount);
  return buildMobilyFieldWork(createFile, opts);
}

function buildMobilyFieldWork(createFile, opts) {
  const meCount = opts.me || 0;
  const networkCategory = resolveNetworkCategory(opts);
  const customerCategory = customerCategoryFor(networkCategory);

  return [
    { step: 2, type: 'create', file: createFile, vars: { networkCategory, customerCategory } },
    { step: 3, type: 'extractWorkOrderIds' },
    ...buildOdbPatchSteps(networkCategory),
    ...buildWfmCpeAndMe(6, meCount),
    {
      step: 7,
      type: 'wait',
      ms: SERVICE_ORDER_WAIT_MS,
      label: 'Waiting for Create Service Order Response',
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

module.exports = {
  buildMobilyActivation,
  buildMobilyFieldWork,
};
