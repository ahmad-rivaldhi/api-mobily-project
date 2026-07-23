'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { listJourneyTree, JOURNEY_REGISTRY } = require('../journeys/registry');

function providerJourneyTypes(tree, provider) {
  const oa = tree.find((c) => c.category === 'OpenAccess');
  const sub = (oa.subcategories || []).find((s) => s.provider === provider);
  assert.ok(sub, `missing OpenAccess subcategory ${provider}`);
  return new Set(sub.journeys.map((j) => j.journeyType));
}

test('ACES journey tree includes full OA parity set', () => {
  const tree = listJourneyTree();
  const aces = providerJourneyTypes(tree, 'ACES');
  const stc = providerJourneyTypes(tree, 'STC');

  for (const t of stc) {
    assert.ok(aces.has(t), `ACES missing journeyType present on STC: ${t}`);
  }
  assert.ok(aces.has('rewiring'), 'ACES should expose rewiring');
  assert.ok(aces.has('downgrade'), 'ACES should expose downgrade');
  assert.ok(aces.has('upgrade'), 'ACES should expose upgrade');
});

test('ACES registry builds resolve to existing create/notify files', () => {
  const root = path.resolve(__dirname, '../..');
  const ids = [
    'aces-activation',
    'aces-failure',
    'aces-relocation',
    'aces-device-swap',
    'aces-rewiring',
    'aces-suspend',
    'aces-resume',
    'aces-termination',
    'aces-maintenance',
    'aces-downgrade',
    'aces-upgrade',
  ];
  for (const id of ids) {
    const entry = JOURNEY_REGISTRY[id];
    assert.ok(entry, `missing registry entry ${id}`);
    const opts = { me: 0, failureCode: entry.options?.[0]?.default };
    const steps = entry.build(opts || {});
    const files = steps.map((s) => s.file).filter(Boolean);
    assert.ok(files.length > 0, `${id} should produce at least one file step`);
    for (const file of files) {
      const abs = path.join(root, file);
      assert.ok(fs.existsSync(abs), `${id} missing file: ${file}`);
    }
  }
});
