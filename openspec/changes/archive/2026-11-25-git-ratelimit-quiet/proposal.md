# Proposal

## Why

GitHub primary and secondary limits should not turn the Git panel into an error surface. Repository batching and reuse of settled history reduce shared-account requests without introducing a new event or window scheduler.

## Approved reduced scope

After four review rounds, the coordinator explicitly narrowed this same PR to two outcomes:

1. Quiet rate refusals retain rows, totals, pins and pages, with cold Loading, shared cooldown, one explicit manual attempt and one log line per episode. Real failures keep their notices. A cooldown retry reads current selected demand, not a captured hidden tab.
2. Repository-batched/shared reads preserve per-alias GraphQL results even when gh exits 1; final merged/closed facts are session-cached; unchanged heads/summaries reuse check details; ordinary refresh reads only the selected tab; canonical agent identity tracks effective gh-resolved routing.

Remove the two-second debounce, pending-invalidation transfer/acknowledgement machinery, inactive-window pause/catch-up, automatic event-failure retry machinery and deferred enrollment scheduling. Event delivery and enrollment use main's lifecycle. Window activity does not gate reads. Retain only repository identity in event callbacks so one affected repository uses one batch rather than one read per PR.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Quiet refusal handling, bounded shared repository reads, final-history reuse, selected-tab refresh and changed-only checks. Existing hidden/disabled/context authority and 45/120-second shown-open safety behavior remain.

## Impact

Implementation stays in the Git panel/read transport and its regression fixtures. The request audit covers two repositories with five Open and thirty Closed task PRs and distinguishes measured fixture operations from estimated GraphQL cost. Three separately dispatched events inside two seconds now mean three immediate batched reads, not one debounced read.

No relay deployment, new service, native change, credential switch or peer PR/branch edit is authorized. Final-cache freshness limits are documented; precise numbered relay hints remain an optional default-off follow-up. This approved reduction supersedes the earlier scheduling plan and its retired transition-invariant claim.
