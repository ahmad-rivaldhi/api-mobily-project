/**
 * Network category routing (Phase 4B).
 *
 * Telflow now distinguishes Mobily customers by `networkCategory` rather
 * than the historical Regular/Royal folder split, so the journey runner
 * picks ODB-patch behaviour from this constant.
 *
 *   FTTH Consumer  →  ODB patch is required  (Regular customers)
 *   FTTH RCY       →  ODB patch is skipped   (Royal customers)
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
  const v = String(value).toUpperCase().replace(/[\s-]+/g, ' ').trim();
  if (v === 'FTTH RCY' || v === 'RCY' || v === 'ROYAL' || v === 'FTTHRCY') {
    return NETWORK_CATEGORY.RCY;
  }
  if (
    v === 'FTTH CONSUMER' ||
    v === 'CONSUMER' ||
    v === 'REGULAR' ||
    v === 'FTTHCONSUMER'
  ) {
    return NETWORK_CATEGORY.CONSUMER;
  }
  return null;
}

/**
 * Resolve the effective networkCategory from the journey opts. Honours an
 * explicit `opts.networkCategory` when present, else maps from
 * `opts.customerType` (the dropdown the UI exposes today).
 */
function resolveNetworkCategory(opts = {}) {
  const explicit = normalizeNetworkCategory(opts.networkCategory);
  if (explicit) return explicit;
  if (opts.customerType === 'Royal-Customer') return NETWORK_CATEGORY.RCY;
  return NETWORK_CATEGORY.CONSUMER;
}

/** Mobily customerCategory characteristic value paired with this network category. */
function customerCategoryFor(networkCategory) {
  return networkCategory === NETWORK_CATEGORY.RCY
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
