/**
 * Journey registry: every supported provider Ã— journey-type combination.
 *
 * Adding a new provider/journey only requires inserting an entry here â€” the
 * runner, step executor, and toolkit all read from this map (Open/Closed
 * principle). `stepLabels` may be either a static array or
 * `(opts) => labels[]` to allow option-driven label sets (e.g. RCY orders
 * skip the ODB rows on the timeline).
 */

const { buildMobilyActivation, buildMobilyFieldWork } = require('../providers/mobily');
const { buildOpenAccessActivation } = require('../providers/openaccess');
const {
  buildOAFieldWork,
  buildSimpleOrder,
  buildSuspendOrder,
  buildFailureJourney,
  buildMaintenanceOrder,
} = require('./builders');
const {
  JOURNEY,
  TMF641,
  mobilyJourneyFile,
  oaJourneyFile,
  mobilyFailureFile,
  oaFailureFile,
  mobilyMaintenanceCreateFile,
  oaMaintenanceCreateFile,
  createServiceOaFile,
} = require('../constants/paths');
const {
  MOBILY_FIELDWORK_LABELS,
  getMobilyActivationLabels,
  MOBILY_FIELDWORK_STATE_MAP,
  OA_FIELDWORK_LABELS,
  OA_FIELDWORK_STATE_MAP,
  OA_PROVIDER_ACTIVATION_LABELS,
  OA_PROVIDER_ACTIVATION_LABELS_STC,
  OA_PROVIDER_ACTIVATION_STATE_MAP,
  OA_PROVIDER_ACTIVATION_STATE_MAP_STC,
  SIMPLE_TMF641_LABELS,
  SIMPLE_ORDER_LABELS,
  FAILURE_LABELS,
  MAINTENANCE_LABELS,
  SUSPEND_OA_LABELS,
  MOBILY_FAILURE_CODES,
  DOWIYAT_FAILURE_CODES,
  STC_FAILURE_CODES,
  ITC_FAILURE_CODES,
} = require('./labels');

const ME_OPTION = { key: 'me', label: 'ME Count', choices: ['0', '1', '2', '3'], default: '0' };

