# Design — Activity Validation (Engine)

Status: approved (brainstorm 2026-07-07)

## Goal

After a journey run, capture the order's **Activities** (the portal "activity
system tab") and validate them against a per-journey expectation: are the
expected system activities present, with the right status, in the right order,
and with the right field shape?

## Scope / opt-in

Validation is **opt-in per journey**. If no expectation file exists for a
journey, validation is skipped (no-op). This keeps existing journeys unaffected
until an expectation is authored.

## Capturing activities

The runtime order-detail URL (`buildOrderDetailUrl`) omits `includeActivity`, so
`Activities` comes back empty. A new builder requests the full payload:

- `lib/url-builder.js` → `buildOrderDetailFullUrl(vars)` mirrors the enrich
  params the portal UI / Search use (`FTTH-Mobily-Toolkit/search.js`
  `buildPortalOrderDetailUrl`), including `includeActivity=true`.
- `lib/activities.js` → `doFetchActivities(vars)` GETs that URL and returns
  `data.Activities` (always an array, `[]` if absent).

## Expectation schema

One file per journey at `validation/expectations/<journeyName>.js`:

```js
module.exports = {
  ordered: true,               // if true, matched activities must be non-decreasing
  activities: [
    {
      name: 'CPE Installation', // matched (case-insensitive) against activity name/type
      exact: false,             // optional — require an exact name/type equality
      requiredStatus: 'Completed', // optional — case-insensitive status compare
      requiredFields: {         // optional — shape check on the raw activity object
        // field: 'string' | 'number' | 'boolean' | 'nonempty' | 'present'
        StartDate: 'nonempty',
      },
    },
  ],
};
```

An empty `activities: []` is valid and passes trivially (safe placeholder).

## Validator

`validation/validate-activities.js`:

- `normalizeActivity(a)` maps varied field names
  (`Name/name/ActivityName`, `Type/type/ActivityType`,
  `Status/status/State/InteractionStatusName`) to `{ name, type, status, raw }`.
- `validateActivities(activities, expectation)` → `{ pass, checks: [...] }` where
  each check is `{ name, status: 'pass'|'fail', expected, actual, message? }`.
  It emits presence, status, field, and (when `ordered`) a single order check.
  `pass` is true only if every check passes.

`validation/index.js`:

- `getExpectationForJourney(journeyName)` loads
  `validation/expectations/<journeyName>.js` (sanitised filename), or `null`.
  The expectations directory name is centralised in `constants/paths.js`
  (`VALIDATION.expectationsDir`).

`core.js` re-exports `buildOrderDetailFullUrl`, `doFetchActivities`,
`validateActivities`, and `getExpectationForJourney`.

## Runner hook

`runner/runJourney` gains a 5th arg `onValidation`. After the steps finish
successfully:

1. `expectation = getExpectationForJourney(journeyName)`; skip if null.
2. `activities = await doFetchActivities(vars)`.
3. `result = validateActivities(activities, expectation)`.
4. Log a one-line `VALIDATE` summary; `await onValidation(result)` if provided.

Failures here are logged and swallowed (they do not fail the run) since the run
itself already completed — validation is a report, not a gate.

## Toolkit integration

`server.js` passes `onValidation` to `runJourney`; the result is stored on the
job (`job.validation`), persisted in `runs.json`, and broadcast over SSE as
`{ type: 'validation', jobId, result }`. The Queue page shows a pass/fail badge
plus per-check detail.

## Testing

`Automation/test/validate-activities.test.js` (node:test + assert): pass case,
missing activity, wrong status, out-of-order, missing/mistyped field, and the
empty-expectation no-op.
