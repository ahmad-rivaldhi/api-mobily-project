'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { resolvePath, assertRule, deepEqual, typeOk } = require('../validation/assert-field');

const OBJ = {
  Status: 'Completed',
  Response: { code: 200, result: 'OK' },
  ExternalId: 'MOB-FTTH-123',
  Items: [{ id: 'a' }, { id: 'b' }],
  Message: { Data: '{"items":[{"id":1},{"id":2}],"total":2}' },
};

test('resolvePath reads dot + bracket paths', () => {
  assert.equal(resolvePath(OBJ, 'Response.code'), 200);
  assert.equal(resolvePath(OBJ, 'Items[1].id'), 'b');
  assert.equal(resolvePath(OBJ, 'Missing.thing'), undefined);
});

test('resolvePath crosses embedded JSON boundaries (array path)', () => {
  assert.deepEqual(resolvePath(OBJ, ['Message.Data', 'items']), [{ id: 1 }, { id: 2 }]);
  assert.equal(resolvePath(OBJ, ['Message.Data', 'total']), 2);
  assert.equal(resolvePath(OBJ, ['Message.Data', 'items[0].id']), 1);
});

test('resolvePath selects name/value array elements ([key=value])', () => {
  const odb = {
    type: 'ODB Patching',
    orderId: '190944',
    characteristic: [
      { name: 'odbId', value: 'JED-FYSL-SAFA-02-2637' },
      { name: 'serviceAddress', value: 'Apartment 2776626' },
      { name: 'appointmentId', value: '12133' },
    ],
  };
  assert.equal(resolvePath(odb, 'characteristic[name=odbId].value'), 'JED-FYSL-SAFA-02-2637');
  assert.equal(resolvePath(odb, 'characteristic[name=appointmentId].value'), '12133');
  assert.equal(resolvePath(odb, 'characteristic[name=missing].value'), undefined);
  assert.equal(
    assertRule(odb, { path: 'characteristic[name=odbId].value', matches: '^JED-' }),
    null,
  );
  assert.equal(
    assertRule(odb, { path: 'characteristic[name=odbId].value', equals: 'WRONG' }).op,
    'equals',
  );
});

test('deepEqual + typeOk basics', () => {
  assert.equal(deepEqual({ a: [1, 2] }, { a: [1, 2] }), true);
  assert.equal(deepEqual({ a: 1 }, { a: 2 }), false);
  assert.equal(typeOk([], 'array'), true);
  assert.equal(typeOk({}, 'object'), true);
  assert.equal(typeOk([], 'object'), false);
});

test('assertRule passes when all operators hold', () => {
  assert.equal(assertRule(OBJ, { path: 'Status', equals: 'Completed' }), null);
  assert.equal(assertRule(OBJ, { path: 'Response.code', type: 'number', gte: 200, lt: 300 }), null);
  assert.equal(assertRule(OBJ, { path: 'Response.result', oneOf: ['OK', 'SUCCESS'] }), null);
  assert.equal(assertRule(OBJ, { path: 'ExternalId', matches: '^MOB-FTTH-' }), null);
  assert.equal(
    assertRule(OBJ, { path: ['Message.Data', 'items'], type: 'array', minLength: 2 }),
    null,
  );
  assert.equal(assertRule(OBJ, { path: 'Items', contains: { id: 'a' } }), null);
});

test('assertRule reports the failing operator', () => {
  assert.equal(assertRule(OBJ, { path: 'Status', equals: 'Failed' }).op, 'equals');
  assert.equal(assertRule(OBJ, { path: 'Response.code', type: 'string' }).op, 'type');
  assert.equal(assertRule(OBJ, { path: 'Response.code', gte: 300 }).op, 'gte');
  assert.equal(assertRule(OBJ, { path: 'Missing', exists: true }).op, 'exists');
  assert.equal(assertRule(OBJ, { path: 'Response.result', oneOf: ['NO'] }).op, 'oneOf');
  assert.equal(assertRule(OBJ, { path: 'ExternalId', matches: '^ZZZ' }).op, 'matches');
  assert.equal(assertRule(OBJ, { path: ['Message.Data', 'items'], minLength: 5 }).op, 'minLength');
});
