# Tasks

## 1. Repeated fleet off/on toggles reattach after current verification while obsolete replies remain rejected

- [ ] 1.1 Extend the packaged Settings/Spaces fixture to begin verified, retain the same module instances and shared state, then repeat off/on at 0, 1000 and 15000 ms with realistic delayed reads and existing timer callbacks; capture the first failing assertion and PR 44 diagnostic reason before editing runtime code.
- [ ] 1.2 Trace the failed sequence through preference generation, shared reader token/deadline, attempt TTL, identity signature and display publication; record the demonstrated cause and distinguish it from the recovered live expired-read observation in a checkout artifact.
- [ ] 1.3 Correct only the demonstrated lifecycle boundary so the first successful current read reattaches immediately; verify each delay matrix locally and on a ready remote machine without closing Settings or triggering unrelated events.
- [ ] 1.4 Add repeated-cycle regressions with old successes and failures completing before and after the latest reply; assert obsolete-generation/token/identity replies cannot overwrite presentation, fresh action facts, read ownership or retry state, and assert local reads completing below two seconds reattach within that bound.
- [ ] 1.5 Preserve independent colours and row order on every off transition, shared colour and both chain markers after successful on verification, truthful native numbers, guarded action authority and unchanged native topology; verify through the real row renderer and focused existing fleet regressions.
- [ ] 1.6 Update relevant testing documentation with the failing reason, successful regression matrix and native-evidence limits; run the targeted regression and OpenSpec validation, then run CI=true npm run test:ci only after confirming no other suite is running and record its result.
- [ ] 1.7 Report final-head required-check statuses and any draft-related skipped checks without claiming they passed; leave the PR unmerged and never mark it ready, and document any unresolved reproduction or native-validation gap.
