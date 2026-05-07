/**
 * Bruno request paths shared by journey builders and tooling.
 * Update here when refactoring collection folders.
 */

const AUTH = Object.freeze({
  dev1: '01-Authentication/Auth Dev 1.bru',
  dev2: '01-Authentication/Auth Dev 2.bru',
  dev3: '01-Authentication/Auth Dev 3.bru',
  devOnPrem: '01-Authentication/Auth Dev On Prem.bru',
  sit: '01-Authentication/Auth SIT.bru',
});

const ACTIVATION = Object.freeze({
  orderRoot: '02-Activation Order',

  wfmcpeSteps018: '02-Activation Order/Mobily/WFM CPE Installation - Notification/Phase 1',
  wfmcpeStep09: '02-Activation Order/Mobily/WFM CPE Installation - Notification/Phase 2',

  mobilyTmf622Root: '02-Activation Order/Mobily/TMF-622 Create Sales Order',
  openAccessRoot: '02-Activation Order/OpenAccess',
});

function meDirName(meCount) {
  const n = Number(meCount) || 0;
  if (n <= 0) return 'without ME';
  return `with ${n} ME`;
}

function mobilyCreateOrderPath(customerType, paymentType, meCount) {
  const me = Number(meCount) || 0;
  const suffix = me > 0 ? `With-${me}-ME` : 'No-ME';
  const meFolder = meDirName(me);
  const base = `${ACTIVATION.mobilyTmf622Root}`;
  if (customerType === 'Royal-Customer') {
    return `${base}/FTTH RCY/${meFolder}/FTTH-Royal-Postpaid-${suffix}.bru`;
  }
  return `${base}/FTTH Consumer/${meFolder}/FTTH-${paymentType}-${suffix}.bru`;
}

function openAccessCreateOrderPath(provider, meCount) {
  const me = Number(meCount) || 0;
  const suffix = me > 0 ? `With-${me}-ME` : 'No-ME';
  const meFolder = meDirName(me);
  const p = provider;
  return `${ACTIVATION.openAccessRoot}/${p}/TMF-622 Create Sales Order/${meFolder}/FTTH-${p}-Postpaid-${suffix}.bru`;
}

function wfmCpeStepFile(stepSlug) {
  return `${ACTIVATION.wfmcpeSteps018}/${stepSlug}.bru`;
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

const WFM_STEP_09_CPE_COMPLETED = `${ACTIVATION.wfmcpeStep09}/Step-09-CPE-Completed.bru`;
const WFM_STEP_09_CPE_UAT_COMPLETED = `${ACTIVATION.wfmcpeStep09}/Step-09-CPE-UAT-Completed.bru`;

module.exports = {
  AUTH,
  ACTIVATION,
  meDirName,
  mobilyCreateOrderPath,
  openAccessCreateOrderPath,
  wfmCpeStepFile,
  WFM_CPE_SEQUENCE,
  wfmCpeStepPaths,
  WFM_STEP_09_CPE_COMPLETED,
  WFM_STEP_09_CPE_UAT_COMPLETED,
};


