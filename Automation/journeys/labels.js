/**
 * Step-label and state-map definitions used to drive the timeline UI and
 * the "detect order position" feature.
 *
 * Mobily activation labels are exposed as a function so RCY orders can show
 * a list without the ODB-patch rows (steps 4 & 5) — see
 * `getMobilyActivationLabels`.
 */

const { isRoyalNetworkCategory, resolveNetworkCategory } = require('../providers/network-category');

const MOBILY_FIELDWORK_LABELS = [
  { num: 1, label: 'Auth' },
  { num: 2, label: 'Create Order' },
  { num: 3, label: 'Extract workOrderIdCpe' },
  { num: 4, label: 'Extract ODB Patch actionId' },
  { num: 5, label: 'ODB Patch Notification' },
  { num: 6, label: 'WFM CPE Steps 01-08' },
  { num: 7, label: 'Wait + Extract serviceOrderId' },
  { num: 8, label: 'TMF641 Completed' },
  { num: 9, label: 'Wait for Provisioning Completed' },
  { num: 10, label: 'SV Provisioning-Completed' },
  { num: 11, label: 'Wait for Pending UAT' },
  { num: 12, label: 'WFM Step 09' },
  { num: 13, label: 'Wait for SV Pending UAT action' },
  { num: 14, label: 'SV UAT-Completed' },
  { num: 15, label: 'Wait for Pre-Completion' },
  { num: 16, label: 'SV Pre-Completion' },
  { num: 17, label: 'Verify Completed' },
];

const MOBILY_FIELDWORK_LABELS_RCY = MOBILY_FIELDWORK_LABELS.filter(
  (l) => l.num !== 4 && l.num !== 5,
);

function getMobilyActivationLabels(opts) {
  if (isRoyalNetworkCategory(resolveNetworkCategory(opts || {}))) {
    return MOBILY_FIELDWORK_LABELS_RCY;
  }
  return MOBILY_FIELDWORK_LABELS;
}

const MOBILY_FIELDWORK_STATE_MAP = {
  'Pending Visit': 6,
  'In Progress': 8,
  'Provisioning Started': 9,
  'Provisioning Completed': 10,
  'Pending UAT': 12,
  'UAT Completed': 14,
  'Pre-Completion': 16,
  Completed: 17,
};

const OA_FIELDWORK_STATE_MAP = {
  'Pending Visit': 4,
  'In Progress': 6,
  'Provisioning Started': 7,
  'Provisioning Completed': 8,
  'Pending UAT': 10,
  'UAT Completed': 12,
  'Pre-Completion': 14,
  Completed: 15,
};

const OA_FIELDWORK_LABELS = [
  { num: 1, label: 'Auth' },
  { num: 2, label: 'Create Order' },
  { num: 3, label: 'Extract workOrderIdCpe' },
  { num: 4, label: 'WFM CPE Steps 01-08' },
  { num: 5, label: 'Wait + Extract serviceOrderId' },
  { num: 6, label: 'TMF641 Completed' },
  { num: 7, label: 'Wait for Provisioning Completed' },
  { num: 8, label: 'SV Provisioning-Completed' },
  { num: 9, label: 'Wait for Pending UAT' },
  { num: 10, label: 'WFM Step 09' },
  { num: 11, label: 'Wait for SV Pending UAT action' },
  { num: 12, label: 'SV UAT-Completed' },
  { num: 13, label: 'Wait for Pre-Completion' },
  { num: 14, label: 'SV Pre-Completion' },
  { num: 15, label: 'Verify Completed' },
];

/** OA Provider activation labels (provider-side flow, no WFM/UAT). */
const OA_PROVIDER_ACTIVATION_LABELS = [
  { num: 1, label: 'Auth' },
  { num: 2, label: 'Create Order' },
  { num: 3, label: 'Extract OA Provider External IDs' },
  { num: 5, label: 'Provider Activation Notifications' },
  { num: 6, label: 'Wait + Extract serviceOrderId' },
  { num: 7, label: 'TMF641 Completed' },
  { num: 8, label: 'Wait for Provisioning Completed + Extract svActionId' },
  { num: 9, label: 'SV Provisioning-Completed' },
  { num: 10, label: 'Wait for Pre-Completion' },
  { num: 11, label: 'SV Pre-Completion' },
  { num: 12, label: 'Verify Completed' },
];

const OA_PROVIDER_ACTIVATION_LABELS_STC = [
  { num: 1, label: 'Auth' },
  { num: 2, label: 'Create Order' },
  { num: 3, label: 'Extract STC SQ External ID' },
  { num: 4, label: 'STC Service Qualification Notifications' },
  { num: 5, label: 'Extract STC Installation External ID' },
  { num: 6, label: 'STC Activation Notifications' },
  { num: 7, label: 'Wait + Extract serviceOrderId' },
  { num: 8, label: 'TMF641 Completed' },
  { num: 9, label: 'Wait for Provisioning Completed + Extract svActionId' },
  { num: 10, label: 'SV Provisioning-Completed' },
  { num: 11, label: 'Wait for Pre-Completion' },
  { num: 12, label: 'SV Pre-Completion' },
  { num: 13, label: 'Verify Completed' },
];

const OA_PROVIDER_ACTIVATION_STATE_MAP = {
  'Pending Visit': 5,
  'In Progress': 7,
  'Provisioning Started': 8,
  'Provisioning Completed': 9,
  'Pre-Completion': 11,
  Completed: 12,
};

const OA_PROVIDER_ACTIVATION_STATE_MAP_STC = {
  'Pending Visit': 6,
  'In Progress': 8,
  'Provisioning Started': 9,
  'Provisioning Completed': 10,
  'Pre-Completion': 12,
  Completed: 13,
};

