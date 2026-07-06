/**
 * Notification + create-order primitives. Wraps `runBruRequest` with the
 * cross-cutting concerns shared by every step:
 *   - timestamp the payload (`eventTime` / `eventDate`)
 *   - emit a friendly `STEP` log line
 *   - remember when SV Provisioning-Completed succeeded so the wait loop
 *     doesn't replay it unnecessarily
 *
 * The SV notification dispatcher (`doTriggerSvNotification`) is also here so
 * the toolkit can fire any SV step manually by string key.
 */

const path = require('path');
const { log } = require('./runtime');
const { runBruRequest } = require('./http');
const { PROVISIONING_COMPLETED_BRU } = require('./b2b');
const { SINGLEVIEW } = require('../constants/paths');

async function doNotification(vars, bruFile) {
  vars.eventTime = new Date().toISOString();
  vars.eventDate = new Date().toISOString();
  const label = path.basename(bruFile, '.bru');
  log('STEP', label);

  const res = await runBruRequest(bruFile, vars);
  if (bruFile.includes('Provisioning-Completed.bru') && res.ok) {
    vars._svProvisioningCompletedOk = true;
  }
  if (bruFile.includes('UAT-Completed.bru') && res.ok) {
    vars._svUatCompletedOk = true;
  }
  if (!res.ok) {
    log('WARN', `${label} => ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
  }
  return res;
}

async function doCreateOrder(vars, bruFile) {
  vars.eventTime = new Date().toISOString();
  vars.eventDate = new Date().toISOString();
  const label = path.basename(bruFile, '.bru');
  log('CREATE', `Creating order: ${label}`);
  log(
    'VARS',
    `customerCategory=${vars.customerCategory || 'âˆ…'}, networkCategory=${vars.networkCategory || 'âˆ…'}`,
  );

  const res = await runBruRequest(bruFile, vars);
  if (!res.ok) {
    throw new Error(`Create order failed (${res.status}): ${JSON.stringify(res.body).slice(0, 500)}`);
  }
  if (res.body?.id) {
    vars.orderId = res.body.id;
    log('CREATE', `orderId: ${vars.orderId}`);
  } else {
    log('WARN', 'Response has no id field');
  }
  return res;
}

const SV_NOTIFICATION_BY_TYPE = {
  'provisioning-completed': PROVISIONING_COMPLETED_BRU,
  'uat-completed': SINGLEVIEW.uatCompleted,
  'pre-completion': SINGLEVIEW.preCompletion,
  'odb-patch': SINGLEVIEW.odbPatch,
};

async function doTriggerSvNotification(vars, type) {
  const file = SV_NOTIFICATION_BY_TYPE[type];
  if (!file) {
    throw new Error(
      `Unknown SV notification type "${type}". Expected: ${Object.keys(SV_NOTIFICATION_BY_TYPE).join(', ')}`,
    );
  }
  return doNotification(vars, file);
}

module.exports = {
  doNotification,
  doCreateOrder,
  SV_NOTIFICATION_BY_TYPE,
  doTriggerSvNotification,
};

