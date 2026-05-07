/**
 * Pure JSON / template-string helpers. No I/O, no logger.
 */

/**
 * Substitute `{{varName}}` placeholders in `text` from the `vars` object.
 * Unknown keys are left as-is so callers can detect unresolved placeholders
 * and surface a clear error.
 */
function subVars(text, vars) {
  return text.replace(/\{\{([\w-]+)\}\}/g, (full, key) => (key in vars ? vars[key] : full));
}

/**
 * Strip JS-style `// line comments` from a JSON-ish blob without touching
 * comment-like sequences inside string literals (e.g. URLs containing `//`).
 */
function cleanJsonBody(raw) {
  let out = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) {
      out += ch;
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      out += ch;
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (!inString && ch === '/' && raw[i + 1] === '/') {
      while (i < raw.length && raw[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Recursively scan an object/array tree for an entry with shape
 * `{ Value, Characteristic: { ID: charId } }` and return its `Value`.
 * Used to pull nested characteristic values out of TMF order detail responses.
 */
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

module.exports = {
  subVars,
  cleanJsonBody,
  deepFindCharacteristic,
};
