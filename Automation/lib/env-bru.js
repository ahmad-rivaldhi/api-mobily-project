/**
 * `.bru` and environment file parsers.
 *
 * - `parseBruFile` resolves paths against ROOT (the package / repo root),
 *   i.e. the collection files bundled with the engine.
 * - `parseEnvFile` / `listEnvironments` resolve against ENVROOT, which is the
 *   consumer's local environments directory (credential files, never bundled).
 *   Set via `core.init({ envPath })`.
 */

const fs = require('fs');
const path = require('path');
const { getRoot, getEnvRoot } = require('./runtime');

/**
 * Parse a Bruno request file into `{ method, url, body, formBody }`.
 *
 * Body parsing uses brace-counting so nested objects (and `}}` inside Bruno
 * `{{var}}` placeholders) don't terminate the body block early.
 */
function parseBruFile(filePath) {
  const abs = path.resolve(getRoot(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
  const content = fs.readFileSync(abs, 'utf-8');

  const result = { method: null, url: null, body: null, formBody: null };

  const methodBlock = content.match(/^(post|get|put|patch|delete)\s*\{([\s\S]*?)\n\}/m);
  if (methodBlock) {
    result.method = methodBlock[1].toUpperCase();
    const urlLine = methodBlock[2].match(/url:\s*(.+)/);
    if (urlLine) result.url = urlLine[1].trim();
  }

  const bodyStart = content.indexOf('body:json {');
  if (bodyStart !== -1) {
    const searchFrom = bodyStart + 'body:json {'.length;
    const jsonStart = content.indexOf('{', searchFrom);
    if (jsonStart !== -1) {
      let depth = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < content.length; i++) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') {
          depth--;
          if (depth === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
      if (jsonEnd > jsonStart) {
        result.body = content.slice(jsonStart, jsonEnd);
      }
    }
  }

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

/**
 * Load `<envRoot>/<envName>.bru` and parse the `vars { ... }` block into
 * a flat key→string map.  The environments directory is resolved from
 * ENVROOT (set via `core.init({ envPath })`), not from the package root.
 */
function parseEnvFile(envName) {
  const envDir  = getEnvRoot();
  const envFile = path.resolve(envDir, `${envName}.bru`);
  if (!fs.existsSync(envFile)) {
    const available = fs.existsSync(envDir)
      ? fs.readdirSync(envDir).filter((f) => f.endsWith('.bru')).map((f) => f.replace('.bru', ''))
      : [];
    throw new Error(
      `Environment "${envName}" not found in ${envDir}. Available: ${available.join(', ') || '(none)'}`,
    );
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

/** @returns {string[]} Available environment names (without `.bru` suffix). */
function listEnvironments() {
  const envDir = getEnvRoot();
  if (!fs.existsSync(envDir)) return [];
  return fs
    .readdirSync(envDir)
    .filter((f) => f.endsWith('.bru'))
    .map((f) => f.replace(/\.bru$/, ''));
}

module.exports = {
  parseBruFile,
  parseEnvFile,
  listEnvironments,
};
