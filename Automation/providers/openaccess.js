/**
 * OpenAccess provider definitions (DOWIYAT / STC / ITC / ACES).
 *
 * Each provider declares:
 *   - `notifications`  : the Service-Qualification + Service-Installation
 *                        `.bru` files that simulate provider→Telflow events.
 *   - `idSpec`         : which `externalId` values must be extracted from B2B
 *                        messages to render those notifications, and how to
 *                        recognise the source action.
 *
 * `buildOpenAccessActivation` consumes these to compose the journey steps.
 * Adding a fifth provider only requires declaring a new entry — no change to
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

const {
  oaActivationPath,
  openAccessCreateOrderPath,
  TMF641,
  SINGLEVIEW,
} = require('../constants/paths');
const { NOTIFY_STEP_DELAY_MS } = require('../constants/timing');

function oaAct(provider, ...subpath) {
  return oaActivationPath(provider, ...subpath);
}

const OA_PROVIDER_NOTIFICATIONS = {
  STC: {
    sqNotifications: [
      oaAct('STC', 'Service Qualification - Notification/STC-Ordered.bru'),
      oaAct('STC', 'Service Qualification - Notification/STC-Completed.bru'),
      oaAct('STC', 'Service Qualification - Notification/STC-Closed.bru'),
    ],
    activationNotifications: [
      oaAct('STC', 'ONT-Installation/Step-01-STC-WO-Created-In-WFMS.bru'),
      oaAct('STC', 'ONT-Installation/Step-02-STC-Technician-Assignment.bru'),
      oaAct('STC', 'ONT-Installation/Step-03-STC-Technician-Working.bru'),
      oaAct('STC', 'ONT-Installation/Step-04-STC-Test-Ftth-Link.bru'),
      oaAct('STC', 'ONT-Installation/Step-05-STC-Activate-ONT.bru'),
      oaAct('STC', 'ONT-Installation/Step-06-STC-Closed.bru'),
    ],
  },
  ITC: {
    sqNotifications: [],
    activationNotifications: [
      oaAct('ITC', 'ONT-Installation/Step-01-ITC-Create-Task.bru'),
      oaAct('ITC', 'ONT-Installation/Step-02-ITC-Accepted.bru'),
      oaAct('ITC', 'ONT-Installation/Step-03-ITC-Assigned.bru'),
      oaAct('ITC', 'ONT-Installation/Step-04-ITC-SetOff.bru'),
      oaAct('ITC', 'ONT-Installation/Step-05-ITC-Serial-Number.bru'),
      oaAct('ITC', 'ONT-Installation/Step-06-ITC-Success.bru'),
    ],
  },
  ACES: {
    sqNotifications: [],
    // Temporarily skip In Progress — Accepted → Installation Completed → Completed only.
    activationNotifications: [
      oaAct('ACES', 'ONT-Installation/Step-01-ACES-Accepted.bru'),
      oaAct('ACES', 'ONT-Installation/Step-03-ACES-Serial-Number.bru'),
      oaAct('ACES', 'ONT-Installation/Step-04-ACES-Completed.bru'),
    ],
  },
  DOWIYAT: {
    sqNotifications: [],
    activationNotifications: [
      oaAct('DOWIYAT', 'ONT-Installation/Step-01-DOWIYAT-Acknowledged.bru'),
      oaAct('DOWIYAT', 'ONT-Installation/Step-02-DOWIYAT-InProgress-Dispatch.bru'),
      oaAct('DOWIYAT', 'ONT-Installation/Step-03-DOWIYAT-InProgress-Departure.bru'),
      oaAct('DOWIYAT', 'ONT-Installation/Step-04-DOWIYAT-InProgress-Arrival.bru'),
      oaAct('DOWIYAT', 'ONT-Installation/Step-05-DOWIYAT-InProgress-HAG-Activation.bru'),
      oaAct('DOWIYAT', 'ONT-Installation/Step-06-DOWIYAT-Serial-Number.bru'),
      oaAct('DOWIYAT', 'ONT-Installation/Step-07-DOWIYAT-Completed.bru'),
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
    delay: NOTIFY_STEP_DELAY_MS,
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
    delay: NOTIFY_STEP_DELAY_MS,
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
      file: TMF641.serviceOrderCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },

    { step: waitProvisioningStep, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: waitProvisioningStep, type: 'extractSvActionId' },

    {
      step: svProvisioningStep,
      type: 'notify',
      file: SINGLEVIEW.provisioningCompleted,
      delay: NOTIFY_STEP_DELAY_MS,
    },

    { step: waitPreCompletionStep, type: 'waitForState', state: 'In Progress|Pre-Completion' },

    {
      step: svPreCompletionStep,
      type: 'notify',
      file: SINGLEVIEW.preCompletion,
      delay: NOTIFY_STEP_DELAY_MS,
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
