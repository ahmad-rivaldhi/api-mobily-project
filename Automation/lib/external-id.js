'use strict';

function generateTmf622ExternalId(random = Math.random) {
  return String(700000 + Math.floor(random() * 100000));
}

function isTmf622CreateOrder(bruFile) {
  return String(bruFile || '')
    .replace(/\\/g, '/')
    .includes('/622-Create-Sales-Order/') ||
    String(bruFile || '').replace(/\\/g, '/').includes('/TMF-622 Create Sales Order/');
}

function applyTmf622ExternalId(vars, bruFile, random = Math.random) {
  if (!isTmf622CreateOrder(bruFile)) return null;
  const externalId = generateTmf622ExternalId(random);
  vars.externalId = externalId;
  return externalId;
}

module.exports = {
  generateTmf622ExternalId,
  isTmf622CreateOrder,
  applyTmf622ExternalId,
};
