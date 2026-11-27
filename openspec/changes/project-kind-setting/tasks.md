# Tasks

## 1. Capability-gated Crew project facts preserve older installations

- [x] 1.1 Add strict project-kinds v1 capability and JSON-list decoding to the Crew provider, retaining canonical home/name/path/kind facts; fake tests cover all kinds, empty lists, dotted names, duplicates, invalid shapes and unknown versions.
- [x] 1.2 Keep unsupported installations on existing names/paths-only listing without interpreting human kind text; fake tests cover help output, ignored flags, missing support, failed transport and unchanged Add/Remove and duplicate-folder guards.
- [x] 1.3 Document labels and the Crew capability dependency in README; run targeted Crew provider and project-error regressions, recording commands/results without touching real homes.

## 2. Shared Settings rows reveal kind choices without moving Remove

- [x] 2.1 Add the optional generic list row-choice declaration and reserved choice slot using the existing Settings dropdown and removable-row kit; renderer tests cover quiet labels, all three choices and unchanged non-choice/saved rows.
- [x] 2.2 Add hover, keyboard-focus-within and popup-open reveal with retained focus handles, accessible names and Escape dismissal; fake event tests cover pointer departure, Tab, Enter/Space, selection, blur and stale popup callbacks.
- [x] 2.3 Keep the choice and Remove in separate stable columns with path truncation; extend targeted geometry tests for long paths, three labels, narrow supported widths and zoom without overlap or horizontal jumps.
- [x] 2.4 Document the generic declaration and lifecycle in docs/PLUGIN-UI.md; run targeted renderer, geometry, saved-row and plugin UI contract tests for this outcome.

## 3. Kind edits confirm the captured machine's stored value or show an inline refusal

- [ ] 3.1 Bind Crew's row-choice setter to the proposed kind-only API with captured machine/home/name/path, expected-path protection and existing quoted local/SSH transport; fake command tests cover both machines and prohibit re-add/config-file workarounds.
- [ ] 3.2 Validate matching stored-value acknowledgements before replacing labels and refresh the authoritative section; fake deferred tests cover success, same-value no-op, duplicate suppression and retention while pending/settling.
- [ ] 3.3 Add one sanitized row-local failure sentence and unknown-outcome read-before-write handling; fake tests cover owner refusal, missing/changed project, unavailable kind, malformed success, timeout, disconnection and no automatic replay.
- [ ] 3.4 Retire captured menus, callbacks and publications on machine/session/registration changes, close or disable; fake lifecycle tests cover changes away and back and prevent stale follow-up work or cross-machine writes.
- [ ] 3.5 Document acknowledged persistence, concise failure and refresh recovery in README and docs/PLUGIN-UI.md; run only the targeted provider/renderer/lifecycle regressions and validate this OpenSpec change strictly.

## Workflow follow-up

- Implementation waits for plan approval. The coordinator arranges Crew project-kinds v1 separately; this repository never edits Crew source or substitutes guessed legacy behavior.
- Group headings correspond one-to-one, in order, to the draft PR's three Implementation outcomes. Keep all boxes unchecked during planning.
- Keep the PR draft and never merge. Publish through the existing project Git remote/SSH path, inspect final-head CI once, and report immediately without waiting for CI or the delivery bot.
