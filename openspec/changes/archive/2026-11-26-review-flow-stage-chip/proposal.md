# Proposal

## Why

The Git panel's robot links a PR to an agent without showing whether that agent is building or reviewing. A three-stage chip makes the review-before-CI workflow and the correct terminal visible, including today's legacy review labels and later Crew round metadata.

## What Changes

- Replace the title-line robot with Build, Review or Approved when a managed stage label is assigned. Rework and Changes needed are legacy Build names; Under review is a legacy Review name.
- Build focuses a ship/fix terminal matched by crew.pr or branch; Review focuses only a review terminal matched by crew.pr. Approved opens the PR through the existing row action and never targets an agent, regardless of checks.
- Consume optional crew.round, crew.finding and crew.approved terminal labels. Following review n, show Build n+1 and the supplied finding; without those facts show plain Build rather than invented history.
- Dim unavailable Build/Review targets and explain ended/disconnected targets on hover. Keep the existing robot behavior for live linked agents on rows without managed labels.
- Use amber, purple and green theme tokens for the stages, retaining existing check metadata, label pills, fixed row height, pin navigation and stale-action guards.
- Update the plugin specification and user/testing docs, with regression coverage across ordinary and coordinator rows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Managed PR stage presentation, role-aware terminal navigation and unavailable-target behavior; revise the robot-only trailing-slot contract to accommodate text chips while preserving stable geometry and fleet authority.

## Impact

- `src/plugins/git/mod/pulls.js`: derive stage from the existing label facts in list and targeted reads; labels already exist in both query shapes on this base.
- `src/plugins/git/mod/agent-links.js`: read terminal role/PR/round/finding/approval metadata, resolve role-specific targets and availability without adding polling or transcript reads.
- `src/plugins/git/mod/main.js` and, only if needed, the existing Git aggregate adapter: compose stage controls and preserve captured coordinator actions.
- `tests/pr-agent-links.test.mjs`, pull parsing/pagination, fleet and row geometry/render-budget fixtures; README and applicable testing documentation.
- No Crew CLI, shared delivery bot, GitHub label writes, workflow trigger changes, native patch or live installation. No edits to `src/services/updates/` or `tools/deploy-all.mjs` (the separate updater PR).
