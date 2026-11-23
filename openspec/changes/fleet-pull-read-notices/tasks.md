# Tasks

## 1. Task PR reads retain last-good facts and classify GitHub response failures separately from transport outages

- [x] 1.1 Repeat the real-provider crew 8 plus finished-task crew 5/6/7 fixture through the host exec seam, recording sanitized command, repository, machine, exit status, timing and stderr; identify any failing layer before changing targeted read behavior, or document the still-unreproduced original transport failure.
- [x] 1.2 Preserve machine-qualified targeted reads, full PR identity and last-good state/completion facts; add a deterministic one-live-open/three-finished-merged regression asserting Open 1 / Closed 3, exact rows, no historical robots and maximum three concurrent reads.
- [x] 1.3 Classify GitHub resource/HTTP/GraphQL, auth and quota responses separately from genuine DNS/connection/transport failures without double-classifying formatted messages; cover these categories and ordinary folder-Git compatibility in focused pull tests.
- [x] 1.4 Keep the strict 24-hour mergedAt/closedAt history rule and existing live-task exception, with fixture assertions for expired, missing, invalid and future completion dates and same-number PRs in other repositories.

## 2. Repository sections show one truthful tab-scoped read notice without leaking finished Closed failures into Open

- [x] 2.1 Derive one repository-and-tab notice from applicable failures rather than render each entry error; cover known Open versus Closed state and historical-only unknown-state load failures in aggregate tests.
- [x] 2.2 Replace only the scoped error-render path in the section body; add real-controller render assertions that the exact one-live/three-merged fixture has no error under Open, at most one notice under Closed after three refresh failures, and unaffected rows remain visible.
- [x] 2.3 Cover genuine unreachability, GitHub refusals, mixed causes, partial/full recovery, historical expiry, folds, other repository sections, unenrolled repositories and stale/hidden contexts without extra reads; update applicable testing/architecture documentation with these guarantees.
- [ ] 2.4 Rebase on the default branch while preserving concurrent enrollment-picker, discovery and label-style work; run focused regressions and CI=true npm run test:ci, recording actual results and the remaining native-transport reproduction limitation.
