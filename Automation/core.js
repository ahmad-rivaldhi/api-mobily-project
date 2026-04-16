/**
 * Shared core for FTTH Mobily journey automation (CLI + web).
 * Call init(projectRoot, logger) to set ROOT and an optional log function.
 */

const fs = require('fs');
const path = require('path');

let ROOT = path.resolve(__dirname, '..');

function defaultLog(tag, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${String(tag).padEnd(8)}] ${msg}`);
}

let _log = defaultLog;
let _cancelCheck = null;

function setCancelCheck(fn) { _cancelCheck = typeof fn === 'function' ? fn : null; }

function log(tag, msg) {
  _log(tag, msg);
}

/** SingleView Provisioning-Completed .bru path (shared by wait + resume replay). */
const PROVISIONING_COMPLETED_BRU =
  'Shared-Workflows/SingleView-Integration/Order-Completion/Provisioning-Completed.bru';

/**
 * @param {string} projectRoot - Absolute path to repo root (parent of `environments/`, `Authentication/`, etc.)
 * @param {(tag: string, msg: string) => void} [logger] - Optional injectable logger
 */
function init(projectRoot, logger) {
  ROOT = path.resolve(projectRoot);
  _log = typeof logger === 'function' ? logger : defaultLog;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// ---------------------------------------------------------------------------
// .bru parser
// ---------------------------------------------------------------------------
function parseBruFile(filePath) {
  const abs = path.resolve(ROOT, filePath);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
  const content = fs.readFileSync(abs, 'utf-8');

  const result = { method: null, url: null, body: null, formBody: null };

  // Extract method + url block (post/get/put/patch/delete)
  // Use \n} to avoid matching }} inside template variables like {{demo-mob-dev}}
  const methodBlock = content.match(/^(post|get|put|patch|delete)\s*\{([\s\S]*?)\n\}/m);
  if (methodBlock) {
    result.method = methodBlock[1].toUpperCase();
    const urlLine = methodBlock[2].match(/url:\s*(.+)/);
    if (urlLine) result.url = urlLine[1].trim();
  }

  // Extract body:json using brace counting (handles nested objects)
  const bodyStart = content.indexOf('body:json {');
  if (bodyStart !== -1) {
    let searchFrom = bodyStart + 'body:json {'.length;
    // Find the first { of the actual JSON
    let jsonStart = content.indexOf('{', searchFrom);
    if (jsonStart !== -1) {
      let depth = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < content.length; i++) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') {
          depth--;
          if (depth === 0) { jsonEnd = i + 1; break; }
        }
      }
      if (jsonEnd > jsonStart) {
        result.body = content.slice(jsonStart, jsonEnd);
      }
    }
  }

  // Extract body:form-urlencoded – use \n} to avoid matching }} in template vars
  const formBlock = content.match(/body:form-urlencoded\s*\{([\s\S]*?)\n\}/);
  if (formBlock) {
    result.formBody = {};
    for (const line of formBlock[1].trim().split('\n')) {
      const sep = line.indexOf(':');
      if (sep > 0) {
        result.formBody[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Environment parser
// ---------------------------------------------------------------------------
function parseEnvFile(envName) {
  const envFile = path.resolve(ROOT, 'environments', `${envName}.bru`);
  if (!fs.existsSync(envFile)) {
    const available = fs.readdirSync(path.resolve(ROOT, 'environments'))
      .filter(f => f.endsWith('.bru')).map(f => f.replace('.bru', ''));
    throw new Error(`Environment "${envName}" not found. Available: ${available.join(', ')}`);
  }
  const content = fs.readFileSync(envFile, 'utf-8');
  const vars = {};
  const block = content.match(/vars\s*\{([\s\S]*)\n\}/);
  if (block) {
    for (const line of block[1].split('\n')) {
      const m = line.match(/^\s*([\w-]+):\s*(.*)/);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  return vars;
}

/** @returns {string[]} Environment names (without `.bru`) */
function listEnvironments() {
  const envDir = path.resolve(ROOT, 'environments');
  if (!fs.existsSync(envDir)) return [];
  return fs.readdirSync(envDir)
    .filter(f => f.endsWith('.bru'))
    .map(f => f.replace(/\.bru$/, ''));
}

// ---------------------------------------------------------------------------
// Variable substitution & JSON cleanup
// ---------------------------------------------------------------------------
function subVars(text, vars) {
  return text.replace(/\{\{([\w-]+)\}\}/g, (full, key) => {
    return key in vars ? vars[key] : full;
  });
}

function cleanJsonBody(raw) {
  // Remove single-line comments but NOT inside strings
  let result = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { result += ch; escape = false; continue; }
    if (ch === '\\' && inString) { result += ch; escape = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (!inString && ch === '/' && raw[i + 1] === '/') {
      // Skip to end of line
      while (i < raw.length && raw[i] !== '\n') i++;
      result += '\n';
      continue;
    }
    result += ch;
  }
  return result;
}

// ---------------------------------------------------------------------------
// HTTP request
// ---------------------------------------------------------------------------
async function httpRequest(method, url, headers, body) {
  const opts = { method, headers: { ...headers } };
  if (body) opts.body = body;
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, ok: res.ok, body: json };
}

async function runBruRequest(bruPath, vars) {
  const parsed = parseBruFile(bruPath);
  if (!parsed.method || !parsed.url) {
    throw new Error(`Cannot parse request from ${bruPath}`);
  }

  const url = subVars(parsed.url, vars);
  const headers = {};

  if (vars.authToken) {
    headers['Authorization'] = `Bearer ${vars.authToken}`;
  }

  let body = null;

  if (parsed.body) {
    headers['Content-Type'] = 'application/json';
    const substituted = subVars(parsed.body, vars);
    const unresolved = substituted.match(/\{\{[\w-]+\}\}/g);
    if (unresolved && unresolved.length) {
      const keys = [...new Set(unresolved.map((s) => s.replace(/^\{\{|\}\}$/g, '')))];
      throw new Error(`Missing variables for ${bruPath}: ${keys.join(', ')}`);
    }
    const cleaned = cleanJsonBody(substituted);
    try {
      JSON.parse(cleaned);
    } catch (e) {
      log('DEBUG', `JSON parse failed for ${bruPath}: ${e.message}`);
      log('DEBUG', `First 300 chars: ${cleaned.slice(0, 300)}`);
      throw new Error(`Invalid JSON in ${bruPath}: ${e.message}`);
    }
    body = cleaned;
  }

  log('HTTP', `${parsed.method} ${url.slice(0, 120)}`);
  if (bruPath.includes('Provisioning-Completed') || bruPath.includes('UAT-Completed') || bruPath.includes('Pre-Completion')) {
    log('HTTP', `Body: ${(body || '').slice(0, 400)}`);
  }

  if (parsed.formBody) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const pairs = {};
    for (const [k, v] of Object.entries(parsed.formBody)) {
      pairs[k] = subVars(v, vars);
    }
    body = new URLSearchParams(pairs).toString();
  }

  const httpRes = await httpRequest(parsed.method, url, headers, body);
  log('HTTP', `=> ${httpRes.status} ${httpRes.ok ? 'OK' : 'FAIL'}`);
  return httpRes;
}

// ---------------------------------------------------------------------------
// Reusable steps
// ---------------------------------------------------------------------------
async function doAuth(vars, envName) {
  log('AUTH', 'Authenticating...');

  // Find the auth file matching the env name
  const authDir = path.resolve(ROOT, 'Authentication');
  const authFiles = fs.readdirSync(authDir).filter(f => f.endsWith('.bru') && f !== 'folder.bru');
  let authFile = authFiles.find(f => f.includes(envName));
  if (!authFile) {
    // Try matching just the number part (e.g. "Dev 1" -> "1")
    const num = envName.match(/\d+/);
    if (num) authFile = authFiles.find(f => f.includes(num[0]));
  }
  if (!authFile) throw new Error(`No auth file for env "${envName}". Available: ${authFiles.join(', ')}`);

  const bruPath = `Authentication/${authFile}`;
  const parsed = parseBruFile(bruPath);
  const url = subVars(parsed.url, vars);
  const pairs = {};
  for (const [k, v] of Object.entries(parsed.formBody || {})) {
    pairs[k] = subVars(v, vars);
  }

  const res = await httpRequest('POST', url,
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    new URLSearchParams(pairs).toString()
  );

  if (!res.body?.access_token) {
    throw new Error(`Auth failed (${res.status}): ${JSON.stringify(res.body).slice(0, 300)}`);
  }
  vars.authToken = res.body.access_token;
  log('AUTH', `Token acquired (expires in ${res.body.expires_in}s)`);
}

async function doCreateOrder(vars, bruFile) {
  vars.eventTime = new Date().toISOString();
  vars.eventDate = new Date().toISOString();
  const label = path.basename(bruFile, '.bru');
  log('CREATE', `Creating order: ${label}`);

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

async function doExtractServiceOrderId(vars, maxAttempts = 8, intervalMs = 15000) {
  log('BRIDGE', 'Polling for Create Service Order Response...');
  const baseUrl = vars['demo-mob-dev'];
  const orderId = vars.orderId;
  const url = `${baseUrl}/portal/api/b2b/message?businessInteractionIds%5B%5D=${orderId}&maxRows=50&orderBy%5B%5D=%7B%22propertyName%22%3A%22DeliveredDate%22%2C%22direction%22%3A%22DESC%22%7D&startRowIndex=0`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await httpRequest('GET', url, { 'Authorization': `Bearer ${vars.authToken}` });
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
          } catch {}
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

/**
 * Extract svActionId (the SingleView Reference, e.g. 'MOB-FTTH-01')
 * from the order detail response.
 *
 * Primary source: CustomerReference field on the order root.
 * Fallback: externalReferences array (Name field, skipping numeric DB IDs).
 */
function findSvReferenceInOrderData(data) {
  if (!data || typeof data !== 'object') return null;

  if (data.CustomerReference) return String(data.CustomerReference);
  if (data.customerReference) return String(data.customerReference);

  const refs = data.externalReferences || data.ExternalReferences;
  if (Array.isArray(refs) && refs.length > 0) {
    log('DEBUG', `externalReferences (${refs.length}): ${JSON.stringify(refs).slice(0, 600)}`);
    for (const r of refs) {
      const name = r.Name || r.name || r.ExternalReferenceType || r.externalReferenceType ||
                   r.ReferenceValue || r.referenceValue;
      if (name && !/^\d+$/.test(String(name))) return String(name);
    }
  }

  if (data.Reference) return data.Reference;
  if (data.reference) return data.reference;

  return null;
}

async function doExtractSvActionId(vars, maxAttempts = 8, intervalMs = 15000) {
  log('BRIDGE', 'Extracting svActionId (CustomerReference) from order detail...');
  const url = buildOrderDetailUrl(vars);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await httpRequest('GET', url, { 'Authorization': `Bearer ${vars.authToken}` });
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
      log('BRIDGE', `Attempt ${attempt}/${maxAttempts} - svActionId not found, waiting ${intervalMs / 1000}s...`);
      await delay(intervalMs);
    }
  }
  log('WARN', 'Could not extract svActionId from order detail - you may need to set it manually via Toolkit');
}

// Deep-search a JSON object for {Value, Characteristic: {ID: charId}} pairs
function deepFindCharacteristic(obj, charId) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.Characteristic?.ID === charId && obj.Value !== undefined) return obj.Value;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        const found = deepFindCharacteristic(item, charId);
        if (found) return found;
      }
    } else if (typeof val === 'object' && val !== null) {
      const found = deepFindCharacteristic(val, charId);
      if (found) return found;
    }
  }
  return null;
}

async function doExtractWorkOrderIds(vars, opts = {}, maxAttempts = 6, intervalMs = 10000) {
  log('BRIDGE', 'Extracting workOrderIds from order detail...');
  const url = buildOrderDetailUrl(vars);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await httpRequest('GET', url, { 'Authorization': `Bearer ${vars.authToken}` });
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
      log('BRIDGE', `Attempt ${attempt}/${maxAttempts} - workOrderId not available yet, waiting ${intervalMs / 1000}s...`);
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
      const res = await httpRequest('GET', url, { 'Authorization': `Bearer ${vars.authToken}` });
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
          } catch {}
        }
        if (isOdbPatchAlreadyCompleted(msg)) {
          log('BRIDGE', 'ODB Patching already completed (Create ODB Patch Action Notification found) — skipping extract');
          return;
        }
      }
    } catch (e) {
      log('WARN', `Poll error: ${e.message}`);
    }

    if (attempt < maxAttempts) {
      log('BRIDGE', `Attempt ${attempt}/${maxAttempts} - ODB Patching not ready, waiting ${intervalMs / 1000}s...`);
      await delay(intervalMs);
    }
  }
  throw new Error('Timed out waiting for ODB Patching Action Response');
}

/**
 * Check if a B2B message indicates ODB patching was already completed
 * (the ODB Patch Notification .bru was sent and acknowledged).
 */
function isOdbPatchAlreadyCompleted(msg) {
  const action = msg.Action || '';
  if (!action.includes('ODB Patch') && !action.includes('Action Notification')) return false;
  try {
    const d = JSON.parse(msg.Message?.Data || '{}');
    const rt =
      d.resolutionText ||
      d.event?.action?.resolutionText ||
      d.action?.resolutionText ||
      '';
    if (rt === 'ODB Patching Completed') return true;
  } catch {}
  return false;
}

function buildB2bUrl(vars) {
  const baseUrl = vars['demo-mob-dev'];
  const orderId = vars.orderId;
  return `${baseUrl}/portal/api/b2b/message?businessInteractionIds%5B%5D=${orderId}&maxRows=50&orderBy%5B%5D=%7B%22propertyName%22%3A%22DeliveredDate%22%2C%22direction%22%3A%22DESC%22%7D&startRowIndex=0`;
}

function buildOrderDetailUrl(vars) {
  const baseUrl = vars['demo-mob-dev'];
  return `${baseUrl}/portal/api/order/order/${vars.orderId}?includeBusinessInteractionVersion=All&includeInventory=true&enrichElements=Specification,PartyRole,Offering,Place`;
}

/**
 * Extract the current sub-state from order detail response.
 * API returns PascalCase keys (InteractionSubState, VersionItems, etc.)
 */
function extractSubState(data) {
  if (!data) return null;

  // Direct field — PascalCase first (confirmed by debug), then camelCase
  if (data.InteractionSubState) return data.InteractionSubState;
  if (data.interactionSubState) return data.interactionSubState;

  // VersionItems at top level
  const topItems = data.VersionItems || data.versionItems;
  if (Array.isArray(topItems)) {
    for (const item of topItems) {
      if ((item.Category === 'Status') && (item.Name === 'SubState')) {
        return item.Value || null;
      }
    }
  }

  // businessInteractionVersion (singular or plural, any casing)
  const versionKeys = [
    'businessInteractionVersion', 'BusinessInteractionVersion',
    'businessInteractionVersions', 'BusinessInteractionVersions',
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
          if ((item.Category === 'Status') && (item.Name === 'SubState')) {
            return item.Value || null;
          }
        }
      }
    }
  }

  // Deep JSON fallback (case-insensitive for InteractionSubState)
  const jsonStr = JSON.stringify(data);
  const m = jsonStr.match(/"Name"\s*:\s*"SubState"[^}]*"Value"\s*:\s*"([^"]+)"/);
  if (m) return m[1];
  const m2 = jsonStr.match(/"Value"\s*:\s*"([^"]+)"[^}]*"Name"\s*:\s*"SubState"/);
  if (m2) return m2[1];
  const m3 = jsonStr.match(/"[Ii]nteraction[Ss]ub[Ss]tate"\s*:\s*"([^"]+)"/);
  if (m3) return m3[1];

  return null;
}

/**
 * Extract inventory entity ID from order detail response.
 */
function extractInventoryId(data) {
  if (!data) return null;

  // Direct inventory array on order
  const inv = data.inventory || data.Inventory;
  if (Array.isArray(inv)) {
    for (const item of inv) {
      if (item.ID || item.id) return item.ID || item.id;
    }
  }

  // itemInvolvesInventoryEntities on order items
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

  // InventoryEntity nested anywhere — fallback deep search
  const jsonStr = JSON.stringify(data);
  const match = jsonStr.match(/"(?:ID|id)"\s*:\s*"(FTTH\d+)"/);
  if (match) return match[1];

  return null;
}

/**
 * Wait for an order to reach a target state (B2B first, then portal detail).
 * If waiting for Pending UAT while detail is still Provisioning Completed, the SV
 * Provisioning-Completed call may be missing — see auto-retry branch below.
 */
function needsProvisioningNotifyBeforePendingUat(subState, specificTarget) {
  if (specificTarget !== 'Pending UAT') return false;
  if (!subState) return false;
  const s = String(subState).trim();
  if (s.includes('Pending UAT')) return false;
  return s === 'Provisioning Completed' || s.includes('Provisioning Completed');
}

async function doWaitForOrderState(vars, targetState, maxAttempts = 20, intervalMs = 15000) {
  const targetParts = targetState.split('|').map(s => s.trim());
  const specificTarget = targetParts[targetParts.length - 1];
  log('STATE', `Waiting for state: ${specificTarget}...`);

  let autoProvisioningNotifyAttempted = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let b2bFound = false;
    try {
      const b2bRes = await httpRequest('GET', buildB2bUrl(vars), { 'Authorization': `Bearer ${vars.authToken}` });
      const rows = b2bRes.body?.data?.Rows || [];
      for (const msg of rows) {
        const action = msg.Action || '';
        if (!action.includes('State Change')) continue;
        try {
          const payload = JSON.parse(msg.Message?.Data || '{}');
          const stateStr =
            payload?.event?.productOrder?.state ||
            payload?.state ||
            '';
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
      const detailRes = await httpRequest('GET', buildOrderDetailUrl(vars), { 'Authorization': `Bearer ${vars.authToken}` });
      const data = detailRes.body?.data || detailRes.body;
      subState = extractSubState(data);
      if (subState && targetParts.includes(subState)) {
        log('STATE', `Order detail matched: "${subState}"`);
        return;
      }
    } catch (e) {
      log('WARN', `Order detail error: ${e.message}`);
    }

    // Not wrapped in try/catch: failures must fail the journey (previously swallowed here).
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

    log('STATE', `Attempt ${attempt}/${maxAttempts} — detail: "${subState || 'N/A'}", B2B: no match yet, target: ${specificTarget} (${intervalMs / 1000}s)...`);

    if (attempt < maxAttempts) {
      await delay(intervalMs);
    }
  }
  throw new Error(`Timed out waiting for state: ${specificTarget}`);
}

async function doNotification(vars, bruFile) {
  vars.eventTime = new Date().toISOString();
  vars.eventDate = new Date().toISOString();
  const label = path.basename(bruFile, '.bru');
  log('STEP', label);

  const res = await runBruRequest(bruFile, vars);
  if (bruFile.includes('Provisioning-Completed.bru') && res.ok) {
    vars._svProvisioningCompletedOk = true;
  }
  if (!res.ok) {
    log('WARN', `${label} => ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// Toolkit: state, B2B listing, ID extraction, SV triggers, tasks
