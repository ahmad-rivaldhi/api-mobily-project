/**
 * Mobily-infrastructure journey builders. The activation builder is the only
 * one that branches on `networkCategory` today (Phase 4B): RCY orders skip
 * the ODB patch, CONSUMER orders include it.
 *
 * The builder also hard-overrides `customerCategory` and `networkCategory`
 * on the create step's vars so the outgoing TMF622 payload always carries
 * the right Phase 4B characteristics — independent of whatever is set in
 * the env file.
 */

const {
  resolveNetworkCategory,
  customerCategoryFor,
  requiresOdbPatch,
} = require('./network-category');

const ODB_PATCH_NOTIFICATION_BRU =
  'Shared-Workflows/SingleView-Integration/Custom-Notifications/ODB-Patch-Notification.bru';

const WFM_CPE_STEPS = [
  'Shared-Workflows/WFM-CPE-Workflow/Step-01-CPE-1000-OK.bru',
  'Shared-Workflows/WFM-CPE-Workflow/Step-02-CPE-Ready.bru',
  'Shared-Workflows/WFM-CPE-Workflow/Step-03-CPE-Acknowledged.bru',
  'Shared-Workflows/WFM-CPE-Workflow/Step-04-CPE-Accepted.bru',
  'Shared-Workflows/WFM-CPE-Workflow/Step-05-CPE-Trip-Started.bru',
  'Shared-Workflows/WFM-CPE-Workflow/Step-06-CPE-Customer-Premises.bru',
  'Shared-Workflows/WFM-CPE-Workflow/Step-07-CPE-In-Work.bru',
  'Shared-Workflows/WFM-CPE-Workflow/Step-08-CPE-Installation-Completed.bru',
];

const WFM_ME_BASE = [
  'Shared-Workflows/WFM-ME-Workflow/Step-01-ME-1000-OK.bru',
  'Shared-Workflows/WFM-ME-Workflow/Step-02-ME-Ready.bru',
  'Shared-Workflows/WFM-ME-Workflow/Step-03-ME-Acknowledged.bru',
  'Shared-Workflows/WFM-ME-Workflow/Step-04-ME-Accepted.bru',
  'Shared-Workflows/WFM-ME-Workflow/Step-05-ME-Trip-Started.bru',
  'Shared-Workflows/WFM-ME-Workflow/Step-06-ME-Customer-Premises.bru',
  'Shared-Workflows/WFM-ME-Workflow/Step-07-ME-In-Work.bru',
];

function meInstallationStep(meCount) {
  return `Shared-Workflows/WFM-ME-Workflow/Step-08-ME-Installation-Completed-${meCount}-ME.bru`;
}

function meCpeStep(stepNum, file) {
  return { step: stepNum, type: 'notify', file, delay: 5000 };
}

function buildWfmCpeAndMeSteps(stepNum, meCount) {
  const steps = WFM_CPE_STEPS.map((f) => meCpeStep(stepNum, f));
  if (meCount > 0) {
    for (const f of WFM_ME_BASE) steps.push(meCpeStep(stepNum, f));
    steps.push(meCpeStep(stepNum, meInstallationStep(meCount)));
  }
  return steps;
}

function buildOdbPatchSteps(networkCategory) {
  if (!requiresOdbPatch(networkCategory)) return [];
  return [
    { step: 4, type: 'extractOdbPatchActionId' },
    { step: 5, type: 'notify', file: ODB_PATCH_NOTIFICATION_BRU, delay: 5000 },
  ];
}

/**
 * Mobily new-activation flow. Step 4 + 5 (ODB patch) are conditional on the
 * resolved networkCategory:
 *   FTTH CONSUMER → ODB patch present
 *   FTTH RCY      → ODB patch skipped
 */
function buildMobilyActivation(opts) {
  const meCount = opts.me || 0;
  const custType = opts.customerType || 'Regular-Customer';
  const payType = opts.paymentType || 'Postpaid';
  const meSuffix = meCount > 0 ? `With-${meCount}-ME` : 'No-ME';
  const createFile = `02-New-Activation/01-Create-Order-TMF622/Mobily/${custType}/${payType}/FTTH-${payType}-${meSuffix}.bru`;

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
      file: 'Shared-Workflows/TMF641-Notifications/Service-Order-Completed.bru',
      delay: 0,
    },

    { step: 9, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: 9, type: 'extractSvActionId' },

    {
      step: 10,
      type: 'notify',
      file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Provisioning-Completed.bru',
      delay: 5000,
    },

    { step: 11, type: 'waitForState', state: 'In Progress|Pending UAT' },

    { step: 12, type: 'notify', file: 'Shared-Workflows/Step-09-CPE-Completed.bru', delay: 5000 },
    ...(meCount > 0
      ? [
          {
            step: 12,
            type: 'notify',
            file: 'Shared-Workflows/WFM-ME-Workflow/Step-09-ME-UAT-Completed.bru',
            delay: 5000,
          },
        ]
      : []),

    { step: 13, type: 'waitForState', state: 'In Progress|UAT Completed' },

    {
      step: 14,
      type: 'notify',
      file: 'Shared-Workflows/SingleView-Integration/Order-Completion/UAT-Completed.bru',
      delay: 5000,
    },

    { step: 15, type: 'waitForState', state: 'In Progress|Pre-Completion' },

    {
      step: 16,
      type: 'notify',
      file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Pre-Completion.bru',
      delay: 5000,
    },

    { step: 17, type: 'waitForState', state: 'Completed' },
  ];
}

/**
 * Mobily field-work pattern (relocation, device-swap, rewiring): create →
 * workOrderIds → ODB → WFM → service order → TMF641 → completion.
 *
 * ODB inclusion follows the same networkCategory rule as activation.
 */
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
      file: 'Shared-Workflows/TMF641-Notifications/Service-Order-Completed.bru',
      delay: 0,
    },
    { step: 9, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: 9, type: 'extractSvActionId' },
    {
      step: 10,
      type: 'notify',
      file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Provisioning-Completed.bru',
      delay: 5000,
    },
    { step: 11, type: 'waitForState', state: 'In Progress|Pending UAT' },
    { step: 12, type: 'notify', file: 'Shared-Workflows/Step-09-CPE-Completed.bru', delay: 5000 },
    ...(meCount > 0
      ? [
          {
            step: 12,
            type: 'notify',
            file: 'Shared-Workflows/WFM-ME-Workflow/Step-09-ME-UAT-Completed.bru',
            delay: 5000,
          },
        ]
      : []),
    { step: 13, type: 'waitForState', state: 'In Progress|UAT Completed' },
    {
      step: 14,
      type: 'notify',
      file: 'Shared-Workflows/SingleView-Integration/Order-Completion/UAT-Completed.bru',
      delay: 5000,
    },
    { step: 15, type: 'waitForState', state: 'In Progress|Pre-Completion' },
    {
      step: 16,
      type: 'notify',
      file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Pre-Completion.bru',
      delay: 5000,
    },
    { step: 17, type: 'waitForState', state: 'Completed' },
  ];
}

module.exports = {
  buildMobilyActivation,
  buildMobilyFieldWork,
};
