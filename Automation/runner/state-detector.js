/**
 * Map portal/B2B state strings to a journey step number using the journey's
 * `stateMap`, then turn that into a "currentStep / completedSteps" snapshot
 * the toolkit dashboard can render.
 */

const { JOURNEY_REGISTRY } = require('../journeys/registry');

/**
 * Map a state string (which may be `"A|B"` from B2B notifications) to a
 * step number. Tries exact match, then each pipe-separated segment from
 * right-to-left, then falls back to a longest-prefix substring scan so
 * variants like `"In Progress|Pre-Completion"` still resolve.
 */
function resolveStepFromStateString(raw, stateMap) {
  if (!raw || !stateMap) return null;
  let s = String(raw).trim();
  s = s.replace(/\s*\|\s*/g, '|');
  if (stateMap[s] != null) return stateMap[s];
  const parts = s.split('|').map((x) => x.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (stateMap[p] != null) return stateMap[p];
  }
  const keys = Object.keys(stateMap).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (s.includes(k)) return stateMap[k];
  }
  return null;
}

/**
 * Resolve which journey step the order is currently sitting on.
 *
 * @param {string|null} orderDetailState  InteractionSubState from the portal
 * @param {string|null} b2bState          productOrder.state from B2B (often leads portal)
 * @param {string} journeyId
 * @returns {{ subState, currentStep, nextStepLabel, completedSteps, totalSteps } | null}
 */
function detectOrderPosition(orderDetailState, b2bState, journeyId) {
  // Back-compat: detectOrderPosition(subState, journeyId)
  if (journeyId === undefined && b2bState != null && JOURNEY_REGISTRY[b2bState]) {
    journeyId = b2bState;
    b2bState = null;
  }

  const entry = JOURNEY_REGISTRY[journeyId];
  if (!entry || !entry.stateMap) return null;

  let stepNum = null;
  let matchedOn = null;
  if (b2bState) {
    stepNum = resolveStepFromStateString(b2bState, entry.stateMap);
    if (stepNum != null) matchedOn = b2bState;
  }
  if (stepNum == null && orderDetailState) {
    stepNum = resolveStepFromStateString(orderDetailState, entry.stateMap);
    if (stepNum != null) matchedOn = orderDetailState;
  }
  if (stepNum == null) return null;

  const labels = typeof entry.stepLabels === 'function' ? entry.stepLabels({}) : entry.stepLabels;
  const safeLabels = labels || [];
  const completed = safeLabels.filter((l) => l.num < stepNum).map((l) => l.num);
  const nextLabel = safeLabels.find((l) => l.num === stepNum);
  return {
    subState: matchedOn,
    currentStep: stepNum,
    nextStepLabel: nextLabel ? nextLabel.label : null,
    completedSteps: completed,
    totalSteps: safeLabels.length,
  };
}

module.exports = {
  resolveStepFromStateString,
  detectOrderPosition,
};
