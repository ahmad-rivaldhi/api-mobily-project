/**
 * Pure activity-tab validator. No I/O — takes a raw `Activities` array and a
 * per-journey expectation, returns a structured pass/fail report.
 *
 * Expectation shape (see docs/specs/2026-07-07-activity-validation-design.md
 * and docs/specs/2026-07-08-activity-json-assertions-design.md):
 *   {
 *     ordered: boolean,
 *     activities: [
 *       {
 *         name, exact?, requiredStatus?,
 *         requiredFields?: { field: type },   // shallow shape (legacy)
 *         assert?: [ { path, ...operators } ] // deep per-field JSON assertions
 *       }
 *     ]
 *   }
 *   field type ∈ 'string' | 'number' | 'boolean' | 'array' | 'object' | 'nonempty' | 'present'
 *
 * Result: { pass, checks: [{ name, status: 'pass'|'fail', expected, actual, message? }] }
 */

const { assertRule, pathLabel } = require('./assert-field');

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return undefined;
}

/** Map varied Telflow field casings to a stable shape. */
function normalizeActivity(a) {
  if (!a || typeof a !== 'object') return { name: '', type: '', status: '', raw: a };
  // `Action` is included so B2B "System-tab" messages match by their action
  // string (e.g. "ODB Patching Action Request").
  const name = pick(a, ['Name', 'name', 'ActivityName', 'activityName', 'Action', 'action']) ?? '';
  const type = pick(a, ['Type', 'type', 'ActivityType', 'activityType']) ?? '';
  const status =
    pick(a, [
      'Status',
      'status',
      'State',
      'state',
      'InteractionStatusName',
      'interactionStatusName',
    ]) ?? '';
  return { name: String(name), type: String(type), status: String(status), raw: a };
}

function matches(act, expected) {
  const target = String(expected.name || expected.match || '').toLowerCase();
  if (!target) return false;
  const hay = [act.name, act.type].map((s) => String(s).toLowerCase());
  if (expected.exact) return hay.some((h) => h === target);
  return hay.some((h) => h.includes(target));
}

function fieldTypeOk(value, expectedType) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'nonempty':
      return value != null && String(value).trim() !== '';
    case 'present':
      return value !== undefined;
    default:
      return true;
  }
}

/**
 * @param {object[]} activities  raw Activities array from order detail
 * @param {object} expectation   per-journey expectation
 * @returns {{ pass: boolean, checks: object[] }}
 */
function validateActivities(activities, expectation) {
  const acts = (Array.isArray(activities) ? activities : []).map(normalizeActivity);
  const expected =
    expectation && Array.isArray(expectation.activities) ? expectation.activities : [];
  const ordered = !!(expectation && expectation.ordered);

  const checks = [];
  const matchedIndices = [];

  for (const exp of expected) {
    const label = exp.name || exp.match || 'activity';

    // First not-yet-matched activity that satisfies the matcher (supports
    // duplicates + order checking).
    let idx = -1;
    for (let i = 0; i < acts.length; i++) {
      if (matchedIndices.includes(i)) continue;
      if (matches(acts[i], exp)) {
        idx = i;
        break;
      }
    }

    if (idx === -1) {
      checks.push({
        name: `present: ${label}`,
        status: 'fail',
        expected: label,
        actual: null,
        message: 'activity not found',
      });
      continue;
    }

    matchedIndices.push(idx);
    checks.push({
      name: `present: ${label}`,
      status: 'pass',
      expected: label,
      actual: acts[idx].name || acts[idx].type,
    });

    if (exp.requiredStatus) {
      const ok =
        String(acts[idx].status).toLowerCase() === String(exp.requiredStatus).toLowerCase();
      checks.push({
        name: `status: ${label}`,
        status: ok ? 'pass' : 'fail',
        expected: exp.requiredStatus,
        actual: acts[idx].status,
        message: ok ? undefined : 'unexpected status',
      });
    }

    if (exp.requiredFields && typeof exp.requiredFields === 'object') {
      for (const [field, type] of Object.entries(exp.requiredFields)) {
        const val = acts[idx].raw ? acts[idx].raw[field] : undefined;
        const ok = fieldTypeOk(val, type);
        checks.push({
          name: `field: ${label}.${field}`,
          status: ok ? 'pass' : 'fail',
          expected: type,
          actual: val === undefined ? null : val,
          message: ok ? undefined : `expected ${type}`,
        });
      }
    }

    // Deep per-field JSON assertions against the raw activity object.
    if (Array.isArray(exp.assert)) {
      for (const rule of exp.assert) {
        const fault = assertRule(acts[idx].raw, rule);
        const lbl = pathLabel(rule.path);
        if (fault) {
          checks.push({
            name: `assert: ${label}.${lbl} [${fault.op}]`,
            status: 'fail',
            expected: fault.expected,
            actual: fault.actual === undefined ? null : fault.actual,
            message: fault.message,
          });
        } else {
          checks.push({
            name: `assert: ${label}.${lbl}`,
            status: 'pass',
            expected: undefined,
            actual: undefined,
          });
        }
      }
    }
  }

  if (ordered && matchedIndices.length > 1) {
    let inOrder = true;
    for (let i = 1; i < matchedIndices.length; i++) {
      if (matchedIndices[i] < matchedIndices[i - 1]) {
        inOrder = false;
        break;
      }
    }
    checks.push({
      name: 'order',
      status: inOrder ? 'pass' : 'fail',
      expected: 'expected sequence',
      actual: matchedIndices.join(','),
      message: inOrder ? undefined : 'activities out of expected order',
    });
  }

  const pass = checks.every((c) => c.status === 'pass');
  return { pass, checks };
}

module.exports = {
  normalizeActivity,
  validateActivities,
};
