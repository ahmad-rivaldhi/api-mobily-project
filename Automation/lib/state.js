/**
 * Order-state helpers: pull current sub-state / inventory / SV reference out
 * of the order detail response, and wait for an order to reach a target
 * state by polling B2B "State Change" rows + portal detail.
 */

const { log, delay } = require('./runtime');
const { httpRequest } = require('./http');
const { buildB2bUrl, buildOrderDetailUrl } = require('./url-builder');
const {
  PROVISIONING_COMPLETED_BRU,
  UAT_COMPLETED_BRU,
  getLatestB2BProductOrderState,
} = require('./b2b');
const { doNotification } = require('./notifications');

/**
 * Extract the current order sub-state from a portal order-detail payload.
 * Telflow returns PascalCase keys but a few legacy paths use camelCase, so
 * we try every known shape before falling back to a regex on the JSON dump.
 */
function extractSubState(data) {
  if (!data) return null;

  if (data.InteractionSubState) return data.InteractionSubState;
  if (data.interactionSubState) return data.interactionSubState;

  const topItems = data.VersionItems || data.versionItems;
  if (Array.isArray(topItems)) {
    for (const item of topItems) {
      if (item.Category === 'Status' && item.Name === 'SubState') {
        return item.Value || null;
      }
    }
  }

  const versionKeys = [
    'businessInteractionVersion',
    'BusinessInteractionVersion',
    'businessInteractionVersions',
    'BusinessInteractionVersions',
  ];
  for (const key of versionKeys) {
    let versions = data[key];
    if (!versions) continue;
    if (!Array.isArray(versions)) versions = [versions];
    for (const ver of versions) {
      if (ver.InteractionSubState) return ver.InteractionSubState;
      if (ver.interactionSubState) return ver.interactionSubState;
      const vi = ver.VersionItems || ver.versionItems;
      if (Array.isArray(vi)) {
        for (const item of vi) {
          if (item.Category === 'Status' && item.Name === 'SubState') {
            return item.Value || null;
          }
        }
      }
    }
  }

  const jsonStr = JSON.stringify(data);
  const m = jsonStr.match(/"Name"\s*:\s*"SubState"[^}]*"Value"\s*:\s*"([^"]+)"/);
  if (m) return m[1];
  const m2 = jsonStr.match(/"Value"\s*:\s*"([^"]+)"[^}]*"Name"\s*:\s*"SubState"/);
  if (m2) return m2[1];
  const m3 = jsonStr.match(/"[Ii]nteraction[Ss]ub[Ss]tate"\s*:\s*"([^"]+)"/);
  if (m3) return m3[1];

  return null;
}

/** Extract inventory entity ID (e.g. `FTTH123`) from order detail. */
function extractInventoryId(data) {
  if (!data) return null;

  const inv = data.inventory || data.Inventory;
  if (Array.isArray(inv)) {
    for (const item of inv) {
      if (item.ID || item.id) return item.ID || item.id;
    }
  }

  const items = data.businessInteractionItems || data.BusinessInteractionItems || [];
  if (Array.isArray(items)) {
    for (const item of items) {
      const entities = item.itemInvolvesInventoryEntities || item.ItemInvolvesInventoryEntities || [];
      if (Array.isArray(entities)) {
        for (const ent of entities) {
          if (ent.ID || ent.id) return ent.ID || ent.id;
        }
      }
    }
  }

  const jsonStr = JSON.stringify(data);
  const match = jsonStr.match(/"(?:ID|id)"\s*:\s*"(FTTH\d+)"/);
  if (match) return match[1];

  return null;
}

/**
 * Find the SingleView reference (e.g. `MOB-FTTH-01`) inside an order detail
 * payload. Primary source is `CustomerReference`; falls back to
 * `externalReferences[].Name`, ignoring numeric DB IDs.
 */
function findSvReferenceInOrderData(data) {
  if (!data || typeof data !== 'object') return null;

  if (data.CustomerReference) return String(data.CustomerReference);
  if (data.customerReference) return String(data.customerReference);

  const refs = data.externalReferences || data.ExternalReferences;
  if (Array.isArray(refs) && refs.length > 0) {
    log('DEBUG', `externalReferences (${refs.length}): ${JSON.stringify(refs).slice(0, 600)}`);
    for (const r of refs) {
      const name =
        r.Name ||
        r.name ||
        r.ExternalReferenceType ||
        r.externalReferenceType ||
        r.ReferenceValue ||
        r.referenceValue;
      if (name && !/^\d+$/.test(String(name))) return String(name);
    }
  }

  if (data.Reference) return data.Reference;
  if (data.reference) return data.reference;
  return null;
}

/**
 * SingleView's `externalId` must be the CustomerReference (e.g.
 * `MOB-FTTH-01`), never a numeric DB row ID. Using a number silently sends
 * the wrong action to SingleView, hence the explicit guard.
 */
function isNumericDbSvActionId(val) {
  if (val == null || val === '') return false;
  return /^\d+$/.test(String(val).trim());
}

/**
 * `true` when we're waiting for "Pending UAT" but the portal is still at
 * "Provisioning Completed" — the SV Provisioning-Completed call probably
 * never landed, so the wait loop will replay it once.
 */
function needsProvisioningNotifyBeforePendingUat(subState, specificTarget) {
  if (specificTarget !== 'Pending UAT') return false;
  if (!subState) return false;
  const s = String(subState).trim();
  if (s.includes('Pending UAT')) return false;
  return s === 'Provisioning Completed' || s.includes('Provisioning Completed');
}

