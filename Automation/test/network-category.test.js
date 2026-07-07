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

test('canonical constants are UPPERCASE (API is case-sensitive)', () => {
  assert.equal(NETWORK_CATEGORY.CONSUMER, 'FTTH CONSUMER');
  assert.equal(NETWORK_CATEGORY.RCY, 'FTTH RCY');
});

test('normalizeNetworkCategory accepts assorted spellings', () => {
  assert.equal(normalizeNetworkCategory('FTTH Consumer'), 'FTTH CONSUMER');
  assert.equal(normalizeNetworkCategory('consumer'), 'FTTH CONSUMER');
  assert.equal(normalizeNetworkCategory('Regular'), 'FTTH CONSUMER');
  assert.equal(normalizeNetworkCategory('FTTH RCY'), 'FTTH RCY');
  assert.equal(normalizeNetworkCategory('royal'), 'FTTH RCY');
  assert.equal(normalizeNetworkCategory('rcy'), 'FTTH RCY');
  assert.equal(normalizeNetworkCategory('nonsense'), null);
  assert.equal(normalizeNetworkCategory(''), null);
});

test('resolveNetworkCategory honours explicit override then customerType', () => {
  assert.equal(resolveNetworkCategory({ networkCategory: 'FTTH RCY' }), 'FTTH RCY');
  assert.equal(resolveNetworkCategory({ customerType: 'Royal-Customer' }), 'FTTH RCY');
  assert.equal(resolveNetworkCategory({ customerType: 'Regular-Customer' }), 'FTTH CONSUMER');
  assert.equal(resolveNetworkCategory({}), 'FTTH CONSUMER');
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
