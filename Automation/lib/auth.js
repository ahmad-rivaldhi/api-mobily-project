/**
 * Per-environment OAuth-style authentication. Looks up a `.bru` file under
 * `Authentication/` whose name matches the env (or its number suffix), runs
 * it, and stores the bearer token in `vars.authToken`.
 */

const fs = require('fs');
const path = require('path');
const { log, getRoot } = require('./runtime');
const { parseBruFile } = require('./env-bru');
const { subVars } = require('./json-utils');
const { httpRequest } = require('./http');

function findAuthFile(envName) {
  const authDir = path.resolve(getRoot(), 'Authentication');
  const authFiles = fs.readdirSync(authDir).filter((f) => f.endsWith('.bru') && f !== 'folder.bru');
  let authFile = authFiles.find((f) => f.includes(envName));
  if (!authFile) {
    const num = envName.match(/\d+/);
    if (num) authFile = authFiles.find((f) => f.includes(num[0]));
  }
  if (!authFile) {
    throw new Error(`No auth file for env "${envName}". Available: ${authFiles.join(', ')}`);
  }
  return `Authentication/${authFile}`;
}

async function doAuth(vars, envName) {
  log('AUTH', 'Authenticating...');
  const bruPath = findAuthFile(envName);
  const parsed = parseBruFile(bruPath);
  const url = subVars(parsed.url, vars);
  const pairs = {};
  for (const [k, v] of Object.entries(parsed.formBody || {})) pairs[k] = subVars(v, vars);

  const res = await httpRequest(
    'POST',
    url,
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    new URLSearchParams(pairs).toString(),
  );

  if (!res.body?.access_token) {
    throw new Error(`Auth failed (${res.status}): ${JSON.stringify(res.body).slice(0, 300)}`);
  }
  vars.authToken = res.body.access_token;
  log('AUTH', `Token acquired (expires in ${res.body.expires_in}s)`);
}

module.exports = {
  doAuth,
};
