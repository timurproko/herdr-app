# Tasks

## 1. Unknown-revision titles stay quiet without changing update eligibility

- [ ] 1.1 Append the seven-character revision only when present in the shared row model; exact title assertions in tests/update-row.test.mjs must cover missing and known revisions without trailing spaces.
- [ ] 1.2 Extend the real row/model fixture across checking, available, launching/running, failed, partial, unknown-outcome and current/cached-current states; assert unchanged actions, enabled flags, current eligibility and diagnostic descriptions.
- [ ] 1.3 Replace the obsolete placeholder expectation in tests/update-check.test.mjs while retaining its real missing-evidence Update assertion; run both update-row and update-check fixtures with their VM flags.
- [ ] 1.4 Audit runtime tooltip/footer/menu consumers for repeated placeholders and update README.md, docs/COMMANDS.md and docs/TESTING.md for the bare unknown-revision title; source searches must find no runtime placeholder and docs must still explain provenance uncertainty honestly.

## 2. Update explanations distinguish native hourly checks from Custom discovery

- [ ] 2.1 Replace the Settings paragraph's ambiguous hourly claim with native Herdr/herdr-core hourly checks, Custom's normal 2–3 minute mounted cadence and optional configured merge hints, preserving corner indicators and terminal-continuity guidance; add focused copy assertions in tests/update-row.test.mjs.
- [ ] 2.2 Keep maintained update documentation consistent with the paragraph and existing failure backoff; run the focused row fixture and inspect the rendered-text inputs for accurate native versus Custom timing.
- [ ] 2.3 Run CI=true npm run test:ci before handoff and record its actual result, plus the unchanged source-inspected 0.1.17 host-review refusal; git diff must contain no host profile, detection, scheduling or deployment changes.
