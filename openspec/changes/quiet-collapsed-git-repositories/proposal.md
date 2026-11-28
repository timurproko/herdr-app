# Proposal

## Why

Collapsing Git repository sections currently hides their rows but leaves list and PR refresh traffic running. Make collapse the existing, minimal way to quiet the panel while keeping the selected agent's pinned PR live.

## What Changes

- Treat the saved canonical repository disclosure policy as panel read admission in ordinary and coordinator views, including repositories hidden by the selected Open/Closed filter.
- Collapsed groups start no list, count-only or per-PR reads for checks, checklists, labels/stages or other row facts, including manual Refresh, events, retries, new task links and startup. Retain their last-known per-tab header counts and presentation until expansion.
- Keep the resolved ordinary selected-agent PR above the headers live through targeted reads and its existing safety cadence, without refreshing siblings or group counts. Coordinator mode gains no permanent pin.
- Expanding individually or globally immediately schedules normal eligible refresh work for the shown context; hidden contexts resume when next shown. Retain pagination, reveal limits, identity checks and existing quiet rate handling.
- Restore disclosure before first PR-read admission. Deliberately quiet unknown repositories do not block admitted expanded siblings behind cold Loading or assert authoritative emptiness.
- Keep independent update notifications, Crew/native agent state, enrollment checks and Core-side CI automation live; hidden panel PR stages/checklists/checks go quiet with their rows.
- No icon position/alignment changes, render-path restructuring, new messages, buttons or options.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: change repository collapse from presentation-only to panel refresh admission, preserve the live selected PR exception, and define deferred startup/expansion and independent-consumer behavior.

## Impact

Small controller changes in `src/plugins/git/mod/main.js` and `aggregate.js`, using the existing `repository-disclosure.js` policy and current request guards. Focused fixtures cover disclosure, scheduling, counts, pin refresh, deferred cold publication and safety reads. Update README and relevant Git architecture/request-budget guidance during implementation; no transport, monitor, Crew, host-document or dependency changes are proposed.

### Decisions requested with plan approval

1. Collapsed row facts and panel-derived totals intentionally become last-known, including hidden labels/stages and history eligibility/count presentation. The independent services below are not paused by collapse; collapse is not an automation-disable switch.
2. Restart restores disclosure, not PR inventory. A collapsed repository with no compatible runtime snapshot has no truthful count or selected-tab membership: do not fabricate a header/count, show a new explanation or spin indefinitely for deliberately deferred PR work. Existing bulk expansion remains available and starts the reads. Previously loaded folded headers keep their last-known per-tab counts. This means unknown collapsed headers are absent after restart until expanded or otherwise legitimately known.
3. On a cold collapsed entry, an explicit PR label/footer can still load the pin, and known cached branch matches remain usable. With only a branch and no cached match, do not download the collapsed list to discover a pin; expansion resolves that association normally.
4. No outside-panel consumer of panel-read PR facts was found. Update attention uses the shared relay's independent update subscription; Core-side CI/conflict/merge messaging reads its own evidence; Spaces/Crew and native agent badges use independent status. Keep those live rather than silently freezing them. If implementation reveals an additional outside consumer that would become stale, stop and request a decision before changing that consumer's freshness.
