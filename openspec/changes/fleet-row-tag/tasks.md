# Tasks

## 1. Both attached expanded rows display matching Crew pills without changing fleet behavior

- [ ] 1.1 Replace attached-child tag suppression with presentation-bound worker classification in `src/plugins/crew/plugin.js`; extend `src/plugins/crew/fleet.test.mjs` and `fleet-refresh.test.mjs` to cover attached live/finished/restored tags, pending/error refresh retention, confirmed detach, unrelated worker tags, attachment off and Crew disabled, with no new reads or writes from tag access.
- [ ] 1.2 Extend `tests/spaces-worktree-layout.test.mjs` to assert the attached worker Crew pill uses the coordinator pill styling and existing trailing placement before the worktree marker on the machine-chevron axis; retain chain/name, local/remote, single-chip drag and compact badge-only assertions; run the targeted Crew and Spaces fixtures.
- [ ] 1.3 Correct README and `docs/TESTING.md` statements that hide the fleet Crew tag; validate this change's delta supersedes all current suppression statements without rewriting historical archives.
- [ ] 1.4 Run `CI=true npm run test:ci` on the completed correction and record its result; incorporate the latest default-branch changes before reporting, then report required checks for the final head without deploying.
