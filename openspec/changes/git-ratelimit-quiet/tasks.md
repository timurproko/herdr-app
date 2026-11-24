# Tasks

## 1. Rate-limit refusals stay quiet across all Git reads while preserving retry and actionable-error behavior

- [ ] 1.1 Add typed primary/secondary/429 refusal and Retry-After handling at the Git read boundary, including GraphQL errors in successful HTTP replies and sanitized panel-called worker results; verify classifier fixtures keep bare 403, authentication, network, timeout, abnormal-exit and malformed-response failures actionable.
- [ ] 1.2 Route list, count, older/pinned, aggregate/history, safety, detail, repository discovery, diagnosis and membership reads through shared cooldown admission; verify fake-clock fixtures enforce 90/180/360/720-second ordinary backoff, at least fifteen minutes or longer Retry-After for rate refusal, and no next-repository fan-out after refusal.
- [ ] 1.3 Preserve last-good rows/counts/pins/paging and cold standard Loading on typed refusal without a new error or Stale alarm; verify both-view controller/render fixtures cover every read path, a refused second chunk and an unrelated pre-existing actionable notice.
- [ ] 1.4 Admit one explicit manual Refresh API attempt during cooldown and log only once per refusal episode until successful recovery; verify repeated manual refusals remain quiet, hidden/controller recreation does not duplicate logs, and logging failures never block retry.
- [ ] 1.5 Document the quiet path and strict exceptions in docs/GIT-WEBHOOKS.md; verify the documented cold-load, manual-bypass, episode and cooldown behavior against targeted Git/fleet regressions.

## 2. Repository-batched shared reads and session-final caches eliminate redundant history and check-detail requests

- [ ] 2.1 Add module-session route-qualified facts and compatible in-flight subscriptions shared by ordinary and coordinator readers; verify overlapping reads issue one compatible request, different machines/credentials/repositories never mix, and stale subscribers cannot publish or authorize actions.
- [ ] 2.2 Replace per-PR aggregate reads with metadata/summary aliases in batches of at most twenty and preserve bounded concurrency and publication ordering; verify the two-repository 5-Open/30-Closed cold fixture uses two metadata batches, truthful full task totals and no unrelated repository inventory.
- [ ] 2.3 Cache known final facts across tab/context/controller recreation and hydrate demanded Closed pages from them; verify warm generic events/manual refresh/hide-show produce zero unchanged final targeted/detail reads, while twenty-four-hour expiry and verified task membership still update presentation locally.
- [ ] 2.4 Split list/targeted/event metadata from check contexts and reuse details for unchanged heads/summaries; verify cold and changed details stay in twenty-row chunks, thin safety probes retain forty-row bounds, latest-run/rerun semantics remain and a failed detail chunk retains the complete prior selection.
- [ ] 2.5 Carry an optional validated positive PR number through authenticated relay notices, bounded broker invalidation sets and panel consumption; verify precise reopen/relabel hints invalidate only affected final facts, forged hints fail authentication, old notices/consumers remain compatible and no cloud action is run.
- [ ] 2.6 Preserve PR 55 missing-history/live-miss caching, per-alias absence classification and scoped actionable failures under batching; verify existing missing-PR, routing, ordering, history and fleet-read regression cases plus mixed partial GraphQL results.
- [ ] 2.7 Document final-cache lifetime, explicit numbered-hint relay rollout and old-relay freshness limits, and add the cold/warm budget rows to docs/GIT-REQUEST-BUDGET.md; verify documented bounds using deterministic fixture call counts rather than claiming live measured savings.

## 3. Selected-tab, two-second event and activity-aware scheduling reduces reads without weakening shown-open safety freshness

- [ ] 3.1 Preserve affected repository identity and debounce event bursts in a bounded two-second window with one dirty follow-up; verify events during in-flight reads are not lost and the two-repository unchanged-burst fixture starts at most one logical refresh per affected repository/window.
- [ ] 3.2 Refresh only selected ordinary-tab rows and reconcile hidden-tab membership lazily while retaining totals/cursors; verify visiting Closed then showing Open causes no Closed-page rereads and pin, expanded-depth, state-transition and scroll behavior remains intact.
- [ ] 3.3 Gate all starts and async follow-ups, including auxiliary reads, on shown/enabled/online/current context and explicit window activity, then coalesce one catch-up on return; verify hidden/inactive fixtures issue zero new HTTP commands and unknown activity remains allowed, and document the supported host activity/minimize signals without inventing native APIs.
- [ ] 3.4 Reuse canonical agent machine/folder repository identity until local invalidation while preserving fresh action-time confirmation, and batch notice membership reads with one named-account verification per refresh; verify unchanged footer TTL cycles add no GitHub request and the named-account two-repo enrollment fixture drops from four to three REST calls without switching login.
- [ ] 3.5 Retain the 45-second unenrolled and 120-second enrolled shown-open safety deadlines, independent of mere event receipt; verify fake-clock success/failure, settled-check merge/close and return-during-cooldown fixtures, including selected-page/fold coverage.
- [ ] 3.6 Finish the full HTTP request inventory and before/after GraphQL-cost tables in docs/GIT-REQUEST-BUDGET.md and update README/docs links; verify every trigger listed in the brief is represented, CLI-internal/paginated operations are counted, REST endpoint choices are justified and estimates are distinguished from actual transport measurements.
- [ ] 3.7 Incorporate current main after PRs 56 and 57 land without editing either PR or branch; verify their paging/fade/inset/tab/header-hover regressions remain intact alongside this change's focused tests.
- [ ] 3.8 After checking no other suite is running, run CI=true npm run test:ci once on the final implementation and record results and exact-head required-check status; verify the handoff distinguishes passed, pending and draft-blocked checks without marking ready or merging.

## Workflow follow-up

- This is a plan-only draft; stop after publishing it and wait for explicit approval before implementing any task.
- Keep the three PR Implementation outcomes in this task-group order and tick each only after its code/tests land; do not batch ticks at handoff.
- Leave the PR draft and unmerged as requested. Do not turn it ready or arm auto-merge. Report any draft-only CI limitation instead of bypassing it.
