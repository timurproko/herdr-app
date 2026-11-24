# Design

## Context

See `proposal.md` for motivation and the spec delta for observable contracts. Inspection is against main commit `386fcc4`, including PRs 45, 49 and 55.

Observed owners and behavior:

- `mod/main.js` owns ordinary list, paging, older/pinned, count compatibility and webhook reads. List pages already embed both totals, but all list and targeted reads enumerate check contexts. `flushWebhook` rereads every previously loaded tab/page, including hidden Closed. Same-panel leases and publication generations exist; no shared ordinary/aggregate read broker exists.
- `mod/aggregate.js` uses up to three concurrent `gh pr view` commands, one per recorded PR. Initial load includes unknown historical links even with Open selected, because their state and both task totals cannot otherwise be established. Generic invalidation dirties all entries, including known final history. Session missing-PR suppression and 24-hour history eligibility must survive.
- `mod/pulls.js` owns routing, classification and the thin 40-row / changed-detail 20-row safety queries. The safety controller alone currently retains rate cooldowns; ordinary event/list/older reads and coordinator targeted reads do not share that policy. `pullFailure` exposes rate errors as notice text.
- `mod/webhooks.js` collapses revisions only while a delivery is pending and invokes `onChange(null, ...)`; a repository-specific event can therefore invalidate the entire coordinator inventory. `relay-client.js` retains revisions and main hints but not precise PR identity. A debounce must also preserve events arriving during work.
- `mod/notices.js` invokes `setup.cjs`: global notice checks call the relay, not GitHub; per-repository membership reads REST hooks. When an explicit account is selected, each worker also validates it with REST `/user`. `github.cjs` currently discards stderr, losing structured rate facts before the panel sees them.
- Ordinary `mod/agent-links.js` resolves each distinct agent machine/folder with `gh repo view` on its ten-second TTL; footer reads and branch/root probes are local/Core, not GitHub. Coordinator navigation uses verified task links and does not run those ordinary agent repository scans.
- Labels are included in row reads; there is no separate panel label-definition endpoint today. The legacy `ci-fix.js` and independent Core monitor have GitHub reads but are not instantiated as panel readers; they are outside this change's scheduler.
- Supported `window()?.active` already gates other features (`src/shared/customization-updates.js`, A1 colors, Start). The facade also exposes `focused()`, but that is pane/terminal focus, not OS-window activity. No independent minimized flag has been found in this checkout's reviewed usage; do not invent one. Use explicit `active === false` to pause; unknown activity preserves existing behavior. Confirm the installed SDK contract read-only during implementation and document whether minimization manifests as inactive; no native patch is authorized.

## Goals / Non-Goals

**Goals:** Centralize refusal/retry behavior without relaxing publication or credential isolation; cut HTTP operations and burst concurrency, not just GraphQL hourly points; retain existing presentation and shown-open freshness.

**Non-goals:** Global throttling of agents or independent Core monitors, cross-account login changes, persistent PR inventory, new daemon/socket, native work, automatic relay deployment, or redesigning paging, fades, tabs, insets or header hover from PRs 56/57. Shared in-flight facts cover ordinary/coordinator subscribers within the Git mod runtime; no cross-process Promise sharing is claimed.

## Decisions

### 1. Typed rate result at the read boundary, not a presentation-only filter

Introduce a Git-owned read coordinator around the existing repository routing. Preserve command status, timeout/signal, HTTP status/headers, Retry-After and GraphQL errors (including errors in a nominally successful response) until strict classification. Recognize primary/secondary/abuse rate evidence and HTTP 429; a bare HTTP 403 is still access, and timeouts/process failures retain precedence. Do not search arbitrary rendered messages for a generic word such as `limit`.

A refused job returns a typed quiet/deferred outcome. It never changes valid rows/counts, marks a snapshot successful, creates an absence, or overwrites an unrelated actionable notice. Cold refused reads remain pending Loading, including historical candidates, until an admitted retry completes. Each path registers retry demand even when there are no rows yet; the current shown-row safety controller alone cannot repair cold refusals.

Propagate sanitized rate facts from panel-called setup/account/hooks workers rather than exposing their raw stderr. If an account-diagnosis follow-up is rate-refused after a genuine permission refusal, keep that original actionable refusal with honest unknown account; the diagnosis refusal itself adds no rate notice or secondary failure.

Use one best-effort customization console/log line per route refusal episode (sanitized repository/machine category and retry duration only). Continued automatic/manual refusals and cooldown extension do not log again. A successful admitted read ends the episode, not mere elapsed time or hidden/show. Deduplication survives view/controller recreation in the module session. A logging exception cannot break reads.

**Alternative rejected:** hiding the red message alone leaves hot retries, cold empty states and duplicate refusal logging elsewhere.

