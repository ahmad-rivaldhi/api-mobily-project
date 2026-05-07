/**
 * Public facade for the FTTH Mobily journey automation.
 *
 * The implementation lives in focused modules under `Automation/lib/`,
 * `Automation/providers/`, `Automation/journeys/`, and `Automation/runner/`.
 * `core.js` exists so existing consumers (`journey-runner.js`,
 * `FTTH-Mobily-Toolkit/server.js`) keep working with `require('./core')`.
 *
 * Module layout (Single Responsibility / SOLID):
 *
 *   lib/runtime.js          init, log, delay, cancellation
 *   lib/env-bru.js          parse env + bruno files
 *   lib/json-utils.js       subVars, cleanJsonBody, deepFindCharacteristic
 *   lib/url-builder.js      portal URL builders
 *   lib/http.js             httpRequest + runBruRequest (with audit logs)
 *   lib/auth.js             OAuth per environment
 *   lib/b2b.js              B2B message helpers
 *   lib/state.js            order state extraction + waiting
 *   lib/extractors.js       polling-based ID extractors
 *   lib/notifications.js    notify / create-order / SV trigger
 *   lib/tasks.js            Telflow task helpers
 *
 *   providers/network-category.js  FTTH CONSUMER vs FTTH RCY routing
 *   providers/mobily.js            Mobily activation + field-work builders
 *   providers/openaccess.js        OA notifications, ID specs, builder
 *
 *   journeys/builders.js    generic journey patterns
 *   journeys/labels.js      label arrays + state maps + failure code lists
 *   journeys/registry.js    JOURNEY_REGISTRY
 *
 *   runner/state-detector.js   detectOrderPosition
 *   runner/extract-all-ids.js  toolkit one-shot ID snapshot
 *   runner/resume.js           resumeFrom logic
 *   runner/step-executor.js    step.type dispatcher
 *   runner/runner.js           runJourney
 */

const { init, log, delay, setCancelCheck } = require('./lib/runtime');
const { parseBruFile, parseEnvFile, listEnvironments } = require('./lib/env-bru');
const { subVars, cleanJsonBody, deepFindCharacteristic } = require('./lib/json-utils');
const { buildB2bUrl, buildOrderDetailUrl } = require('./lib/url-builder');
const { httpRequest, runBruRequest } = require('./lib/http');
const { doAuth } = require('./lib/auth');
const { doListB2b } = require('./lib/b2b');
const {
  extractSubState,
  extractInventoryId,
  findSvReferenceInOrderData,
  doWaitForOrderState,
  doCheckState,
} = require('./lib/state');
const {
  doExtractServiceOrderId,
  doExtractSvActionId,
  doExtractWorkOrderIds,
  doExtractOdbPatchActionId,
} = require('./lib/extractors');
const {
  doNotification,
  doCreateOrder,
  doTriggerSvNotification,
} = require('./lib/notifications');
const { doListTasks, doCompleteTask } = require('./lib/tasks');

const {
  buildMobilyActivation,
  buildMobilyFieldWork,
} = require('./providers/mobily');
const {
  doExtractOpenAccessProviderIds,
  buildOpenAccessActivation,
} = require('./providers/openaccess');

const {
  buildOAFieldWork,
  buildSimpleOrder,
  buildSuspendOrder,
  buildFailureJourney,
  buildMaintenanceOrder,
} = require('./journeys/builders');
const {
  JOURNEY_REGISTRY,
  JOURNEYS,
  getJourneyStepLabels,
  listJourneys,
  listJourneyTree,
} = require('./journeys/registry');

const { detectOrderPosition } = require('./runner/state-detector');
const { doExtractAllIds } = require('./runner/extract-all-ids');
const { runJourney } = require('./runner/runner');

module.exports = {
  // runtime / generic utilities
  init,
  log,
  delay,
  setCancelCheck,

  // parsing
  parseBruFile,
  parseEnvFile,
  listEnvironments,

  // json / template helpers
  subVars,
  cleanJsonBody,
  deepFindCharacteristic,

  // URL builders
  buildB2bUrl,
  buildOrderDetailUrl,

  // HTTP
  httpRequest,
  runBruRequest,

  // domain actions
  doAuth,
  doCreateOrder,
  doNotification,
  doExtractServiceOrderId,
  doExtractSvActionId,
  doExtractWorkOrderIds,
  doExtractOpenAccessProviderIds,
  doExtractOdbPatchActionId,
  doWaitForOrderState,
  doCheckState,
  doListB2b,
  doExtractAllIds,
  doTriggerSvNotification,
  doListTasks,
  doCompleteTask,

  // order state helpers
  extractSubState,
  extractInventoryId,
  findSvReferenceInOrderData,

  // journey builders (in case CLI tools build steps directly)
  buildMobilyActivation,
  buildOpenAccessActivation,
  buildMobilyFieldWork,
  buildOAFieldWork,
  buildSimpleOrder,
  buildFailureJourney,
  buildMaintenanceOrder,
  buildSuspendOrder,

  // journey registry / catalogue
  JOURNEYS,
  JOURNEY_REGISTRY,
  getJourneyStepLabels,
  listJourneys,
  listJourneyTree,

  // execution
  detectOrderPosition,
  runJourney,
};
