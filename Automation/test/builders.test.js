'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildMobilyActivation, buildMobilyFieldWork } = require('../providers/mobily');

function stepShape(steps) {
  return steps.map((s) => `${s.step}:${s.type}`);
}

test('buildMobilyActivation delegates to field-work (identical shape)', () => {
  const opts = { me: 0, customerType: 'Regular-Customer', paymentType: 'Postpaid' };
  const activation = buildMobilyActivation(opts);
  // The activation create file is derived from opts; field-work takes it as arg.
  const createFile = activation.find((s) => s.type === 'create').file;
  const fieldwork = buildMobilyFieldWork(createFile, opts);
  assert.deepEqual(stepShape(activation), stepShape(fieldwork));
});

test('Regular (CONSUMER) activation includes ODB patch steps', () => {
  const steps = buildMobilyActivation({ me: 0, customerType: 'Regular-Customer' });
  assert.ok(steps.some((s) => s.type === 'extractOdbPatchActionId'));
  const create = steps.find((s) => s.type === 'create');
  assert.equal(create.vars.networkCategory, 'FTTH Consumer');
});

test('Royal (RCY) activation skips ODB patch steps', () => {
  const steps = buildMobilyActivation({ me: 0, customerType: 'Royal-Customer' });
  assert.ok(!steps.some((s) => s.type === 'extractOdbPatchActionId'));
  const create = steps.find((s) => s.type === 'create');
  assert.equal(create.vars.networkCategory, 'FTTH RCY');
});

test('activation ends by waiting for Completed', () => {
  const steps = buildMobilyActivation({ me: 0 });
  const last = steps[steps.length - 1];
  assert.equal(last.type, 'waitForState');
  assert.equal(last.state, 'Completed');
});

test('ME > 0 adds mesh-extender notify steps', () => {
  const none = buildMobilyActivation({ me: 0 });
  const withMe = buildMobilyActivation({ me: 2 });
  assert.ok(withMe.length > none.length, 'ME journey should have more steps');
});