// ---------------------------------------------------------------------------

/**
 * Latest ProductOrder.state from B2B "State Change" rows (same source as journey waits).
 * Rows are newest-first; first matching message for this order wins.
 */
async function getLatestB2BProductOrderState(vars) {
  const res = await httpRequest('GET', buildB2bUrl(vars), { 'Authorization': `Bearer ${vars.authToken}` });
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

/** Current order state: portal detail + B2B notification string (B2B often leads portal). */
async function doCheckState(vars) {
  const detailUrl = buildOrderDetailUrl(vars);
  const res = await httpRequest('GET', detailUrl, { 'Authorization': `Bearer ${vars.authToken}` });
  const data = res.body?.data || res.body;

  const orderDetailState = extractSubState(data);
  let b2bState = null;
  try {
    b2bState = await getLatestB2BProductOrderState(vars);
  } catch {
    /* ignore B2B failures; portal state still useful */
  }

  const inventoryId = extractInventoryId(data);
  /** Order detail CustomerReference always wins over env / stale numeric IDs. */
  const refFromDetail = findSvReferenceInOrderData(data);
  let svActionId = refFromDetail || null;
  if (!svActionId && vars.svActionId && !isNumericDbSvActionId(vars.svActionId)) {
    svActionId = vars.svActionId;
  }
  if (svActionId) {
    vars.svActionId = svActionId;
  } else {
    delete vars.svActionId;
  }

  const state = orderDetailState || b2bState || null;

  return {
    state,
    orderDetailState: orderDetailState || null,
    b2bState: b2bState || null,
    svActionId,
    inventoryId,
  };
}

async function doListB2b(vars) {
  const res = await httpRequest('GET', buildB2bUrl(vars), { 'Authorization': `Bearer ${vars.authToken}` });
  const rows = res.body?.data?.Rows || [];
  return rows.map((msg, i) => {
    const raw = msg.Message?.Data;
    const dataPreview = typeof raw === 'string'
      ? raw.slice(0, 200)
      : JSON.stringify(raw ?? '').slice(0, 200);
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

/**
 * One-shot extraction of IDs from B2B messages + order detail (no retry polling).
 * @param {object} vars
 * @param {{ me?: number }} [opts]
 */
async function doExtractAllIds(vars, opts = {}) {
  const out = {
    orderId: vars.orderId || null,
    serviceOrderId: vars.serviceOrderId || null,
    svActionId: vars.svActionId || null,
    workOrderIdCpe: vars.workOrderIdCpe || null,
    workOrderIdMe: vars.workOrderIdMe || null,
    odbPatchActionId: vars.odbPatchActionId || null,
    inventoryId: vars.inventoryId || null,
    subState: null,
  };

  const baseUrl = vars['demo-mob-dev'];
  const orderId = vars.orderId;
  if (orderId && vars.authToken) {
    try {
      const detailUrl = buildOrderDetailUrl(vars);
      const res = await httpRequest('GET', detailUrl, { 'Authorization': `Bearer ${vars.authToken}` });
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
  }

  if (!vars.orderId || !vars.authToken) return out;

  try {
    const res = await httpRequest('GET', buildB2bUrl(vars), { 'Authorization': `Bearer ${vars.authToken}` });
    const rows = res.body?.data?.Rows || [];
    for (const msg of rows) {
      if (msg.Action === 'Create Service Order Response') {
        try {
          const d = JSON.parse(msg.Message.Data);
          if (d.id) {
            vars.serviceOrderId = d.id;
            out.serviceOrderId = d.id;
          }
        } catch {}
      }
      if (msg.Action === 'ODB Patching Action Response') {
        try {
          const d = JSON.parse(msg.Message.Data);
          if (d.id) {
            vars.odbPatchActionId = d.id;
            out.odbPatchActionId = d.id;
          }
        } catch {}
      }
      if (!out.odbPatchCompleted && isOdbPatchAlreadyCompleted(msg)) {
        out.odbPatchCompleted = true;
      }
    }
  } catch (e) {
    log('WARN', `doExtractAllIds B2B: ${e.message}`);
  }

  return out;
}

const SV_NOTIFICATION_BY_TYPE = {
  'provisioning-completed': PROVISIONING_COMPLETED_BRU,
  'uat-completed': 'Shared-Workflows/SingleView-Integration/Order-Completion/UAT-Completed.bru',
  'pre-completion': 'Shared-Workflows/SingleView-Integration/Order-Completion/Pre-Completion.bru',
  'odb-patch': 'Shared-Workflows/SingleView-Integration/Custom-Notifications/ODB-Patch-Notification.bru',
};

async function doTriggerSvNotification(vars, type) {
  const file = SV_NOTIFICATION_BY_TYPE[type];
  if (!file) {
    throw new Error(`Unknown SV notification type "${type}". Expected: ${Object.keys(SV_NOTIFICATION_BY_TYPE).join(', ')}`);
  }
  return doNotification(vars, file);
}

async function doListTasks(vars) {
  const baseUrl = vars['demo-mob-dev'];
  const orderId = vars.orderId;
  const url = `${baseUrl}/portal/api/v1/tasks?businessInteractionId=${encodeURIComponent(orderId)}`;
  const res = await httpRequest('GET', url, { 'Authorization': `Bearer ${vars.authToken}` });
  return res;
}

async function doCompleteTask(vars, taskId) {
  const baseUrl = vars['demo-mob-dev'];
  const url = `${baseUrl}/portal/api/v1/tasks/${encodeURIComponent(taskId)}/complete`;
  const res = await httpRequest('POST', url, {
    'Authorization': `Bearer ${vars.authToken}`,
    'Content-Type': 'application/json',
  }, '{}');
  return res;
}

// ---------------------------------------------------------------------------
// Mobily Activation Journey
// ---------------------------------------------------------------------------
// Flow (Internal Env - manual SV notifications):
//   1.  Auth
//   2.  Create Order (TMF622) -> capture orderId
//   3.  Extract workOrderIdCpe from order detail API
//   4.  Wait for ODB Patching Action Response -> extract odbPatchActionId
//   5.  Send ODB Patch Notification
//   6.  WFM CPE Steps 01-08 (5s delay between each) [+ ME steps if me > 0]
//   7.  Wait for Create Service Order Response -> extract serviceOrderId
//   8.  TMF641 Completed (with serviceOrderId)
//   9.  Wait for state "Provisioning Completed" -> extract svActionId
//   10. SV Notification: Provisioning-Completed
//   11. Wait for state "Pending UAT"
//   12. WFM Step 09 Completed [+ ME if me > 0]
//   13. Wait for state "UAT Completed"
//   14. SV Notification: UAT-Completed
//   15. Wait for state "Pre-Completion"
//   16. SV Notification: Pre-Completion
//   17. Wait for state "Completed" -> verify order completion
// ---------------------------------------------------------------------------

function buildMobilyActivation(opts) {
  const meCount = opts.me || 0;
  const custType = opts.customerType || 'Regular-Customer';
  const payType = opts.paymentType || 'Postpaid';
  const meSuffix = meCount > 0 ? `With-${meCount}-ME` : 'No-ME';
  const createFile = `02-New-Activation/01-Create-Order-TMF622/Mobily/${custType}/${payType}/FTTH-${payType}-${meSuffix}.bru`;

  return [
    { step: 2, type: 'create', file: createFile },

    { step: 3, type: 'extractWorkOrderIds' },

    { step: 4, type: 'extractOdbPatchActionId' },

    { step: 5, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Custom-Notifications/ODB-Patch-Notification.bru', delay: 5000 },

    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-01-CPE-1000-OK.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-02-CPE-Ready.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-03-CPE-Acknowledged.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-04-CPE-Accepted.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-05-CPE-Trip-Started.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-06-CPE-Customer-Premises.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-07-CPE-In-Work.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-08-CPE-Installation-Completed.bru', delay: 5000 },

    ...(meCount > 0 ? [
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-01-ME-1000-OK.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-02-ME-Ready.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-03-ME-Acknowledged.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-04-ME-Accepted.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-05-ME-Trip-Started.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-06-ME-Customer-Premises.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-07-ME-In-Work.bru', delay: 5000 },
      { step: 6, type: 'notify', file: `Shared-Workflows/WFM-ME-Workflow/Step-08-ME-Installation-Completed-${meCount}-ME.bru`, delay: 5000 },
    ] : []),

    { step: 7, type: 'wait', ms: 45000, label: 'Waiting for Create Service Order Response to be generated' },
    { step: 7, type: 'extractServiceOrderId' },

    { step: 8, type: 'notify', file: 'Shared-Workflows/TMF641-Notifications/Service-Order-Completed.bru', delay: 0 },

    { step: 9, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: 9, type: 'extractSvActionId' },

    { step: 10, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Provisioning-Completed.bru', delay: 5000 },

    { step: 11, type: 'waitForState', state: 'In Progress|Pending UAT' },

    { step: 12, type: 'notify', file: 'Shared-Workflows/Step-09-CPE-Completed.bru', delay: 5000 },
    ...(meCount > 0 ? [
      { step: 12, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-09-ME-UAT-Completed.bru', delay: 5000 },
    ] : []),

    { step: 13, type: 'waitForState', state: 'In Progress|UAT Completed' },

    { step: 14, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/UAT-Completed.bru', delay: 5000 },

    { step: 15, type: 'waitForState', state: 'In Progress|Pre-Completion' },

    { step: 16, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Pre-Completion.bru', delay: 5000 },

    { step: 17, type: 'waitForState', state: 'Completed' },
  ];
}

// ---------------------------------------------------------------------------
// OpenAccess Activation (DAWIYAT / STC / ITC) — shared builder
// ---------------------------------------------------------------------------
function buildOpenAccessActivation(provider, opts) {
  const meCount = opts.me || 0;
  const meSuffix = meCount > 0 ? `With-${meCount}-ME` : 'No-ME';
  const createFile = `02-New-Activation/01-Create-Order-TMF622/OpenAccess/${provider}/FTTH-${provider}-Postpaid-${meSuffix}.bru`;

  return [
    { step: 2, type: 'create', file: createFile },
    { step: 3, type: 'extractWorkOrderIds' },

    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-01-CPE-1000-OK.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-02-CPE-Ready.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-03-CPE-Acknowledged.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-04-CPE-Accepted.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-05-CPE-Trip-Started.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-06-CPE-Customer-Premises.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-07-CPE-In-Work.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-08-CPE-Installation-Completed.bru', delay: 5000 },

    ...(meCount > 0 ? [
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-01-ME-1000-OK.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-02-ME-Ready.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-03-ME-Acknowledged.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-04-ME-Accepted.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-05-ME-Trip-Started.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-06-ME-Customer-Premises.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-07-ME-In-Work.bru', delay: 5000 },
      { step: 4, type: 'notify', file: `Shared-Workflows/WFM-ME-Workflow/Step-08-ME-Installation-Completed-${meCount}-ME.bru`, delay: 5000 },
    ] : []),

    { step: 5, type: 'wait', ms: 45000, label: 'Waiting for Create Service Order Response' },
    { step: 5, type: 'extractServiceOrderId' },

    { step: 6, type: 'notify', file: 'Shared-Workflows/TMF641-Notifications/Service-Order-Completed.bru', delay: 0 },

    { step: 7, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: 7, type: 'extractSvActionId' },

    { step: 8, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Provisioning-Completed.bru', delay: 5000 },

    { step: 9, type: 'waitForState', state: 'In Progress|Pending UAT' },

    { step: 10, type: 'notify', file: 'Shared-Workflows/Step-09-CPE-Completed.bru', delay: 5000 },
    ...(meCount > 0 ? [
      { step: 10, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-09-ME-UAT-Completed.bru', delay: 5000 },
    ] : []),

    { step: 11, type: 'waitForState', state: 'In Progress|UAT Completed' },

    { step: 12, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/UAT-Completed.bru', delay: 5000 },

    { step: 13, type: 'waitForState', state: 'In Progress|Pre-Completion' },

    { step: 14, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Pre-Completion.bru', delay: 5000 },

    { step: 15, type: 'waitForState', state: 'Completed' },
  ];
}

// ---------------------------------------------------------------------------
// Generic journey builders (parameterised by create-file)
// ---------------------------------------------------------------------------

/** Mobily field-work pattern: create → workOrderIds → ODB → WFM → serviceOrder → TMF641 → completion */
function buildMobilyFieldWork(createFile, opts) {
  const meCount = opts.me || 0;
  return [
    { step: 2, type: 'create', file: createFile },
    { step: 3, type: 'extractWorkOrderIds' },
    { step: 4, type: 'extractOdbPatchActionId' },
    { step: 5, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Custom-Notifications/ODB-Patch-Notification.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-01-CPE-1000-OK.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-02-CPE-Ready.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-03-CPE-Acknowledged.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-04-CPE-Accepted.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-05-CPE-Trip-Started.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-06-CPE-Customer-Premises.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-07-CPE-In-Work.bru', delay: 5000 },
    { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-08-CPE-Installation-Completed.bru', delay: 5000 },
    ...(meCount > 0 ? [
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-01-ME-1000-OK.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-02-ME-Ready.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-03-ME-Acknowledged.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-04-ME-Accepted.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-05-ME-Trip-Started.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-06-ME-Customer-Premises.bru', delay: 5000 },
      { step: 6, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-07-ME-In-Work.bru', delay: 5000 },
      { step: 6, type: 'notify', file: `Shared-Workflows/WFM-ME-Workflow/Step-08-ME-Installation-Completed-${meCount}-ME.bru`, delay: 5000 },
    ] : []),
    { step: 7, type: 'wait', ms: 45000, label: 'Waiting for Create Service Order Response' },
    { step: 7, type: 'extractServiceOrderId' },
    { step: 8, type: 'notify', file: 'Shared-Workflows/TMF641-Notifications/Service-Order-Completed.bru', delay: 0 },
    { step: 9, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: 9, type: 'extractSvActionId' },
    { step: 10, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Provisioning-Completed.bru', delay: 5000 },
    { step: 11, type: 'waitForState', state: 'In Progress|Pending UAT' },
    { step: 12, type: 'notify', file: 'Shared-Workflows/Step-09-CPE-Completed.bru', delay: 5000 },
    ...(meCount > 0 ? [
      { step: 12, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-09-ME-UAT-Completed.bru', delay: 5000 },
    ] : []),
    { step: 13, type: 'waitForState', state: 'In Progress|UAT Completed' },
    { step: 14, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/UAT-Completed.bru', delay: 5000 },
    { step: 15, type: 'waitForState', state: 'In Progress|Pre-Completion' },
    { step: 16, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Pre-Completion.bru', delay: 5000 },
    { step: 17, type: 'waitForState', state: 'Completed' },
  ];
}

/** OpenAccess field-work pattern: create → workOrderIds → WFM → serviceOrder → TMF641 → completion (no ODB) */
function buildOAFieldWork(createFile, opts) {
  const meCount = opts.me || 0;
  return [
    { step: 2, type: 'create', file: createFile },
    { step: 3, type: 'extractWorkOrderIds' },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-01-CPE-1000-OK.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-02-CPE-Ready.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-03-CPE-Acknowledged.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-04-CPE-Accepted.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-05-CPE-Trip-Started.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-06-CPE-Customer-Premises.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-07-CPE-In-Work.bru', delay: 5000 },
    { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-CPE-Workflow/Step-08-CPE-Installation-Completed.bru', delay: 5000 },
    ...(meCount > 0 ? [
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-01-ME-1000-OK.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-02-ME-Ready.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-03-ME-Acknowledged.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-04-ME-Accepted.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-05-ME-Trip-Started.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-06-ME-Customer-Premises.bru', delay: 5000 },
      { step: 4, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-07-ME-In-Work.bru', delay: 5000 },
      { step: 4, type: 'notify', file: `Shared-Workflows/WFM-ME-Workflow/Step-08-ME-Installation-Completed-${meCount}-ME.bru`, delay: 5000 },
    ] : []),
    { step: 5, type: 'wait', ms: 45000, label: 'Waiting for Create Service Order Response' },
    { step: 5, type: 'extractServiceOrderId' },
    { step: 6, type: 'notify', file: 'Shared-Workflows/TMF641-Notifications/Service-Order-Completed.bru', delay: 0 },
    { step: 7, type: 'waitForState', state: 'In Progress|Provisioning Completed' },
    { step: 7, type: 'extractSvActionId' },
    { step: 8, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Provisioning-Completed.bru', delay: 5000 },
    { step: 9, type: 'waitForState', state: 'In Progress|Pending UAT' },
    { step: 10, type: 'notify', file: 'Shared-Workflows/Step-09-CPE-Completed.bru', delay: 5000 },
    ...(meCount > 0 ? [
      { step: 10, type: 'notify', file: 'Shared-Workflows/WFM-ME-Workflow/Step-09-ME-UAT-Completed.bru', delay: 5000 },
    ] : []),
    { step: 11, type: 'waitForState', state: 'In Progress|UAT Completed' },
    { step: 12, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/UAT-Completed.bru', delay: 5000 },
    { step: 13, type: 'waitForState', state: 'In Progress|Pre-Completion' },
    { step: 14, type: 'notify', file: 'Shared-Workflows/SingleView-Integration/Order-Completion/Pre-Completion.bru', delay: 5000 },
    { step: 15, type: 'waitForState', state: 'Completed' },
  ];
}

/** Simple order: create + optional TMF641 + wait for completion */
function buildSimpleOrder(createFile, opts) {
  const tmf641 = opts._tmf641File || null;
  const steps = [
    { step: 2, type: 'create', file: createFile },
  ];
  if (tmf641) {
    steps.push({ step: 3, type: 'wait', ms: 30000, label: 'Waiting for service order' });
    steps.push({ step: 3, type: 'extractServiceOrderId' });
    steps.push({ step: 4, type: 'notify', file: tmf641, delay: 0 });
    steps.push({ step: 5, type: 'waitForState', state: 'Completed' });
  } else {
    steps.push({ step: 3, type: 'waitForState', state: 'Completed' });
  }
  return steps;
}

/** Suspend with optional OA service order */
function buildSuspendOrder(createFile, oaServiceOrderFile, opts) {
  const steps = [
    { step: 2, type: 'create', file: createFile },
  ];
  if (oaServiceOrderFile) {
    steps.push({ step: 3, type: 'wait', ms: 30000, label: 'Waiting for service order' });
    steps.push({ step: 3, type: 'extractServiceOrderId' });
    steps.push({ step: 4, type: 'notify', file: oaServiceOrderFile, delay: 5000 });
    steps.push({ step: 5, type: 'waitForState', state: 'Completed' });
  } else {
    steps.push({ step: 3, type: 'waitForState', state: 'Completed' });
  }
  return steps;
}

/** Installation failure: send failure notification on existing order */
function buildFailureJourney(failureFile) {
  return [
    { step: 2, type: 'notify', file: failureFile, delay: 0 },
    { step: 3, type: 'waitForState', state: 'Installation Failure|Failed' },
  ];
}

/** Maintenance: create + manual close/reopen via toolkit */
function buildMaintenanceOrder(createFile) {
  return [
    { step: 2, type: 'create', file: createFile },
  ];
}

// ---------------------------------------------------------------------------
// Step-label templates
// ---------------------------------------------------------------------------
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
  { num: 13, label: 'Wait for UAT Completed' },
  { num: 14, label: 'SV UAT-Completed' },
  { num: 15, label: 'Wait for Pre-Completion' },
  { num: 16, label: 'SV Pre-Completion' },
  { num: 17, label: 'Verify Completed' },
];

/**
 * Portal InteractionSubState / B2B productOrder.state → journey step (Mobily field-work journeys).
 * Maps common "In Progress" sub-states so Detect position + resume work (not only coarse states).
 */
const MOBILY_FIELDWORK_STATE_MAP = {
  'Pending Visit': 6,
  'In Progress': 8,
  'Provisioning Started': 9,
  'Provisioning Completed': 10,
  'Pending UAT': 12,
  'UAT Completed': 14,
  'Pre-Completion': 16,
  'Completed': 17,
};

/** OpenAccess field-work journeys (different step numbers than Mobily). */
const OA_FIELDWORK_STATE_MAP = {
  'Pending Visit': 4,
  'In Progress': 6,
  'Provisioning Started': 7,
  'Provisioning Completed': 8,
  'Pending UAT': 10,
  'UAT Completed': 12,
  'Pre-Completion': 14,
  'Completed': 15,
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
  { num: 11, label: 'Wait for UAT Completed' },
  { num: 12, label: 'SV UAT-Completed' },
  { num: 13, label: 'Wait for Pre-Completion' },
  { num: 14, label: 'SV Pre-Completion' },
  { num: 15, label: 'Verify Completed' },
];

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
// Failure code options per provider
// ---------------------------------------------------------------------------
const MOBILY_FAILURE_CODES = [
  { value: '(No Tr) Code 2102- Customer Refused to sign PN', label: '(No Tr) 2102 - Customer Refused' },
  { value: '(T1) Code 2017 - Device Swap Failure', label: '(T1) 2017 - Device Swap Failure' },
  { value: '(T1) Code 2017 - Wrong ODB ID', label: '(T1) 2017 - Wrong ODB ID' },
  { value: '(T2) Code 2023 - Speed Problem', label: '(T2) 2023 - Speed Problem' },
  { value: '(T3) Code 2060 - Wrong Contact Number', label: '(T3) 2060 - Wrong Contact' },
  { value: '(T3) Code 2064 - Wrong Info - Wrong Package', label: '(T3) 2064 - Wrong Package' },
  { value: '(T4) Code 2040 - Customer Not Reachable', label: '(T4) 2040 - Not Reachable' },
  { value: 'Device Swap Failure', label: 'Device Swap Failure' },
];

const DAWIYAT_FAILURE_CODES = [
  { value: '(T1) DOWIYAT - Fiber cut', label: '(T1) Fiber cut' },
  { value: '(T2) DOWIYAT - Customer cancelation', label: '(T2) Customer cancelation' },
  { value: '(T3) DOWIYAT - Wrong customer contact', label: '(T3) Wrong contact' },
  { value: '(T4) DOWIYAT - No HAG', label: '(T4) No HAG' },
  { value: '(T5) DOWIYAT - Unknown', label: '(T5) Unknown' },
];

const STC_FAILURE_CODES = [
  { value: '(T1) STC - B09-OLO - Loss Signal', label: '(T1) B09 - Loss Signal' },
  { value: '(T2) STC - B13-OLO - Need Owner Permission', label: '(T2) B13 - Owner Permission' },
  { value: '(T3) STC - B23-OLO - Wrong Contact Number', label: '(T3) B23 - Wrong Contact' },
  { value: '(T4) STC - B167 - OLO - No HAG Available', label: '(T4) B167 - No HAG' },
  { value: '(T5) STC - No Details', label: '(T5) No Details' },
];

const ITC_FAILURE_CODES = [
  { value: '(T1) ITC - No Details - Wrong ODB', label: '(T1) Wrong ODB' },
  { value: '(T2) ITC - No Details - Internal wiring', label: '(T2) Internal wiring' },
  { value: '(T3) ITC - No Details - Wrong customer contact', label: '(T3) Wrong contact' },
  { value: '(T4) ITC - No Details - No HAG Available', label: '(T4) No HAG' },
];

// ---------------------------------------------------------------------------
// Journey Registry (all providers × all journey types)
// ---------------------------------------------------------------------------
const ME_OPTION = { key: 'me', label: 'ME Count', choices: ['0','1','2','3'], default: '0' };

const JOURNEY_REGISTRY = {
  // ===== MOBILY ============================================================
  'mobily-activation': {
    label: 'New Activation',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'activation',
    options: [
      ME_OPTION,
      { key: 'customerType', label: 'Customer', choices: [
        { value: 'Regular-Customer', label: 'Regular' },
        { value: 'Royal-Customer', label: 'Royal' },
      ], default: 'Regular-Customer' },
      { key: 'paymentType', label: 'Payment', choices: ['Postpaid','Prepaid'], default: 'Postpaid' },
    ],
    build: (opts) => buildMobilyActivation(opts),
    stepLabels: MOBILY_FIELDWORK_LABELS,
    stateMap: MOBILY_FIELDWORK_STATE_MAP,
  },
  'mobily-failure': {
    label: 'Installation Failure',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'failure',
    options: [
      { key: 'failureCode', label: 'Failure Code', choices: MOBILY_FAILURE_CODES, default: MOBILY_FAILURE_CODES[0].value },
    ],
    build: (opts) => buildFailureJourney(`Shared-Workflows/Installation-Failure-Scenarios/Mobily/${opts.failureCode}.bru`),
    stepLabels: FAILURE_LABELS,
    stateMap: {},
  },
  'mobily-relocation': {
    label: 'Relocation',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'relocation',
    options: [ME_OPTION],
    build: (opts) => buildMobilyFieldWork('03-Relocation/01-Create-Relocation-Order-TMF622/Relocation Mobily.bru', opts),
    stepLabels: MOBILY_FIELDWORK_LABELS,
    stateMap: MOBILY_FIELDWORK_STATE_MAP,
  },
  'mobily-device-swap-cpe': {
    label: 'Device Swap (CPE)',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'device-swap',
    options: [ME_OPTION],
    build: (opts) => buildMobilyFieldWork('04-Device-Swap/01-Create-Swap-Order-TMF622/Device Swap - CPE - Mobily.bru', opts),
    stepLabels: MOBILY_FIELDWORK_LABELS,
    stateMap: MOBILY_FIELDWORK_STATE_MAP,
  },
  'mobily-device-swap-hag': {
    label: 'Device Swap (HAG)',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'device-swap',
    options: [ME_OPTION],
    build: (opts) => buildMobilyFieldWork('04-Device-Swap/01-Create-Swap-Order-TMF622/Device Swap - HAG - Mobily.bru', opts),
    stepLabels: MOBILY_FIELDWORK_LABELS,
    stateMap: MOBILY_FIELDWORK_STATE_MAP,
  },
  'mobily-rewiring': {
    label: 'Rewiring',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'rewiring',
    options: [ME_OPTION],
    build: (opts) => buildMobilyFieldWork('08-Rewiring/01-Create-Rewiring-Order-TMF622/Rewiring Mobily.bru', opts),
    stepLabels: MOBILY_FIELDWORK_LABELS,
    stateMap: MOBILY_FIELDWORK_STATE_MAP,
  },
  'mobily-upgrade': {
    label: 'Upgrade',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'upgrade',
    options: [],
    build: (opts) => buildSimpleOrder('05-Upgrade-Downgrade/01-Upgrade-Order-TMF622/Upgrade - Bandwith Only - Mobily.bru', opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { 'Completed': 3 },
  },
  'mobily-downgrade': {
    label: 'Downgrade',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'downgrade',
    options: [],
    build: (opts) => buildSimpleOrder('05-Upgrade-Downgrade/02-Downgrade-Order-TMF622/Downgrade - Bandwith Only - Mobily.bru', opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { 'Completed': 3 },
  },
  'mobily-suspend': {
    label: 'Suspend',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'suspend',
    options: [],
    build: (opts) => buildSimpleOrder('06-Suspend-Resume/01-Suspend-Order-TMF622/Suspends Mobily.bru', opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { 'Completed': 3 },
  },
  'mobily-termination': {
    label: 'Termination',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'termination',
    options: [],
    build: (opts) => buildSimpleOrder('07-Termination/01-Termination-Order-TMF622/Termination - Mobily.bru', { ...opts, _tmf641File: 'Shared-Workflows/TMF641-Notifications/641 Cease - Termination.bru' }),
    stepLabels: SIMPLE_TMF641_LABELS,
    stateMap: { 'Completed': 5 },
  },
  'mobily-maintenance': {
    label: 'Maintenance',
    provider: 'Mobily', providerCategory: 'mobily', journeyType: 'maintenance',
    options: [],
    build: () => buildMaintenanceOrder('09-Maintenance/01-Create-Maintenance-Order-TMF622/Maintenance Order - Mobily.bru'),
    stepLabels: MAINTENANCE_LABELS,
    stateMap: {},
  },

  // ===== DAWIYAT (OpenAccess) ==============================================
  'dawiyat-activation': {
    label: 'New Activation',
    provider: 'DAWIYAT', providerCategory: 'openaccess', journeyType: 'activation',
    options: [ME_OPTION],
    build: (opts) => buildOpenAccessActivation('DAWIYAT', opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'dawiyat-failure': {
    label: 'Installation Failure',
    provider: 'DAWIYAT', providerCategory: 'openaccess', journeyType: 'failure',
    options: [
      { key: 'failureCode', label: 'Failure Code', choices: DAWIYAT_FAILURE_CODES, default: DAWIYAT_FAILURE_CODES[0].value },
    ],
    build: (opts) => buildFailureJourney(`Shared-Workflows/Installation-Failure-Scenarios/OpenAccess/DOWIYAT - Installation Failure Notification/${opts.failureCode}.bru`),
    stepLabels: FAILURE_LABELS,
    stateMap: {},
  },
  'dawiyat-relocation': {
    label: 'Relocation',
    provider: 'DAWIYAT', providerCategory: 'openaccess', journeyType: 'relocation',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork('03-Relocation/01-Create-Relocation-Order-TMF622/Relocation Dowiyat.bru', opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'dawiyat-device-swap': {
    label: 'Device Swap (ONT)',
    provider: 'DAWIYAT', providerCategory: 'openaccess', journeyType: 'device-swap',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork('04-Device-Swap/01-Create-Swap-Order-TMF622/Device Swap - ONT - DOWIYAT.bru', opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'dawiyat-rewiring': {
    label: 'Rewiring',
    provider: 'DAWIYAT', providerCategory: 'openaccess', journeyType: 'rewiring',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork('08-Rewiring/01-Create-Rewiring-Order-TMF622/Rewiring Dowiyat.bru', opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'dawiyat-suspend': {
    label: 'Suspend',
    provider: 'DAWIYAT', providerCategory: 'openaccess', journeyType: 'suspend',
    options: [],
    build: (opts) => buildSuspendOrder('06-Suspend-Resume/01-Suspend-Order-TMF622/622 - Suspends Dowiyat.bru', '06-Suspend-Resume/02-Create-Service-Order-OA/Create Service Order OA - Dowiyat.bru', opts),
    stepLabels: SUSPEND_OA_LABELS,
    stateMap: { 'Completed': 5 },
  },
  'dawiyat-resume': {
    label: 'Resume',
    provider: 'DAWIYAT', providerCategory: 'openaccess', journeyType: 'resume',
    options: [],
    build: (opts) => buildSimpleOrder('06-Suspend-Resume/03-Resume-Order-TMF622/622 - Resume Dowiyat.bru', opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { 'Completed': 3 },
  },
  'dawiyat-termination': {
    label: 'Termination',
    provider: 'DAWIYAT', providerCategory: 'openaccess', journeyType: 'termination',
    options: [],
    build: (opts) => buildSimpleOrder('07-Termination/01-Termination-Order-TMF622/Termination - DOWIYAT.bru', { ...opts, _tmf641File: 'Shared-Workflows/TMF641-Notifications/641 Cease - Termination.bru' }),
    stepLabels: SIMPLE_TMF641_LABELS,
    stateMap: { 'Completed': 5 },
  },
  'dawiyat-maintenance': {
    label: 'Maintenance',
    provider: 'DAWIYAT', providerCategory: 'openaccess', journeyType: 'maintenance',
    options: [],
    build: () => buildMaintenanceOrder('09-Maintenance/01-Create-Maintenance-Order-TMF622/Maintenance Order - DOWIYAT.bru'),
    stepLabels: MAINTENANCE_LABELS,
    stateMap: {},
  },

  // ===== STC (OpenAccess) ==================================================
  'stc-activation': {
    label: 'New Activation',
    provider: 'STC', providerCategory: 'openaccess', journeyType: 'activation',
    options: [ME_OPTION],
    build: (opts) => buildOpenAccessActivation('STC', opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'stc-failure': {
    label: 'Installation Failure',
    provider: 'STC', providerCategory: 'openaccess', journeyType: 'failure',
    options: [
      { key: 'failureCode', label: 'Failure Code', choices: STC_FAILURE_CODES, default: STC_FAILURE_CODES[0].value },
    ],
    build: (opts) => buildFailureJourney(`Shared-Workflows/Installation-Failure-Scenarios/OpenAccess/STC - Installation Failure Notification/${opts.failureCode}.bru`),
    stepLabels: FAILURE_LABELS,
    stateMap: {},
  },
  'stc-relocation': {
    label: 'Relocation',
    provider: 'STC', providerCategory: 'openaccess', journeyType: 'relocation',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork('03-Relocation/01-Create-Relocation-Order-TMF622/Relocation STC.bru', opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'stc-device-swap': {
    label: 'Device Swap (ONT)',
    provider: 'STC', providerCategory: 'openaccess', journeyType: 'device-swap',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork('04-Device-Swap/01-Create-Swap-Order-TMF622/Device Swap - ONT - STC.bru', opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'stc-suspend': {
    label: 'Suspend',
    provider: 'STC', providerCategory: 'openaccess', journeyType: 'suspend',
    options: [],
    build: (opts) => buildSuspendOrder('06-Suspend-Resume/01-Suspend-Order-TMF622/622 - Suspends STC.bru', '06-Suspend-Resume/02-Create-Service-Order-OA/Create Service Order OA - STC.bru', opts),
    stepLabels: SUSPEND_OA_LABELS,
    stateMap: { 'Completed': 5 },
  },
  'stc-resume': {
    label: 'Resume',
    provider: 'STC', providerCategory: 'openaccess', journeyType: 'resume',
    options: [],
    build: (opts) => buildSimpleOrder('06-Suspend-Resume/03-Resume-Order-TMF622/622 - Resume STC.bru', opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { 'Completed': 3 },
  },
  'stc-termination': {
    label: 'Termination',
    provider: 'STC', providerCategory: 'openaccess', journeyType: 'termination',
    options: [],
    build: (opts) => buildSimpleOrder('07-Termination/01-Termination-Order-TMF622/Termination - STC.bru', { ...opts, _tmf641File: 'Shared-Workflows/TMF641-Notifications/641 Cease - Termination.bru' }),
    stepLabels: SIMPLE_TMF641_LABELS,
    stateMap: { 'Completed': 5 },
  },
  'stc-maintenance': {
    label: 'Maintenance',
    provider: 'STC', providerCategory: 'openaccess', journeyType: 'maintenance',
    options: [],
    build: () => buildMaintenanceOrder('09-Maintenance/01-Create-Maintenance-Order-TMF622/Maintenance Order - STC.bru'),
    stepLabels: MAINTENANCE_LABELS,
    stateMap: {},
  },

  // ===== ITC (OpenAccess) ==================================================
  'itc-activation': {
    label: 'New Activation',
    provider: 'ITC', providerCategory: 'openaccess', journeyType: 'activation',
    options: [ME_OPTION],
    build: (opts) => buildOpenAccessActivation('ITC', opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'itc-failure': {
    label: 'Installation Failure',
    provider: 'ITC', providerCategory: 'openaccess', journeyType: 'failure',
    options: [
      { key: 'failureCode', label: 'Failure Code', choices: ITC_FAILURE_CODES, default: ITC_FAILURE_CODES[0].value },
    ],
    build: (opts) => buildFailureJourney(`Shared-Workflows/Installation-Failure-Scenarios/OpenAccess/ITC - Installation Failure Notification/${opts.failureCode}.bru`),
    stepLabels: FAILURE_LABELS,
    stateMap: {},
  },
  'itc-relocation': {
    label: 'Relocation',
    provider: 'ITC', providerCategory: 'openaccess', journeyType: 'relocation',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork('03-Relocation/01-Create-Relocation-Order-TMF622/Relocation ITC.bru', opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'itc-device-swap': {
    label: 'Device Swap (ONT)',
    provider: 'ITC', providerCategory: 'openaccess', journeyType: 'device-swap',
    options: [ME_OPTION],
    build: (opts) => buildOAFieldWork('04-Device-Swap/01-Create-Swap-Order-TMF622/Device Swap - ONT - ITC.bru', opts),
    stepLabels: OA_FIELDWORK_LABELS,
    stateMap: OA_FIELDWORK_STATE_MAP,
  },
  'itc-suspend': {
    label: 'Suspend',
    provider: 'ITC', providerCategory: 'openaccess', journeyType: 'suspend',
    options: [],
    build: (opts) => buildSuspendOrder('06-Suspend-Resume/01-Suspend-Order-TMF622/622 - Suspends ITC.bru', '06-Suspend-Resume/02-Create-Service-Order-OA/Create Service Order OA - ITC.bru', opts),
    stepLabels: SUSPEND_OA_LABELS,
    stateMap: { 'Completed': 5 },
  },
  'itc-resume': {
    label: 'Resume',
    provider: 'ITC', providerCategory: 'openaccess', journeyType: 'resume',
    options: [],
    build: (opts) => buildSimpleOrder('06-Suspend-Resume/03-Resume-Order-TMF622/622 - Resume ITC.bru', opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { 'Completed': 3 },
  },
  'itc-termination': {
    label: 'Termination',
    provider: 'ITC', providerCategory: 'openaccess', journeyType: 'termination',
    options: [],
    build: (opts) => buildSimpleOrder('07-Termination/01-Termination-Order-TMF622/Termination - ITC.bru', { ...opts, _tmf641File: 'Shared-Workflows/TMF641-Notifications/641 Cease - Termination.bru' }),
    stepLabels: SIMPLE_TMF641_LABELS,
    stateMap: { 'Completed': 5 },
  },
  'itc-maintenance': {
    label: 'Maintenance',
    provider: 'ITC', providerCategory: 'openaccess', journeyType: 'maintenance',
    options: [],
    build: () => buildMaintenanceOrder('09-Maintenance/01-Create-Maintenance-Order-TMF622/Maintenance Order - ITC.bru'),
    stepLabels: MAINTENANCE_LABELS,
    stateMap: {},
  },

  // ===== OA Downgrade (shared across OA providers) =========================
  'oa-downgrade': {
    label: 'Downgrade (OA)',
    provider: 'OpenAccess', providerCategory: 'openaccess', journeyType: 'downgrade',
    options: [],
    build: (opts) => buildSimpleOrder('05-Upgrade-Downgrade/02-Downgrade-Order-TMF622/Downgrade - Bandwith Only - OA.bru', opts),
    stepLabels: SIMPLE_ORDER_LABELS,
    stateMap: { 'Completed': 3 },
  },
};

const JOURNEYS = {};
for (const [k, v] of Object.entries(JOURNEY_REGISTRY)) {
  JOURNEYS[k] = v.build;
}

function getJourneyStepLabels(journeyName) {
  if (journeyName && JOURNEY_REGISTRY[journeyName]) {
    return JOURNEY_REGISTRY[journeyName].stepLabels;
  }
  return JOURNEY_REGISTRY['mobily-activation'].stepLabels;
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
  const oa = { DAWIYAT: [], STC: [], ITC: [] };
  const oaShared = [];

  for (const [id, j] of Object.entries(JOURNEY_REGISTRY)) {
    const entry = { id, label: j.label, journeyType: j.journeyType };
    if (j.providerCategory === 'mobily') {
      mobily.push(entry);
    } else if (oa[j.provider]) {
      oa[j.provider].push(entry);
    } else {
      oaShared.push(entry);
    }
  }

  return [
    { category: 'Mobily', provider: 'Mobily', journeys: mobily },
    { category: 'OpenAccess', subcategories: [
      { provider: 'DAWIYAT', journeys: oa.DAWIYAT },
      { provider: 'STC', journeys: oa.STC },
      { provider: 'ITC', journeys: oa.ITC },
      ...(oaShared.length ? [{ provider: 'Shared', journeys: oaShared }] : []),
    ]},
  ];
}

// ---------------------------------------------------------------------------
// State detection — map order subState to journey step position
// ---------------------------------------------------------------------------

/**
 * Map portal/B2B state string to a journey step using stateMap (handles "A|B" B2B strings).
 */
function resolveStepFromStateString(raw, stateMap) {
  if (!raw || !stateMap) return null;
  let s = String(raw).trim();
  s = s.replace(/\s*\|\s*/g, '|');
  if (stateMap[s] != null) return stateMap[s];
  const parts = s.split('|').map(x => x.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (stateMap[p] != null) return stateMap[p];
  }
  const keys = Object.keys(stateMap).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (s.includes(k)) return stateMap[k];
  }
  return null;
}

/**
 * @param {string|null} orderDetailState - InteractionSubState / VersionItems from portal
 * @param {string|null} b2bState - productOrder.state from latest B2B State Change (optional)
 * @param {string} journeyId
 */
function detectOrderPosition(orderDetailState, b2bState, journeyId) {
  // Back-compat: detectOrderPosition(subState, journeyId)
  if (journeyId === undefined && b2bState != null && JOURNEY_REGISTRY[b2bState]) {
    journeyId = b2bState;
    b2bState = null;
  }

  const entry = JOURNEY_REGISTRY[journeyId];
  if (!entry || !entry.stateMap) return null;

  let stepNum = null;
  let matchedOn = null;
  if (b2bState) {
    stepNum = resolveStepFromStateString(b2bState, entry.stateMap);
    if (stepNum != null) matchedOn = b2bState;
  }
  if (stepNum == null && orderDetailState) {
    stepNum = resolveStepFromStateString(orderDetailState, entry.stateMap);
    if (stepNum != null) matchedOn = orderDetailState;
  }
  if (stepNum == null) return null;

  const labels = entry.stepLabels || [];
  const completed = labels.filter(l => l.num < stepNum).map(l => l.num);
  const nextLabel = labels.find(l => l.num === stepNum);
  return {
    subState: matchedOn,
    currentStep: stepNum,
    nextStepLabel: nextLabel ? nextLabel.label : null,
    completedSteps: completed,
    totalSteps: labels.length,
  };
}

function mergePreseedVars(vars, opts) {
  const keys = [
    'authToken',
    'orderId',
    'serviceOrderId',
    'svActionId',
    'workOrderIdCpe',
    'workOrderIdMe',
    'odbPatchActionId',
  ];
  for (const k of keys) {
    if (opts[k] !== undefined && opts[k] !== null && opts[k] !== '') {
      if (k === 'svActionId' && /^\d+$/.test(String(opts[k]))) {
        log('WARN', `Ignoring numeric svActionId "${opts[k]}" (likely a DB row ID, not the SV reference like MOB-FTTH-xx). Will re-extract.`);
        continue;
      }
      vars[k] = opts[k];
    }
  }
}

/** SingleView externalId must be CustomerReference (e.g. MOB-FTTH-01), not a numeric externalReferences row ID. */
function isNumericDbSvActionId(val) {
  if (val == null || val === '') return false;
  return /^\d+$/.test(String(val).trim());
}

/**
 * Remove invalid svActionId from vars (env file or stale cache often has "168325").
 * Otherwise resume skips extractSvActionId and the wrong value is sent to SingleView.
 */
function stripInvalidSvActionId(vars) {
  if (isNumericDbSvActionId(vars.svActionId)) {
    log('WARN', `Removing numeric svActionId "${vars.svActionId}" from env/vars (use CustomerReference like MOB-FTTH-xx). Will re-extract.`);
    delete vars.svActionId;
  }
}

function shouldSkipStep(step, resumeFrom) {
  if (resumeFrom == null || resumeFrom <= 1) return false;
  if (step.step == null) return false;
  return step.step < resumeFrom;
}

/**
 * Last journey step# that still runs an action needing this extract (Mobily / OA patterns).
 * If resumeFrom is above this, do not force the extract — user is past that phase (e.g. Pre-Completion resume must not poll ODB).
 */
function maxResumeStillNeedsExtract(journeyName, stepType) {
  const oa = new Set(['dawiyat-activation', 'stc-activation', 'itc-activation']);
  if (oa.has(journeyName)) {
    if (stepType === 'extractWorkOrderIds') return 4;
    if (stepType === 'extractServiceOrderId') return 6;
    if (stepType === 'extractSvActionId') return 14;
    return null;
  }
  const mobilyFw = new Set([
    'mobily-activation',
    'mobily-relocation',
    'mobily-device-swap-cpe',
    'mobily-device-swap-hag',
    'mobily-rewiring',
  ]);
  if (mobilyFw.has(journeyName)) {
    if (stepType === 'extractOdbPatchActionId') return 5;
    if (stepType === 'extractWorkOrderIds') return 6;
    if (stepType === 'extractServiceOrderId') return 8;
    if (stepType === 'extractSvActionId') return 16;
    return null;
  }
  return null;
}

/** When resuming past an extract step, re-run it if the ID was not pre-seeded (otherwise notify .bru may never fire). */
function shouldForceExtractOnResume(step, resumeFrom, vars, journeyName) {
  if (!shouldSkipStep(step, resumeFrom)) return false;
  if (!vars.orderId) return false;
  const maxNeed = maxResumeStillNeedsExtract(journeyName, step.type);
  if (maxNeed != null && resumeFrom > maxNeed) return false;
  switch (step.type) {
    case 'extractSvActionId':
      return !vars.svActionId || isNumericDbSvActionId(vars.svActionId);
    case 'extractServiceOrderId':
      return !vars.serviceOrderId;
    case 'extractWorkOrderIds':
      return !vars.workOrderIdCpe;
    case 'extractOdbPatchActionId':
      return !vars.odbPatchActionId;
    default:
      return false;
  }
}

function parseResumeFrom(raw) {
  if (raw == null || raw === '') return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Invalid resumeFrom: ${JSON.stringify(raw)} (expected integer ≥ 1)`);
  }
  return Math.floor(n);
}

function logResumeFirstExecutableSteps(steps, resumeFrom, vars, journeyName) {
  if (resumeFrom <= 1) return;
  const names = [];
  for (const step of steps) {
    if (shouldSkipStep(step, resumeFrom) && !shouldForceExtractOnResume(step, resumeFrom, vars, journeyName)) {
      continue;
    }
    const kind = step.type || '?';
    const sn = step.step != null ? String(step.step) : '?';
    const file = step.file ? path.basename(step.file) : step.state || step.label || '';
    names.push(`${kind}@${sn}${file ? ` (${file})` : ''}`);
    if (names.length >= 5) break;
  }
  if (names.length) {
    log('START', `Resume will execute first (up to 5): ${names.join(' → ')}`);
  }
}

/**
 * Resume often skips step 10 (SV Provisioning-Completed) when resumeFrom is 11+ or Detect sets a higher step,
 * while the portal is still at Provisioning Completed — send the notify once before the main loop.
 */
async function maybeReplayProvisioningNotifyIfSkipped(steps, resumeFrom, vars) {
  if (resumeFrom <= 1) return;
  const prov = steps.find(s => s.type === 'notify' && s.file && s.file.includes('Provisioning-Completed.bru'));
  if (!prov || prov.step == null) return;
  if (!shouldSkipStep(prov, resumeFrom)) return;
  if (vars._svProvisioningCompletedOk) return;
  if (!vars.orderId) {
    log('WARN', 'Resume skipped Provisioning-Completed step but orderId is missing — cannot replay');
    return;
  }

  let subState = null;
  try {
    const detailRes = await httpRequest('GET', buildOrderDetailUrl(vars), { 'Authorization': `Bearer ${vars.authToken}` });
    const data = detailRes.body?.data || detailRes.body;
    subState = extractSubState(data);
  } catch (e) {
    log('WARN', `Resume provisioning replay: could not read order detail: ${e.message}`);
    return;
  }
  if (!needsProvisioningNotifyBeforePendingUat(subState, 'Pending UAT')) return;

  log(
    'BRIDGE',
    'Resume skipped SV Provisioning-Completed step but order is still at Provisioning Completed — sending notify now',
  );
  if (!vars.svActionId) {
    await doExtractSvActionId(vars);
  }
  const res = await doNotification(vars, prov.file);
  if (!res.ok) {
    throw new Error(
      `SV Provisioning-Completed failed (${res.status}) on resume replay. ${JSON.stringify(res.body).slice(0, 300)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Journey executor
// ---------------------------------------------------------------------------

/**
 * @param {string} journeyName
 * @param {string} envName
 * @param {object} [opts]
 * @param {number} [opts.me]
 * @param {string} [opts.customerType]
 * @param {string} [opts.paymentType]
 * @param {number} [opts.resumeFrom] - Skip journey steps whose step number is less than this (1 = run from Auth)
 * @param {string} [opts.authToken]
 * @param {string} [opts.orderId]
 * @param {string} [opts.serviceOrderId]
 * @param {string} [opts.svActionId]
 * @param {string} [opts.workOrderIdCpe]
 * @param {string} [opts.workOrderIdMe]
 * @param {string} [opts.odbPatchActionId]
 * @param {(info: { journeyName: string, envName: string, step: object, vars: object }) => void | Promise<void>} [onStep]
 */
async function runJourney(journeyName, envName, opts = {}, onStep) {
  const resumeFrom = parseResumeFrom(opts.resumeFrom != null ? opts.resumeFrom : 1);

  log('START', `Journey: ${journeyName}`);
  log('START', `Env: ${envName} | ME: ${opts.me || 0} | Payment: ${opts.paymentType || 'Postpaid'}`);
  if (resumeFrom > 1) {
    log('START', `Resume from step: ${resumeFrom}`);
  }
  log('START', '='.repeat(60));

  const journeyFn = JOURNEYS[journeyName];
  if (!journeyFn) {
    throw new Error(`Unknown journey: "${journeyName}". Available: ${Object.keys(JOURNEYS).join(', ')}`);
  }

  const vars = parseEnvFile(envName);
  mergePreseedVars(vars, opts);
  stripInvalidSvActionId(vars);

  const steps = journeyFn(opts);

  const activeSteps = steps.filter(s => !shouldSkipStep(s, resumeFrom));
  const notifyCount = activeSteps.filter(s => s.type === 'notify').length;
  let notifyNum = 0;

  // Step 1: Auth
  if (resumeFrom <= 1 || !vars.authToken) {
    await doAuth(vars, envName);
  } else {
    log('AUTH', 'Skipping auth (resumeFrom > 1 and authToken present)');
  }

  if (resumeFrom > 1) {
    log('DEBUG', `Resume vars: orderId=${vars.orderId || 'MISSING'}, svActionId=${vars.svActionId || 'MISSING'}, authToken=${vars.authToken ? 'present' : 'MISSING'}`);
  }

  logResumeFirstExecutableSteps(steps, resumeFrom, vars, journeyName);
  await maybeReplayProvisioningNotifyIfSkipped(steps, resumeFrom, vars);

  for (const step of steps) {
    const skip = shouldSkipStep(step, resumeFrom);
    const forceExtract = skip && shouldForceExtractOnResume(step, resumeFrom, vars, journeyName);

    if (skip && !forceExtract) {
      continue;
    }
    if (forceExtract) {
      log('BRIDGE', `Resume: running skipped ${step.type} (required ID not pre-seeded)`);
    }

    log('RUN', `Step ${step.step} [${step.type}]${step.file ? ' ' + path.basename(step.file, '.bru') : ''}${step.state ? ' state=' + step.state : ''}`);

    if (typeof onStep === 'function') {
      await onStep({ journeyName, envName, step, vars });
    }

    switch (step.type) {
      case 'create':
        await doCreateOrder(vars, step.file);
        break;

      case 'extractWorkOrderIds':
        await doExtractWorkOrderIds(vars, opts);
        break;

      case 'notify':
        notifyNum++;
        log('PROGRESS', `[${notifyNum}/${notifyCount}]`);
        {
          const nRes = await doNotification(vars, step.file);
          if (!nRes.ok) {
            log('ERROR', `Notify ${path.basename(step.file, '.bru')} FAILED: HTTP ${nRes.status} — ${JSON.stringify(nRes.body).slice(0, 300)}`);
          } else {
            log('OK', `Notify ${path.basename(step.file, '.bru')} => HTTP ${nRes.status}`);
          }
          if (step.file && step.file.includes('Provisioning-Completed.bru') && !nRes.ok) {
            throw new Error(
              `SV Provisioning-Completed failed (${nRes.status}). Cannot continue. ${JSON.stringify(nRes.body).slice(0, 300)}`,
            );
          }
        }
        if (step.delay > 0) await delay(step.delay);
        break;

      case 'wait':
        log('WAIT', `${step.label} (${step.ms / 1000}s)...`);
        await delay(step.ms);
        break;

      case 'extractServiceOrderId':
        await doExtractServiceOrderId(vars);
        break;

      case 'extractSvActionId':
        await doExtractSvActionId(vars);
        log('DEBUG', `After extractSvActionId: svActionId=${vars.svActionId || 'STILL MISSING'}`);
        break;

      case 'extractOdbPatchActionId':
        await doExtractOdbPatchActionId(vars);
        break;

      case 'waitForState':
        await doWaitForOrderState(vars, step.state);
        break;

      default:
        break;
    }
  }

  log('DONE', '='.repeat(60));
  log('DONE', 'Journey completed! Order is now COMPLETED.');
  log('DONE', `  orderId:          ${vars.orderId || 'N/A'}`);
  log('DONE', `  serviceOrderId:   ${vars.serviceOrderId || 'N/A'}`);
  log('DONE', `  svActionId:       ${vars.svActionId || 'N/A'}`);
  log('DONE', `  workOrderIdCpe:   ${vars.workOrderIdCpe || 'N/A'}`);
  log('DONE', `  workOrderIdMe:    ${vars.workOrderIdMe || 'N/A'}`);
  log('DONE', `  odbPatchActionId: ${vars.odbPatchActionId || 'N/A'}`);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
async function delay(ms) {
  if (!_cancelCheck) return new Promise(r => setTimeout(r, ms));
  const chunk = 1000;
  let remaining = ms;
  while (remaining > 0) {
    await new Promise(r => setTimeout(r, Math.min(chunk, remaining)));
    remaining -= chunk;
    if (_cancelCheck()) throw new Error('Journey cancelled');
  }
}

module.exports = {
  init,
  parseBruFile,
  parseEnvFile,
  listEnvironments,
  subVars,
  cleanJsonBody,
  delay,
  log,
  httpRequest,
  runBruRequest,
  buildB2bUrl,
  buildOrderDetailUrl,
  deepFindCharacteristic,
  extractSubState,
  extractInventoryId,
  doAuth,
  doCreateOrder,
  doNotification,
  doExtractServiceOrderId,
  doExtractSvActionId,
  doExtractWorkOrderIds,
  doExtractOdbPatchActionId,
  doWaitForOrderState,
  doCheckState,
  doListB2b,
  doExtractAllIds,
  doTriggerSvNotification,
  doListTasks,
  doCompleteTask,
  buildMobilyActivation,
  buildOpenAccessActivation,
  buildMobilyFieldWork,
  buildOAFieldWork,
  buildSimpleOrder,
  buildFailureJourney,
  buildMaintenanceOrder,
  buildSuspendOrder,
  JOURNEYS,
  JOURNEY_REGISTRY,
  getJourneyStepLabels,
  listJourneys,
  listJourneyTree,
  detectOrderPosition,
  findSvReferenceInOrderData,
  runJourney,
  setCancelCheck,
};
