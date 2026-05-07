/**
 * OpenAccess provider definitions (DOWIYAT / STC / ITC / ACES).
 *
 * Each provider declares:
 *   - `notifications`  : the Service-Qualification + Service-Installation
 *                        `.bru` files that simulate providerâ†’Telflow events.
 *   - `idSpec`         : which `externalId` values must be extracted from B2B
 *                        messages to render those notifications, and how to
 *                        recognise the source action.
 *
 * `buildOpenAccessActivation` consumes these to compose the journey steps.
 * Adding a fifth provider only requires declaring a new entry â€” no change to
 * the runner, registry, or extractor needed (Open/Closed principle).
 */

const { log, delay } = require('./../lib/runtime');
const { httpRequest } = require('./../lib/http');
const { buildB2bUrl } = require('./../lib/url-builder');
const {
  parseB2bMessageData,
  actionMatchesProviderKind,
  extractExternalIdFromB2bPayload,
} = require('./../lib/b2b');

const { openAccessCreateOrderPath } = require('../constants/paths');

const OA_BASE = '02-Activation Order/OpenAccess';

const OA_PROVIDER_NOTIFICATIONS = {
  STC: {
    sqNotifications: [
      `${OA_BASE}/STC/Service Qualification - Notification/STC-Ordered.bru`,
      `${OA_BASE}/STC/Service Qualification - Notification/STC-Completed.bru`,
      `${OA_BASE}/STC/Service Qualification - Notification/STC-Closed.bru`,
    ],
    activationNotifications: [
      `${OA_BASE}/STC/OA ONT Installation - Notification/Step-01-STC-WO-Created-In-WFMS.bru`,
      `${OA_BASE}/STC/OA ONT Installation - Notification/Step-02-STC-Technician-Assignment.bru`,
      `${OA_BASE}/STC/OA ONT Installation - Notification/Step-03-STC-Technician-Working.bru`,
      `${OA_BASE}/STC/OA ONT Installation - Notification/Step-04-STC-TEST-FTTH-LINK.bru`,
      `${OA_BASE}/STC/OA ONT Installation - Notification/Step-05-STC-Activate-ONT.bru`,
      `${OA_BASE}/STC/OA ONT Installation - Notification/Step-06-STC-Closed.bru`,
    ],
  },
  ITC: {
    sqNotifications: [],
    activationNotifications: [
      `${OA_BASE}/ITC/OA ONT Installation - Notification/01-ITC-Create Task.bru`,
      `${OA_BASE}/ITC/OA ONT Installation - Notification/02-ITC-Accepted.bru`,
      `${OA_BASE}/ITC/OA ONT Installation - Notification/03-ITC-Assigned.bru`,
      `${OA_BASE}/ITC/OA ONT Installation - Notification/04-ITC-SetOff.bru`,
      `${OA_BASE}/ITC/OA ONT Installation - Notification/05-ITC- Installation Completed - Serial Number Notification.bru`,
      `${OA_BASE}/ITC/OA ONT Installation - Notification/06-ITC-Success.bru`,
    ],
  },
  ACES: {
    sqNotifications: [],
    activationNotifications: [
      `${OA_BASE}/ACES/OA ONT Installation - Notification/Step-01-ACES-Accepted.bru`,
      `${OA_BASE}/ACES/OA ONT Installation - Notification/Step-02-ACES-InProgress.bru`,
      `${OA_BASE}/ACES/OA ONT Installation - Notification/Step-03-ACES-Serial-Number-Notification.bru`,
      `${OA_BASE}/ACES/OA ONT Installation - Notification/Step-04-ACES-Completed.bru`,
    ],
  },
  DOWIYAT: {
    sqNotifications: [],
    activationNotifications: [
      `${OA_BASE}/DOWIYAT/OA ONT Installation - Notification/Step-01-DOWIYAT-Acknowledged.bru`,
      `${OA_BASE}/DOWIYAT/OA ONT Installation - Notification/Step-02-DOWIYAT-InProgress-Dispatch.bru`,
      `${OA_BASE}/DOWIYAT/OA ONT Installation - Notification/Step-03-DOWIYAT-InProgress-Departure.bru`,
      `${OA_BASE}/DOWIYAT/OA ONT Installation - Notification/Step-04-DOWIYAT-InProgress-Arrival.bru`,
      `${OA_BASE}/DOWIYAT/OA ONT Installation - Notification/Step-05-DOWIYAT-InProgress-HAG-Activation.bru`,
      `${OA_BASE}/DOWIYAT/OA ONT Installation - Notification/Step-06-DOWIYAT-Serial-Number-Notification.bru`,
      `${OA_BASE}/DOWIYAT/OA ONT Installation - Notification/Step-07-DOWIYAT-Completed.bru`,
    ],
  },
};

