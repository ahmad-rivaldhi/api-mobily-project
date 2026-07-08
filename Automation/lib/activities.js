/**
 * Fetch the order's activity ("system") tab. The runtime order-detail URL omits
 * `includeActivity`, so this uses the full portal URL that populates
 * `data.Activities`. Used by the post-run activity validation (see
 * `validation/`).
 */

const { httpRequest } = require('./http');
const { buildOrderDetailFullUrl } = require('./url-builder');

/**
 * @param {object} vars  must contain `demo-mob-dev`, `orderId`, `authToken`
 * @returns {Promise<object[]>} the Activities array (empty if none/absent)
 */
async function doFetchActivities(vars) {
  if (!vars || !vars.orderId) throw new Error('doFetchActivities: orderId is required');
  const url = buildOrderDetailFullUrl(vars);
  const res = await httpRequest('GET', url, { Authorization: `Bearer ${vars.authToken}` });
  if (!res.ok) {
    throw new Error(`Full order detail returned HTTP ${res.status}`);
  }
  const data = (res.body && (res.body.data || res.body.Data)) || res.body;
  if (!data || typeof data !== 'object') return [];
  const activities = data.Activities || data.activities;
  return Array.isArray(activities) ? activities : [];
}

module.exports = {
  doFetchActivities,
};
