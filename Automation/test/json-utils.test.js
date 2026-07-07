'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { subVars, cleanJsonBody, deepFindCharacteristic } = require('../lib/json-utils');

test('subVars resolves known placeholders', () => {
  assert.equal(subVars('id={{orderId}}', { orderId: 'ORD1' }), 'id=ORD1');
  assert.equal(subVars('{{a}}/{{b}}', { a: 'x', b: 'y' }), 'x/y');
});

test('subVars leaves unknown placeholders untouched', () => {
  assert.equal(subVars('id={{missing}}', {}), 'id={{missing}}');
  // Empty-string value should still substitute (key exists).
  assert.equal(subVars('[{{v}}]', { v: '' }), '[]');
});

test('cleanJsonBody strips // line comments outside strings', () => {
  const raw = '{\n  "a": 1, // trailing\n  "b": 2\n}';
  const cleaned = cleanJsonBody(raw);
  assert.doesNotMatch(cleaned, /trailing/);
  assert.deepEqual(JSON.parse(cleaned), { a: 1, b: 2 });
});

test('cleanJsonBody preserves // inside string literals', () => {
  const raw = '{ "url": "https://example.com/path" }';
  const cleaned = cleanJsonBody(raw);
  assert.equal(JSON.parse(cleaned).url, 'https://example.com/path');
});

test('deepFindCharacteristic finds nested characteristic value', () => {
  const tree = {
    items: [
      { Characteristic: { ID: 'other' }, Value: 'nope' },
      { nested: { Characteristic: { ID: 'cpeWorkOrderId' }, Value: 'WO-123' } },
    ],
  };
  assert.equal(deepFindCharacteristic(tree, 'cpeWorkOrderId'), 'WO-123');
});

test('deepFindCharacteristic returns null when absent', () => {
  assert.equal(deepFindCharacteristic({ a: { b: 1 } }, 'missing'), null);
  assert.equal(deepFindCharacteristic(null, 'x'), null);
});
