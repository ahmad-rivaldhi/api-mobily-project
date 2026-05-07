/**
 * One-shot snapshot of every ID we know how to find on an order, used by
 * the toolkit's "Detect" panel. No retries: if something isn't there yet,
 * the response simply lacks that key and the UI shows N/A.
 *
 * Sits at the runner layer because it composes lib/ extractors with
 * provider-specific knowledge (OA spec) — keeps both layers dependency-free
 * of each other.
 */

const { log } = require('../lib/runtime');
const { httpRequest } = require('../lib/http');
const { buildB2bUrl, buildOrderDetailUrl } = require('../lib/url-builder');
const { deepFindCharacteristic } = require('../lib/json-utils');
const {
  parseB2bMessageData,
  actionMatchesProviderKind,
  extractExternalIdFromB2bPayload,
  isOdbPatchAlreadyCompleted,
} = require('../lib/b2b');
const {
  findSvReferenceInOrderData,
  isNumericDbSvActionId,
  extractSubState,
  extractInventoryId,
} = require('../lib/state');
const { OA_PROVIDER_ID_SPECS } = require('../providers/openaccess');

async function doExtractAllIds(vars, opts = {}) {
  const out = {
    orderId: vars.orderId || null,
    serviceOrderId: vars.serviceOrderId || null,
    svActionId: vars.svActionId || null,
    workOrderIdCpe: vars.workOrderIdCpe || null,
    workOrderIdMe: vars.workOrderIdMe || null,
    odbPatchActionId: vars.odbPatchActionId || null,
    inventoryId: vars.inventoryId || null,
    stcSqId: vars.stcSqId || null,
    stcInstallationId: vars.stcInstallationId || null,
    itcInstallationId: vars.itcInstallationId || null,
    dawiyatInstallationId: vars.dawiyatInstallationId || null,
    acesInstallationId: vars.acesInstallationId || null,
    subState: null,
  };

  if (!vars.orderId || !vars.authToken) return out;

  try {
    const detailUrl = buildOrderDetailUrl(vars);
    const res = await httpRequest('GET', detailUrl, { Authorization: `Bearer ${vars.authToken}` });
    const data = res.body?.data || res.body;
    if (data) {
      const cpeWoId = deepFindCharacteristic(data, 'cpeWorkOrderId');
      if (cpeWoId) {
        vars.workOrderIdCpe = cpeWoId;
        out.workOrderIdCpe = cpeWoId;
      }
      if ((opts.me || 0) > 0) {
        const meWoId = deepFindCharacteristic(data, 'meshWorkOrderId');
        if (meWoId) {
          vars.workOrderIdMe = meWoId;
          out.workOrderIdMe = meWoId;
        }
      }
      const ref = findSvReferenceInOrderData(data);
      if (ref) {
        vars.svActionId = ref;
        out.svActionId = ref;
      } else if (isNumericDbSvActionId(out.svActionId)) {
        out.svActionId = null;
        delete vars.svActionId;
      }
      const invId = extractInventoryId(data);
      if (invId) {
        vars.inventoryId = invId;
        out.inventoryId = invId;
      }
      out.subState = extractSubState(data);
    }
  } catch (e) {
    log('WARN', `doExtractAllIds order detail: ${e.message}`);
  }

  try {
    const res = await httpRequest('GET', buildB2bUrl(vars), {
      Authorization: `Bearer ${vars.authToken}`,
    });
    const rows = res.body?.data?.Rows || [];
    for (const msg of rows) {
      const action = String(msg.Action || '');
      const payload = parseB2bMessageData(msg);

      if (msg.Action === 'Create Service Order Response') {
        try {
          const d = JSON.parse(msg.Message.Data);
          if (d.id) {
            vars.serviceOrderId = d.id;
            out.serviceOrderId = d.id;
          }
        } catch {
          /* skip malformed row */
        }
      }
      if (msg.Action === 'ODB Patching Action Response') {
        try {
          const d = JSON.parse(msg.Message.Data);
          if (d.id) {
            vars.odbPatchActionId = d.id;
            out.odbPatchActionId = d.id;
          }
        } catch {
          /* skip malformed row */
        }
      }
      if (!out.odbPatchCompleted && isOdbPatchAlreadyCompleted(msg)) {
        out.odbPatchCompleted = true;
      }

      if (payload) {
        const externalId = extractExternalIdFromB2bPayload(payload);
        if (externalId) {
          for (const [provider, spec] of Object.entries(OA_PROVIDER_ID_SPECS)) {
            for (const ext of spec.extractors) {
              if (vars[ext.key]) continue;
              if (actionMatchesProviderKind(action, provider, ext.kind)) {
                vars[ext.key] = externalId;
                out[ext.key] = externalId;
              }
            }
          }
        }
      }
    }
  } catch (e) {
    log('WARN', `doExtractAllIds B2B: ${e.message}`);
  }

  return out;
}

module.exports = {
  doExtractAllIds,
};
