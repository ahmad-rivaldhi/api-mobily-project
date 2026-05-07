/**
 * B2B message helpers: parse Telflow's `/portal/api/b2b/message` rows, match
 * provider-specific actions, and pull `externalId`-like values from inside
 * the JSON `Message.Data` payload.
 *
 * The shared `PROVISIONING_COMPLETED_BRU` constant lives here because both
 * the wait-for-state logic and the resume replay use it.
 */

const { httpRequest } = require('./http');
const { buildB2bUrl } = require('./url-builder');

const PROVISIONING_COMPLETED_BRU =
  '13-Shared-Workflows/SingleView-Integration/Order-Completion/Provisioning-Completed.bru';

function parseB2bMessageData(msg) {
  const raw = msg?.Message?.Data;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw;
  return null;
}

/**
 * The canonical provider key is **DOWIYAT**; legacy B2B action strings may still
 * contain either token, so matching accepts both.
 */
function getProviderTokens(provider) {
  if (provider === 'DOWIYAT') return ['DOWIYAT', 'DAWIYAT'];
  return [provider];
}

function actionMatchesProviderKind(action, provider, kind) {
  if (!action) return false;
  const a = String(action).toUpperCase();
  const kindToken = String(kind).toUpperCase();
  if (!a.includes(kindToken)) return false;
  return getProviderTokens(provider).some((t) => a.includes(String(t).toUpperCase()));
}

/**
 * Pull an externalId out of a B2B payload, trying the well-known shapes used
 * by Telflow's Service Qualification / Service Installation events.
 */
function extractExternalIdFromB2bPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.externalId) return String(payload.externalId);
  if (payload.event?.serviceOrder?.externalId) return String(payload.event.serviceOrder.externalId);
  const soi = payload.serviceOrderItem || payload.serviceorderitem;
  if (soi && soi.externalId) return String(soi.externalId);
  if (soi && soi.id) return String(soi.id);
  return null;
}

/**
 * `true` when this row is an ODB Patching Action notification confirming that
 * the patch already completed end-to-end. Used to short-circuit the
 * extract-action poll on resume so we don't wait for an event that's gone.
 */
function isOdbPatchAlreadyCompleted(msg) {
  const action = msg.Action || '';
  if (!action.includes('ODB Patch') && !action.includes('Action Notification')) return false;
  try {
    const d = JSON.parse(msg.Message?.Data || '{}');
    const rt = d.resolutionText || d.event?.action?.resolutionText || d.action?.resolutionText || '';
    if (rt === 'ODB Patching Completed') return true;
  } catch {
    /* ignore malformed payloads */
  }
  return false;
}

/**
 * Latest `productOrder.state` from B2B "State Change" rows. Rows are
 * newest-first; first matching message for this order wins.
 */
async function getLatestB2BProductOrderState(vars) {
  const res = await httpRequest('GET', buildB2bUrl(vars), {
    Authorization: `Bearer ${vars.authToken}`,
  });
  const rows = res.body?.data?.Rows || [];
  const oid = vars.orderId ? String(vars.orderId) : '';
  for (const msg of rows) {
    const action = msg.Action || '';
    if (!action.includes('State Change')) continue;
    const raw = msg.Message?.Data;
    if (typeof raw !== 'string' || !raw) continue;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      continue;
    }
    const po = payload.event?.productOrder || payload.productOrder;
    const rowId = po?.id != null ? String(po.id) : '';
    if (oid && rowId && rowId !== oid) continue;
    const stateStr = po?.state || payload.state || '';
    if (stateStr) return String(stateStr);
  }
  return null;
}

/** Toolkit-only: list B2B messages for this order in a UI-friendly shape. */
async function doListB2b(vars) {
  const res = await httpRequest('GET', buildB2bUrl(vars), {
    Authorization: `Bearer ${vars.authToken}`,
  });
  const rows = res.body?.data?.Rows || [];
  return rows.map((msg, i) => {
    const raw = msg.Message?.Data;
    const dataPreview =
      typeof raw === 'string' ? raw.slice(0, 200) : JSON.stringify(raw ?? '').slice(0, 200);
    return {
      id: msg.Id ?? msg.id ?? i,
      date: msg.DeliveredDate ?? msg.deliveredDate ?? null,
      action: msg.Action ?? '',
      status: msg.Status ?? msg.status ?? null,
      from: msg.From ?? msg.from ?? null,
      to: msg.To ?? msg.to ?? null,
      dataPreview,
    };
  });
}

module.exports = {
  PROVISIONING_COMPLETED_BRU,
  parseB2bMessageData,
  getProviderTokens,
  actionMatchesProviderKind,
  extractExternalIdFromB2bPayload,
  isOdbPatchAlreadyCompleted,
  getLatestB2BProductOrderState,
  doListB2b,
};

