/**
 * Field-level assertion evaluator for activity JSON. Pure, dependency-free.
 *
 * A rule targets a `path` into an object and applies one or more operators:
 *   structure: exists, type, minLength, maxLength
 *   value:     equals, notEquals, oneOf, matches, contains, gt, gte, lt, lte
 *
 * `path` is either a string or an array of segments that cross embedded
 * JSON-string boundaries (`['Message.Data', 'items[0].id']` parses
 * `Message.Data` before resolving `items[0].id`).
 *
 * String path syntax:
 *   - dot properties:        `a.b.c`
 *   - array index:           `items[0].id`
 *   - name/value selector:   `characteristic[name=odbId].value`
 *     (first array element whose `name` equals `odbId` — ideal for the TMF
 *     `characteristic: [{ name, value }]` shape used across Telflow payloads).
 */

// Matches one path segment: a plain key, [index], or [key=value] selector.
const SEGMENT_RE = /([^.[\]]+)|\[(\d+)\]|\[([^\]=]+)=([^\]]*)\]/g;

function getByString(obj, path) {
  let cur = obj;
  SEGMENT_RE.lastIndex = 0;
  let m;
  while ((m = SEGMENT_RE.exec(String(path))) !== null) {
    if (cur == null) return undefined;
    if (m[1] !== undefined) {
      cur = cur[m[1]];
    } else if (m[2] !== undefined) {
      cur = cur[Number(m[2])];
    } else {
      const key = m[3].trim();
      const val = m[4];
      if (!Array.isArray(cur)) return undefined;
      cur = cur.find((el) => el != null && String(el[key]) === String(val));
    }
  }
  return cur;
}

/** Parse a value if it is a JSON-looking string; otherwise return it as-is. */
function maybeParseJson(v) {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if (!s || (s[0] !== '{' && s[0] !== '[')) return v;
  try {
    return JSON.parse(s);
  } catch {
    return v;
  }
}

/** Resolve a path spec (string or array crossing embedded JSON) to a value. */
function resolvePath(obj, pathSpec) {
  if (Array.isArray(pathSpec)) {
    let cur = obj;
    for (let i = 0; i < pathSpec.length; i++) {
      cur = getByString(cur, pathSpec[i]);
      if (cur === undefined) return undefined;
      if (i < pathSpec.length - 1) cur = maybeParseJson(cur);
    }
    return cur;
  }
  return getByString(obj, pathSpec);
}

function typeOk(value, expectedType) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return value != null && typeof value === 'object' && !Array.isArray(value);
    case 'nonempty':
      return value != null && String(value).trim() !== '';
    case 'present':
      return value !== undefined;
    default:
      return true;
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

function lengthOf(value) {
  if (Array.isArray(value) || typeof value === 'string') return value.length;
  return null;
}

/**
 * Evaluate a single rule against `root`.
 * @returns {null|{op,expected,actual,message}} null when every operator passes.
 */
function assertRule(root, rule) {
  const value = resolvePath(root, rule.path);
  const fail = (op, expected, message) => ({ op, expected, actual: value, message });

  if (rule.exists === true && value === undefined) return fail('exists', true, 'missing');
  if (rule.exists === false && value !== undefined)
    return fail('exists', false, 'should be absent');

  if (rule.type != null && !typeOk(value, rule.type)) {
    return fail('type', rule.type, `not a ${rule.type}`);
  }
  if ('equals' in rule && !deepEqual(value, rule.equals)) {
    return fail('equals', rule.equals, 'not equal');
  }
  if ('notEquals' in rule && deepEqual(value, rule.notEquals)) {
    return fail('notEquals', rule.notEquals, 'should differ');
  }
  if (rule.oneOf != null) {
    const set = Array.isArray(rule.oneOf) ? rule.oneOf : [rule.oneOf];
    if (!set.some((x) => deepEqual(value, x))) return fail('oneOf', set, 'not in allowed set');
  }
  if (rule.matches != null) {
    const re = rule.matches instanceof RegExp ? rule.matches : new RegExp(rule.matches);
    if (typeof value !== 'string' || !re.test(value)) {
      return fail('matches', String(rule.matches), 'no regex match');
    }
  }
  if (rule.contains != null) {
    const ok = Array.isArray(value)
      ? value.some((x) => deepEqual(x, rule.contains))
      : typeof value === 'string' && value.includes(String(rule.contains));
    if (!ok) return fail('contains', rule.contains, 'not contained');
  }
  if (rule.minLength != null) {
    const len = lengthOf(value);
    if (len == null || len < rule.minLength)
      return fail('minLength', rule.minLength, `length ${len}`);
  }
  if (rule.maxLength != null) {
    const len = lengthOf(value);
    if (len == null || len > rule.maxLength)
      return fail('maxLength', rule.maxLength, `length ${len}`);
  }
  if (rule.gt != null && !(Number(value) > rule.gt)) return fail('gt', rule.gt, `not > (${value})`);
  if (rule.gte != null && !(Number(value) >= rule.gte))
    return fail('gte', rule.gte, `not >= (${value})`);
  if (rule.lt != null && !(Number(value) < rule.lt)) return fail('lt', rule.lt, `not < (${value})`);
  if (rule.lte != null && !(Number(value) <= rule.lte))
    return fail('lte', rule.lte, `not <= (${value})`);

  return null;
}

/** Human-readable label for a path spec (used in check names). */
function pathLabel(pathSpec) {
  return Array.isArray(pathSpec) ? pathSpec.join('|') : String(pathSpec);
}

module.exports = {
  resolvePath,
  assertRule,
  typeOk,
  deepEqual,
  pathLabel,
};
