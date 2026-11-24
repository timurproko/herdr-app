# Approved amendment: stale failures, missing PRs and transport cost

The coordinator explicitly requested this repair after reviewing PR #45. Continue
on its existing branch/PR, preserving the finalization commit and render findings.

## Delivered outcomes within the existing repository-read outcome

- Reproduce the disabled-Git HTTP 404 response starting an account lookup; guard
  current request identity before diagnosis and bind the original repository.
  Cover 403 too, plus hidden, folder, machine and replaced/mutated repository cases.
- Classify missing-resource replies as `notfound`, without an account lookup or
  login-problem wording. Group missing historical PR numbers into one notice:
  `Task PR history: timurproko/crew #36, #37, #38 not found`. Preserve real
  permission/authentication wording and a known login or honest unknown identity.
  Clarify the older Truthful repository-scoped notices scenario so it no longer
  treats resource-resolution failure as permission evidence.
- Measure the Node environment carrier rather than assuming negligible overhead.
  User-home/Core measurements on this Windows host show 36.8 ms median bare Node
  startup; nine paired local CLI runs add median 49.6 ms, and five paired API runs
  add median 45.8 ms (network noise is not a precise process-only estimate).
- Avoid per-PR identity children: missing replies launch none; real permission
  failures share one identity query per repository/refresh, discarded afterward.
  A normal two-repository coordinator refresh uses zero new Node carriers for
  targeted PR reads. Two permission-failing repositories use at most two identity
  Node carriers, not one per failed PR. Existing pending-check queries already
  batch up to 20 PRs in each repository/chunk; no daemon or credential cache is added.
- Batch both count totals into list/page GraphQL snapshots instead of a second
  count-only Node/gh launch. Three real paired crew list/count measurements:
  2966→2383 ms, 2398→1977 ms, 2360→1751 ms; two Node carriers become one.
  These are transport measurements, not native end-to-end UI timing promises.

## Verification

The stale/disabled regression failed before the fix. Targeted tests cover missing
vs permission/auth classification, exact grouped notices, no lookup after context
invalidation, two account queries for twelve permission failures across two repos,
cache retirement/reverification and combined page/count reads. Run the full
`CI=true npm run test:ci` exclusively after targeted repairs; wait for final-head
required checks, update the complete task report and signal `crew done`.

No running installation, account, old task link or MyConfigs file may be modified;
no direct readiness, merge or deployment action is authorized.
