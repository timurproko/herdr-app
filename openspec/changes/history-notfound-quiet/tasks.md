# Tasks

## 1. Missing task PRs are quiet, session-cached and diagnosed without hiding genuine failures

- [ ] 1.1 Add narrow authoritative targeted-PR absence handling and exact repository/number session tombstones outside aggregate entry resets; verify request counts across refresh, events, hide/show, context changes and panel recreation, plus independent identical numbers in another repository.
- [ ] 1.2 Exclude every confirmed missing task PR from rows, counts, notices, hints and tooltips, and log one sanitized customization line per identity per session; verify cold and previously loaded live/history misses, mixed found/missing results, all-missing empty sections and single log emission with synthetic host responses.
- [ ] 1.3 Allow live-task misses one recheck after five minutes through the existing shown-panel refresh lifecycle, with changed recorded URLs read immediately and historical-only misses cached for the session; verify clock boundaries, live/history transitions, corrected URLs, later creation at the same number, no parallel reads and no extra timer.
- [ ] 1.4 Preserve real access/authentication repository/account notices and transient network/rate-limit/timeout errors without negative caching; verify existing failure/account fixtures, mixed explicit refusal text and obsolete hidden/disabled/superseded responses.
- [ ] 1.5 Update README and architecture descriptions to match silent live/history absence, session retention and bounded live-task rechecks; verify documentation against the implemented response and cache behavior and run targeted controller/render regression entrypoints with their original VM flags.

## Workflow follow-up

- Implementation is blocked on maintainer approval of this draft plan; no project code is changed in the planning phase.
- After approval and implementation, run CI=true npm run test:ci once when no other suite is running, then report required-check status on the final head, distinguishing skipped or unavailable draft checks from passed checks.
- Leave readiness and OpenSpec finalization to the delivery bot; never mark ready or merge manually.