### 2. One scheduler, route-scoped cooldowns and subscriber-safe single-flight

Key reads/cache by canonical repository, target machine and credential/configuration routing generation, never by PR number alone or by coordinator working directory. Preserve `GH_REPO` child routing and explicit credentials. Do not launch `/user` merely to discover a cooldown key. Keep the existing conservative machine-scope secondary-limit fan-out stop when effective account identity is unavailable; do not let the next repository immediately start more work after refusal.

All panel entrypoints consult cooldown and visibility before dispatch and before each follow-up. Retain the existing 90/180/360/720-second failure progression, with rate delay at least 900 seconds or longer Retry-After. Track pending demand separately from timers; use one next-deadline wakeup and the existing lifecycle, not a polling loop per PR. Hide/disable/inactivity suspends dispatch without losing demand or deadline. An explicitly clicked Refresh admits one bypass API attempt during cooldown. If refused, stop that refresh's fan-out immediately and extend the same quiet episode; no automatic retry or detail/identity chain follows. If successful, normal successful recovery can resume work under ordinary admission rules.

Share compatible pending repository jobs and canonical per-PR facts across ordinary and coordinator subscribers. Attach overlapping targeted requests to the shared fact result; do not perform a duplicate read just because list and aggregate projections differ. Non-overlapping shapes remain queued, not mislabeled equivalent. Each subscriber keeps its own epoch/generation, membership and visibility guards. Retiring a subscriber removes its authority but must not cancel independently current subscribers. Cache facts contain no worker IDs or coordinator action permission and remain module-memory-only, not portable or persisted shared PR snapshots.

**Alternative rejected:** unrelated controller cooldown maps cannot prevent event/older/count paths bypassing safety backoff; persisted raw request/PR state would violate the runtime inventory boundary.

### 3. Batched metadata/summary reads, session-final facts and precise invalidation

Replace N coordinator `gh pr view` calls with bounded aliased targeted metadata/summary queries, up to 20 identities per command and existing bounded repository concurrency. Cold unknown historical links must be read once to establish state and truthful totals even when Open is selected; do not guess from Crew's task status. Subsequent refreshes read mutable candidates only. Known final facts are reused across selection, panel recreation and manual refresh. Time-based history removal is a local eligibility calculation, never a GitHub reread. Preserve missing live recheck and historical suppression from PR 55, including partial alias errors and authoritative-absence distinctions.

Ordinary page membership remains cursor-based; refresh only the selected tab and keep the other tab's rows/cursor until demanded. When Closed is actually selected, fetch only the membership facts needed to reconcile its requested depth, then hydrate known final rows from session cache instead of requesting their body/check/label details again. Open totals still come from the same page or first safety probe. An older pin not present in selected rows shares targeted facts/cache rather than being fetched twice.

Split row metadata/summary from check contexts on every path, not only safety probes. Compare head SHA and rollup summary with published facts; only new or changed rows fetch contexts, in 20-row chunks. Preserve the existing 40-row thin safety query and latest-workflow/rerun semantics. Publish complete selected updates atomically; a refused second chunk cannot partly blank counts or checks. No extra label-definition calls.

Approval refinement: do not change the relay. All read savings, quiet behavior and 45/120-second shown-open safety work with the deployed protocol. Precise numbered PR hints are an optional, default-off follow-up, not part of this implementation. Generic notifications refresh mutable facts only. Final coordinator facts are session-bound: external changes to a previously closed row are not polled; an independently observed contradictory Open fact or a new runtime can replace them. Ordinary Open inventory can independently rediscover reopened rows. Document this intentional final-cache freshness trade-off without a new Stale alarm.

**Alternative rejected:** rereading every Closed PR to discover which one reopened defeats the requested session cache; moving all row reads to REST would require separate PR/check/status/review/label requests and increase request count.

### 4. Two-second repository debounce and activity gating

Preserve repository identity from revision changes rather than delivering only `null`. Use a two-second bounded batching window from the first queued event, not an indefinitely postponed trailing timer. Coalesce dirty repositories and affected PR IDs, with at most one pending follow-up when an event arrives after the in-flight snapshot began. This means one logical refresh per affected repository per window; cold/changing details can still require bounded extra HTTP chunks, disclosed in the budget table.

Gate list starts (including manual/paging), aggregate pumps, identity/notice reads, related PRs, agent repo scans and all async follow-ups on shown/enabled/online/current/active. Unknown host activity remains allowed. Mark one catch-up on hidden/inactive to visible/active transition and join accumulated work, without resetting an existing cooldown. Keep the authenticated chrome broker running for independent update consumers. Do not reset the healthy 45/120-second safety deadline on a mere event receipt; only successful equivalent facts can satisfy due work.