const OA_PROVIDER_ID_SPECS = {
  STC: {
    required: ['stcSqId', 'stcInstallationId'],
    extractors: [
      { key: 'stcSqId', kind: 'Service Qualification' },
      { key: 'stcInstallationId', kind: 'Service Installation' },
    ],
  },
  ITC: {
    required: ['itcInstallationId'],
    extractors: [{ key: 'itcInstallationId', kind: 'Service Installation' }],
  },
  ACES: {
    required: ['acesInstallationId'],
    extractors: [{ key: 'acesInstallationId', kind: 'Service Installation' }],
  },
  DOWIYAT: {
    required: ['dawiyatInstallationId'],
    extractors: [{ key: 'dawiyatInstallationId', kind: 'Service Installation' }],
  },
};

function getOAProviderIdSpec(provider) {
  return OA_PROVIDER_ID_SPECS[provider] || null;
}

function getMissingOAProviderIds(provider, vars) {
  const spec = getOAProviderIdSpec(provider);
  if (!spec) return [];
  return spec.required.filter((k) => {
    const v = vars[k];
    return v == null || String(v).trim() === '';
  });
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean).map((v) => String(v)))];
}

/**
 * Poll B2B messages for `<provider>` and assign every external ID matching
 * the spec into `vars`. `opts.requiredKeys` / `opts.kinds` narrow the scope
 * so a single journey can split STC's `stcSqId` (early) and
 * `stcInstallationId` (after the SQ flow completes) into two distinct
 * extract steps.
 */
async function doExtractOpenAccessProviderIds(
  vars,
  provider,
  opts = {},
  maxAttempts = 10,
  intervalMs = 10000,
) {
  const spec = getOAProviderIdSpec(provider);
  if (!spec) throw new Error(`Unsupported OA provider for ID extraction: ${provider}`);
  if (!vars.orderId) throw new Error('orderId is required before extracting OA provider IDs');

  const kindsFilter = uniqueStrings(opts.kinds);
  const keysFilter = uniqueStrings(opts.requiredKeys);
  const activeExtractors = spec.extractors.filter((ext) => {
    if (keysFilter.length && !keysFilter.includes(ext.key)) return false;
    if (kindsFilter.length && !kindsFilter.includes(ext.kind)) return false;
    return true;
  });
  if (activeExtractors.length === 0) {
    throw new Error(
      `No extractor rule for ${provider} with requiredKeys=${keysFilter.join(',') || '-'} and kinds=${kindsFilter.join(',') || '-'}`,
    );
  }

  const expectedKeys = uniqueStrings(activeExtractors.map((e) => e.key));
  const missingKeys = () => expectedKeys.filter((k) => !vars[k] || String(vars[k]).trim() === '');

  log(
    'BRIDGE',
    `Extracting ${provider} external IDs from B2B messages (${expectedKeys.join(', ')})...`,
  );
  const seenActions = new Set();
  const url = buildB2bUrl(vars);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await httpRequest('GET', url, { Authorization: `Bearer ${vars.authToken}` });
      const rows = res.body?.data?.Rows || [];

      for (const msg of rows) {
        const action = String(msg.Action || '');
        if (action) seenActions.add(action);
        const payload = parseB2bMessageData(msg);
        if (!payload) continue;
        const externalId = extractExternalIdFromB2bPayload(payload);
        if (!externalId) continue;

        for (const ext of activeExtractors) {
          if (vars[ext.key]) continue;
          if (actionMatchesProviderKind(action, provider, ext.kind)) {
            vars[ext.key] = externalId;
            log('BRIDGE', `${ext.key}: ${externalId}  (from action "${action}")`);
          }
        }
      }
    } catch (e) {
      log('WARN', `OA ID poll error: ${e.message}`);
    }

    const missing = missingKeys();
    if (missing.length === 0) return;

    if (attempt < maxAttempts) {
      log(
        'BRIDGE',
        `Attempt ${attempt}/${maxAttempts} - waiting OA IDs (${missing.join(', ')}) ${intervalMs / 1000}s...`,
      );
      await delay(intervalMs);
    }
  }

  const missing = missingKeys();
  const sampleActions = [...seenActions].slice(0, 8).join(' | ');
  throw new Error(
    `Could not extract OA IDs for ${provider}. Missing: ${missing.join(', ')}. ` +
      `Check B2B Action contains provider request messages. Seen actions: ${sampleActions || 'none'}`,
  );
}

