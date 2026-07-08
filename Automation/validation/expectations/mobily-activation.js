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
 * Example (verify names first, then uncomment / adapt):
 *
 *   activities: [
 *     { name: 'CPE Installation', requiredStatus: 'Completed' },
 *     { name: 'UAT',              requiredStatus: 'Completed',
 *       requiredFields: { CompletionDate: 'nonempty' } },
 *   ],
 *   ordered: true,
 */

module.exports = {
  ordered: true,
  activities: [],
};
