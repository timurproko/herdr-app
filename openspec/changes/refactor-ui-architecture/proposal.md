# Proposal

## Why

Ordinary Git still performs repeated identity projection during render and admits unbounded agent discovery reads, despite the coordinator-only improvement in PR 104. The UI needs a structural separation of data, publication and rendering, not another local patch; the architecture review and measured limitations are in `docs/UI-ARCHITECTURE-REVIEW.md`.

## What Changes

- Plan only until explicit approval, with stage-one implementation held until PRs 110, 111, 112, 113, 115, 117 and the activity-line change have merged.
- Stage one separates Git repository facts, selected-agent association, native geometry and action authority. Immutable committed presentation survives same-repository navigation and failed/refused refreshes.
- Stage one routes Git discovery, root, page, target, footer and auxiliary reads through one bounded, deduplicated admission service, not a separate semaphore per caller/mod.
- Stage one makes ordinary/coordinator render functions consume prepared facts, preserving native diagnostics, the watchdog and every existing UI/interaction detail.
- Later independently proposed PRs extract the existing component kit and migrate Files/Usage, Settings/plugin adapters and Spaces/Agents/Tabs. Their boundaries, deletions, risks and parity gates are the review's roadmap, not implementation authorization in this change.
- No redesign, new messages, controls, options, preference migration, native patch, polling policy change or changed animation. Visible differences remain explicit variants unless the person separately approves convergence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: strengthen ordinary/coordinator same-repository navigation retention and bounded read admission without changing successful UI behavior. Existing render-recovery, geometry, lifecycle and fresh-authority requirements remain intact.

## Impact

Stage one affects `src/plugins/git/mod/`, narrowly shared read-admission infrastructure and packaging, plus targeted Git fixtures/docs. No new external dependency, host API, native binary, credential handling or persisted preference schema is proposed. The review covers `src/ui/`, `src/shared/`, Settings, sidebars, and Git/Files/Usage/Crew/Trello ownership. Implementation must take its visual baseline from the merged prerequisite head, not restore this planning head's styling.
