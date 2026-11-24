# Tasks

## 1. Missing task PRs are quiet, session-cached and diagnosed without hiding genuine failures

- [ ] 1.1 Add narrow authoritative targeted-PR absence handling and exact repository/number session tombstones outside aggregate entry resets; verify request counts across refresh, events, hide/show, context changes and panel recreation, plus independent identical numbers in another repository.
- [ ] 1.2 Exclude missing historical PRs from rows, counts and read notices, and log one sanitized customization line per confirmed identity; verify cold and previously loaded missing history, mixed found/missing results, all-missing empty sections and single log emission with synthetic host responses.
- [ ] 1.3 Present muted task-specific missing-URL hints for unfinished sources in Open, integrated with existing folds and bounded presentation paging; verify shared live/history identities, task completion, corrected URLs, no fake rows/robots and unchanged Closed history presentation.
- [ ] 1.4 Preserve real access/authentication repository/account notices and transient network/rate-limit/timeout errors without negative caching; verify existing failure/account fixtures, mixed explicit refusal text and obsolete hidden/disabled/superseded responses.
- [ ] 1.5 Update README and architecture descriptions to match quiet history, session retention and neutral live hints; verify documentation against the implemented response and cache behavior and run targeted controller/render regression entrypoints with their original VM flags.

## Workflow follow-up

- Implementation is blocked on maintainer approval of this draft plan; no project code is changed in the planning phase.
- After approval and implementation, run CI=true npm run test:ci once when no other suite is running, then report required-check status on the final head, distinguishing skipped or unavailable draft checks from passed checks.
- Leave readiness and OpenSpec finalization to the delivery bot; never mark ready or merge manually.
