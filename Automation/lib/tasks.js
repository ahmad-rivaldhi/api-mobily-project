/**
 * Telflow task helpers. Used by the toolkit dashboard to list and complete
 * tasks attached to an order (e.g. UAT confirmation, OLO acknowledgement).
 */

const { httpRequest } = require('./http');
const { buildTaskListUrl, buildTaskCompleteUrl } = require('./url-builder');

async function doListTasks(vars) {
  return httpRequest('GET', buildTaskListUrl(vars), {
    Authorization: `Bearer ${vars.authToken}`,
  });
}

async function doCompleteTask(vars, taskId) {
  return httpRequest(
    'POST',
    buildTaskCompleteUrl(vars, taskId),
    {
      Authorization: `Bearer ${vars.authToken}`,
      'Content-Type': 'application/json',
    },
    '{}',
  );
}

module.exports = {
  doListTasks,
  doCompleteTask,
};
