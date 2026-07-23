'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const skippedDirectories = new Set(['.git', 'node_modules']);

function collectTmf622Payloads(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (skippedDirectories.has(entry.name) || relativePath === 'Automation/environments') continue;
      collectTmf622Payloads(fullPath, files);
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith('.bru') &&
      (relativePath.includes('/622-Create-Sales-Order/') ||
        relativePath.includes('/TMF-622 Create Sales Order/'))
    ) {
      const source = fs.readFileSync(fullPath, 'utf8');
      if (source.includes('body:json')) files.push({ fullPath, source });
    }
  }

  return files;
}

test('every TMF 622 create-order payload uses the runtime externalId variable', () => {
  const files = collectTmf622Payloads(root);
  assert.ok(files.length > 0, 'expected to find TMF 622 create-order payloads');

  for (const { fullPath, source } of files) {
    assert.match(
      source,
      /"externalId"\s*:\s*"\{\{externalId\}\}"/,
      `${path.relative(root, fullPath)} must use {{externalId}}`,
    );
  }
});
