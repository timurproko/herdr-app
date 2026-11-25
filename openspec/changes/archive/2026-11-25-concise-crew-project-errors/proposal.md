# Proposal

## Why

Crew Projects currently passes raw command output into a second UI wrapper, so a rejected Add can display a usage dump instead of useful guidance. The existing refusal specification explicitly preserves Crew's words and must be revised before changing that contract.

## What Changes

- Replace raw Add and Remove refusals with concise, actionable text, matching Crew's actual project-command refusals.
- Suppress usage blocks and multiline output; unknown failures expose only the first line trimmed to one sentence.
- Keep machine-switch error clearing and Crew requirement status unchanged, with no retries or registration-policy changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: revise Crew project refusal presentation while retaining tool authority, home-ownership semantics and partial-batch success.

## Impact

`src/plugins/crew/plugin.js`, the folder-refusal text composition in `src/features/settings/plugins-ui.js`, focused plugin/UI regressions and `docs/PLUGIN-UI.md`. No native changes, deployment, tool installation, new logging subsystem or edits to the separate machine-error and update-required tasks.
