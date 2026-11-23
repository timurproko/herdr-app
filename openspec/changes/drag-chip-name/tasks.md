# Tasks

## 1. Grabbed-row chip identity with unchanged pair movement

- [ ] 1.1 Update `src/features/spaces/main.js` to use the grabbed row's display name and existing row badge renderer for one preview chip, without changing block sources or drop logic; confirm coordinator and fleet chips match their respective sidebar rows.
- [ ] 1.2 Update `tests/spaces-worktree-layout.test.mjs` rendering coverage for both grab origins in active, return and fade phases, distinct saved colours, attachment-off behaviour and missing identities; pass `node tests/spaces-worktree-layout.test.mjs`.
- [ ] 1.3 Extend `tests/reorder.test.mjs` both-origin gesture coverage for one chip, original pressed identity and unchanged pair dimming/cancellation; pass `node tests/reorder.test.mjs` and existing `node tests/fleet-reorder.test.mjs` block movement checks.
- [ ] 1.4 Update the chip descriptions in `README.md` and `docs/REORDER.md` to match this change's workspace-experience delta; confirm no current documentation still promises an always-coordinator chip.
- [ ] 1.5 Run the requested `CI=true npm run test:ci` once after implementation, record its result and inspect required checks on the final pushed head before implementation handoff; retain any failures as explicit blockers rather than claiming success.
