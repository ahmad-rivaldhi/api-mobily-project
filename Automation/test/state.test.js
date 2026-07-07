'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { extractSubState, isNumericDbSvActionId } = require('../lib/state');

test('extractSubState reads direct InteractionSubState (both casings)', () => {
  assert.equal(extractSubState({ InteractionSubState: 'In Progress' }), 'In Progress');
  assert.equal(extractSubState({ interactionSubState: 'UAT Completed' }), 'UAT Completed');
});

test('extractSubState reads SubState VersionItems', () => {
  const data = {
    VersionItems: [
      { Category: 'Other', Name: 'X', Value: 'y' },
      { Category: 'Status', Name: 'SubState', Value: 'Provisioning Completed' },
    ],
  };
  assert.equal(extractSubState(data), 'Provisioning Completed');
});

test('extractSubState digs into businessInteractionVersion arrays', () => {
  const data = {
    businessInteractionVersion: [
      { VersionItems: [{ Category: 'Status', Name: 'SubState', Value: 'Visit Scheduled' }] },
    ],
  };
  assert.equal(extractSubState(data), 'Visit Scheduled');
});

test('extractSubState falls back to regex on JSON dump', () => {
  const data = { deep: { blob: { Name: 'SubState', Value: 'Completed' } } };
  assert.equal(extractSubState(data), 'Completed');
});

test('extractSubState returns null when nothing matches', () => {
  assert.equal(extractSubState(null), null);
  assert.equal(extractSubState({ unrelated: true }), null);
});

test('isNumericDbSvActionId flags bare numeric ids only', () => {
  assert.equal(isNumericDbSvActionId('168325'), true);
  assert.equal(isNumericDbSvActionId(168325), true);
  assert.equal(isNumericDbSvActionId('MOB-FTTH-01'), false);
  assert.equal(isNumericDbSvActionId(''), false);
  assert.equal(isNumericDbSvActionId(null), false);
});
