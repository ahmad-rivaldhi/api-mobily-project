'use strict';

/**
 * Batch 5: flatten TMF-622 create-order layout per collection naming design.
 * - Drop Prepaid/Postpaid folders (Postpaid bodies become canonical)
 * - Drop with-N-ME folders (ME encoded in filename)
 * - Rename folder to 622-Create-Sales-Order
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, body) {
  ensureDir(path.dirname(file));
  let next = body;
  const base = path.basename(file, '.bru');
  next = next.replace(/^(\s*name:\s*).+$/m, `$1${base}`);
  fs.writeFileSync(file, next, 'utf8');
  console.log('WRITE', path.relative(root, file));
}

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('RM', path.relative(root, dir));
  }
}

function copyMapped(srcRel, destRel) {
  const src = path.join(root, srcRel);
  const dest = path.join(root, destRel);
  if (!fs.existsSync(src)) {
    console.warn('MISS', srcRel);
    return;
  }
  write(dest, read(src));
}

// --- Mobily ---
const mobBaseOld = 'Mobily/Activation/TMF-622 Create Sales Order';
const mobBaseNew = 'Mobily/Activation/622-Create-Sales-Order';

for (const me of [0, 1, 2, 3]) {
  const meFolder = me === 0 ? 'without ME' : `with ${me} ME`;
  const meSuffix = me === 0 ? '' : `-${me}-ME`;
  const oldName = me === 0 ? 'FTTH-Postpaid-No-ME.bru' : `FTTH-Postpaid-With-${me}-ME.bru`;
  copyMapped(
    `${mobBaseOld}/FTTH Consumer/${meFolder}/${oldName}`,
    `${mobBaseNew}/FTTH-Consumer/MOB-FTTH-Consumer${meSuffix}.bru`,
  );
}

for (const me of [0, 1, 2, 3]) {
  const meFolder = me === 0 ? 'without ME' : `with ${me} ME`;
  const meSuffix = me === 0 ? '' : `-${me}-ME`;
  const oldName = me === 0 ? 'FTTH-Royal-Postpaid-No-ME.bru' : `FTTH-Royal-Postpaid-With-${me}-ME.bru`;
  copyMapped(
    `${mobBaseOld}/FTTH RCY/Postpaid/${meFolder}/${oldName}`,
    `${mobBaseNew}/FTTH-RCY/MOB-FTTH-RCY${meSuffix}.bru`,
  );
}

const apptSrc = path.join(root, mobBaseOld, 'FTTH Consumer/without ME/MOB - Update Appointment.bru');
const apptDest = path.join(root, 'Mobily/Activation/622-Update-Appointment.bru');
if (fs.existsSync(apptSrc)) {
  write(apptDest, read(apptSrc));
}

rmDir(path.join(root, mobBaseOld));

// --- OpenAccess ---
for (const provider of ['STC', 'ITC', 'ACES', 'DOWIYAT']) {
  const oldBase = `OpenAccess/${provider}/Activation/TMF-622 Create Sales Order`;
  const newBase = `OpenAccess/${provider}/Activation/622-Create-Sales-Order`;
  for (const me of [0, 1, 2, 3]) {
    const meFolder = me === 0 ? 'without ME' : `with ${me} ME`;
    const meSuffix = me === 0 ? '' : `-${me}-ME`;
    const oldName =
      me === 0 ? `FTTH-${provider}-Postpaid-No-ME.bru` : `FTTH-${provider}-Postpaid-With-${me}-ME.bru`;
    copyMapped(`${oldBase}/${meFolder}/${oldName}`, `${newBase}/${provider}-FTTH${meSuffix}.bru`);
  }
  rmDir(path.join(root, oldBase));
}

console.log('622 flatten complete');
