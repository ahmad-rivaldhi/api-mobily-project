'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  MOBILY_FAILURE_CODES,
  DOWIYAT_FAILURE_CODES,
  STC_FAILURE_CODES,
  ITC_FAILURE_CODES,
  ACES_FAILURE_CODES,
} = require('../journeys/labels');
const { mobilyFailureFile, oaFailureFile } = require('../constants/paths');

const ROOT = path.resolve(__dirname, '../..');

function assertCodesExist(provider, codes) {
  for (const { value } of codes) {
    const rel =
      provider === 'Mobily' ? mobilyFailureFile(value) : oaFailureFile(provider, value);
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
  }
}

test('canonical failure-code files exist for every provider option', () => {
  assertCodesExist('Mobily', MOBILY_FAILURE_CODES);
  assertCodesExist('DOWIYAT', DOWIYAT_FAILURE_CODES);
  assertCodesExist('STC', STC_FAILURE_CODES);
  assertCodesExist('ITC', ITC_FAILURE_CODES);
  assertCodesExist('ACES', ACES_FAILURE_CODES);
});

test('ACES installation-failure notifications use Pending status/milestone', () => {
  for (const { value } of ACES_FAILURE_CODES) {
    const rel = oaFailureFile('ACES', value);
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.match(text, /"providerStatus"\s*:\s*"Pending"/, rel);
    assert.match(text, /"providerMilestone"\s*:\s*"Pending"/, rel);
    assert.doesNotMatch(text, /"providerStatus"\s*:\s*"Failure"/, rel);
  }
});
