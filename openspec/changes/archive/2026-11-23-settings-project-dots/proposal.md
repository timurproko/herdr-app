# Proposal

## Why

Crew's Projects settings currently turn dotted folder names into different registrations and hide dotted names returned by Crew. Add failures also prefix Crew's home-ownership refusals with the selected folder, making the refusal look like a problem with that folder.

## What Changes

- Match Crew's dotted-name policy: 1–40 lowercase ASCII letters, digits, dashes and dots, starting with a letter or digit, without consecutive or trailing dots.
- Preserve safe dots when deriving names from folders, and show and remove existing dotted registrations using their exact IDs.
- Update the naming hint and fixture regressions, including boundary and malformed names.
- Present failed folder changes with separate operation context and plugin-attributed refusal text, preserving Crew's actual explanation and successful changes in a batch.
- Keep older Crew versions authoritative: show a dotted-name refusal instead of hiding it, retrying with another name or claiming success.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: Add the Crew project-name contract and clear plugin-origin failure presentation for project registration.

## Impact

- `src/plugins/crew/plugin.js` and `src/plugins/crew/plugin.test.mjs`: name derivation, list parsing, naming hint and mocked CLI add/remove behavior.
- `src/features/settings/plugins-ui.js` and `tests/crew-projects-ui.test.mjs`: generic folder-change failure formatting, retaining plugin-independent rendering and batch semantics.
- `docs/PLUGIN-UI.md`: document plugin-attributed folder-change refusals if the shared presentation contract changes.
- No Crew repository edits, companion installation or update, deployment, terminal input, runtime-state migration or native changes. Crew PR 5 remains an external prerequisite for successful dotted registration on older installations.
