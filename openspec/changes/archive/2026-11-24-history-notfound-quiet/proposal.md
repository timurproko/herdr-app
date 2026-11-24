# Proposal

## Why

Old finished Crew tasks can retain PR URLs from before a repository split. GitHub permanently rejects those links, so a persistent red history error and repeated refresh requests cannot help the person.

## What Changes

- Treat every authoritatively missing recorded task PR as absent, including unfinished tasks: no row, count, notice, neutral hint, tooltip or empty section.
- Remember each exact canonical repository and PR number across refreshes and coordinator/panel context changes, and emit one sanitized customization-log line on first confirmation per identity per session.
- Keep historical-only misses cached for the session. For live tasks, permit a recheck after five minutes on the existing shown-panel refresh lifecycle; a changed recorded URL is eligible immediately. Do not introduce a new timer or head-discovery request.
- Preserve actionable permission/authentication notices, including repository/account context, and transient network, rate-limit and timeout notices.
- Add synthetic controller/render regressions for quiet missing history, cache reuse, mixed results, silent live-task misses and bounded rechecks and preserved genuine failures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: distinguish confirmed missing task PRs from real read failures; make all confirmed task-PR absence silent, session-cache historical misses and bound rechecks for live tasks.

## Impact

- Focused changes in `src/plugins/git/mod/aggregate.js` and the task-section presentation in `src/plugins/git/mod/main.js`, with existing failure classification reused or narrowly refined to avoid suppressing unrelated errors.
- Extend `tests/fleet-read-failures.test.mjs`, `tests/fleet-read-notices.test.mjs` and relevant account-diagnosis fixtures; align README and architecture guidance.
- Base: refreshed `origin/main` at `3bf9eb0`, including merged PRs 45, 48, 49 and 53. No edits to branches for PRs 51 or 53, native binaries, Crew records, deployed files, preferences, accounts or enrollment.
- This changes the existing explicit missing-resource notice requirement, so delivery requires approval of this draft plan before implementation.
