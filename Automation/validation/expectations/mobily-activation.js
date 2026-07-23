/**
 * Activity-tab expectation for the `mobily-activation` journey.
 *
 * IMPORTANT: The `activities` list below is intentionally EMPTY so validation
 * runs but passes trivially — it will not raise false failures on real runs.
 * The exact activity names/statuses depend on the live Telflow environment and
 * MUST be verified against a completed order (Detect → full order detail, or
 * Search by Order ID) before enabling real assertions.
 *
 * To enable, fill `activities` using the schema shown in the commented example.
 * Matching is case-insensitive substring against each activity's name/type.
 *
 * `source`: 'activities' (default — order-detail Activities[]) or 'b2b' (the
 * portal "System" tab, i.e. B2B messages). For B2B, each item exposes the
 * parsed `Message.Data` payload as `Data`, and matching is by the message
 * `Action`.
 *
 * Example — validate the ODB Patching Action Request payload from the System
 * tab (verify against a real order via the Validation page → Source "B2B"):
 *
 *   source: 'b2b',
 *   activities: [
 *     {
 *       name: 'ODB Patching Action Request',   // matches the B2B Action
 *       requiredStatus: 'Delivered',
 *       assert: [
 *         { path: 'Data.type', equals: 'ODB Patching' },
 *         { path: 'Data.orderId', type: 'nonempty' },
 *         { path: 'Data.characteristic[name=odbId].value', matches: '^JED-' },
 *         { path: 'Data.characteristic[name=serviceAddress].value', type: 'nonempty' },
 *         { path: 'Data.characteristic[name=appointmentId].value', type: 'nonempty' },
 *         { path: 'Data.characteristic[name=appointmentStartDate].value',
 *           matches: '^\\d{4}-\\d{2}-\\d{2}T' },
 *       ],
 *     },
 *   ],
 *   ordered: false,
 */

module.exports = {
  ordered: true,
  activities: [],
};
