'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  listShortcuts,
  getShortcut,
  buildShortcutSteps,
  resolveRequiredIds,
  resolvePayloadFields,
  assertRequiredIds,
} = require('../shortcuts/registry');
const { runShortcut } = require('../shortcuts/runner');

const ROOT = path.join(__dirname, '..', '..');

test('listShortcuts includes activation catalogue IDs', () => {
  const ids = listShortcuts().map((s) => s.id);
  for (const id of [
    'wfm-cpe-01-08',
    'wfm-cpe-installation-completed',
    'wfm-cpe-09',
    'wfm-me',
    'sv-provisioning-completed',
    'sv-uat-completed',
    'sv-pre-completion',
    'sv-odb-patch',
    'tmf641-completed',
    'stc-sq',
    'stc-ont',
    'itc-ont',
    'aces-ont',
    'dowiyat-ont',
    'failure-notify',
  ]) {
    assert.ok(ids.includes(id), `missing shortcut ${id}`);
  }
});

test('WFM CPE 01–08 builds eight notify steps', () => {
  const steps = buildShortcutSteps('wfm-cpe-01-08');
  assert.equal(steps.length, 8);
  assert.ok(steps.every((s) => s.type === 'notify' && s.file));
  assert.ok(steps[7].file.includes('Step-08-CPE-Installation-Completed'));
});

test('failure-notify is notify-only (no wait)', () => {
  const steps = buildShortcutSteps('failure-notify', {
    provider: 'Mobily',
    failureCode: 'MOB-IF-T4-2040-Customer-Not-Reachable',
  });
  assert.equal(steps.length, 1);
  assert.equal(steps[0].type, 'notify');
  assert.ok(!steps.some((s) => s.type === 'waitForState'));
});

test('STC ONT bundle length matches provider activation notifications', () => {
  const steps = buildShortcutSteps('stc-ont');
  assert.equal(steps.length, 6);
});

test('ACES ONT shortcut skips In Progress (Accepted / Install Completed / Completed)', () => {
  const steps = buildShortcutSteps('aces-ont');
  assert.equal(steps.length, 3);
  const bases = steps.map((s) => path.basename(s.file));
  assert.deepEqual(bases, [
    'Step-01-ACES-Accepted.bru',
    'Step-03-ACES-Serial-Number.bru',
    'Step-04-ACES-Completed.bru',
  ]);
});

test('assertRequiredIds / resolveRequiredIds for failure provider', () => {
  const shortcut = getShortcut('failure-notify');
  assert.deepEqual(resolveRequiredIds(shortcut, { provider: 'STC' }), [
    'orderId',
    'stcInstallationId',
  ]);
  assert.throws(
    () => assertRequiredIds({ orderId: 'ORD1' }, ['orderId', 'workOrderIdCpe']),
    /missing required IDs/,
  );
});

test('runShortcut rejects unknown id and missing IDs before notify', async () => {
  await assert.rejects(() => runShortcut({}, 'no-such'), /Unknown shortcut/);
  await assert.rejects(
    () => runShortcut({ orderId: 'ORD1' }, 'wfm-cpe-01-08'),
    /missing required IDs/,
  );
});

test('High shortcuts expose payloadFields for serial/device overrides', () => {
  const cpeKeys = ['cpeIntegrationId', 'cpeSerialNumber'];
  for (const id of ['wfm-cpe-01-08', 'wfm-cpe-installation-completed', 'itc-ont', 'dowiyat-ont']) {
    const fields = resolvePayloadFields(getShortcut(id));
    assert.deepEqual(
      fields.map((f) => f.key),
      cpeKeys,
      id,
    );
  }

  const stc = resolvePayloadFields(getShortcut('stc-ont'));
  assert.deepEqual(
    stc.map((f) => f.key),
    [...cpeKeys, 'stcServiceAccNum'],
  );

  const aces = resolvePayloadFields(getShortcut('aces-ont'));
  assert.deepEqual(
    aces.map((f) => f.key),
    ['acesCpeIntegrationId', 'acesCpeSerialNumber', 'acesServiceAccNum'],
  );
  assert.equal(aces.find((f) => f.key === 'acesCpeIntegrationId').label, 'Integration ID');
  assert.equal(aces.find((f) => f.key === 'acesCpeSerialNumber').label, 'Serial Number');
  assert.equal(aces.find((f) => f.key === 'acesServiceAccNum').label, 'Service Acc');

  const listed = listShortcuts().find((s) => s.id === 'wfm-cpe-01-08');
  assert.ok(listed.payloadFields.some((f) => f.key === 'cpeIntegrationId'));
  assert.equal(listShortcuts().find((s) => s.id === 'wfm-me').dynamicPayloadFields, true);
});

test('WFM ME payloadFields scale with me count', () => {
  const me = getShortcut('wfm-me');
  assert.deepEqual(
    resolvePayloadFields(me, { me: 1 }).map((f) => f.key),
    ['meshExtender1', 'meshSerial1'],
  );
  assert.deepEqual(
    resolvePayloadFields(me, { me: 2 }).map((f) => f.key),
    ['meshExtender1', 'meshSerial1', 'meshExtender2', 'meshSerial2'],
  );
  assert.deepEqual(
    resolvePayloadFields(me, { me: 3 }).map((f) => f.key),
    [
      'meshExtender1',
      'meshSerial1',
      'meshExtender2',
      'meshSerial2',
      'meshExtender3',
      'meshSerial3',
    ],
  );
});

test('Installation Completed Bruno files use template vars for device fields', () => {
  const files = [
    [
      'Shared-Workflows/WFM-CPE/Phase-1/Step-08-CPE-Installation-Completed.bru',
      ['{{cpeIntegrationId}}', '{{cpeSerialNumber}}'],
    ],
    [
      'Shared-Workflows/WFM-ME/Step-08-ME-Installation-Completed-1-ME.bru',
      ['{{meshExtender1}}', '{{meshSerial1}}'],
    ],
    [
      'Shared-Workflows/WFM-ME/Step-08-ME-Installation-Completed-2-ME.bru',
      ['{{meshExtender1}}', '{{meshSerial1}}', '{{meshExtender2}}', '{{meshSerial2}}'],
    ],
    [
      'Shared-Workflows/WFM-ME/Step-08-ME-Installation-Completed-3-ME.bru',
      [
        '{{meshExtender1}}',
        '{{meshSerial1}}',
        '{{meshExtender2}}',
        '{{meshSerial2}}',
        '{{meshExtender3}}',
        '{{meshSerial3}}',
      ],
    ],
    [
      'OpenAccess/STC/Activation/ONT-Installation/Step-04-STC-Test-Ftth-Link.bru',
      ['{{cpeIntegrationId}}', '{{cpeSerialNumber}}', '{{stcServiceAccNum}}'],
    ],
    [
      'OpenAccess/ITC/Activation/ONT-Installation/Step-05-ITC-Serial-Number.bru',
      ['{{cpeIntegrationId}}', '{{cpeSerialNumber}}'],
    ],
    [
      'OpenAccess/DOWIYAT/Activation/ONT-Installation/Step-06-DOWIYAT-Serial-Number.bru',
      ['{{cpeIntegrationId}}', '{{cpeSerialNumber}}'],
    ],
    [
      'OpenAccess/ACES/Activation/ONT-Installation/Step-03-ACES-Serial-Number.bru',
      ['{{acesCpeIntegrationId}}', '{{acesCpeSerialNumber}}', '{{acesServiceAccNum}}'],
    ],
  ];

  for (const [rel, needles] of files) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const needle of needles) {
      assert.ok(text.includes(needle), `${rel} missing ${needle}`);
    }
  }
});