Cache verified canonical agent repository identity by unchanged machine/folder and existing routing generation so footer TTL reads do not require new GitHub resolution every ten seconds. Retain action-time repository confirmation and local root/remote-change invalidation; no cached fact alone grants robot navigation. Batch panel membership checks per notice-refresh generation, reusing one explicit-account verification across repository hooks checks. Keep hooks and `/user` on REST; these already avoid GraphQL and should not be converted to multiple endpoints.

### 5. Request audit and planned budgets

The implementation must record actual fixture transport calls by trigger and emit final before/after tables in `docs/GIT-REQUEST-BUDGET.md`, referenced from `docs/GIT-WEBHOOKS.md`. Audit the GitHub HTTP operations behind CLI commands, including implicit CLI/account/wrapper resolution and pagination, not just subprocess launches. No production diagnostic may log credentials or full query responses. The table below is a source-derived planning estimate, **not measured implemented savings**.

Reference workload: 35 distinct linked PRs total across two repositories: A has 3 Open + 15 Closed; B has 2 Open + 15 Closed. All history is within 24 hours, both repos expanded, all check data fits first 100 contexts and all labels fit first 100; each hooks response fits one page. Coordinator display paging is independent of full task counts. G = GraphQL HTTP operations; R = GitHub REST operations. In these bounded query shapes estimated hourly cost is about 1 GraphQL point per G (minimum-one and connection-based rounding), not a guarantee of GitHub's actual charge. Secondary throttling is separate. CLI-internal extra HTTP operations must be added if tracing finds them. For larger inventories use metadata/detail chunks of 20 and safety chunks of 40, per repository.

| Coordinator trigger | Before, expected requests / GraphQL points | Planned after, requests / GraphQL points | Notes |
|---|---|---|---|
| Cold initial PR inventory, either tab | 35 G / ~35 | 2 metadata G + 2 cold detail G / ~4 | Each repo fits one metadata and one detail batch; unknown history must be classified once |
| Warm Open/Closed tab switch or UI paging | 0 / 0 | 0 / 0 | Presentation paging already uses loaded task facts; do not regress |
| Manual refresh, all heads/summaries unchanged | 35 G / ~35 | 2 metadata/summary G / ~2 | Thirty final rows reused, five mutable rows batched by repo |
| Manual refresh, all five mutable heads/summaries changed | 35 G / ~35 | 2 metadata G + 2 details G / ~4 | Final rows still untouched |
| Generic webhook/reconnect, both repos changed | 35 G / ~35 | 2 metadata G, plus 0–2 detail G / ~2–4 | Existing `onChange(null)` invalidates every entry |
| Event affecting only A | Up to 35 G / ~35 | 1 metadata G, plus 0–1 detail G / ~1–2 | Retain repository identity; do not touch B or cached final rows |
| N separated event deliveries inside a two-second burst, unchanged facts | Up to 35N G / ~35N | 2 G / ~2 when both repos affected | Existing in-flight coalescing can reduce the before upper bound; after one logical job per repo/window |
| Known Closed/Merged rows during generic refresh | 30 of those G / ~30 | 0 final-row G / 0 | Not an extra row to add to refresh totals |
| Newly linked exact task PR | 1 G / ~1 per PR | Up to 1 metadata G + 1 cold detail G / ~2 per affected repo batch | One new item can cost two requests; batching/caching wins overall, not on every isolated trigger |
| Shown-open safety, five unchanged Open rows across both repos | At most 2 thin G / ~2 | At most 2 thin G / ~2 | Presentation-page/fold selection may reduce repo count; preserve 45/120 s cadence |
| Safety, all shown heads/summaries changed in both repos | At most 2 thin + 2 detail G / ~4 | Same upper bound / ~4 | No extra contexts for unchanged rows |
| Local Crew task membership refresh, unchanged links | 0 / 0 | 0 / 0 | Crew discovery's own internal GitHub budget is external, not panel HTTP |
| Warm hide/show or inactive/active catch-up | Up to 35 G / ~35 on invalidation | 2 metadata G + 0–2 details / ~2–4 | One catch-up, final cache reused; dispatch obeys cooldown |
| While hidden | 0 intended, but audit unguarded list/root follow-ups | 0 / 0 | Enforce every start/follow-up gate |
| While window explicitly inactive | Existing shown-panel reads continue at trigger budgets above | 0 / 0 | No independent minimized-state API assumed |
| Automatic trigger during rate cooldown | Safety blocked, other triggers can still spend their ordinary budget | 0 / 0 | Refusal is never an empty successful inventory |
| Manual refresh during cooldown, first attempt rate-refused | No unified bound across targeted/list/event paths | 1 attempted API request, then stop | Refused-request hourly billing is not estimated |
| Coordinator count calculation | 0 / 0 | 0 / 0 | Task-scoped locally derived totals, never repository count queries |
| PR-label definitions | 0 / 0 | 0 / 0 | Assigned labels stay in metadata; no label-catalog endpoint |
| Access/auth diagnosis, both repos, one refresh | Up to 2 R / 0 | Up to 2 R / 0 | One `/user` per failed repository/refresh; no diagnosis on pure rate refusal |
| Enrollment cold/explicit Refresh, both repos | 4 R with named account, 2 R otherwise / 0 | 3 R with named account, 2 R otherwise / 0 | Two hooks pages plus one shared named-account verification; ordinary warm renders use 0 |
| Global setup notice | 0 GitHub / 0 | 0 GitHub / 0 | Relay verification HTTP is tracked separately, not GraphQL |
| Coordinator repository/footer/identity/older-pin scans | 0 / 0 | 0 / 0 | Verified explicit task context avoids ordinary folder/agent discovery |

