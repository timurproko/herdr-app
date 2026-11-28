# Design

## Context

See proposal.md for motivation and approval decisions. PR 110 added a durable global disclosure policy and exceptions, but `main.js` currently applies them primarily to rendering. `loadPulls` and `flushWebhook` still read lists, and the ordinary safety snapshot includes unpinned rows even when folded. Coordinator safety already excludes folded rows, but `AggregatePulls.pump` still batches dirty entries across all repositories. Its publication/waiting predicates currently treat every unread entry as admitted work.

The existing specification explicitly says counts update while folded and disclosure is presentation-only. The delta replaces those promises; this is a behavior change requiring plan approval, not a no-plan cosmetic fix.

## Goals / Non-Goals

**Goals:** Add narrow read-admission and disclosure-transition handling to the existing controllers. Preserve saved state, cache qualification, machine routing, request coalescing, pagination/reveal and pin selection/animation contracts. Keep load reduction observable as zero collapsed-group PR operations in synthetic transport fixtures.

**Non-Goals:** No renderer decomposition, new scheduler, host/native changes, broad UI refactor, additional UI, alignment changes, durable PR cache, automation disablement or relay protocol changes. No full local test suite or live account/agent mutation.

## Decisions

### 1. Gate work at controller admission and every asynchronous boundary

Use the existing `RepositoryDisclosure` canonical policy, not rendered section visibility. Synchronize saved disclosure before startup, ordinary page admission, aggregate pump selection and deferred callbacks. Pass a small repository eligibility callback into the aggregate rather than importing panel rendering or making the shared GitHub transport aware of UI folds.

Ordinary guards cover first page, append, manual refresh, webhook/catch-up, fallback and count-only compatibility work. Coordinator guards cover new links, dirty entries, invalidation retries, repository batches and post-metadata details/account diagnosis. Already-dispatched calls may finish, but cannot issue follow-ups or alter frozen group presentation. Preserve their dirty/deferred demand without servicing it while folded. Capture a disclosure/selection generation so collapse-expand cannot make an old reply current again. Do not cancel another independently admitted subscriber's shared transport.

Alternative rejected: gate only rendering or the safety fallback. That leaves list, new-link and event traffic running. A global transport gate is also wrong: it could quiet independent automation or another current consumer.

### 2. Split ordinary pin demand from group demand without a second render path

Keep existing selected-agent/footer and local root/branch resolution live. For a collapsed canonical repository, bypass list and sibling-transition refreshes and refresh only the effective linked/pinned PR through the existing targeted facts path. A known cached branch match can identify the pin; do not list a collapsed repository just to search for an unknown branch match. Existing explicit PR labels/footer identity and older-PR targeting remain supported. The safety selection contains the pin only when the group is folded; an expanded group keeps its current selection behavior.

Keep pinned row facts separate from frozen unpinned presentation/counts: a pin merge, checklist edit or stage change must not trigger a sibling list/count query or recompute a folded header from freshly returned repository totals. Pin association changes can still alter which already-known row is pinned, with existing remaining-row/lone-pin rules; they cannot claim a new repository total. Final pins retain existing final-cache behavior, not newly invented polling. Coordinator mode remains pinless.

Alternative rejected: keep the whole repository live whenever it has a pin. That defeats collapse-all as the quiet control.

### 3. Defer folded unknown work without blocking publication

Distinguish deferred folded entries from admitted unresolved requests in aggregate waiting, updating and publication completion. A folded dirty entry must neither keep the warm line spinning nor hold all expanded sibling sections behind cold Loading. Keep the existing publication abstraction and render tree; change controller eligibility predicates and retain pure per-repository/tab presentation/count snapshots as necessary, not callback-bearing trees.

Warm folded headers keep the last-known per-tab count and membership presentation, including across local task membership/history aging, until expansion. Current membership still controls action authority; frozen presentation cannot authorize an ended/removed target. Actual machine/home/provider/enable changes still invalidate incompatible snapshots. Internal totals retain last-known/unknown metadata rather than claiming freshness.

Cold restart intentionally has no PR snapshot. Do not add durable counts, fabricate zero, or introduce a new explanatory state: unknown folded repositories have no header/count yet, and intentional deferral alone shows neither perpetual Loading nor a false No pull requests result. Existing bulk expansion makes them readable. Known compatible runtime sections still paint their folded headers. This startup trade-off is explicitly submitted for approval in proposal.md.

### 4. Expansion schedules normal work immediately, within existing bounds

