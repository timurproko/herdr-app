# Proposal

## Why

Pending Git rows can retain an early passed/total count while GitHub advances because unchanged heads and overall PENDING summaries reuse old check details. Restore bounded numeric freshness without multiplying repository requests or weakening quiet rate-limit handling.

## What Changes

- Refresh shown Open/Draft pending-row numbers on every existing probe cycle, at 45 seconds even in enrolled repositories; retain settled-row cadence and final-history caching.
- Include the existing first-100 context selection for pending rows inside the existing batched repository probe; keep settled rows thin. Raw rollup aggregates must not drive displayed counts.
- Preserve the current full-detail counting rule: newest run per workflow, newest attempt per job/context, SUCCESS/SKIPPED/NEUTRAL passed, and combined check-run/status-context totals.
- Keep event-driven updates immediate even when head and overall summary have not changed.
- Track successful numeric confirmation separately from successful state reads. At more than 90 seconds without numeric confirmation, force the next eligible pending-row read past unchanged/cache/coalescing shortcuts; respect account cooldown and retry when it ends without waiting for another event.
- Preserve loaded data, repository routing, batching, stale-generation guards, hidden/offline gates, and quiet cooldown/backoff behavior.
- Record the historical incident as proven mechanisms versus missing telemetry, with disposable reproduction and before/after query budgets.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Pending check-count freshness, cadence, event refresh and authoritative numeric confirmation.

## Impact

Expected implementation areas are `src/plugins/git/mod/pulls.js` and `main.js`, with aggregate/event paths checked for unchanged-summary reuse. Targeted suites include check fallback/order, state refresh, request budget, rate quietness, read scheduling, safety paging and repository routing. Update README, Git webhook timing and request-budget documentation. No changes to PRs 61 or 64, running app/settings, webhook setup, native code, deployment or relay service.

## Evidence and approved counting decision

Installed `pulls.js`, `main.js` and `webhooks.js` are byte-identical to source at main `f3fe341`. A disposable run of the real current controller reproduces GitHub 2/10 then 5/10 while the panel remains 2/5 at successive enrolled 120-second probe cycles; changing the summary to SUCCESS finally reads details and repairs to 10/10. Repository webhook history includes successful check completion deliveries during the incident; delivery to the relay does not prove desktop consumption or a numeric read. No historical per-read desktop trace has been established, so the precise incident trigger and final recovery remain unproven.

Live GraphQL introspection confirms `StatusCheckRollup.contexts` exposes `checkRunCountsByState { state count }`, `statusContextCountsByState { state count }`, and `totalCount`, without requesting nodes. One real PR 64 query returned cost 1 and nodeCount 1. However, its raw aggregates contain 17 contexts (10 SUCCESS, 6 SKIPPED, 1 CANCELLED), which derive 16/17 under current pass-state rules. Its complete context list, after existing latest-workflow/attempt filtering, and GitHub's PR list both show 11/11. The connection accepts pagination arguments only, not a latest-run filter. Therefore raw rollup aggregates alone are not losslessly equivalent to the required existing derivation for reruns.

**Approved decision:** correctness takes priority. Pending rows enumerate up to 100 contexts inside each existing batched probe and use the existing derivation; settled rows remain thin. Detailed pending rows are capped at the existing 20-row detail chunk limit, with at most 40 state rows per probe. More than 100 contexts retains today's incomplete-context refusal and last-good values. The coordinator approved implementation, the 45-second pending cadence, the 90-second numeric-confirmation safeguard and retry at cooldown expiry.
