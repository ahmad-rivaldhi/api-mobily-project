/**
 * Network category routing (Phase 4B).
 *
 * Telflow distinguishes Mobily customers by `networkCategory` rather than
 * the historical Regular/Royal folder split, so the journey runner picks
 * ODB-patch behaviour from this constant.
 *
 *   FTTH Consumer  →  ODB patch is required  (Regular customers)
 *   FTTH RCY       →  ODB patch is skipped   (Royal customers)
 *
 * Spelling is case-sensitive and env-dependent. Current Telflow option lists
 * (collection.bru / Dev 3) accept **title case** `FTTH Consumer`. An explicit
 * UI/env override is passed through verbatim for envs that differ.
 * See AGENTS.md / .cursor rules.
 */

const NETWORK_CATEGORY = Object.freeze({
  CONSUMER: 'FTTH Consumer',
  RCY: 'FTTH RCY',
});

const CUSTOMER_CATEGORY = Object.freeze({
  REGULAR: 'Regular',
  ROYAL: 'Royal',
});

/**
 * Return a canonical `FTTH Consumer` / `FTTH RCY` value, accepting any
 * sensible spelling the caller might pass (case-insensitive, hyphen/space
 * tolerant).
 */
function normalizeNetworkCategory(value) {
  if (!value) return null;
  const v = String(value)
    .toUpperCase()
    .replace(/[\s-]+/g, ' ')
    .trim();
  if (v === 'FTTH RCY' || v === 'RCY' || v === 'ROYAL' || v === 'FTTHRCY') {
    return NETWORK_CATEGORY.RCY;
  }
  if (v === 'FTTH CONSUMER' || v === 'CONSUMER' || v === 'REGULAR' || v === 'FTTHCONSUMER') {
    return NETWORK_CATEGORY.CONSUMER;
  }
  return null;
}

/**
 * Resolve the effective networkCategory sent to the API from the journey opts.
 *
 * An explicit `opts.networkCategory` is passed through VERBATIM (only trimmed)
 * so environments whose option list differs from the canonical spelling can
 * be driven from the UI override. When no explicit value is given we fall
 * back to the canonical value derived from `opts.customerType`.
 */
function resolveNetworkCategory(opts = {}) {
  const explicit = opts.networkCategory != null ? String(opts.networkCategory).trim() : '';
  if (explicit) return explicit;
  if (opts.customerType === 'Royal-Customer') return NETWORK_CATEGORY.RCY;
  return NETWORK_CATEGORY.CONSUMER;
}

/**
 * Mobily customerCategory characteristic value paired with this network
 * category. Uses the tolerant `isRoyalNetworkCategory` check so a custom-cased
 * override (e.g. `FTTH Rcy`) still maps correctly.
 */
function customerCategoryFor(networkCategory) {
  return isRoyalNetworkCategory(networkCategory)
    ? CUSTOMER_CATEGORY.ROYAL
    : CUSTOMER_CATEGORY.REGULAR;
}

/**
 * `true` for `FTTH Consumer` (regular customers). RCY/Royal orders skip the
 * ODB patch action entirely — Telflow handles the patch internally for that
 * network class.
 */
function requiresOdbPatch(networkCategory) {
  return normalizeNetworkCategory(networkCategory) !== NETWORK_CATEGORY.RCY;
}

function isRoyalNetworkCategory(networkCategory) {
  return normalizeNetworkCategory(networkCategory) === NETWORK_CATEGORY.RCY;
}

module.exports = {
  NETWORK_CATEGORY,
  CUSTOMER_CATEGORY,
  normalizeNetworkCategory,
  resolveNetworkCategory,
  customerCategoryFor,
  requiresOdbPatch,
  isRoyalNetworkCategory,
};
