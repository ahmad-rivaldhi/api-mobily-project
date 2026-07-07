'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseResumeFrom,
  shouldSkipStep,
  stripStalePerOrderIds,
  stripInvalidSvActionId,
  mergePreseedVars,
  maxResumeStillNeedsExtract,
  PER_ORDER_STALE_KEYS,
} = require('../runner/resume');

test('parseResumeFrom normalises and validates', () => {
  assert.equal(parseResumeFrom(null), 1);
  assert.equal(parseResumeFrom(''), 1);
  assert.equal(parseResumeFrom('5'), 5);
  assert.equal(parseResumeFrom(3.9), 3);
  assert.throws(() => parseResumeFrom(0));
  assert.throws(() => parseResumeFrom('abc'));
});

test('shouldSkipStep only skips steps below resumeFrom (>1)', () => {
  assert.equal(shouldSkipStep({ step: 2 }, 1), false);
  assert.equal(shouldSkipStep({ step: 2 }, 5), true);
  assert.equal(shouldSkipStep({ step: 6 }, 5), false);
  assert.equal(shouldSkipStep({ step: null }, 5), false);
});

test('stripStalePerOrderIds drops stale env ids not explicitly provided', () => {
  const vars = { workOrderIdCpe: 'STALE', serviceOrderId: 'OLD', orderId: 'ORD1' };
  stripStalePerOrderIds(vars, {});
  assert.equal(vars.workOrderIdCpe, undefined);
  assert.equal(vars.serviceOrderId, undefined);
  // Non per-order id survives.
  assert.equal(vars.orderId, 'ORD1');
});

test('stripStalePerOrderIds keeps ids explicitly passed via opts', () => {
  const vars = { workOrderIdCpe: 'STALE' };
  stripStalePerOrderIds(vars, { workOrderIdCpe: 'FRESH' });
  // opts value wins by being preserved in vars for later merge.
  assert.equal(vars.workOrderIdCpe, 'STALE');
});

test('PER_ORDER_STALE_KEYS covers OA + Mobily per-order ids', () => {
  for (const k of [
    'workOrderIdCpe',
    'workOrderIdMe',
    'serviceOrderId',
    'odbPatchActionId',
    'stcInstallationId',
  ]) {
    assert.ok(PER_ORDER_STALE_KEYS.includes(k), `expected ${k} in PER_ORDER_STALE_KEYS`);
  }
});

test('stripInvalidSvActionId removes bare numeric ids', () => {
  const numeric = { svActionId: '168325' };
  stripInvalidSvActionId(numeric);
  assert.equal(numeric.svActionId, undefined);

  const valid = { svActionId: 'MOB-FTTH-01' };
  stripInvalidSvActionId(valid);
  assert.equal(valid.svActionId, 'MOB-FTTH-01');
});

test('mergePreseedVars ignores numeric svActionId but merges real ids', () => {
  const vars = {};
  mergePreseedVars(vars, { svActionId: '999', orderId: 'ORD9', workOrderIdCpe: 'WO1' });
  assert.equal(vars.svActionId, undefined);
  assert.equal(vars.orderId, 'ORD9');
  assert.equal(vars.workOrderIdCpe, 'WO1');
});

test('maxResumeStillNeedsExtract preserves OA-standard ceilings', () => {
  for (const j of ['dawiyat-activation', 'itc-activation', 'aces-activation']) {
    assert.equal(maxResumeStillNeedsExtract(j, 'extractOAProviderIds'), 6);
    assert.equal(maxResumeStillNeedsExtract(j, 'extractServiceOrderId'), 7);
    assert.equal(maxResumeStillNeedsExtract(j, 'extractSvActionId'), 11);
    assert.equal(maxResumeStillNeedsExtract(j, 'extractOdbPatchActionId'), null);
  }
});

test('maxResumeStillNeedsExtract preserves STC ceilings', () => {
  assert.equal(maxResumeStillNeedsExtract('stc-activation', 'extractOAProviderIds'), 8);
  assert.equal(maxResumeStillNeedsExtract('stc-activation', 'extractServiceOrderId'), 8);
  assert.equal(maxResumeStillNeedsExtract('stc-activation', 'extractSvActionId'), 12);
});

test('maxResumeStillNeedsExtract preserves Mobily field-work ceilings', () => {
  for (const j of [
    'mobily-activation',
    'mobily-relocation',
    'mobily-device-swap-cpe',
    'mobily-device-swap-hag',
    'mobily-rewiring',
  ]) {
    assert.equal(maxResumeStillNeedsExtract(j, 'extractOdbPatchActionId'), 5);
    assert.equal(maxResumeStillNeedsExtract(j, 'extractWorkOrderIds'), 12);
    assert.equal(maxResumeStillNeedsExtract(j, 'extractServiceOrderId'), 8);
    assert.equal(maxResumeStillNeedsExtract(j, 'extractSvActionId'), 16);
  }
});

test('maxResumeStillNeedsExtract returns null for unknown journey/type', () => {
  assert.equal(maxResumeStillNeedsExtract('nonexistent', 'extractSvActionId'), null);
  assert.equal(maxResumeStillNeedsExtract('mobily-activation', 'extractOAProviderIds'), null);
});
