#!/usr/bin/env node
/**
 * Fix Windows-1252 mojibake in project files.
 *
 * Root cause: files were originally UTF-8 (with emoji / smart-quotes / arrows /
 * special symbols), then a tool read those UTF-8 bytes as Windows-1252 and
 * re-saved them as UTF-8.  Every original byte B became the UTF-8 encoding of
 * the Windows-1252 character for B — turning e.g. → (E2 86 92) into â†' and
 * 📁 (F0 9F 93 81) into Ã°Å¸â€œÂ.
 *
 * Fix: for each code-point in the file, map back to the original byte via the
 * Windows-1252 table, then decode the resulting byte buffer as UTF-8.
 * Only rewrite a file when the conversion produces valid UTF-8 that differs
 * from the original (and contains no replacement chars U+FFFD).
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Windows-1252: Unicode code-point → original byte  (only 0x80-0x9F differs
// from Latin-1; everything else is identity within 0x00-0xFF)
// ---------------------------------------------------------------------------
const CP_TO_BYTE = new Map([
  [0x20AC, 0x80], // €
  [0x201A, 0x82], // ‚
  [0x0192, 0x83], // ƒ
  [0x201E, 0x84], // „
  [0x2026, 0x85], // …
  [0x2020, 0x86], // †
  [0x2021, 0x87], // ‡
  [0x02C6, 0x88], // ˆ
  [0x2030, 0x89], // ‰
  [0x0160, 0x8A], // Š
  [0x2039, 0x8B], // ‹
  [0x0152, 0x8C], // Œ
  [0x017D, 0x8E], // Ž
  [0x2018, 0x91], // '
  [0x2019, 0x92], // '
  [0x201C, 0x93], // "
  [0x201D, 0x94], // "
  [0x2022, 0x95], // •
  [0x2013, 0x96], // –
  [0x2014, 0x97], // —
  [0x02DC, 0x98], // ˜
  [0x2122, 0x99], // ™
  [0x0161, 0x9A], // š
  [0x203A, 0x9B], // ›
  [0x0153, 0x9C], // œ
  [0x017E, 0x9E], // ž
  [0x0178, 0x9F], // Ÿ
]);

/**
 * Attempt to decode a string that is the result of Windows-1252 mojibake.
 * Returns the corrected string, or null if the input doesn't look like
 * clean mojibake (e.g. has code-points that can't map to a single byte).
 */
function tryDecode(str) {
  const bytes = [];
  for (let i = 0; i < str.length; ) {
    const cp = str.codePointAt(i);
    i += cp > 0xFFFF ? 2 : 1;

    if (cp < 0x80) {
      bytes.push(cp);
    } else if (CP_TO_BYTE.has(cp)) {
      bytes.push(CP_TO_BYTE.get(cp));
    } else if (cp <= 0xFF) {
      bytes.push(cp); // straight Latin-1 passthrough
    } else {
      // Code-point > 0xFF and not in the Win-1252 special table →
      // this character can't be a single original byte, so the file is
      // either already clean or has mixed content we can't handle.
      return null;
    }
  }

  try {
    const result = Buffer.from(bytes).toString('utf8');
    if (result.includes('\uFFFD')) return null; // invalid UTF-8 sequence
    return result;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------
const EXTENSIONS = new Set(['.js', '.md', '.bru', '.ps1', '.json', '.mdc', '.txt']);
const SKIP_DIRS  = new Set(['node_modules', '.git']);
const SKIP_FILES = new Set([
  path.resolve('Automation/scripts/migrate-provider-folders.ps1'),
  path.resolve('Automation/scripts/fix-mojibake.js'), // this file itself
]);

function walk(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    const fp = path.resolve(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(fp, results);
    } else if (EXTENSIONS.has(path.extname(e.name).toLowerCase()) && !SKIP_FILES.has(fp)) {
      results.push(fp);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const ROOT    = path.resolve(__dirname, '..', '..');
const files   = walk(ROOT);
let fixed = 0, skipped = 0, unchanged = 0;

for (const fp of files) {
  const original = fs.readFileSync(fp, 'utf8');
  const decoded  = tryDecode(original);

  if (decoded === null) {
    // Mixed or already-clean file — try a line-by-line pass so we can still
    // fix individual lines that are pure mojibake.
    const lines = original.split('\n');
    let changed = false;
    const fixed_lines = lines.map(line => {
      const d = tryDecode(line);
      if (d !== null && d !== line) { changed = true; return d; }
      return line;
    });
    if (changed) {
      fs.writeFileSync(fp, fixed_lines.join('\n'), 'utf8');
      const rel = path.relative(ROOT, fp);
      console.log('FIXED (line-by-line):', rel);
      fixed++;
    } else {
      unchanged++;
    }
  } else if (decoded !== original) {
    fs.writeFileSync(fp, decoded, 'utf8');
    const rel = path.relative(ROOT, fp);
    console.log('FIXED (whole-file):', rel);
    fixed++;
  } else {
    unchanged++;
  }
}

console.log(`\nDone. fixed=${fixed}  unchanged=${unchanged}  skipped=${skipped}`);