Individual and bulk transitions invalidate old read/safety selection generations and admit newly expanded repositories in the shown context at once, including deferred work for repositories hidden by the selected filter. Reuse existing queues and bounded refresh, with normal cooldown, machine and fresh coordinator identity guards; immediate means scheduling now, not bypassing those guards. Ordinary refresh loads its selected tab and preserves event depth/cursors; coordinator refresh retains targeted task inventory and existing final caching rather than becoming a repository list fetch. Hidden contexts stay idle until shown. Do not replay every invalidation: one current refresh consumes accumulated demand.

Alternative rejected: wait for the next webhook or ten-second tick. That leaves reopening visibly stale and fails the requested immediate behavior.

### 5. Explicit dependency/freshness inventory

| Consumer | Observed source today | Proposed collapse behavior |
| --- | --- | --- |
| Group PR title/state/checks/body checklist/labels and managed stage | `main.js` list/target/safety and `aggregate.js` targeted reads | Quiet for folded groups; last-known values until expansion |
| Header counts and panel internal scoped totals | Repository page/probe counts or aggregate eligible task facts | Last-known per-tab group count; unknown stays unknown; pin results do not refresh group counts |
| Selected-agent pinned PR | Existing selection/footer association plus targeted/list/safety facts | Keep association live, use pin-only targeted/event/safety facts when folded |
| Stage role availability and Crew rounds | `agent-links.js`, verified native membership and Crew labels | Independent identity stays live; hidden GitHub-assigned stage itself goes quiet |
| Custom update notification/attention | `relay-client.js` `watchUpdates`, separate fixed-repository update checks | Remain live; keep chrome-owned relay and independent update subscription |
| Core-side automatic CI/conflict/merge messaging | Independent monitor configuration and worker evidence | Remain live and unchanged; collapse is not a monitoring switch |
| Spaces/Crew/native agent badges and attachment | Native/Crew status lifecycle | Remain live; do not apply panel fold admission to that service |
| Setup/enrollment notices | `notices.js`, independent setup/hook membership | Retain existing reads and footer behavior; no PR list/detail exception |
| Read diagnostics/runtime presentation caches | Best-effort read evidence and pure bounded snapshots | No independent reads; preserve last evidence, never treat cached values as freshness |

Search found no external reader of this panel's managed PR stage/checklist facts and no notification badge fed by these panel PR reads. The legacy `mod/ci-fix.js` is not called by `main.js`; the panel explicitly delegates delivery to the Core monitor. No outside-panel consumer is intentionally made stale. If an undiscovered consumer would lose freshness, stop for the person's decision rather than widening read exceptions silently.

Independent local Git identity/footer work, Crew discovery, enrollment and monitor/network work may still run with all groups collapsed. The zero-read promise is for panel PR inventory/facts, not a machine-wide network-off switch.

## Risks / Trade-offs

- [Dirty folded entries keep busy/publication latched] → Separate read eligibility from unknown facts; exercise cold all-folded and mixed folded/expanded cases with fake queues.
- [Pin refresh silently fans out into lists/counts] → Assert actual operation shapes and numbers, including older pins, state transitions and count compatibility fallbacks.
- [Collapse between metadata and details starts more IO] → Hold metadata responses in fixtures, fold before release, and assert zero follow-up/detail/diagnosis operations and no frozen publication.
- [Saved state is applied only after initial render] → Test real initialization and retained-view synchronization before request admission, not only the storage model.
- [Folded snapshots outlive task identity] → Keep scope invalidation and independent action guards; presentation never becomes worker authority.
- [No remembered count after app restart] → Explicit approval decision; avoid new durable PR data or new UI solely to preserve a number.
- [Existing fixture asserts folding starts no reads in both directions] → Update the now-superseded expansion assertion while retaining geometry, count, pin, pagination and mounted-row invariants.

## Validation and Migration Plan

Use synthetic transports and fake time only. Add a focused `tests/git-quiet-collapsed.test.mjs` using existing panel/aggregate harnesses to count operation shapes for both views, tabs, hidden repositories, manual/events/retries, startup, mixed groups, pin-only updates and held responses. Extend nearby disclosure/safety fixtures instead of broad suite churn. Run only this new fixture and touched relevant existing fixtures (disclosure, safety paging, read scheduling, counts, inventory presentation and entry recovery as warranted). Record exact commands/results, not promises of full-suite success.

Update README and `docs/ARCHITECTURE.md`, `docs/GIT-REQUEST-BUDGET.md` and relevant refresh guidance to replace presentation-only/live-folded claims and explain independent consumers. No persistence schema change: reuse version-1 disclosure and legacy migration. Rollback restores the prior controller policy without deleting saved folds or changing independent integration configuration. Publish the implementation through the existing branch/draft-PR flow after approval; no live deployment is needed for a planning-only handoff.
