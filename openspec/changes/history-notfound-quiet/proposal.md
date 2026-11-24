# Proposal

## Why

Old finished Crew tasks can retain PR URLs from before a repository split. GitHub permanently rejects those links, so a persistent red history error and repeated refresh requests cannot help the person.

## What Changes

- Treat authoritatively missing historical-only task PRs as absent: no row, count, section-only error or red notice.
- Remember each exact canonical repository and PR number for the app session across refreshes and coordinator/panel context changes, and emit one sanitized customization-log line on first confirmation.
- For unfinished tasks, show a muted task-specific hint: `Task <task>: <repository> #<number> not found; check the recorded PR URL`. Do not manufacture a PR row or share a repository-wide red notice for it.
- Preserve actionable permission/authentication notices, including repository/account context, and transient network, rate-limit and timeout notices.
- Add synthetic controller/render regressions for quiet missing history, cache reuse, mixed results, live hints and preserved genuine failures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: distinguish confirmed missing task PRs from real read failures; make historical absence quiet and session-cached while live task absence remains neutrally actionable.

## Impact

- Focused changes in `src/plugins/git/mod/aggregate.js` and the task-section presentation in `src/plugins/git/mod/main.js`, with existing failure classification reused or narrowly refined to avoid suppressing unrelated errors.
- Extend `tests/fleet-read-failures.test.mjs`, `tests/fleet-read-notices.test.mjs` and relevant account-diagnosis fixtures; align README and architecture guidance.
- Base: current `origin/main` at `1c511d7`, including merged PRs 45, 48 and 49. No edits to branches for PRs 51 or 53, native binaries, Crew records, deployed files, preferences, accounts or enrollment.
- This changes the existing explicit missing-resource notice requirement, so delivery requires approval of this draft plan before implementation.
