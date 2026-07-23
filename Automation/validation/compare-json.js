/**
 * Shape-first JSON compare for System-tab validation.
 *
 * Compares structure + types only (values ignored). Findings:
 *   missing       — path in expected, absent in actual
 *   extra         — path in actual, absent in expected
 *   typeMismatch  — both present, JSON types differ
 *
 * Arrays of objects with a `name` field (TMF characteristic[]) are matched
 * by name; other arrays are compared by index.
 */

function jsonType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // string | number | boolean | object | undefined
}

function isNamedObjectArray(arr) {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((el) => el != null && typeof el === 'object' && !Array.isArray(el) && 'name' in el)
  );
}

/**
 * @param {*} actual
 * @param {*} expected
 * @param {string} [basePath]
 * @returns {{ pass: boolean, findings: Array<{ path, kind, expected?, actual? }> }}
 */
function compareJsonShape(actual, expected, basePath = '') {
  const findings = [];
  walk(actual, expected, basePath || '$', findings);
  return { pass: findings.length === 0, findings };
}

function walk(actual, expected, path, findings) {
  const tA = jsonType(actual);
  const tE = jsonType(expected);

  // Expected side drives "missing"; if expected is undefined we only care
  // when walking extras from the actual side (handled by callers).
  if (tE === 'undefined') return;

  if (tA === 'undefined') {
    findings.push({ path, kind: 'missing', expected, actual: undefined });
    return;
  }

  if (tA !== tE) {
    findings.push({ path, kind: 'typeMismatch', expected: tE, actual: tA });
    return;
  }

  if (tE === 'array') {
    if (isNamedObjectArray(expected) || isNamedObjectArray(actual)) {
      walkNamedArrays(actual, expected, path, findings);
    } else {
      const max = Math.max(actual.length, expected.length);
      for (let i = 0; i < max; i++) {
        const p = `${path}[${i}]`;
        if (i >= expected.length) {
          findings.push({ path: p, kind: 'extra', actual: actual[i] });
        } else if (i >= actual.length) {
          findings.push({ path: p, kind: 'missing', expected: expected[i] });
        } else {
          walk(actual[i], expected[i], p, findings);
        }
      }
    }
    return;
  }

  if (tE === 'object') {
    const keysE = Object.keys(expected);
    const keysA = Object.keys(actual);
    const setE = new Set(keysE);
    const setA = new Set(keysA);

    for (const k of keysE) {
      const p = path === '$' ? k : `${path}.${k}`;
      if (!setA.has(k)) {
        findings.push({ path: p, kind: 'missing', expected: expected[k] });
      } else {
        walk(actual[k], expected[k], p, findings);
      }
    }
    for (const k of keysA) {
      if (!setE.has(k)) {
        const p = path === '$' ? k : `${path}.${k}`;
        findings.push({ path: p, kind: 'extra', actual: actual[k] });
      }
    }
  }
  // primitives: shape-only — value differences are ignored
}

function walkNamedArrays(actual, expected, path, findings) {
  const byNameA = new Map();
  for (const el of actual) {
    if (el && el.name != null) byNameA.set(String(el.name), el);
  }
  const byNameE = new Map();
  for (const el of expected) {
    if (el && el.name != null) byNameE.set(String(el.name), el);
  }

  for (const [name, elE] of byNameE) {
    const p = `${path}[name=${name}]`;
    const elA = byNameA.get(name);
    if (!elA) {
      findings.push({ path: p, kind: 'missing', expected: elE });
    } else {
      walk(elA, elE, p, findings);
    }
  }
  for (const [name, elA] of byNameA) {
    if (!byNameE.has(name)) {
      findings.push({ path: `${path}[name=${name}]`, kind: 'extra', actual: elA });
    }
  }
}

module.exports = {
  compareJsonShape,
  jsonType,
};
