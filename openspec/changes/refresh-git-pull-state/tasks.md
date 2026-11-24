# Tasks

## 1. State-and-check freshness through existing refresh paths

- [x] 1.1 Add a packaged coordinator reproduction using fake Crew/GitHub and the actual relay consumer: settled Open merges during and outside an in-flight read; sample state and counts across the cycle and same-home verification, recording whether the enrolled fault reproduces.
- [x] 1.2 Extend the bounded repository fallback query/parser and scheduler with thin state, draft/completion/head and rollup-summary probes for shown settled Open/Draft rows; fetch full contexts only for changed head/summary rows, verifying 45/120-second timing, bounded chunks and unchanged-row cost regressions.
- [x] 1.3 Preserve request leases, epoch/generation guards, complete-batch publication, backoff and visibility/offline/stale-context cancellation; verify secondary limits keep values, wait at least 15 minutes and honor longer Retry-After values without immediate retries.
- [x] 1.4 Repair any lost aggregate event invalidation established by the reproduction without changing PR #45 transport/notices unnecessarily; verify a merge/close event during a read produces the required coalesced state reread.
- [x] 1.5 Update README.md, docs/GIT-WEBHOOKS.md, docs/ARCHITECTURE.md and applicable testing guidance for state-and-check fallback and honest enrolled/unenrolled latency bounds; check descriptions against scheduler/query tests.

## 2. Coherent list membership, counts and retained presentation

- [x] 2.1 Publish aggregate row state and completion timestamp coherently so existing eligibility and derived totals move merge/close/reopen/draft rows correctly; verify live/history deduplication, 24-hour bounds, no historical robots and stable unrelated order in packaged fleet/history fixtures.
- [x] 2.2 Reconcile ordinary cached tabs and older related pins after every state refresh, with authoritative repository totals rather than paginated-subset deltas; verify merge/close/reopen/draft transitions, loaded/unloaded destination tabs, expanded pagination, pin uniqueness and no empty intermediate frame.
- [x] 2.3 Exercise both enrolled event and unenrolled fallback paths across both views with retained-render and stale-response assertions; verify unaffected rows keep order and existing folds, counts and pin geometry survive pending or failed reads.
- [ ] 2.4 Integrate latest default-branch work, preserving PR #45 changes if landed, and run focused suites plus CI=true npm run test:ci only when no other suite is running; record the exact final head, reproduction root cause/evidence limits and required-check status in the handoff, keeping the PR draft.
