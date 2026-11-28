# Tasks

## 1. Added Trello boards refresh current names by ID on opening and Check, retaining last-known names offline

- [x] 1.1 Update owner verification to refresh labels even when saved hints exist, preserving ID-keyed display merging, grants and write settings; cover existing-name renames, partial inventories and failed refresh persistence in `src/plugins/trello/names.test.mjs`.
- [x] 1.2 Connect Boards opening, already-open section entry and both existing Check paths to bounded owner refresh through captured Settings contexts; retain rows while pending/offline and prove stale machine/account/enable responses cannot publish with the packaged Settings harness.
- [x] 1.3 Keep the existing Herdr controls and add only a plugin-neutral opt-in disclosure refresh hook if needed; cover no duplicate same-round requests and unchanged unrelated-plugin behavior in targeted renderer fixtures.
- [x] 1.4 Update `tests/trello-saved-names.test.mjs` for ai-factory/xrbuild to ai/xr, reopen, Check, offline and partial-read fallback with unchanged grant IDs/order/writes; update README and `docs/TRELLO.md` so opening guidance matches the approved contract.
- [x] 1.5 Run only touched-area name/Settings regressions and `openspec validate refresh-trello-board-names --strict`; record exact commands/results and known native/live-provider validation gaps without running the full suite or contacting real Trello.
