/**
 * Journey registry: every supported provider × journey-type combination.
 *
 * Adding a new provider/journey only requires inserting an entry here — the
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
          { value: 'Regular-Customer', label: 'Regular (FTTH CONSUMER)' },
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
    build: (opts) =>
      buildFailureJourney(`Shared-Workflows/Installation-Failure-Scenarios/Mobily/${opts.failureCode}.bru`),
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
      buildMobilyFieldWork('03-Relocation/01-Create-Relocation-Order-TMF622/Relocation Mobily.bru', opts),
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
      buildMobilyFieldWork('04-Device-Swap/01-Create-Swap-Order-TMF622/Device Swap - CPE - Mobily.bru', opts),
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
      buildMobilyFieldWork('04-Device-Swap/01-Create-Swap-Order-TMF622/Device Swap - HAG - Mobily.bru', opts),
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
      buildMobilyFieldWork('08-Rewiring/01-Create-Rewiring-Order-TMF622/Rewiring Mobily.bru', opts),
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
      buildSimpleOrder('05-Upgrade-Downgrade/01-Upgrade-Order-TMF622/Upgrade - Bandwith Only - Mobily.bru', opts),
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
      buildSimpleOrder('05-Upgrade-Downgrade/02-Downgrade-Order-TMF622/Downgrade - Bandwith Only - Mobily.bru', opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { Completed: 3 },
  },
  'mobily-suspend': {
    label: 'Suspend',
    provider: 'Mobily',
    providerCategory: 'mobily',
    journeyType: 'suspend',
    options: [],
    build: (opts) => buildSimpleOrder('06-Suspend-Resume/01-Suspend-Order-TMF622/Suspends Mobily.bru', opts),
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
      buildSimpleOrder('07-Termination/01-Termination-Order-TMF622/Termination - Mobily.bru', {
        ...opts,
        _tmf641File: 'Shared-Workflows/TMF641-Notifications/641 Cease - Termination.bru',
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
    build: () =>
      buildMaintenanceOrder('09-Maintenance/01-Create-Maintenance-Order-TMF622/Maintenance Order - Mobily.bru'),
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
    build: (opts) =>
      buildFailureJourney(
        `Shared-Workflows/Installation-Failure-Scenarios/OpenAccess/DOWIYAT - Installation Failure Notification/${opts.failureCode}.bru`,
      ),
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
      buildOAFieldWork('03-Relocation/01-Create-Relocation-Order-TMF622/Relocation Dowiyat.bru', opts),
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
      buildOAFieldWork('04-Device-Swap/01-Create-Swap-Order-TMF622/Device Swap - ONT - DOWIYAT.bru', opts),
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
      buildOAFieldWork('08-Rewiring/01-Create-Rewiring-Order-TMF622/Rewiring Dowiyat.bru', opts),
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
        '06-Suspend-Resume/01-Suspend-Order-TMF622/622 - Suspends Dowiyat.bru',
        '06-Suspend-Resume/02-Create-Service-Order-OA/Create Service Order OA - Dowiyat.bru',
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
    build: (opts) => buildSimpleOrder('06-Suspend-Resume/03-Resume-Order-TMF622/622 - Resume Dowiyat.bru', opts),
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
      buildSimpleOrder('07-Termination/01-Termination-Order-TMF622/Termination - DOWIYAT.bru', {
        ...opts,
        _tmf641File: 'Shared-Workflows/TMF641-Notifications/641 Cease - Termination.bru',
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
    build: () =>
      buildMaintenanceOrder('09-Maintenance/01-Create-Maintenance-Order-TMF622/Maintenance Order - DOWIYAT.bru'),
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
    build: (opts) =>
      buildFailureJourney(
        `Shared-Workflows/Installation-Failure-Scenarios/OpenAccess/STC - Installation Failure Notification/${opts.failureCode}.bru`,
      ),
    stepLabels: FAILURE_LABELS,
    stateMap: {},
  },
  'stc-relocation': {
    label: 'Relocation',
    provider: 'STC',
    providerCategory: 'openaccess',
    journeyType: 'relocation',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork('03-Relocation/01-Create-Relocation-Order-TMF622/Relocation STC.bru', opts),
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
      buildOAFieldWork('04-Device-Swap/01-Create-Swap-Order-TMF622/Device Swap - ONT - STC.bru', opts),
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
        '06-Suspend-Resume/01-Suspend-Order-TMF622/622 - Suspends STC.bru',
        '06-Suspend-Resume/02-Create-Service-Order-OA/Create Service Order OA - STC.bru',
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
    build: (opts) => buildSimpleOrder('06-Suspend-Resume/03-Resume-Order-TMF622/622 - Resume STC.bru', opts),
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
      buildSimpleOrder('07-Termination/01-Termination-Order-TMF622/Termination - STC.bru', {
        ...opts,
        _tmf641File: 'Shared-Workflows/TMF641-Notifications/641 Cease - Termination.bru',
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
    build: () =>
      buildMaintenanceOrder('09-Maintenance/01-Create-Maintenance-Order-TMF622/Maintenance Order - STC.bru'),
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
    build: (opts) =>
      buildFailureJourney(
        `Shared-Workflows/Installation-Failure-Scenarios/OpenAccess/ITC - Installation Failure Notification/${opts.failureCode}.bru`,
      ),
    stepLabels: FAILURE_LABELS,
    stateMap: {},
  },
  'itc-relocation': {
    label: 'Relocation',
    provider: 'ITC',
    providerCategory: 'openaccess',
    journeyType: 'relocation',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork('03-Relocation/01-Create-Relocation-Order-TMF622/Relocation ITC.bru', opts),
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
      buildOAFieldWork('04-Device-Swap/01-Create-Swap-Order-TMF622/Device Swap - ONT - ITC.bru', opts),
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
        '06-Suspend-Resume/01-Suspend-Order-TMF622/622 - Suspends ITC.bru',
        '06-Suspend-Resume/02-Create-Service-Order-OA/Create Service Order OA - ITC.bru',
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
    build: (opts) => buildSimpleOrder('06-Suspend-Resume/03-Resume-Order-TMF622/622 - Resume ITC.bru', opts),
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
      buildSimpleOrder('07-Termination/01-Termination-Order-TMF622/Termination - ITC.bru', {
        ...opts,
        _tmf641File: 'Shared-Workflows/TMF641-Notifications/641 Cease - Termination.bru',
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
    build: () =>
      buildMaintenanceOrder('09-Maintenance/01-Create-Maintenance-Order-TMF622/Maintenance Order - ITC.bru'),
    stepLabels: MAINTENANCE_LABELS,
    stateMap: {},
  },

  // ===== ACES (OpenAccess — Phase 4B) ======================================
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
      buildSimpleOrder('05-Upgrade-Downgrade/02-Downgrade-Order-TMF622/Downgrade - Bandwith Only - OA.bru', opts),
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
