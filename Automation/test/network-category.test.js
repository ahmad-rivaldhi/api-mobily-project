'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  NETWORK_CATEGORY,
  normalizeNetworkCategory,
  resolveNetworkCategory,
  customerCategoryFor,
  requiresOdbPatch,
  isRoyalNetworkCategory,
} = require('../providers/network-category');

test('canonical constants match Telflow option list (case-sensitive)', () => {
  assert.equal(NETWORK_CATEGORY.CONSUMER, 'FTTH Consumer');
  assert.equal(NETWORK_CATEGORY.RCY, 'FTTH RCY');
});

test('normalizeNetworkCategory accepts assorted spellings', () => {
  assert.equal(normalizeNetworkCategory('FTTH Consumer'), 'FTTH Consumer');
  assert.equal(normalizeNetworkCategory('FTTH CONSUMER'), 'FTTH Consumer');
  assert.equal(normalizeNetworkCategory('consumer'), 'FTTH Consumer');
  assert.equal(normalizeNetworkCategory('Regular'), 'FTTH Consumer');
  assert.equal(normalizeNetworkCategory('FTTH RCY'), 'FTTH RCY');
  assert.equal(normalizeNetworkCategory('royal'), 'FTTH RCY');
  assert.equal(normalizeNetworkCategory('rcy'), 'FTTH RCY');
  assert.equal(normalizeNetworkCategory('nonsense'), null);
  assert.equal(normalizeNetworkCategory(''), null);
});

test('resolveNetworkCategory honours explicit override then customerType', () => {
  assert.equal(resolveNetworkCategory({ networkCategory: 'FTTH RCY' }), 'FTTH RCY');
  assert.equal(resolveNetworkCategory({ customerType: 'Royal-Customer' }), 'FTTH RCY');
  assert.equal(resolveNetworkCategory({ customerType: 'Regular-Customer' }), 'FTTH Consumer');
  assert.equal(resolveNetworkCategory({}), 'FTTH Consumer');
});

test('resolveNetworkCategory passes an explicit override through verbatim', () => {
  // Env-specific spellings must survive so a UI override can satisfy option
  // lists that differ from the canonical value.
  assert.equal(resolveNetworkCategory({ networkCategory: 'FTTH CONSUMER' }), 'FTTH CONSUMER');
  assert.equal(resolveNetworkCategory({ networkCategory: '  FTTH Consumer  ' }), 'FTTH Consumer');
  assert.equal(
    customerCategoryFor(resolveNetworkCategory({ networkCategory: 'FTTH Rcy' })),
    'Royal',
  );
});

test('ODB patch routing: RCY skips, CONSUMER requires', () => {
  assert.equal(requiresOdbPatch(NETWORK_CATEGORY.RCY), false);
  assert.equal(requiresOdbPatch(NETWORK_CATEGORY.CONSUMER), true);
  assert.equal(isRoyalNetworkCategory(NETWORK_CATEGORY.RCY), true);
  assert.equal(isRoyalNetworkCategory(NETWORK_CATEGORY.CONSUMER), false);
});

test('customerCategoryFor maps to Regular/Royal', () => {
  assert.equal(customerCategoryFor(NETWORK_CATEGORY.RCY), 'Royal');
  assert.equal(customerCategoryFor(NETWORK_CATEGORY.CONSUMER), 'Regular');
});
