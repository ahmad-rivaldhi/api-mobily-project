/**
 * Polling-based ID extractors. Each one waits for an asynchronous Telflow
 * artefact to materialise (B2B response, order detail enrichment) and writes
 * the discovered ID into `vars` so downstream notification steps can use it
 * via `{{varName}}` placeholders.
 */

const { log, delay } = require('./runtime');
const { httpRequest } = require('./http');
const { buildB2bUrl, buildOrderDetailUrl } = require('./url-builder');
const { deepFindCharacteristic } = require('./json-utils');
const { isOdbPatchAlreadyCompleted } = require('./b2b');
const { findSvReferenceInOrderData } = require('./state');

async function doExtractServiceOrderId(vars, maxAttempts = 8, intervalMs = 15000) {
  log('BRIDGE', 'Polling for Create Service Order Response...');
  const url = buildB2bUrl(vars);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await httpRequest('GET', url, { Authorization: `Bearer ${vars.authToken}` });
      const rows = res.body?.data?.Rows || [];
      for (const msg of rows) {
        if (msg.Action === 'Create Service Order Response') {
          try {
            const d = JSON.parse(msg.Message.Data);
            if (d.id) {
              vars.serviceOrderId = d.id;
              log('BRIDGE', `serviceOrderId: ${d.id}`);
              return;
            }
          } catch {
            /* skip malformed row */
          }
        }
      }
    } catch (e) {
      log('WARN', `Poll error: ${e.message}`);
    }

    if (attempt < maxAttempts) {
      log('BRIDGE', `Attempt ${attempt}/${maxAttempts} - not ready, waiting ${intervalMs / 1000}s...`);
      await delay(intervalMs);
    }
  }
  throw new Error('Timed out waiting for Create Service Order Response');
}

async function doExtractSvActionId(vars, maxAttempts = 8, intervalMs = 15000) {
  log('BRIDGE', 'Extracting svActionId (CustomerReference) from order detail...');
  const url = buildOrderDetailUrl(vars);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await httpRequest('GET', url, { Authorization: `Bearer ${vars.authToken}` });
      const data = res.body?.data;
      if (data) {
        const ref = findSvReferenceInOrderData(data);
        if (ref) {
          vars.svActionId = ref;
          log('BRIDGE', `svActionId: ${ref}`);
          return;
        }
      }
    } catch (e) {
      log('WARN', `Extract svActionId error: ${e.message}`);
    }

    if (attempt < maxAttempts) {
      log(
        'BRIDGE',
        `Attempt ${attempt}/${maxAttempts} - svActionId not found, waiting ${intervalMs / 1000}s...`,
      );
      await delay(intervalMs);
    }
  }
  log(
    'WARN',
    'Could not extract svActionId from order detail - you may need to set it manually via Toolkit',
  );
}

async function doExtractWorkOrderIds(vars, opts = {}, maxAttempts = 6, intervalMs = 10000) {
  log('BRIDGE', 'Extracting workOrderIds from order detail...');
  const url = buildOrderDetailUrl(vars);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await httpRequest('GET', url, { Authorization: `Bearer ${vars.authToken}` });
      const data = res.body?.data;

      if (data) {
        const cpeWoId = deepFindCharacteristic(data, 'cpeWorkOrderId');
        if (cpeWoId) {
          vars.workOrderIdCpe = cpeWoId;
          log('BRIDGE', `workOrderIdCpe: ${cpeWoId}`);

          if ((opts.me || 0) > 0) {
            const meWoId = deepFindCharacteristic(data, 'meshWorkOrderId');
            if (meWoId) {
              vars.workOrderIdMe = meWoId;
              log('BRIDGE', `workOrderIdMe: ${meWoId}`);
            }
          }
          return;
        }
      }
    } catch (e) {
      log('WARN', `Order detail error: ${e.message}`);
    }

    if (attempt < maxAttempts) {
      log(
        'BRIDGE',
        `Attempt ${attempt}/${maxAttempts} - workOrderId not available yet, waiting ${intervalMs / 1000}s...`,
      );
      await delay(intervalMs);
    }
  }
  throw new Error('Could not extract cpeWorkOrderId from order detail');
}

async function doExtractOdbPatchActionId(vars, maxAttempts = 8, intervalMs = 15000) {
  log('BRIDGE', 'Polling for ODB Patching Action Response...');
  const url = buildB2bUrl(vars);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await httpRequest('GET', url, { Authorization: `Bearer ${vars.authToken}` });
      const rows = res.body?.data?.Rows || [];

      for (const msg of rows) {
        if (msg.Action === 'ODB Patching Action Response') {
          try {
            const d = JSON.parse(msg.Message.Data);
            if (d.id) {
              vars.odbPatchActionId = d.id;
              log('BRIDGE', `odbPatchActionId: ${d.id}`);
              return;
            }
          } catch {
            /* skip malformed row */
          }
        }
        if (isOdbPatchAlreadyCompleted(msg)) {
          log(
            'BRIDGE',
            'ODB Patching already completed (Create ODB Patch Action Notification found) — skipping extract',
          );
          return;
        }
      }
    } catch (e) {
      log('WARN', `Poll error: ${e.message}`);
    }

    if (attempt < maxAttempts) {
      log(
        'BRIDGE',
        `Attempt ${attempt}/${maxAttempts} - ODB Patching not ready, waiting ${intervalMs / 1000}s...`,
      );
      await delay(intervalMs);
    }
  }
  throw new Error('Timed out waiting for ODB Patching Action Response');
}

module.exports = {
  doExtractServiceOrderId,
  doExtractSvActionId,
  doExtractWorkOrderIds,
  doExtractOdbPatchActionId,
};
