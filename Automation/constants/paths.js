/**
 * Bruno request paths — single source of truth for collection layout.
 * Provider × Journey + Shared workflows (see project README).
 */

const ROOT = Object.freeze({
  auth: 'Authentication',
  mobily: 'Mobily',
  openAccess: 'OpenAccess',
  shared: 'Shared-Workflows',
  search: 'Search-By-SAN-CPE',
});

const JOURNEY = Object.freeze({
  activation: 'Activation',
  relocation: 'Relocation',
  deviceSwap: 'Device-Swap',
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  suspend: 'Suspend',
  resume: 'Resume',
  termination: 'Termination',
  rewiring: 'Rewiring',
  maintenance: 'Maintenance',
  requestUpdate: 'Request-Update',
  installationFailure: 'Installation-Failure',
  meshExtender: 'ME-Standalone',
  cancelOrder: 'Cancel-Order',
});

const AUTH = Object.freeze({
  dev1: `${ROOT.auth}/Auth-Dev-1.bru`,
  dev2: `${ROOT.auth}/Auth-Dev-2.bru`,
  dev3: `${ROOT.auth}/Auth-Dev-3.bru`,
  devOnPrem: `${ROOT.auth}/Auth-Dev-On-Prem.bru`,
  sit: `${ROOT.auth}/Auth-SIT.bru`,
});

const SHARED = Object.freeze({
  wfmCpePhase1: `${ROOT.shared}/WFM-CPE/Phase-1`,
  wfmCpePhase2: `${ROOT.shared}/WFM-CPE/Phase-2`,
  wfmMe: `${ROOT.shared}/WFM-ME`,
  tmf641: `${ROOT.shared}/TMF641-Notifications`,
  singleView: `${ROOT.shared}/SingleView-Integration`,
  createServiceOa: `${ROOT.shared}/Create-Service-Order-OA`,
});

function join(...parts) {
  return parts.filter(Boolean).join('/');
}

function mobilyJourneyDir(journey) {
  return join(ROOT.mobily, journey);
}

function mobilyJourneyFile(journey, file) {
  return join(mobilyJourneyDir(journey), file);
}

function oaProviderDir(provider) {
  return join(ROOT.openAccess, provider);
}

function oaJourneyDir(provider, journey) {
  return join(oaProviderDir(provider), journey);
}

function oaJourneyFile(provider, journey, file) {
  return join(oaJourneyDir(provider, journey), file);
}

function oaActivationPath(provider, ...subpath) {
  return join(oaJourneyDir(provider, JOURNEY.activation), ...subpath);
}

function sharedWorkflowFile(...subpath) {
  return join(ROOT.shared, ...subpath);
}

/** @deprecated ME is encoded in the filename; kept for transitional callers. */
function meDirName(meCount) {
  const n = Number(meCount) || 0;
  if (n <= 0) return 'without ME';
  return `with ${n} ME`;
}

function meFileSuffix(meCount) {
  const me = Number(meCount) || 0;
  return me > 0 ? `-${me}-ME` : '';
}

/**
 * Mobily TMF622 create path. `paymentType` is ignored (prepaid/postpaid no
 * longer split the collection); kept in the signature for caller compat.
 */
function mobilyCreateOrderPath(customerType, _paymentType, meCount) {
  const base = join(mobilyJourneyDir(JOURNEY.activation), '622-Create-Sales-Order');
  const suffix = meFileSuffix(meCount);
  if (customerType === 'Royal-Customer') {
    return join(base, 'FTTH-RCY', `MOB-FTTH-RCY${suffix}.bru`);
  }
  return join(base, 'FTTH-Consumer', `MOB-FTTH-Consumer${suffix}.bru`);
}

function openAccessCreateOrderPath(provider, meCount) {
  const suffix = meFileSuffix(meCount);
  return join(
    oaActivationPath(provider, '622-Create-Sales-Order'),
    `${provider}-FTTH${suffix}.bru`,
  );
}

function wfmCpeStepFile(stepSlug) {
  return join(SHARED.wfmCpePhase1, `${stepSlug}.bru`);
}

const WFM_CPE_SEQUENCE = Object.freeze([
  'Step-01-CPE-1000-OK',
  'Step-02-CPE-Ready',
  'Step-03-CPE-Acknowledged',
  'Step-04-CPE-Accepted',
  'Step-05-CPE-Trip-Started',
  'Step-06-CPE-Customer-Premises',
  'Step-07-CPE-In-Work',
  'Step-08-CPE-Installation-Completed',
]);

function wfmCpeStepPaths() {
  return WFM_CPE_SEQUENCE.map(wfmCpeStepFile);
}

