'use strict';

/**
 * Batch 6: kebab renames for Shared WFM phases, request files, create-service OA,
 * maintenance, auth, and key SV/TMF641 filenames referenced by paths.js.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function renameRel(fromRel, toRel) {
  const from = path.join(root, fromRel);
  const to = path.join(root, toRel);
  if (!fs.existsSync(from)) {
    console.warn('MISS', fromRel);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (fs.existsSync(to)) {
    console.warn('EXISTS skip', toRel);
    return;
  }
  fs.renameSync(from, to);
  console.log('MV', fromRel, '→', toRel);
}

function renameInPlace(dirRel, fromName, toName) {
  renameRel(path.join(dirRel, fromName).replace(/\\/g, '/'), path.join(dirRel, toName).replace(/\\/g, '/'));
}

// WFM CPE phases
renameRel('Shared-Workflows/WFM-CPE/Phase 1', 'Shared-Workflows/WFM-CPE/Phase-1');
renameRel('Shared-Workflows/WFM-CPE/Phase 2', 'Shared-Workflows/WFM-CPE/Phase-2');

// TMF641 / SV / Create-Service / Device-Swap / Get-Order / ME-2041
renameInPlace('Shared-Workflows/TMF641-Notifications', '641 Cease - Termination.bru', 'TMF641-Cease-Termination.bru');
renameInPlace('Shared-Workflows/TMF641-Notifications', '641 Suspend.bru', 'TMF641-Suspend.bru');
renameInPlace(
  'Shared-Workflows/TMF641-Notifications',
  'Service-Order-Completed.bru',
  'TMF641-Service-Order-Completed.bru',
);
renameInPlace(
  'Shared-Workflows/TMF641-Notifications',
  'Service-Order-InProgress.bru',
  'TMF641-Service-Order-InProgress.bru',
);
renameInPlace(
  'Shared-Workflows/TMF641-Notifications',
  'Service-Order-Error-1000-OK.bru',
  'TMF641-Service-Order-Error-1000-OK.bru',
);

renameInPlace(
  'Shared-Workflows/SingleView-Integration/Order-Completion',
  'Provisioning-Completed.bru',
  'SV-Provisioning-Completed.bru',
);
renameInPlace(
  'Shared-Workflows/SingleView-Integration/Order-Completion',
  'UAT-Completed.bru',
  'SV-UAT-Completed.bru',
);
renameInPlace(
  'Shared-Workflows/SingleView-Integration/Order-Completion',
  'Pre-Completion.bru',
  'SV-Pre-Completion.bru',
);
renameInPlace(
  'Shared-Workflows/SingleView-Integration/Custom-Notifications',
  'ODB-Patch-Notification.bru',
  'SV-ODB-Patch-Notification.bru',
);

for (const p of ['STC', 'ITC', 'ACES', 'DOWIYAT']) {
  renameInPlace(
    'Shared-Workflows/Create-Service-Order-OA',
    `Create Service OA - ${p}.bru`,
    `Create-Service-OA-${p}.bru`,
  );
}

renameInPlace('Shared-Workflows/Cancel-Order-OA', '622 - Cancel Order.bru', '622-Cancel-Order.bru');
renameInPlace('Shared-Workflows/Get-Order', 'Get Order.bru', 'Get-Order.bru');
renameInPlace(
  'Shared-Workflows/Device-Swap-Notification',
  'Device Swap Required.bru',
  'Device-Swap-Required.bru',
);
renameInPlace('Shared-Workflows/WFM-ME', '2041 - ME.bru', 'ME-2041.bru');

// Auth
const authMap = {
  'Auth Dev 1.bru': 'Auth-Dev-1.bru',
  'Auth Dev 2.bru': 'Auth-Dev-2.bru',
  'Auth Dev 3.bru': 'Auth-Dev-3.bru',
  'Auth Dev On Prem.bru': 'Auth-Dev-On-Prem.bru',
  'Auth SIT.bru': 'Auth-SIT.bru',
};
for (const [from, to] of Object.entries(authMap)) {
  renameInPlace('Authentication', from, to);
}

// Mesh-Extender → ME-Standalone
for (const scope of ['Mobily', 'OpenAccess/STC', 'OpenAccess/ITC', 'OpenAccess/ACES', 'OpenAccess/DOWIYAT']) {
  const oldDir = `${scope}/Mesh-Extender-Standalone`;
  const newDir = `${scope}/ME-Standalone`;
  if (!exists(oldDir)) continue;
  renameRel(oldDir, newDir);
  const oldFile =
    scope === 'Mobily'
      ? 'Mesh Extender Standalone - Mobily.bru'
      : `Mesh Extender Standalone - ${scope.split('/').pop()}.bru`;
  const newFile =
    scope === 'Mobily' ? 'MOB-ME-Standalone.bru' : `${scope.split('/').pop()}-ME-Standalone.bru`;
  renameInPlace(newDir, oldFile, newFile);
}

// Mobily journey requests
const mobilyRequests = [
  ['Relocation', 'Request - Mobily.bru', 'MOB-Relocation-Request.bru'],
  ['Device-Swap', 'Request - CPE - Mobily.bru', 'MOB-Device-Swap-CPE-Request.bru'],
  ['Device-Swap', 'Request - HAG - Mobily.bru', 'MOB-Device-Swap-HAG-Request.bru'],
  ['Downgrade', 'Request - Mobily.bru', 'MOB-Downgrade-Request.bru'],
  ['Upgrade', 'Request - Mobily.bru', 'MOB-Upgrade-Request.bru'],
  ['Rewiring', 'Request - Mobily.bru', 'MOB-Rewiring-Request.bru'],
  ['Suspend', 'Request - Mobily.bru', 'MOB-Suspend-Request.bru'],
  ['Termination', 'Request - Mobily.bru', 'MOB-Termination-Request.bru'],
  ['Maintenance', 'Maintenance Order - Mobily.bru', 'MOB-Maintenance-Order.bru'],
  ['Request-Update', 'Request Update Mobily.bru', 'MOB-Request-Update.bru'],
];
for (const [journey, from, to] of mobilyRequests) {
  renameInPlace(`Mobily/${journey}`, from, to);
}

// OA journey requests + maintenance
for (const p of ['STC', 'ITC', 'ACES', 'DOWIYAT']) {
  const journeys = [
    ['Relocation', `Request - ${p}.bru`, `${p}-Relocation-Request.bru`],
    ['Device-Swap', `Request - ${p}.bru`, `${p}-Device-Swap-Request.bru`],
    ['Downgrade', `Request - ${p}.bru`, `${p}-Downgrade-Request.bru`],
    ['Upgrade', `Request - ${p}.bru`, `${p}-Upgrade-Request.bru`],
    ['Rewiring', `Request - ${p}.bru`, `${p}-Rewiring-Request.bru`],
    ['Suspend', `Request - ${p}.bru`, `${p}-Suspend-Request.bru`],
    ['Resume', `Request - ${p}.bru`, `${p}-Resume-Request.bru`],
    ['Termination', `Request - ${p}.bru`, `${p}-Termination-Request.bru`],
    ['Maintenance', `Maintenance Order - ${p}.bru`, `${p}-Maintenance-Order.bru`],
    ['Maintenance', `PATCH - Close - Maintenance Order - ${p}.bru`, `${p}-Maintenance-Patch-Close.bru`],
    ['Maintenance', `PATCH - ReOpen - Maintenance Order - ${p}.bru`, `${p}-Maintenance-Patch-ReOpen.bru`],
    ['Request-Update', `Request Update ${p}.bru`, `${p}-Request-Update.bru`],
  ];
  for (const [journey, from, to] of journeys) {
    renameInPlace(`OpenAccess/${p}/${journey}`, from, to);
  }
}

console.log('batch 6 renames complete');
