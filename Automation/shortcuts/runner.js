'use strict';

const path = require('path');
const { log, delay } = require('../lib/runtime');
const { doNotification } = require('../lib/notifications');
const { notifyDelayForFile } = require('../constants/timing');
const {
  getShortcut,
  buildShortcutSteps,
  resolveRequiredIds,
  assertRequiredIds,
} = require('./registry');

/**
 * Execute an activation shortcut: validate IDs, then fire each notify step
 * with the same post-notify delay policy as journey `notify` steps.
 */
async function runShortcut(vars, shortcutId, opts = {}) {
  const shortcut = getShortcut(shortcutId);
  if (!shortcut) throw new Error(`Unknown shortcut: ${shortcutId}`);

  const requiredIds = resolveRequiredIds(shortcut, opts);
  assertRequiredIds(vars, requiredIds);

  const steps = buildShortcutSteps(shortcutId, opts);
  if (!steps.length) throw new Error(`Shortcut "${shortcutId}" produced no steps`);

  log('START', `Shortcut: ${shortcutId} (${steps.length} step(s))`);
  let notifyNum = 0;
  const notifyCount = steps.filter((s) => s.type === 'notify').length;

  for (const step of steps) {
    if (step.type !== 'notify') {
      throw new Error(`Unsupported shortcut step type "${step.type}" in ${shortcutId}`);
    }
    notifyNum += 1;
    log('PROGRESS', `[${notifyNum}/${notifyCount}]`);
    const label = path.basename(step.file, '.bru');
    const nRes = await doNotification(vars, step.file);
    if (!nRes.ok) {
      const detail = `HTTP ${nRes.status} — ${JSON.stringify(nRes.body).slice(0, 300)}`;
      throw new Error(`Shortcut notify ${label} failed: ${detail}`);
    }
    log('OK', `Notify ${label} => HTTP ${nRes.status}`);
    const notifyDelay = step.delay != null ? step.delay : notifyDelayForFile(step.file);
    log('WAIT', `Pausing ${notifyDelay / 1000}s after notification...`);
    await delay(notifyDelay);
  }

  log('DONE', `Shortcut ${shortcutId} finished`);
  return { ok: true, shortcutId, steps: steps.length };
}

module.exports = { runShortcut };
