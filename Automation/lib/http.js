/**
 * Generic HTTP client + Bruno-request executor.
 *
 * `runBruRequest` is the main building block used by every notification /
 * create-order step: it parses the .bru, substitutes `{{vars}}`, validates
 * JSON, and prints debug context (key request fields and externalId) so the
 * user can audit which value was actually sent on the wire.
 */

const { log } = require('./runtime');
const { parseBruFile } = require('./env-bru');
const { subVars, cleanJsonBody } = require('./json-utils');

async function httpRequest(method, url, headers, body) {
  const opts = { method, headers: { ...headers } };
  if (body) opts.body = body;
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, ok: res.ok, body: json };
}

const DEBUG_FILE_FRAGMENTS = ['Provisioning-Completed', 'UAT-Completed', 'Pre-Completion'];
const ID_FIELDS_OF_INTEREST = [
  'externalId',
  'serviceOrderId',
  'orderId',
  'svActionId',
  'workOrderIdCpe',
  'workOrderIdMe',
  'odbPatchActionId',
  'stcSqId',
  'stcInstallationId',
  'itcInstallationId',
  'acesInstallationId',
  'dawiyatInstallationId',
];

/** Walk a JSON tree and return the first string value for any of the given keys. */
function findFirstStringValueByKey(node, keys, depth = 0) {
  if (!node || depth > 6) return null;
  if (typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findFirstStringValueByKey(item, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const k of keys) {
    if (typeof node[k] === 'string' && node[k].trim()) return node[k];
    if (typeof node[k] === 'number') return String(node[k]);
  }
  for (const v of Object.values(node)) {
    if (v && typeof v === 'object') {
      const found = findFirstStringValueByKey(v, keys, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Print which `{{var}}` placeholders the bru file references and which
 * concrete values they resolved to. This is the audit log the user asked
 * for so they can see *which* externalId was sent on every notification.
 */
function logRequestVariables(bruPath, rawBody, vars) {
  const placeholders = [...new Set((rawBody.match(/\{\{([\w-]+)\}\}/g) || [])
    .map((p) => p.replace(/^\{\{|\}\}$/g, '')))];
  const interesting = placeholders.filter((p) => ID_FIELDS_OF_INTEREST.includes(p));
  if (interesting.length) {
    const pairs = interesting.map((k) => `${k}=${vars[k] || '∅'}`).join(', ');
    log('VARS', `${bruPath} → ${pairs}`);
  }
}

async function runBruRequest(bruPath, vars) {
  const parsed = parseBruFile(bruPath);
  if (!parsed.method || !parsed.url) {
    throw new Error(`Cannot parse request from ${bruPath}`);
  }

  const url = subVars(parsed.url, vars);
  const headers = {};
  if (vars.authToken) headers['Authorization'] = `Bearer ${vars.authToken}`;

  let body = null;

  if (parsed.body) {
    headers['Content-Type'] = 'application/json';
    logRequestVariables(bruPath, parsed.body, vars);

    const substituted = subVars(parsed.body, vars);
    const unresolved = substituted.match(/\{\{[\w-]+\}\}/g);
    if (unresolved && unresolved.length) {
      const keys = [...new Set(unresolved.map((s) => s.replace(/^\{\{|\}\}$/g, '')))];
      throw new Error(`Missing variables for ${bruPath}: ${keys.join(', ')}`);
    }
    const cleaned = cleanJsonBody(substituted);
    let parsedBody = null;
    try {
      parsedBody = JSON.parse(cleaned);
    } catch (e) {
      log('DEBUG', `JSON parse failed for ${bruPath}: ${e.message}`);
      log('DEBUG', `First 300 chars: ${cleaned.slice(0, 300)}`);
      throw new Error(`Invalid JSON in ${bruPath}: ${e.message}`);
    }
    body = cleaned;

    const externalId = findFirstStringValueByKey(parsedBody, ['externalId']);
    if (externalId) {
      log('REQ', `${bruPath} → externalId=${externalId}`);
    }
  }

  if (parsed.formBody) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const pairs = {};
    for (const [k, v] of Object.entries(parsed.formBody)) pairs[k] = subVars(v, vars);
    body = new URLSearchParams(pairs).toString();
  }

  log('HTTP', `${parsed.method} ${url.slice(0, 120)}`);
  if (DEBUG_FILE_FRAGMENTS.some((f) => bruPath.includes(f))) {
    log('HTTP', `Body: ${(body || '').slice(0, 400)}`);
  }

  const httpRes = await httpRequest(parsed.method, url, headers, body);
  log('HTTP', `=> ${httpRes.status} ${httpRes.ok ? 'OK' : 'FAIL'}`);
  return httpRes;
}

module.exports = {
  httpRequest,
  runBruRequest,
};
