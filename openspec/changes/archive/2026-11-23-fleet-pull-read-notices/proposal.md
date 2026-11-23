# Proposal

## Why

The coordinator's Open tab can display one misleading GitHub-unreachable error for every failed historical PR refresh, even when those PRs belong to Closed. The source demonstrably duplicates and misclassifies errors; fresh real-provider reads currently succeed, so the original transport failure must not be guessed.

## What Changes

- Preserve successful targeted reads and the existing 24-hour GitHub merge/close history bound, with a regression for one live open PR and three finished-task merged PRs in one repository.
- Keep failed refreshes attached to their last-known PR state, never surfacing known Closed history errors under Open.
- Reduce applicable PR-read failures to at most one truthful repository-section notice, distinguishing GitHub responses from actual connectivity failures and preserving healthy rows.
- Capture the actual failing command/result before making any provider-read change; do not replace working reads merely because the PRs are merged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `plugin-integrations`: clarify state-scoped, deduplicated repository read notices while preserving existing finished-task history, identity and concurrency policies.

## Impact

Focused changes to `src/plugins/git/mod/pulls.js`, `aggregate.js`, the error rendering in `main.js`, and their fleet/history/pull regressions. No new dependency, deployment, enrollment change, section-header redesign or Crew reader change. The concurrent enrollment-picker, discovery and label-style tasks remain outside this change.
