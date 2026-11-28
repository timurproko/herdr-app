# Proposal

## Why

Crew Projects' four-column Delivery kinds tooltip is difficult to read without tracing headers. The same panel gives a false failure when a valid project listing takes about 20 seconds because its transport currently allows only 15 seconds.

## What Changes

- Replace the table with three short, wrapped explanations, each beginning with a bold kind name, in the existing passive hover/focus tooltip.
- Give project-list reads a bounded 60-second execution allowance, retaining the existing loading state and same-context last-confirmed rows throughout refresh.
- Preserve actionable failures after the deadline, capability validation, context invalidation and all write safeguards.
- Add focused copy/layout and delayed-list regressions, update the declarative hint documentation and collect before/after screenshots in the task report after implementation approval.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: replace the mandated table explanation and define slow Crew Projects listing behavior without introducing new controls.

## Impact

Targets `src/plugins/crew/plugin.js`, shared `src/ui/settings-kit.js`, relevant Settings/crew tests and `docs/PLUGIN-UI.md`/README guidance. Reuse the current HoverCard, passive keyboard Popup and shared menu surface styles; other hint tables remain unchanged. No Crew CLI changes, native patches, deployment to the live app, persistent data changes or new dependencies are included.