const JOURNEY_REGISTRY = {
  // ===== MOBILY ============================================================
  'mobily-activation': {
    label: 'New Activation',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'activation',
    options: [
      ME_OPTION,
      {
        key: 'customerType',
        label: 'Customer',
        choices: [
          { value: 'Regular-Customer', label: 'Regular (FTTH Consumer)' },
          { value: 'Royal-Customer', label: 'Royal (FTTH RCY)' },
        ],
        default: 'Regular-Customer',
      },
      { key: 'paymentType', label: 'Payment', choices: ['Postpaid', 'Prepaid'], default: 'Postpaid' },
    ],
    build: (opts) => buildMobilyActivation(opts),
    stepLabels: (opts) => getMobilyActivationLabels(opts),
    stateMap: MOBILY_FIELDWORK_STATE_MAP,
  },
  'mobily-failure': {
    label: 'Installation Failure',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'failure',
    options: [
      {
        key: 'failureCode',
        label: 'Failure Code',
        choices: MOBILY_FAILURE_CODES,
        default: MOBILY_FAILURE_CODES[0].value,
      },
    ],
    build: (opts) => buildFailureJourney(mobilyFailureFile(opts.failureCode)),
    stepLabels: FAILURE_LABELS,
    stateMap: {},
  },
  'mobily-relocation': {
    label: 'Relocation',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'relocation',
    options: [ME_OPTION],
    build: (opts) =>
      buildMobilyFieldWork(mobilyJourneyFile(JOURNEY.relocation, 'Request - Mobily.bru'), opts),
    stepLabels: MOBILY_FIELDWORK_LABELS,
    stateMap: MOBILY_FIELDWORK_STATE_MAP,
  },
  'mobily-device-swap-cpe': {
    label: 'Device Swap (CPE)',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'device-swap',
    options: [ME_OPTION],
    build: (opts) =>
      buildMobilyFieldWork(mobilyJourneyFile(JOURNEY.deviceSwap, 'Request - CPE - Mobily.bru'), opts),
    stepLabels: MOBILY_FIELDWORK_LABELS,
    stateMap: MOBILY_FIELDWORK_STATE_MAP,
  },
  'mobily-device-swap-hag': {
    label: 'Device Swap (HAG)',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'device-swap',
    options: [ME_OPTION],
    build: (opts) =>
      buildMobilyFieldWork(mobilyJourneyFile(JOURNEY.deviceSwap, 'Request - HAG - Mobily.bru'), opts),
    stepLabels: MOBILY_FIELDWORK_LABELS,
    stateMap: MOBILY_FIELDWORK_STATE_MAP,
  },
  'mobily-rewiring': {
    label: 'Rewiring',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'rewiring',
    options: [ME_OPTION],
    build: (opts) =>
      buildMobilyFieldWork(mobilyJourneyFile(JOURNEY.rewiring, 'Request - Mobily.bru'), opts),
    stepLabels: MOBILY_FIELDWORK_LABELS,
    stateMap: MOBILY_FIELDWORK_STATE_MAP,
  },
  'mobily-upgrade': {
    label: 'Upgrade',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'upgrade',
    options: [],
    build: (opts) =>
      buildSimpleOrder(mobilyJourneyFile(JOURNEY.upgrade, 'Request - Mobily.bru'), opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { Completed: 3 },
  },
  'mobily-downgrade': {
    label: 'Downgrade',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'downgrade',
    options: [],
    build: (opts) =>
      buildSimpleOrder(mobilyJourneyFile(JOURNEY.downgrade, 'Request - Mobily.bru'), opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { Completed: 3 },
  },
  'mobily-suspend': {
    label: 'Suspend',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'suspend',
    options: [],
    build: (opts) => buildSimpleOrder(mobilyJourneyFile(JOURNEY.suspend, 'Request - Mobily.bru'), opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { Completed: 3 },
  },
  'mobily-termination': {
    label: 'Termination',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'termination',
    options: [],
    build: (opts) =>
      buildSimpleOrder(mobilyJourneyFile(JOURNEY.termination, 'Request - Mobily.bru'), {
        ...opts,
        _tmf641File: TMF641.ceaseTermination,
      }),
    stepLabels: SIMPLE_TMF641_LABELS,
    stateMap: { Completed: 5 },
  },
  'mobily-maintenance': {
    label: 'Maintenance',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'maintenance',
    options: [],
    build: () => buildMaintenanceOrder(mobilyMaintenanceCreateFile()),
    stepLabels: MAINTENANCE_LABELS,
    stateMap: {},
  },

  // ===== DOWIYAT (OpenAccess; journey slug kept as dawiyat-* for compat) =====
  'dawiyat-activation': {
    label: 'New Activation',
    provider: 'DOWIYAT',
    providerCategory: 'openaccess',
    journeyType: 'activation',
    options: [ME_OPTION],
    build: (opts) => buildOpenAccessActivation('DOWIYAT', opts),
    stepLabels: OA_PROVIDER_ACTIVATION_LABELS,
    stateMap: OA_PROVIDER_ACTIVATION_STATE_MAP,
  },
  'dawiyat-failure': {
    label: 'Installation Failure',
    provider: 'DOWIYAT',
    providerCategory: 'openaccess',
    journeyType: 'failure',
    options: [
      {
        key: 'failureCode',
        label: 'Failure Code',
        choices: DOWIYAT_FAILURE_CODES,
        default: DOWIYAT_FAILURE_CODES[0].value,
      },
    ],
    build: (opts) => buildFailureJourney(oaFailureFile('DOWIYAT', opts.failureCode)),
    stepLabels: FAILURE_LABELS,
    stateMap: {},
  },
  'dawiyat-relocation': {
    label: 'Relocation',
    provider: 'DOWIYAT',
    providerCategory: 'openaccess',
    journeyType: 'relocation',
    options: [ME_OPTION],
    build: (opts) =>
      buildOAFieldWork(oaJourneyFile('DOWIYAT', JOURNEY.relocation, 'Request - DOWIYAT.bru'), opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'dawiyat-device-swap': {
    label: 'Device Swap (ONT)',
    provider: 'DOWIYAT',
    providerCategory: 'openaccess',
    journeyType: 'device-swap',
    options: [ME_OPTION],
    build: (opts) =>
      buildOAFieldWork(oaJourneyFile('DOWIYAT', JOURNEY.deviceSwap, 'Request - DOWIYAT.bru'), opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'dawiyat-rewiring': {
    label: 'Rewiring',
    provider: 'DOWIYAT',
    providerCategory: 'openaccess',
    journeyType: 'rewiring',
    options: [ME_OPTION],
    build: (opts) =>
      buildOAFieldWork(oaJourneyFile('DOWIYAT', JOURNEY.rewiring, 'Request - DOWIYAT.bru'), opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'dawiyat-suspend': {
    label: 'Suspend',
    provider: 'DOWIYAT',
    providerCategory: 'openaccess',
    journeyType: 'suspend',
    options: [],
    build: (opts) =>
      buildSuspendOrder(
        oaJourneyFile('DOWIYAT', JOURNEY.suspend, 'Request - DOWIYAT.bru'),
        createServiceOaFile('DOWIYAT'),
        opts,
      ),
    stepLabels: SUSPEND_OA_LABELS,
    stateMap: { Completed: 5 },
  },
  'dawiyat-resume': {
    label: 'Resume',
    provider: 'DOWIYAT',
    providerCategory: 'openaccess',
    journeyType: 'resume',
    options: [],
    build: (opts) => buildSimpleOrder(oaJourneyFile('DOWIYAT', JOURNEY.resume, 'Request - DOWIYAT.bru'), opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { Completed: 3 },
  },
  'dawiyat-termination': {
    label: 'Termination',
    provider: 'DOWIYAT',
    providerCategory: 'openaccess',
    journeyType: 'termination',
    options: [],
    build: (opts) =>
      buildSimpleOrder(oaJourneyFile('DOWIYAT', JOURNEY.termination, 'Request - DOWIYAT.bru'), {
        ...opts,
        _tmf641File: TMF641.ceaseTermination,
      }),
    stepLabels: SIMPLE_TMF641_LABELS,
    stateMap: { Completed: 5 },
  },
  'dawiyat-maintenance': {
    label: 'Maintenance',
    provider: 'DOWIYAT',
    providerCategory: 'openaccess',
    journeyType: 'maintenance',
    options: [],
    build: () => buildMaintenanceOrder(oaMaintenanceCreateFile('DOWIYAT')),
    stepLabels: MAINTENANCE_LABELS,
    stateMap: {},
  },

  // ===== STC (OpenAccess) ==================================================
  'stc-activation': {
    label: 'New Activation',
    provider: 'STC',
    providerCategory: 'openaccess',
    journeyType: 'activation',
    options: [ME_OPTION],
    build: (opts) => buildOpenAccessActivation('STC', opts),
    stepLabels: OA_PROVIDER_ACTIVATION_LABELS_STC,
    stateMap: OA_PROVIDER_ACTIVATION_STATE_MAP_STC,
  },
  'stc-failure': {
    label: 'Installation Failure',
    provider: 'STC',
    providerCategory: 'openaccess',
    journeyType: 'failure',
    options: [
      {
        key: 'failureCode',
        label: 'Failure Code',
        choices: STC_FAILURE_CODES,
        default: STC_FAILURE_CODES[0].value,
      },
    ],
    build: (opts) => buildFailureJourney(oaFailureFile('STC', opts.failureCode)),
    stepLabels: FAILURE_LABELS,
    stateMap: {},
  },
  'stc-relocation': {
    label: 'Relocation',
    provider: 'STC',
    providerCategory: 'openaccess',
    journeyType: 'relocation',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork(oaJourneyFile('STC', JOURNEY.relocation, 'Request - STC.bru'), opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'stc-device-swap': {
    label: 'Device Swap (ONT)',
    provider: 'STC',
    providerCategory: 'openaccess',
    journeyType: 'device-swap',
    options: [ME_OPTION],
    build: (opts) =>
      buildOAFieldWork(oaJourneyFile('STC', JOURNEY.deviceSwap, 'Request - STC.bru'), opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'stc-suspend': {
    label: 'Suspend',
    provider: 'STC',
    providerCategory: 'openaccess',
    journeyType: 'suspend',
    options: [],
    build: (opts) =>
      buildSuspendOrder(
        oaJourneyFile('STC', JOURNEY.suspend, 'Request - STC.bru'),
        createServiceOaFile('STC'),
        opts,
      ),
    stepLabels: SUSPEND_OA_LABELS,
    stateMap: { Completed: 5 },
  },
  'stc-resume': {
    label: 'Resume',
    provider: 'STC',
    providerCategory: 'openaccess',
    journeyType: 'resume',
    options: [],
    build: (opts) => buildSimpleOrder(oaJourneyFile('STC', JOURNEY.resume, 'Request - STC.bru'), opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { Completed: 3 },
  },
  'stc-termination': {
    label: 'Termination',
    provider: 'STC',
    providerCategory: 'openaccess',
    journeyType: 'termination',
    options: [],
    build: (opts) =>
      buildSimpleOrder(oaJourneyFile('STC', JOURNEY.termination, 'Request - STC.bru'), {
        ...opts,
        _tmf641File: TMF641.ceaseTermination,
      }),
    stepLabels: SIMPLE_TMF641_LABELS,
    stateMap: { Completed: 5 },
  },
  'stc-maintenance': {
    label: 'Maintenance',
    provider: 'STC',
    providerCategory: 'openaccess',
    journeyType: 'maintenance',
    options: [],
    build: () => buildMaintenanceOrder(oaMaintenanceCreateFile('STC')),
    stepLabels: MAINTENANCE_LABELS,
    stateMap: {},
  },

  // ===== ITC (OpenAccess) ==================================================
  'itc-activation': {
    label: 'New Activation',
    provider: 'ITC',
    providerCategory: 'openaccess',
    journeyType: 'activation',
    options: [ME_OPTION],
    build: (opts) => buildOpenAccessActivation('ITC', opts),
    stepLabels: OA_PROVIDER_ACTIVATION_LABELS,
    stateMap: OA_PROVIDER_ACTIVATION_STATE_MAP,
  },
  'itc-failure': {
    label: 'Installation Failure',
    provider: 'ITC',
    providerCategory: 'openaccess',
    journeyType: 'failure',
    options: [
      {
        key: 'failureCode',
        label: 'Failure Code',
        choices: ITC_FAILURE_CODES,
        default: ITC_FAILURE_CODES[0].value,
      },
    ],
    build: (opts) => buildFailureJourney(oaFailureFile('ITC', opts.failureCode)),
    stepLabels: FAILURE_LABELS,
    stateMap: {},
  },
  'itc-relocation': {
    label: 'Relocation',
    provider: 'ITC',
    providerCategory: 'openaccess',
    journeyType: 'relocation',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork(oaJourneyFile('ITC', JOURNEY.relocation, 'Request - ITC.bru'), opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'itc-device-swap': {
    label: 'Device Swap (ONT)',
    provider: 'ITC',
    providerCategory: 'openaccess',
    journeyType: 'device-swap',
    options: [ME_OPTION],
    build: (opts) =>
      buildOAFieldWork(oaJourneyFile('ITC', JOURNEY.deviceSwap, 'Request - ITC.bru'), opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'itc-suspend': {
    label: 'Suspend',
    provider: 'ITC',
    providerCategory: 'openaccess',
    journeyType: 'suspend',
    options: [],
    build: (opts) =>
      buildSuspendOrder(
        oaJourneyFile('ITC', JOURNEY.suspend, 'Request - ITC.bru'),
        createServiceOaFile('ITC'),
        opts,
      ),
    stepLabels: SUSPEND_OA_LABELS,
    stateMap: { Completed: 5 },
  },
  'itc-resume': {
    label: 'Resume',
    provider: 'ITC',
    providerCategory: 'openaccess',
    journeyType: 'resume',
    options: [],
    build: (opts) => buildSimpleOrder(oaJourneyFile('ITC', JOURNEY.resume, 'Request - ITC.bru'), opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { Completed: 3 },
  },
  'itc-termination': {
    label: 'Termination',
    provider: 'ITC',
    providerCategory: 'openaccess',
    journeyType: 'termination',
    options: [],
    build: (opts) =>
      buildSimpleOrder(oaJourneyFile('ITC', JOURNEY.termination, 'Request - ITC.bru'), {
        ...opts,
        _tmf641File: TMF641.ceaseTermination,
      }),
    stepLabels: SIMPLE_TMF641_LABELS,
    stateMap: { Completed: 5 },
  },
  'itc-maintenance': {
    label: 'Maintenance',
    provider: 'ITC',
    providerCategory: 'openaccess',
    journeyType: 'maintenance',
    options: [],
    build: () => buildMaintenanceOrder(oaMaintenanceCreateFile('ITC')),
    stepLabels: MAINTENANCE_LABELS,
    stateMap: {},
  },

  // ===== ACES (OpenAccess â€” Phase 4B) ======================================
  'aces-activation': {
    label: 'New Activation',
    provider: 'ACES',
    providerCategory: 'openaccess',
    journeyType: 'activation',
    options: [ME_OPTION],
    build: (opts) => buildOpenAccessActivation('ACES', opts),
    stepLabels: OA_PROVIDER_ACTIVATION_LABELS,
    stateMap: OA_PROVIDER_ACTIVATION_STATE_MAP,
  },

  // ===== OA Downgrade (shared across OA providers) =========================
  'oa-downgrade': {
    label: 'Downgrade (OA)',
    provider: 'OpenAccess',
    providerCategory: 'openaccess',
    journeyType: 'downgrade',
    options: [],
    build: (opts) =>
      buildSimpleOrder(oaJourneyFile('ACES', JOURNEY.downgrade, 'Request - ACES.bru'), opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { Completed: 3 },
  },
};

const JOURNEYS = {};
for (const [k, v] of Object.entries(JOURNEY_REGISTRY)) {
  JOURNEYS[k] = v.build;
}

/**
 * Resolve the step-label list for `journeyName`. If the registry entry's
 * `stepLabels` is a function, it's invoked with `opts` so option-driven
 * variants (e.g. RCY skips ODB rows) render correctly.
 */
function getJourneyStepLabels(journeyName, opts = {}) {
  const entry =
    journeyName && JOURNEY_REGISTRY[journeyName]
      ? JOURNEY_REGISTRY[journeyName]
      : JOURNEY_REGISTRY['mobily-activation'];
  return typeof entry.stepLabels === 'function' ? entry.stepLabels(opts) : entry.stepLabels;
}

function listJourneys() {
  return Object.entries(JOURNEY_REGISTRY).map(([id, j]) => ({
    id,
    label: j.label,
    provider: j.provider,
    providerCategory: j.providerCategory,
    journeyType: j.journeyType,
    options: j.options,
  }));
}

function listJourneyTree() {
  const mobily = [];
  const oa = { DOWIYAT: [], STC: [], ITC: [], ACES: [] };
  const oaShared = [];

  for (const [id, j] of Object.entries(JOURNEY_REGISTRY)) {
    const entry = { id, label: j.label, journeyType: j.journeyType };
    if (j.providerCategory === 'mobily') mobily.push(entry);
    else if (oa[j.provider]) oa[j.provider].push(entry);
    else oaShared.push(entry);
  }

  return [
    { category: 'Mobily', provider: 'Mobily', journeys: mobily },
    {
      category: 'OpenAccess',
      subcategories: [
        { provider: 'DOWIYAT', journeys: oa.DOWIYAT },
        { provider: 'STC', journeys: oa.STC },
        { provider: 'ITC', journeys: oa.ITC },
        { provider: 'ACES', journeys: oa.ACES },
        ...(oaShared.length ? [{ provider: 'Shared', journeys: oaShared }] : []),
      ],
    },
  ];
}

module.exports = {
  JOURNEY_REGISTRY,
  JOURNEYS,
  getJourneyStepLabels,
  listJourneys,
  listJourneyTree,
};




