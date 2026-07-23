'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateTmf622ExternalId,
  applyTmf622ExternalId,
} = require('../lib/external-id');

test('generateTmf622ExternalId returns six digits beginning with 7', () => {
  assert.equal(generateTmf622ExternalId(() => 0), '700000');
  assert.equal(generateTmf622ExternalId(() => 0.92004), '792004');
  assert.match(generateTmf622ExternalId(() => 0.99999), /^7\d{5}$/);
});

test('applyTmf622ExternalId replaces stale values on every TMF 622 attempt', () => {
  const vars = { externalId: '44088-240707' };
  const bruFile = 'Mobily/Activation/622-Create-Sales-Order/FTTH-Consumer/order.bru';

  assert.equal(applyTmf622ExternalId(vars, bruFile, () => 0.92004), '792004');
  assert.equal(vars.externalId, '792004');
  assert.equal(applyTmf622ExternalId(vars, bruFile, () => 0), '700000');
  assert.equal(vars.externalId, '700000');
});

test('applyTmf622ExternalId leaves non-TMF 622 external IDs unchanged', () => {
  const vars = { externalId: 'ORD123' };

  assert.equal(
    applyTmf622ExternalId(vars, 'Shared-Workflows/WFM-CPE/Step.bru', () => 0),
    null,
  );
  assert.equal(vars.externalId, 'ORD123');
});