const SIMPLE_TMF641_LABELS = [
  { num: 1, label: 'Auth' },
  { num: 2, label: 'Create Order' },
  { num: 3, label: 'Wait + Extract serviceOrderId' },
  { num: 4, label: 'TMF641 Notification' },
  { num: 5, label: 'Wait for Completed' },
];

const SIMPLE_ORDER_LABELS = [
  { num: 1, label: 'Auth' },
  { num: 2, label: 'Create Order' },
  { num: 3, label: 'Wait for Completed' },
];

const FAILURE_LABELS = [
  { num: 1, label: 'Auth' },
  { num: 2, label: 'Send Failure Notification' },
  { num: 3, label: 'Wait for Failure State' },
];

const MAINTENANCE_LABELS = [
  { num: 1, label: 'Auth' },
  { num: 2, label: 'Create Maintenance Order' },
];

const SUSPEND_OA_LABELS = [
  { num: 1, label: 'Auth' },
  { num: 2, label: 'Create Suspend Order' },
  { num: 3, label: 'Wait + Extract serviceOrderId' },
  { num: 4, label: 'OA Service Order' },
  { num: 5, label: 'Wait for Completed' },
];

// ---------------------------------------------------------------------------
// Failure code option lists (per provider)
// ---------------------------------------------------------------------------
const MOBILY_FAILURE_CODES = [
  { value: 'MOB-IF-T1-2010-NS-No-Signal', label: 'T1 · 2010 · NS-NO SIGNAL' },
  { value: 'MOB-IF-T2-2020-CPE-STB-Swap-Failure', label: 'T2 · 2020 · CPE/STB SWAP FAILURE' },
  { value: 'MOB-IF-T3-2060-Wrong-Contact-No', label: 'T3 · 2060 · WRONG CONTACT NO.' },
  { value: 'MOB-IF-T4-2040-Customer-Not-Reachable', label: 'T4 · 2040 · CUSTOMER NOT REACHABLE' },
];

const DOWIYAT_FAILURE_CODES = [
  { value: 'DOWIYAT-IF-T1-V1-Fiber-Cut', label: 'T1 V1 · FIBER CUT' },
  { value: 'DOWIYAT-IF-T1-V2-Commercial-Area', label: 'T1 V2 · COMMERCIAL AREA' },
  { value: 'DOWIYAT-IF-T1-V3-Duplicate-Order', label: 'T1 V3 · DUPLICATE ORDER' },
  { value: 'DOWIYAT-IF-T2-Internal-Wiring', label: 'T2 · INTERNAL WIRING' },
  { value: 'DOWIYAT-IF-T3-Wrong-Customer-Contact', label: 'T3 · WRONG CUSTOMER CONTACT' },
  { value: 'DOWIYAT-IF-T4-No-HAG-Available', label: 'T4 · NO HAG AVAILABLE' },
  { value: 'DOWIYAT-IF-T5-Others', label: 'T5 · OTHERS' },
];

const STC_FAILURE_CODES = [
  { value: 'STC-IF-T1-V1-B11-OLO-Fiber-Cut', label: 'T1 V1 · B11-OLO · FIBER CUT' },
  { value: 'STC-IF-T1-V2-B15-OLO-Wrong-Plate-ID', label: 'T1 V2 · B15-OLO · WRONG PLATE ID' },
  { value: 'STC-IF-T2-B24-OLO-Internal-Wiring', label: 'T2 · B24-OLO · INTERNAL WIRING' },
  { value: 'STC-IF-T3-B23-OLO-Wrong-Contact-Number', label: 'T3 · B23-OLO · WRONG CONTACT NUMBER' },
  { value: 'STC-IF-T4-B167-OLO-No-HAG-Available', label: 'T4 · B167-OLO · NO HAG AVAILABLE' },
  { value: 'STC-IF-T5-No-Details', label: 'T5 · NO DETAILS' },
];

const ITC_FAILURE_CODES = [
  { value: 'ITC-IF-T1-V1-Fiber-Cut', label: 'T1 V1 · FIBER CUT' },
  { value: 'ITC-IF-T1-V2-Wrong-ODB', label: 'T1 V2 · WRONG ODB' },
  { value: 'ITC-IF-T2-Internal-Wiring', label: 'T2 · INTERNAL WIRING' },
  { value: 'ITC-IF-T3-Wrong-Customer-Contact', label: 'T3 · WRONG CUSTOMER CONTACT' },
  { value: 'ITC-IF-T4-No-HAG-Available', label: 'T4 · NO HAG AVAILABLE' },
];

const ACES_FAILURE_CODES = [
  { value: 'ACES-IF-T1-V1-CST005-Fiber-Cut', label: 'T1 V1 · CST005 · FIBER CUT' },
  { value: 'ACES-IF-T1-V2-CST001-Commercial-Area', label: 'T1 V2 · CST001 · COMMERCIAL AREA' },
  { value: 'ACES-IF-T2-CST002-Customer-Cancelation', label: 'T2 · CST002 · CUSTOMER CANCELATION' },
  { value: 'ACES-IF-T4-CST007-No-HAG-Available', label: 'T4 · CST007 · NO HAG AVAILABLE' },
];

module.exports = {
  MOBILY_FIELDWORK_LABELS,
  MOBILY_FIELDWORK_LABELS_RCY,
  getMobilyActivationLabels,
  MOBILY_FIELDWORK_STATE_MAP,
  OA_FIELDWORK_STATE_MAP,
  OA_FIELDWORK_LABELS,
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
  ACES_FAILURE_CODES,
};
