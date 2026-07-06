#!/usr/bin/env node
/**
 * Report remaining mojibake patterns in key files.
 * Uses specific Win-1252 mojibake signatures, not just non-ASCII.
 */
const fs   = require('fs');
const path = require('path');

// True mojibake patterns: Windows-1252 double-encoding artifacts
// These are specific Unicode chars that only appear in mojibake context
const MOJI_CHARS = /[\u00C3\u00C5][\u00B0\u00A0\u00A2\u00B8\u00BD\u00BE]|[\u00E2][\u0080\u0086\u0088\u0089\u008A\u0099][\u0084-\u009F\u00A0-\u00AF]/;

const SKIP_DIRS  = ['node_modules', '.git'];
const SKIP_FILES = ['fix-mojibake.js', 'check-mojibake.js', 'migrate-provider-folders.ps1'];
const EXT        = ['.js', '.md', '.bru', '.ps1', '.json', '.mdc'];

function walk(dir, res = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return res; }
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.includes(e.name)) walk(fp, res);
    } else if (
      EXT.includes(path.extname(e.name).toLowerCase()) &&
      !SKIP_FILES.some(s => e.name.includes(s))
    ) {
      res.push(fp);
    }
  }
  return res;
}

const ROOT = path.resolve(__dirname, '..', '..');
const files = walk(ROOT);
let hits = 0;

for (const fp of files) {
  const content = fs.readFileSync(fp, 'utf8');
  const lines   = content.split('\n');
  let fileHit = false;
  for (let i = 0; i < lines.length; i++) {
    if (MOJI_CHARS.test(lines[i])) {
      if (!fileHit) { console.log('\n' + path.relative(ROOT, fp)); fileHit = true; hits++; }
      console.log(`  L${i + 1}: ${lines[i].trim().slice(0, 100)}`);
    }
  }
}

console.log(`\nTotal files with mojibake: ${hits}`);
