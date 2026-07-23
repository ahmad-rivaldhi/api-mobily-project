'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { validateActivities, normalizeActivity } = require('../validation/validate-activities');

// A small fixture mimicking a portal `Activities` array (mixed field casings).
const ACTIVITIES = [
  { Name: 'CPE Installation', Status: 'Completed', CompletionDate: '2026-07-01' },
  { name: 'UAT', status: 'Completed', CompletionDate: '2026-07-02', attempts: 2 },
  { ActivityType: 'Order Completion', State: 'Completed' },
];

test('normalizeActivity maps varied field casings', () => {
  const n = normalizeActivity({
    ActivityName: 'X',
    ActivityType: 'T',
    InteractionStatusName: 'Done',
  });
  assert.equal(n.name, 'X');
  assert.equal(n.type, 'T');
  assert.equal(n.status, 'Done');
});

test('passes when all expected activities are present, in order, with status', () => {
  const expectation = {
    ordered: true,
    activities: [
      { name: 'CPE Installation', requiredStatus: 'Completed' },
      { name: 'UAT', requiredStatus: 'completed' }, // case-insensitive
      { name: 'Order Completion' },
    ],
  };
  const res = validateActivities(ACTIVITIES, expectation);
  assert.equal(res.pass, true, JSON.stringify(res.checks));
});

test('empty expectation is a trivial pass (no-op)', () => {
  const res = validateActivities(ACTIVITIES, { activities: [] });
  assert.equal(res.pass, true);
  assert.equal(res.checks.length, 0);
});

test('fails when an expected activity is missing', () => {
  const res = validateActivities(ACTIVITIES, {
    activities: [{ name: 'Nonexistent Activity' }],
  });
  assert.equal(res.pass, false);
  const presence = res.checks.find((c) => c.name.startsWith('present:'));
  assert.equal(presence.status, 'fail');
});

test('fails on a wrong required status', () => {
  const res = validateActivities(ACTIVITIES, {
    activities: [{ name: 'CPE Installation', requiredStatus: 'In Progress' }],
  });
  assert.equal(res.pass, false);
  const statusCheck = res.checks.find((c) => c.name.startsWith('status:'));
  assert.equal(statusCheck.status, 'fail');
});

test('fails when activities are out of expected order (ordered=true)', () => {
  const res = validateActivities(ACTIVITIES, {
    ordered: true,
    activities: [
      { name: 'UAT' }, // appears at index 1
      { name: 'CPE Installation' }, // appears at index 0 → out of order
    ],
  });
  assert.equal(res.pass, false);
  const orderCheck = res.checks.find((c) => c.name === 'order');
  assert.ok(orderCheck, 'expected an order check');
  assert.equal(orderCheck.status, 'fail');
});

test('does not flag order when ordered is false', () => {
  const res = validateActivities(ACTIVITIES, {
    ordered: false,
    activities: [{ name: 'UAT' }, { name: 'CPE Installation' }],
  });
  assert.equal(res.pass, true);
  assert.equal(
    res.checks.find((c) => c.name === 'order'),
    undefined,
  );
});

test('validates required field types', () => {
  const ok = validateActivities(ACTIVITIES, {
    activities: [
      { name: 'UAT', requiredFields: { CompletionDate: 'nonempty', attempts: 'number' } },
    ],
  });
  assert.equal(ok.pass, true, JSON.stringify(ok.checks));

  const bad = validateActivities(ACTIVITIES, {
    activities: [{ name: 'CPE Installation', requiredFields: { MissingField: 'nonempty' } }],
  });
  assert.equal(bad.pass, false);
  const fieldCheck = bad.checks.find((c) => c.name.startsWith('field:'));
  assert.equal(fieldCheck.status, 'fail');
});

test('exact matching requires a full name/type equality', () => {
  const substr = validateActivities(ACTIVITIES, { activities: [{ name: 'UA' }] });
  assert.equal(substr.pass, true); // substring match on "UAT"

  const exact = validateActivities(ACTIVITIES, { activities: [{ name: 'UA', exact: true }] });
  assert.equal(exact.pass, false); // no activity named exactly "UA"
});

test('validates a B2B "System-tab" message by Action + parsed Data payload', () => {
  // Shape produced by doFetchB2bActivities (Message.Data already parsed to Data).
  const b2bItems = [
    {
      Action: 'ODB Patching Action Request',
      Status: 'Delivered',
      Type: 'REST',
      orderId: 'ORD000000149168',
      Data: {
        type: 'ODB Patching',
        orderId: '190944',
        characteristic: [
          { name: 'odbId', value: 'JED-FYSL-SAFA-02-2637' },
          { name: 'serviceAddress', value: 'Apartment Number 2776626' },
          { name: 'appointmentId', value: '12133' },
          { name: 'appointmentStartDate', value: '2026-07-16T16:00:00.000Z' },
        ],
      },
    },
  ];

  const good = validateActivities(b2bItems, {
    source: 'b2b',
    activities: [
      {
        name: 'ODB Patching Action Request',
        requiredStatus: 'Delivered',
        assert: [
          { path: 'Data.type', equals: 'ODB Patching' },
          { path: 'Data.characteristic[name=odbId].value', matches: '^JED-' },
          {
            path: 'Data.characteristic[name=appointmentStartDate].value',
            matches: '^\\d{4}-\\d{2}-',
          },
        ],
      },
    ],
  });
  assert.equal(good.pass, true, JSON.stringify(good.checks));

  const bad = validateActivities(b2bItems, {
    activities: [
      {
        name: 'ODB Patching Action Request',
        assert: [{ path: 'Data.characteristic[name=odbId].value', matches: '^XXX-' }],
      },
    ],
  });
  assert.equal(bad.pass, false);
});

test('per-process assert[] rules feed into the overall result', () => {
  const ok = validateActivities(ACTIVITIES, {
    activities: [
      {
        name: 'CPE Installation',
        assert: [
          { path: 'Status', equals: 'Completed' },
          { path: 'CompletionDate', type: 'nonempty' },
        ],
      },
    ],
  });
  assert.equal(ok.pass, true, JSON.stringify(ok.checks));
  assert.ok(ok.checks.some((c) => c.name.startsWith('assert: CPE Installation.Status')));

  const bad = validateActivities(ACTIVITIES, {
    activities: [{ name: 'CPE Installation', assert: [{ path: 'Status', equals: 'Failed' }] }],
  });
  assert.equal(bad.pass, false);
  const failed = bad.checks.find((c) => c.name.startsWith('assert:') && c.status === 'fail');
  assert.equal(failed.expected, 'Failed');
  assert.equal(failed.actual, 'Completed');
});