const WFM_STEP_09_CPE_COMPLETED = join(SHARED.wfmCpePhase2, 'Step-09-CPE-Completed.bru');
const WFM_STEP_09_CPE_UAT_COMPLETED = join(SHARED.wfmCpePhase2, 'Step-09-CPE-UAT-Completed.bru');

const WFM_ME_STEPS = Object.freeze([
  join(SHARED.wfmMe, 'Step-01-ME-1000-OK.bru'),
  join(SHARED.wfmMe, 'Step-02-ME-Ready.bru'),
  join(SHARED.wfmMe, 'Step-03-ME-Acknowledged.bru'),
  join(SHARED.wfmMe, 'Step-04-ME-Accepted.bru'),
  join(SHARED.wfmMe, 'Step-05-ME-Trip-Started.bru'),
  join(SHARED.wfmMe, 'Step-06-ME-Customer-Premises.bru'),
  join(SHARED.wfmMe, 'Step-07-ME-In-Work.bru'),
]);

function wfmMeInstallationStep(meCount) {
  return join(SHARED.wfmMe, `Step-08-ME-Installation-Completed-${meCount}-ME.bru`);
}

function wfmMeUatCompletedStep() {
  return join(SHARED.wfmMe, 'Step-09-ME-UAT-Completed.bru');
}

const TMF641 = Object.freeze({
  serviceOrderCompleted: join(SHARED.tmf641, 'TMF641-Service-Order-Completed.bru'),
  ceaseTermination: join(SHARED.tmf641, 'TMF641-Cease-Termination.bru'),
});

const SINGLEVIEW = Object.freeze({
  provisioningCompleted: join(SHARED.singleView, 'Order-Completion/SV-Provisioning-Completed.bru'),
  uatCompleted: join(SHARED.singleView, 'Order-Completion/SV-UAT-Completed.bru'),
  preCompletion: join(SHARED.singleView, 'Order-Completion/SV-Pre-Completion.bru'),
  odbPatch: join(SHARED.singleView, 'Custom-Notifications/SV-ODB-Patch-Notification.bru'),
});

/**
 * Activity-validation expectation files (JS modules, not Bruno requests).
 * Directory is relative to the `Automation/` root; see `validation/index.js`.
 */
const VALIDATION = Object.freeze({
  expectationsDir: 'validation/expectations',
});

function createServiceOaFile(provider) {
  return join(SHARED.createServiceOa, `Create-Service-OA-${provider}.bru`);
}

function mobilyFailureFile(failureCode) {
  return mobilyJourneyFile(JOURNEY.installationFailure, `${failureCode}.bru`);
}

function oaFailureFile(provider, failureCode) {
  return oaJourneyFile(provider, JOURNEY.installationFailure, `${failureCode}.bru`);
}

function mobilyMaintenanceCreateFile() {
  return mobilyJourneyFile(JOURNEY.maintenance, 'MOB-Maintenance-Order.bru');
}

function oaMaintenanceCreateFile(provider) {
  return oaJourneyFile(provider, JOURNEY.maintenance, `${provider}-Maintenance-Order.bru`);
}

function oaRequestFile(provider, journey, filename) {
  return oaJourneyFile(provider, journey, filename);
}

/** @deprecated use ROOT / JOURNEY / SHARED — kept for transitional imports */
const ACTIVATION = Object.freeze({
  orderRoot: mobilyJourneyDir(JOURNEY.activation),
  wfmcpeSteps018: SHARED.wfmCpePhase1,
  wfmcpeStep09: SHARED.wfmCpePhase2,
  mobilyTmf622Root: join(mobilyJourneyDir(JOURNEY.activation), '622-Create-Sales-Order'),
  openAccessRoot: ROOT.openAccess,
});

module.exports = {
  ROOT,
  JOURNEY,
  AUTH,
  SHARED,
  TMF641,
  SINGLEVIEW,
  VALIDATION,
  ACTIVATION,
  join,
  mobilyJourneyDir,
  mobilyJourneyFile,
  oaProviderDir,
  oaJourneyDir,
  oaJourneyFile,
  oaActivationPath,
  sharedWorkflowFile,
  meDirName,
  mobilyCreateOrderPath,
  openAccessCreateOrderPath,
  wfmCpeStepFile,
  WFM_CPE_SEQUENCE,
  wfmCpeStepPaths,
  WFM_STEP_09_CPE_COMPLETED,
  WFM_STEP_09_CPE_UAT_COMPLETED,
  WFM_ME_STEPS,
  wfmMeInstallationStep,
  wfmMeUatCompletedStep,
  createServiceOaFile,
  mobilyFailureFile,
  oaFailureFile,
  mobilyMaintenanceCreateFile,
  oaMaintenanceCreateFile,
  oaRequestFile,
};