Auxiliary ordinary-view audit (not additive to the coordinator-only workload):

| Ordinary trigger | Before | Planned after |
|---|---|---|
| Cold root resolves canonical repository | 1 `gh repo view` G, then one selected-page G | Reuse compatible canonical lookup if in flight; otherwise same discovery + metadata page, and cold details only for new rows |
| Event with five Open and thirty already-loaded Closed rows | 1 Open + 3 Closed page G, plus optional older pin G; all with contexts | 1 selected Open metadata G + 0–1 changed-details G; zero Closed page rereads |
| Selected Closed reconciliation | Loaded-depth pages with full row/check facts | Only demanded cursor membership/summary pages, hydrate cached final row details; no unchanged final targeted/detail calls |
| Next page | 1 page G with embedded totals and contexts | 1 metadata page G + only needed new/changed detail chunks; disclose cold-page trade-off |
| Older/pinned PR outside loaded pages | 1 targeted G, repeated after list/event refresh | Join cached/in-flight facts; final PR 0; mutable uncached PR metadata + changed detail only |
| Complete-page counts | 0 additional | 0 additional; preserve embedded totals |
| Partial-response count compatibility | Up to 1 additional count G | At most 1 shared count G only if truly missing; quiet refusal preserves last counts |
| Agent-link discovery every ten seconds for F distinct machine/folders | Up to F canonical repo G, plus local footer reads | 0 repo G for unchanged verified folders; resolve only invalidated/new identities; footer reads stay local |
| Robot action confirmation | 1 canonical repo G plus local footer | Preserve fresh guarded confirmation; join compatible in-flight lookup only, never use final cache as action permission |

## Risks / Trade-offs

- [Closed-unmerged PRs can reopen; current relay lacks exact identity] → Document session-final freshness limits and defer optional numbered hints. Never scan all unchanged final PRs to compensate or claim webhook hints are authoritative state.
- [A new singleton or page can require metadata + details instead of one monolithic read] → Disclose that local increase and enforce the overall 35-PR workload budget. Reject blanket REST conversion that multiplies check/review/status calls.
- [Mixed partial GraphQL failures can hide valid rows or turn access into absence] → Preserve per-alias identities and PR 55 classifier precedence; stage a complete affected update and retain last-good facts on refusal.
- [Shared read outlives a coordinator identity] → Separate raw fact lifetime from subscriber publication/action authority; existing epochs and per-PR generations stay authoritative.
- [Unfocused is not an independent minimize detector] → Use only supported explicit activity facts, document unknown signals and check runtime SDK before making a minimization claim.
- [Latest summary can stay constant while individual job composition changes] → Retain PR 49's deliberate head/summary optimization and document that bound; do not promise an unconditional per-job streaming SLA.
- [PRs 56/57 land while implementation is in progress] → Merge main after they land, resolve only in this task branch, and rerun their preserved paging/inset/fade/tab/hover regressions. Never edit their branches or PRs.

## Migration Plan

1. Land this plan-only draft and stop for approval. No runtime code, broad suite, native installation or relay operation now.
2. After approval, deliver the three PR outcomes in order, with code and focused fixtures per outcome and immediate task/body ticks.
3. Preserve public IDs and deployed relay behavior; cache/rate state is ephemeral. No relay source or cloud deployment changes. Optional precise hints are a separately scoped follow-up.
4. Before final implementation handoff, incorporate current main including PRs 56/57 once landed. Check for another running suite, then run `CI=true npm run test:ci` once against the final implementation. Read required-check results on the exact final head and report pending/blocked checks truthfully; this task must remain draft and must not be merged or marked ready by the agent.
5. Rollback is reverting this customization change through the normal workflow; no persistent PR cache migration, credentials, host documents or worker configuration needs reversal.
