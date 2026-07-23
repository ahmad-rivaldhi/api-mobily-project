'use strict';

/**
 * Activation Shortcut catalogue — mid-journey notify bundles without a full
 * journey run. Source of truth for Toolkit Shortcut Actions.
 */

const {
  wfmCpeStepPaths,
  WFM_STEP_09_CPE_COMPLETED,
  WFM_ME_STEPS,
  wfmMeInstallationStep,
  SINGLEVIEW,
  TMF641,
  mobilyFailureFile,
  oaFailureFile,
} = require('../constants/paths');
const { notifyDelayForFile } = require('../constants/timing');
const { OA_PROVIDER_NOTIFICATIONS } = require('../providers/openaccess');
const {
  MOBILY_FAILURE_CODES,
  DOWIYAT_FAILURE_CODES,
  STC_FAILURE_CODES,
  ITC_FAILURE_CODES,
  ACES_FAILURE_CODES,
} = require('../journeys/labels');

const WFM_CPE_STEPS = wfmCpeStepPaths();

function notifyFiles(files) {
  return (files || []).map((file) => ({
    type: 'notify',
    file,
    delay: notifyDelayForFile(file),
  }));
}

const FAILURE_CODES_BY_PROVIDER = Object.freeze({
  Mobily: MOBILY_FAILURE_CODES,
  STC: STC_FAILURE_CODES,
  ITC: ITC_FAILURE_CODES,
  DOWIYAT: DOWIYAT_FAILURE_CODES,
  ACES: ACES_FAILURE_CODES,
});

function failureRequiredIds(provider) {
  if (provider === 'Mobily') return ['orderId', 'workOrderIdCpe'];
  if (provider === 'STC') return ['orderId', 'stcInstallationId'];
  if (provider === 'ITC') return ['orderId', 'itcInstallationId'];
  if (provider === 'ACES') return ['orderId', 'acesInstallationId'];
  if (provider === 'DOWIYAT') return ['orderId', 'dawiyatInstallationId'];
  return ['orderId'];
}

function resolveFailureFile(provider, failureCode) {
  if (!provider || !failureCode) {
    throw new Error('failure-notify requires opts.provider and opts.failureCode');
  }
  if (provider === 'Mobily') return mobilyFailureFile(failureCode);
  return oaFailureFile(provider, failureCode);
}

const CPE_PAYLOAD_FIELDS = [
  { key: 'cpeIntegrationId', label: 'Integration ID' },
  { key: 'cpeSerialNumber', label: 'Serial Number' },
];

function mePayloadFields(meCount) {
  const n = Math.min(3, Math.max(1, Number(meCount) || 1));
  const fields = [];
  for (let i = 1; i <= n; i += 1) {
    fields.push(
      { key: `meshExtender${i}`, label: `ME ${i} Integration ID` },
      { key: `meshSerial${i}`, label: `ME ${i} Serial Number` },
    );
  }
  return fields;
}

/** Resolve static or opts-dependent payload field defs for a shortcut. */
function resolvePayloadFields(shortcut, opts = {}) {
  if (!shortcut) return [];
  if (typeof shortcut.payloadFieldsFor === 'function') {
    return shortcut.payloadFieldsFor(opts) || [];
  }
  return shortcut.payloadFields || [];
}