/**
 * Build the OpenAccess activation step list.
 *
 * Step numbering (no-SQ providers â€” ITC / ACES / DOWIYAT):
 *   2 create order
 *   3 extract OA installation external ID
 *   5 provider activation notifications
 *   6 wait + extract serviceOrderId
 *   7 TMF641 Completed
 *   8 wait Provisioning Completed + extract svActionId
 *   9 SV Provisioning-Completed
 *  10 wait Pre-Completion
 *  11 SV Pre-Completion
 *  12 verify Completed
 *
 * STC adds two extra steps in the middle for the Service-Qualification flow,
 * so its numbering is shifted by +1 from step 5 onwards (see labels module).
 */
function buildOpenAccessActivation(provider, opts) {
  const meCount = opts.me || 0;
  const createFile = openAccessCreateOrderPath(provider, meCount);

  const providerSpec = OA_PROVIDER_NOTIFICATIONS[provider];
  if (!providerSpec) {
    throw new Error(
      `Unknown OpenAccess provider: "${provider}". Expected one of: ${Object.keys(OA_PROVIDER_NOTIFICATIONS).join(', ')}`,
    );
  }

  const sqSteps = providerSpec.sqNotifications.map((file) => ({
    step: 4,
    type: 'notify',
    file,
    delay: 5000,
  }));

  const initialExtractStep =
    provider === 'STC'
      ? {
          step: 3,
          type: 'extractOAProviderIds',
          provider,
          requiredKeys: ['stcSqId'],
          kinds: ['Service Qualification'],
        }
      : {
          step: 3,
          type: 'extractOAProviderIds',
          provider,
          kinds: ['Service Installation'],
        };

  const stcInstallationExtractStep =
    provider === 'STC'
      ? [
          {
            step: 5,
            type: 'extractOAProviderIds',
            provider,
            requiredKeys: ['stcInstallationId'],
            kinds: ['Service Installation'],
          },
        ]
      : [];

  const activationStepNum = provider === 'STC' ? 6 : 5;
  const activationSteps = providerSpec.activationNotifications.map((file) => ({
    step: activationStepNum,
    type: 'notify',
    file,
    delay: 5000,
  }));

  const postProviderWaitStep = provider === 'STC' ? 7 : 6;
  const tmf641Step = provider === 'STC' ? 8 : 7;
  const waitProvisioningStep = provider === 'STC' ? 9 : 8;
  const svProvisioningStep = provider === 'STC' ? 10 : 9;
  const waitPreCompletionStep = provider === 'STC' ? 11 : 10;
  const svPreCompletionStep = provider === 'STC' ? 12 : 11;
  const waitCompletedStep = provider === 'STC' ? 13 : 12;

  return [
    { step: 2, type: 'create', file: createFile },
    initialExtractStep,

    ...sqSteps,
    ...stcInstallationExtractStep,
    ...activationSteps,

    {
      step: postProviderWaitStep,
      type: 'wait',
      ms: 45000,
      label: `Waiting for Create Service Order Response (after ${provider} provider notifications)`,
    },
    { step: postProviderWaitStep, type: 'extractServiceOrderId' },

    {
      step: tmf641Step,
      type: 'notify',
      file: '13-Shared-Workflows/TMF641-Notifications/Service-Order-Completed.bru',
      delay: 0,
    },

    { step: waitProvisioningStep, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: waitProvisioningStep, type: 'extractSvActionId' },

    {
      step: svProvisioningStep,
      type: 'notify',
      file: '13-Shared-Workflows/SingleView-Integration/Order-Completion/Provisioning-Completed.bru',
      delay: 5000,
    },

    { step: waitPreCompletionStep, type: 'waitForState', state: 'In Progress|Pre-Completion' },

    {
      step: svPreCompletionStep,
      type: 'notify',
      file: '13-Shared-Workflows/SingleView-Integration/Order-Completion/Pre-Completion.bru',
      delay: 5000,
    },

    { step: waitCompletedStep, type: 'waitForState', state: 'Completed' },
  ];
}

module.exports = {
  OA_PROVIDER_NOTIFICATIONS,
  OA_PROVIDER_ID_SPECS,
  getOAProviderIdSpec,
  getMissingOAProviderIds,
  doExtractOpenAccessProviderIds,
  buildOpenAccessActivation,
};


