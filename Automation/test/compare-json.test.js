'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { compareJsonShape } = require('../validation/compare-json');

test('identical shapes PASS even when values differ', () => {
  const expected = { type: 'ODB Patching', orderId: '111' };
  const actual = { type: 'ODB Patching', orderId: '999' };
  const res = compareJsonShape(actual, expected);
  assert.equal(res.pass, true, JSON.stringify(res.findings));
});

test('missing key FAIL', () => {
  const res = compareJsonShape({ type: 'ODB' }, { type: 'ODB', orderId: '1' });
  assert.equal(res.pass, false);
  assert.ok(res.findings.some((f) => f.kind === 'missing' && f.path === 'orderId'));
});

test('extra key FAIL', () => {
  const res = compareJsonShape({ type: 'ODB', extra: true }, { type: 'ODB' });
  assert.equal(res.pass, false);
  assert.ok(res.findings.some((f) => f.kind === 'extra' && f.path === 'extra'));
});

test('type mismatch FAIL', () => {
  const res = compareJsonShape({ orderId: 190944 }, { orderId: '190944' });
  assert.equal(res.pass, false);
  assert.ok(res.findings.some((f) => f.kind === 'typeMismatch' && f.path === 'orderId'));
});

test('characteristic arrays match by name (ODB example)', () => {
  const expected = {
    type: 'ODB Patching',
    orderId: '190944',
    characteristic: [
      { name: 'odbId', value: 'JED-EXAMPLE' },
      { name: 'serviceAddress', value: 'Somewhere' },
      { name: 'appointmentId', value: '0' },
      { name: 'appointmentStartDate', value: '2020-01-01T00:00:00.000Z' },
    ],
  };
  const actual = {
    type: 'ODB Patching',
    orderId: '999999',
    characteristic: [
      { name: 'appointmentStartDate', value: '2026-07-16T16:00:00.000Z' },
      { name: 'odbId', value: 'JED-FYSL-SAFA-02-2637' },
      { name: 'serviceAddress', value: 'Apartment Number 2776626' },
      { name: 'appointmentId', value: '12133' },
    ],
  };
  const res = compareJsonShape(actual, expected);
  assert.equal(res.pass, true, JSON.stringify(res.findings));
});

test('missing named characteristic FAIL', () => {
  const expected = {
    characteristic: [
      { name: 'odbId', value: 'x' },
      { name: 'appointmentId', value: 'y' },
    ],
  };
  const actual = {
    characteristic: [{ name: 'odbId', value: 'x' }],
  };
  const res = compareJsonShape(actual, expected);
  assert.equal(res.pass, false);
  assert.ok(
    res.findings.some((f) => f.kind === 'missing' && String(f.path).includes('appointmentId')),
  );
});

test('nested objects recurse', () => {
  const res = compareJsonShape({ a: { b: { c: 1 } } }, { a: { b: { c: 2, d: 3 } } });
  assert.equal(res.pass, false);
  assert.ok(res.findings.some((f) => f.path === 'a.b.d' && f.kind === 'missing'));
});