/** @type {Record<string, object>} */
const SHORTCUT_REGISTRY = {
  'wfm-cpe-01-08': {
    id: 'wfm-cpe-01-08',
    label: 'WFM CPE 01–08 (thru Installation Completed)',
    group: 'shared',
    requiredIds: ['orderId', 'workOrderIdCpe'],
    options: [],
    payloadFields: CPE_PAYLOAD_FIELDS,
    buildSteps: () => notifyFiles(WFM_CPE_STEPS),
  },
  'wfm-cpe-installation-completed': {
    id: 'wfm-cpe-installation-completed',
    label: 'WFM CPE Installation Completed only',
    group: 'shared',
    requiredIds: ['orderId', 'workOrderIdCpe'],
    options: [],
    payloadFields: CPE_PAYLOAD_FIELDS,
    buildSteps: () => notifyFiles([WFM_CPE_STEPS[WFM_CPE_STEPS.length - 1]]),
  },
  'wfm-cpe-09': {
    id: 'wfm-cpe-09',
    label: 'WFM CPE Step 09 Completed',
    group: 'shared',
    requiredIds: ['orderId', 'workOrderIdCpe'],
    options: [],
    buildSteps: () => notifyFiles([WFM_STEP_09_CPE_COMPLETED]),
  },
  'wfm-me': {
    id: 'wfm-me',
    label: 'WFM ME full (incl. Installation Completed)',
    group: 'shared',
    requiredIds: ['orderId', 'workOrderIdMe'],
    options: [
      {
        key: 'me',
        label: 'ME count',
        choices: [1, 2, 3],
        default: 1,
      },
    ],
    payloadFieldsFor: (opts = {}) => mePayloadFields(opts.me),
    buildSteps: (opts = {}) => {
      const me = Number(opts.me) || 1;
      return notifyFiles([...WFM_ME_STEPS, wfmMeInstallationStep(me)]);
    },
  },
  'sv-provisioning-completed': {
    id: 'sv-provisioning-completed',
    label: 'SV Provisioning Completed',
    group: 'shared',
    requiredIds: ['orderId', 'svActionId'],
    options: [],
    buildSteps: () => notifyFiles([SINGLEVIEW.provisioningCompleted]),
  },
  'sv-uat-completed': {
    id: 'sv-uat-completed',
    label: 'SV UAT Completed',
    group: 'shared',
    requiredIds: ['orderId', 'svActionId'],
    options: [],
    buildSteps: () => notifyFiles([SINGLEVIEW.uatCompleted]),
  },
  'sv-pre-completion': {
    id: 'sv-pre-completion',
    label: 'SV Pre-Completion',
    group: 'shared',
    requiredIds: ['orderId', 'svActionId'],
    options: [],
    buildSteps: () => notifyFiles([SINGLEVIEW.preCompletion]),
  },
  'sv-odb-patch': {
    id: 'sv-odb-patch',
    label: 'ODB Patch',
    group: 'shared',
    requiredIds: ['orderId', 'odbPatchActionId'],
    options: [],
    buildSteps: () => notifyFiles([SINGLEVIEW.odbPatch]),
  },
  'tmf641-completed': {
    id: 'tmf641-completed',
    label: 'TMF641 Service Order Completed',
    group: 'shared',
    requiredIds: ['orderId', 'serviceOrderId'],
    options: [],
    buildSteps: () => notifyFiles([TMF641.serviceOrderCompleted]),
  },
  'stc-sq': {
    id: 'stc-sq',
    label: 'STC Service Qualification',
    group: 'openaccess',
    requiredIds: ['orderId', 'stcSqId'],
    options: [],
    buildSteps: () => notifyFiles(OA_PROVIDER_NOTIFICATIONS.STC.sqNotifications),
  },
  'stc-ont': {
    id: 'stc-ont',
    label: 'STC ONT Installation',
    group: 'openaccess',
    requiredIds: ['orderId', 'stcInstallationId'],
    options: [],
    payloadFields: [
      ...CPE_PAYLOAD_FIELDS,
      { key: 'stcServiceAccNum', label: 'Service Acc' },
    ],
    buildSteps: () => notifyFiles(OA_PROVIDER_NOTIFICATIONS.STC.activationNotifications),
  },
  'itc-ont': {
    id: 'itc-ont',
    label: 'ITC ONT Installation',
    group: 'openaccess',
    requiredIds: ['orderId', 'itcInstallationId'],
    options: [],
    payloadFields: CPE_PAYLOAD_FIELDS,
    buildSteps: () => notifyFiles(OA_PROVIDER_NOTIFICATIONS.ITC.activationNotifications),
  },
  'aces-ont': {
    id: 'aces-ont',
    label: 'ACES ONT Installation',
    group: 'openaccess',
    requiredIds: ['orderId', 'acesInstallationId'],
    options: [],
    // Same UI labels as other providers; Bruno vars stay ACES-specific.
    payloadFields: [
      { key: 'acesCpeIntegrationId', label: 'Integration ID' },
      { key: 'acesCpeSerialNumber', label: 'Serial Number' },
      { key: 'acesServiceAccNum', label: 'Service Acc' },
    ],
    buildSteps: () => notifyFiles(OA_PROVIDER_NOTIFICATIONS.ACES.activationNotifications),
  },
  'dowiyat-ont': {
    id: 'dowiyat-ont',
    label: 'DOWIYAT ONT Installation',
    group: 'openaccess',
    requiredIds: ['orderId', 'dawiyatInstallationId'],
    options: [],
    payloadFields: CPE_PAYLOAD_FIELDS,
    buildSteps: () => notifyFiles(OA_PROVIDER_NOTIFICATIONS.DOWIYAT.activationNotifications),
  },
  'failure-notify': {
    id: 'failure-notify',
    label: 'Send Installation Failure',
    group: 'failure',
    requiredIds: [], // dynamic via opts.provider
    options: [
      {
        key: 'provider',
        label: 'Provider',
        choices: ['Mobily', 'STC', 'ITC', 'DOWIYAT', 'ACES'],
        default: 'Mobily',
      },
      {
        key: 'failureCode',
        label: 'Failure code',
        choicesByProvider: FAILURE_CODES_BY_PROVIDER,
        default: MOBILY_FAILURE_CODES[0].value,
      },
    ],
    requiredIdsFor: (opts = {}) => failureRequiredIds(opts.provider || 'Mobily'),
    buildSteps: (opts = {}) => {
      const file = resolveFailureFile(opts.provider || 'Mobily', opts.failureCode);
      return notifyFiles([file]);
    },
  },
};

function listShortcuts() {
  return Object.values(SHORTCUT_REGISTRY).map((s) => ({
    id: s.id,
    label: s.label,
    group: s.group,
    requiredIds: s.requiredIds || [],
    options: s.options || [],
    payloadFields: resolvePayloadFields(s, {}),
    dynamicPayloadFields: typeof s.payloadFieldsFor === 'function',
    dynamicRequiredIds: typeof s.requiredIdsFor === 'function',
  }));
}

function getShortcut(id) {
  return SHORTCUT_REGISTRY[id] || null;
}

function resolveRequiredIds(shortcut, opts = {}) {
  if (typeof shortcut.requiredIdsFor === 'function') {
    return shortcut.requiredIdsFor(opts);
  }
  return shortcut.requiredIds || [];
}

function buildShortcutSteps(id, opts = {}) {
  const shortcut = getShortcut(id);
  if (!shortcut) throw new Error(`Unknown shortcut: ${id}`);
  return shortcut.buildSteps(opts || {});
}

function assertRequiredIds(vars, requiredIds) {
  const missing = (requiredIds || []).filter((k) => {
    const v = vars[k];
    return v == null || String(v).trim() === '';
  });
  if (missing.length) {
    throw new Error(`Shortcut missing required IDs: ${missing.join(', ')}`);
  }
}

module.exports = {
  SHORTCUT_REGISTRY,
  FAILURE_CODES_BY_PROVIDER,
  listShortcuts,
  getShortcut,
  buildShortcutSteps,
  resolveRequiredIds,
  resolvePayloadFields,
  assertRequiredIds,
};
