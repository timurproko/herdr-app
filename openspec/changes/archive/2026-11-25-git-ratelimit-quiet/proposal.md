# Proposal

## Why

GitHub's secondary burst limit can reject reads while hourly GraphQL quota is still available. The Git panel currently exposes those refusals as errors and repeats expensive reads of settled history, making a shared multi-agent account both noisier and easier to throttle.

## What Changes

- Keep last-good rows, counts, pins and paging silently on primary or secondary rate refusals across ordinary and coordinator reads; cold refused loads retain standard Loading feedback.
- Apply the existing exponential backoff and minimum 15-minute or longer Retry-After cooldown to all panel read paths, with one sanitized customization-log line per refusal episode and one user-initiated read allowed during cooldown.
- Batch coordinator targeted reads per repository, share in-flight repository facts across both views, debounce event bursts for two seconds, and refresh only the selected ordinary tab's rows.
- Cache known Closed/Merged facts for the session instead of rereading unchanged history. All savings work with the current relay; precise numbered hints are deferred as an optional, default-off follow-up, not a redeployment prerequisite.
- Keep thin state/summary probes and request check contexts only for new or changed heads/summaries. Preserve 45-second unenrolled and 120-second enrolled shown-open safety cadences.
- Gate new reads on shown/enabled/online/current context and the supported window activity signal, with one coalesced catch-up on return.
- Publish a complete request inventory and before/after request-count and estimated GraphQL-cost table for two repositories with five Open and thirty Closed task PRs, including auxiliary reads and endpoint choices.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Quiet rate refusal handling, shared bounded read scheduling, selected-tab refresh, session-final history caching, changed-only check details and activity-aware catch-up while retaining existing authority, freshness and actionable-failure contracts.

## Impact

Expected implementation owners are `src/plugins/git/mod/{pulls,main,aggregate,agent-links,notices,webhooks}.js`, a narrow Git-owned read coordinator if needed, the panel-called read-only setup/transport boundary. Regression coverage belongs with the existing Git/fleet fixtures; request evidence and operational limits belong in `docs/GIT-WEBHOOKS.md` and a focused request-budget document. No native changes, new service, account switch, webhook enrollment, deployment or change to the independent Core auto-fix monitor is proposed.

Implementation was approved with the refinement that relay-side changes remain optional and off by default; precise numbered relay hints are deferred. Open PRs 56 (scroll paging/fades) and 57 (insets/tabs/header hover) are not edited; their changes will be incorporated from main after they land, preserving their presentation behavior. Implementation and broad CI execution wait for plan approval.
