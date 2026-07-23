'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../journeys/registry.js');
let s = fs.readFileSync(file, 'utf8');

const reps = [
  ["mobilyJourneyFile(JOURNEY.relocation, 'Request - Mobily.bru')", "mobilyJourneyFile(JOURNEY.relocation, 'MOB-Relocation-Request.bru')"],
  ["mobilyJourneyFile(JOURNEY.deviceSwap, 'Request - CPE - Mobily.bru')", "mobilyJourneyFile(JOURNEY.deviceSwap, 'MOB-Device-Swap-CPE-Request.bru')"],
  ["mobilyJourneyFile(JOURNEY.deviceSwap, 'Request - HAG - Mobily.bru')", "mobilyJourneyFile(JOURNEY.deviceSwap, 'MOB-Device-Swap-HAG-Request.bru')"],
  ["mobilyJourneyFile(JOURNEY.rewiring, 'Request - Mobily.bru')", "mobilyJourneyFile(JOURNEY.rewiring, 'MOB-Rewiring-Request.bru')"],
  ["mobilyJourneyFile(JOURNEY.upgrade, 'Request - Mobily.bru')", "mobilyJourneyFile(JOURNEY.upgrade, 'MOB-Upgrade-Request.bru')"],
  ["mobilyJourneyFile(JOURNEY.downgrade, 'Request - Mobily.bru')", "mobilyJourneyFile(JOURNEY.downgrade, 'MOB-Downgrade-Request.bru')"],
  ["mobilyJourneyFile(JOURNEY.suspend, 'Request - Mobily.bru')", "mobilyJourneyFile(JOURNEY.suspend, 'MOB-Suspend-Request.bru')"],
  ["mobilyJourneyFile(JOURNEY.termination, 'Request - Mobily.bru')", "mobilyJourneyFile(JOURNEY.termination, 'MOB-Termination-Request.bru')"],
];

for (const [a, b] of reps) {
  if (!s.includes(a)) console.warn('MISS', a);
  s = s.split(a).join(b);
}

for (const prov of ['DOWIYAT', 'STC', 'ITC', 'ACES']) {
  const map = [
    ['relocation', `${prov}-Relocation-Request.bru`],
    ['deviceSwap', `${prov}-Device-Swap-Request.bru`],
    ['rewiring', `${prov}-Rewiring-Request.bru`],
    ['suspend', `${prov}-Suspend-Request.bru`],
    ['resume', `${prov}-Resume-Request.bru`],
    ['termination', `${prov}-Termination-Request.bru`],
    ['downgrade', `${prov}-Downgrade-Request.bru`],
    ['upgrade', `${prov}-Upgrade-Request.bru`],
  ];
  for (const [j, name] of map) {
    const old = `oaJourneyFile('${prov}', JOURNEY.${j}, 'Request - ${prov}.bru')`;
    const neu = `oaJourneyFile('${prov}', JOURNEY.${j}, '${name}')`;
    if (s.includes(old)) s = s.split(old).join(neu);
  }
}

fs.writeFileSync(file, s);
console.log('registry request names patched');
