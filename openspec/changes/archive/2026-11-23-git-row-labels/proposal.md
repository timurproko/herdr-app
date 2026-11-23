# Proposal

## Why

Git pull-request rows spend scarce space on an Owner badge but omit useful GitHub labels such as `🤖 Under review`. Their tiny separator dots are hard to see, especially in the narrow coordinator panel.

## What Changes

- Fetch assigned label names and colours with the existing PR requests, normalize them into shared row facts, and refresh them with the rest of the row, including labeled/unlabeled webhooks.
- Remove the Owner badge from the shared row. Keep title, byline and status metadata distinct; status metadata starts at its existing left edge with tasks, followed by checks and assigned label pills.
- Render exact label names, including emoji, in their GitHub colours with readable text. Constrain multiple/long labels in a single-height strip with full-name tooltips so narrow panels do not overflow or jump when labels change. Unlabeled PRs have no placeholder or trailing separator.
- Use one larger, muted, vertically centred separator with equal spacing throughout PR metadata, including the number/author byline.
- Cover ordinary and coordinator views, Open/Closed tabs and pinned/scrolling rows with regression tests; document the row contract and refresh behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Add the shared Git PR metadata, label data/refresh and separator presentation contract for ordinary and coordinator views.

## Impact

- `src/plugins/git/mod/pulls.js`: Existing paginated GraphQL selection, targeted `PR_FIELDS` reads and shared row facts.
- `src/plugins/git/mod/main.js`: Shared `pullRow` rendering used by repository and coordinator views, including pin-motion ghost rows.
- Existing regression, pagination, fleet and webhook fixtures; README and Git/testing docs; OpenSpec delta.
- No new per-row requests, polling, dependencies, relay transport, coordinator section redesign, deployment or live account mutations. Preserve the work in PR #18 (`fix/fleet-link-look`) and PR #17 (`feature/update-check`); reconcile with the latest default branch before implementation handoff.
