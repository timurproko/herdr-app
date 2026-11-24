# Proposal

## Why

Git pull request titles and metadata shift when related agents, checks, task progress or labels change. Ordinary and consolidated coordinator panels need predictable row geometry from first paint, including while existing data is being refreshed.

## What Changes

- Reserve the same state-icon, title, related-agent, byline and metadata geometry for every ordinary, pinned, coordinator and motion-preview PR row in Open and Closed.
- Keep the existing three-line row structure; give optional metadata independent reserved horizontal cells and separator slots, with blank space rather than visible placeholders when absent.
- Preserve displayed same-context rows through pending and failed refreshes; replace data only when authoritative replacement facts are ready, without weakening context invalidation or stale coordinator action guards.
- Cover agent/check/task/label/review transitions, cold/loading/verifying states and delayed refreshes with geometry regressions at 75%, 100%, 125%, 150% and 200% zoom.
- Document the deliberate blank-space/truncation trade-off and the limits of synthetic geometry evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Stable PR row cells and line geometry, reserved optional metadata space, and non-destructive same-context refresh presentation. This explicitly revises the current rule that missing metadata lets remaining groups start at the left edge.

## Impact

- Shared row and panel rendering in `src/plugins/git/mod/main.js`; row facts in `pulls.js` if needed to separate byline cells.
- Same-context refresh/error handling in `main.js`; aggregate retention in `aggregate.js` only where a regression demonstrates a gap.
- Existing Git row, pagination, pin-swap and fleet fixtures plus focused geometry coverage; README and testing documentation.
- No host/native patch, deployment, polling, credentials, live terminal operation or new dependency. No changes to Spaces or open PR #38.

This is a plan-only change. Implementation and the requested `CI=true npm run test:ci` run follow approval; the PR remains draft and is never merged by this task.
