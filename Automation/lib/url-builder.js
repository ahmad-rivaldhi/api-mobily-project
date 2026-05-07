/**
 * URL builders for the Telflow portal API. Pure functions of `vars`.
 */

function buildB2bUrl(vars) {
  const baseUrl = vars['demo-mob-dev'];
  const orderId = vars.orderId;
  return (
    `${baseUrl}/portal/api/b2b/message?` +
    `businessInteractionIds%5B%5D=${orderId}&maxRows=50&` +
    `orderBy%5B%5D=%7B%22propertyName%22%3A%22DeliveredDate%22%2C%22direction%22%3A%22DESC%22%7D&` +
    `startRowIndex=0`
  );
}

function buildOrderDetailUrl(vars) {
  const baseUrl = vars['demo-mob-dev'];
  return (
    `${baseUrl}/portal/api/order/order/${vars.orderId}` +
    `?includeBusinessInteractionVersion=All&includeInventory=true` +
    `&enrichElements=Specification,PartyRole,Offering,Place`
  );
}

function buildTaskListUrl(vars) {
  const baseUrl = vars['demo-mob-dev'];
  return `${baseUrl}/portal/api/v1/tasks?businessInteractionId=${encodeURIComponent(vars.orderId)}`;
}

function buildTaskCompleteUrl(vars, taskId) {
  const baseUrl = vars['demo-mob-dev'];
  return `${baseUrl}/portal/api/v1/tasks/${encodeURIComponent(taskId)}/complete`;
}

module.exports = {
  buildB2bUrl,
  buildOrderDetailUrl,
  buildTaskListUrl,
  buildTaskCompleteUrl,
};