/**
 * `true` when we're waiting for Pre-Completion but the portal is still at
 * UAT Completed — replay `UAT-Completed.bru` once (often sent before the
 * SingleView CPE Installation Pending UAT action was ready in B2B).
 */
function needsUatNotifyBeforePreCompletion(subState, specificTarget) {
  if (specificTarget !== 'Pre-Completion') return false;
  if (!subState) return false;
  const s = String(subState).trim();
  if (s.includes('Pre-Completion')) return false;
  return s === 'UAT Completed' || s.includes('UAT Completed');
}

async function doWaitForOrderState(vars, targetState, maxAttempts = 20, intervalMs = 15000) {
  const targetParts = targetState.split('|').map((s) => s.trim());
  const specificTarget = targetParts[targetParts.length - 1];
  log('STATE', `Waiting for state: ${specificTarget}...`);

  let autoProvisioningNotifyAttempted = false;
  let autoUatNotifyAttempted = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let b2bFound = false;
    try {
      const b2bRes = await httpRequest('GET', buildB2bUrl(vars), {
        Authorization: `Bearer ${vars.authToken}`,
      });
      const rows = b2bRes.body?.data?.Rows || [];
      for (const msg of rows) {
        const action = msg.Action || '';
        if (!action.includes('State Change')) continue;
        try {
          const payload = JSON.parse(msg.Message?.Data || '{}');
          const stateStr = payload?.event?.productOrder?.state || payload?.state || '';
          if (stateStr && stateStr.includes(specificTarget)) {
            log('STATE', `B2B notification matched: "${stateStr}"`);
            b2bFound = true;
            break;
          }
        } catch {
          /* skip malformed B2B row */
        }
      }
    } catch (e) {
      log('WARN', `B2B poll error: ${e.message}`);
    }
    if (b2bFound) return;

    let subState = null;
    try {
      const detailRes = await httpRequest('GET', buildOrderDetailUrl(vars), {
        Authorization: `Bearer ${vars.authToken}`,
      });
      const data = detailRes.body?.data || detailRes.body;
      subState = extractSubState(data);
      if (subState && targetParts.includes(subState)) {
        log('STATE', `Order detail matched: "${subState}"`);
        return;
      }
    } catch (e) {
      log('WARN', `Order detail error: ${e.message}`);
    }

    if (
      needsProvisioningNotifyBeforePendingUat(subState, specificTarget) &&
      !vars._svProvisioningCompletedOk &&
      !autoProvisioningNotifyAttempted
    ) {
      autoProvisioningNotifyAttempted = true;
      log(
        'BRIDGE',
        'Order is still at Provisioning Completed — sending SV Provisioning-Completed (required before Pending UAT)',
      );
      const res = await doNotification(vars, PROVISIONING_COMPLETED_BRU);
      if (!res.ok) {
        throw new Error(
          `SV Provisioning-Completed failed (${res.status}) while waiting for Pending UAT. ` +
            `Fix svActionId / auth or send manually. Body: ${JSON.stringify(res.body).slice(0, 300)}`,
        );
      }
      await delay(3000);
      continue;
    }

    if (
      needsUatNotifyBeforePreCompletion(subState, specificTarget) &&
      !autoUatNotifyAttempted
    ) {
      autoUatNotifyAttempted = true;
      log(
        'BRIDGE',
        'Order is still at UAT Completed — replaying SV UAT-Completed (required before Pre-Completion)',
      );
      const res = await doNotification(vars, UAT_COMPLETED_BRU);
      if (!res.ok) {
        throw new Error(
          `SV UAT-Completed failed (${res.status}) while waiting for Pre-Completion. ` +
            `Fix svActionId / auth or send manually. Body: ${JSON.stringify(res.body).slice(0, 300)}`,
        );
      }
      vars._svUatCompletedOk = true;
      await delay(3000);
      continue;
    }

    log(
      'STATE',
      `Attempt ${attempt}/${maxAttempts} — detail: "${subState || 'N/A'}", B2B: no match yet, target: ${specificTarget} (${intervalMs / 1000}s)...`,
    );

    if (attempt < maxAttempts) await delay(intervalMs);
  }
  throw new Error(`Timed out waiting for state: ${specificTarget}`);
}

/** Toolkit: combined portal+B2B order state snapshot used by the dashboard. */
async function doCheckState(vars) {
  const detailUrl = buildOrderDetailUrl(vars);
  const res = await httpRequest('GET', detailUrl, { Authorization: `Bearer ${vars.authToken}` });
  const data = res.body?.data || res.body;

  const orderDetailState = extractSubState(data);
  let b2bState = null;
  try {
    b2bState = await getLatestB2BProductOrderState(vars);
  } catch {
    /* portal state alone is still useful */
  }

  const inventoryId = extractInventoryId(data);
  const refFromDetail = findSvReferenceInOrderData(data);
  let svActionId = refFromDetail || null;
  if (!svActionId && vars.svActionId && !isNumericDbSvActionId(vars.svActionId)) {
    svActionId = vars.svActionId;
  }
  if (svActionId) vars.svActionId = svActionId;
  else delete vars.svActionId;

  const state = orderDetailState || b2bState || null;

  return {
    state,
    orderDetailState: orderDetailState || null,
    b2bState: b2bState || null,
    svActionId,
    inventoryId,
  };
}

module.exports = {
  extractSubState,
  extractInventoryId,
  findSvReferenceInOrderData,
  isNumericDbSvActionId,
  needsProvisioningNotifyBeforePendingUat,
  needsUatNotifyBeforePreCompletion,
  doWaitForOrderState,
  doCheckState,
};
