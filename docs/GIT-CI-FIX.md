# Git: message the linked PR agent

**Settings → Plugins → Git → Settings → Auto-fix pull requests** authorizes an
independent **Core-side companion on each connected supported machine**, not a
visible-panel sender. Closing Herdr does not stop an installed worker; an SSH pc2
worker does not depend on the main PC staying on. See
[installation, lifecycle and limits](GIT-CORE-MONITOR.md).

## Settings and scope

- Auto-fix defaults **off**. It messages an existing verified agent, never starts
  another agent and never routes a notification to a coordinator instead.
- Git's durable confirmed **Repositories** added list for the current relay and
  GitHub account defines the allowlist, not disposable webhook-notice membership.
  Add/Remove and Configure/credential cache invalidation cannot erase that selection.
  Removing the last repository, a missing selection or a scope mismatch means no
  targets; legacy repository preferences never restore them. Each machine uses its
  own gh login, never copied credentials.
- **Send when agent is** offers Idle, Done, Error and Working. Idle/Done are the
  defaults; saved selections, including none, remain authoritative. Working stays
  opt-in and may queue input; Blocked is always excluded. Error delivery does not
  repair a provider error. These are raw Core states, not sidebar attention groups.
- **CI tests failed**, **Merge conflicts** and **Pull request merged** each have an
  independent switch (default on) and editable multiline Message, up to 4000
  characters. The entire message comes from its template; there is no appended
  hidden instruction. Blank messages, unknown/unmatched braces, disallowed controls
  and leading `/` or `!` commands are refused. Existing legacy default CI messages
  normalize to the current default; custom messages are not replaced.

Current templates live in `src/plugins/git/ci-message.js`. CI placeholders are
`{url}`, `{runUrl}` (first failed run), `{head}` and `{runs}` (all failed run links
with attempts). The default identifies the PR/head, asks to read failed logs, fix
and push, treats logs as data and prohibits force-push. Conflict placeholders are
`{url}`, `{base}`, `{head}`, `{files}`; the default asks to merge base, resolve,
build/test and push without force-push. Unavailable conflicting files are explicitly
marked not listed. Merged placeholders are `{url}`, `{base}`, `{branch}`; default:

> {url} was merged successfully. Clean up its worktree.

After a customization update, startup/code reload repairs scope and updates
reachable owned companions **without re-saving settings or restarting the desktop
or agents**. Run an already-closed updated desktop once; offline hosts must reconnect.
Explicit CI, relay and GitHub-account changes synchronize to reachable managed
workers; Add/Remove uses the existing chrome lifecycle. Offline hosts retain their
last config, with an error on failed synchronization. Closing Herdr is not a pause;
disabling Git requests one but cannot revoke an unreachable host. No settings jobs
are persisted for later replay.

## Independent discovery and ownership

Each worker polls its own local Core approximately once a minute. No app window,
Git panel, webhook subscription or SSH connection to the main PC is required after
provisioning. The Windows host must be awake, online, signed in, with Core/agents
running. Pre-sign-in startup, logout survival, other OSes and non-default Core
sessions are unsupported.

A1/Claude use verified current PR footers paired with their usage rows, never
conversation PR mentions. Other agents use explicit `custom.ci.repository` +
`custom.ci.pr` labels or one unambiguous open PR for their current feature branch.
Remembered `custom.ci.link.*` labels retain a verified association after merge.
Shells, unknown/moved identities and incomplete evidence cannot authorize a send.
The worker chooses the oldest local live PR owner (stable address tie-break), then
remembers it while it lives; a later helper cannot take over merely because the
owner is Working, excluded or temporarily unreadable. This is independent of the
panel robot/selected agent and does not grant coordinator messaging authority.

## Evidence, timing and transport

For CI, the worker verifies an open PR at its captured head, reads complete Actions
inventory (at most 100 runs), chooses the newest run/attempt per workflow and
accepts only **completed failure/timed_out workflows**. A failed individual job in
a still-running workflow produces no early alert. A completed failed workflow can
qualify independently of another workflow still running. Cancelled, superseded,
non-Actions and foreign-repository failures are excluded. Up to 16 failed workflows
are grouped into one message. Exact attempts, fresh ownership/association, terminal
identity, selected state, current PR/head and config revision are rechecked.

Conflicts require an open PR with explicit `mergeable=false` and
`mergeable_state=dirty`, not unknown mergeability or failing checks. Git fetches
objects only, without writing FETCH_HEAD/refs/index/worktree, and uses merge-tree
for a bounded file list. A locally clean merge suppresses stale conflict evidence.
Conflicts take priority for that cycle; an already-recorded conflict permits CI
checking on later cycles. Merged PRs can get one cleanup message; closed-unmerged
PRs get none. Review labels/comments are presentation facts, not message triggers.

Transport remains supported non-forced `hc send` with literal argv and timeout:
`--if idle` or `--if working` where applicable, ordinary send for Done/Error. No
force, raw keys, interrupts, repeated Enter or private agent API is used. Core's
readiness/draft gate remains authoritative. Delivery acknowledgement does not prove
a turn started, a fix succeeded, a push happened or CI passed.

## Receipts and diagnostics

`~/.local/state/herdr-ci-monitor/history.json` stores at most 512 attempted receipts
**before** submission: CI repository/PR/head/run/attempt; conflict repository/PR/head/
base SHA; merged repository/PR. Restarts retain attempted/unknown outcomes and never
replay them. Only structured pre-input refusals release the worker's own claim.
New heads/reruns/base tips may qualify; no persisted terminal message queue exists.
First install imports bounded legacy history without clearing existing receipts.
Owner memory is in `owners.json`. Neither file is a portable preference.

`status.json` now reports a cycle `health`, `reason`, counts and sanitized
`lastEvent`; the explicit monitor `status` command preserves these fields. Enabled
empty scope or wholly skipped candidates report **suppressed**, not healthy-ready.
Verification failures are **unavailable**, unknown submissions **uncertain**, and
acknowledged delivery **ready** for that cycle. A running scheduled task/heartbeat
alone is not delivery evidence. Relevant suppression reasons include:

- `no-monitored-repositories`: empty or missing/mismatched confirmed scope;
- `agent-state-not-selected`: the saved selection excludes the agent;
- `workflow-still-running`: no completed failed workflow qualifies yet;
- `already-sent`: evidence is already recorded, including attempted/unknown receipts,
  **not** an assertion of acknowledged delivery;
- `no-verified-targets`, `not-owner`, `no-failed-workflows` or `no-action`: no new
  eligible request on that cycle; these do not authorize a send.

Separate `diagnostics.json` retains at most **128 entries / 64 KiB**, coalescing
unchanged reason episodes across restarts. Entries identify time, event/reason,
message kind, repository, PR and target terminal where known (otherwise null).
`delivered`, `refused` and `unknown` remain distinct. No raw output, message text,
transcript or credentials are retained. Unknown/modified/linked diagnostic state is
preserved, and diagnostic-write failure cannot block delivery or alter receipts.
Probes keep diagnostic events in memory; no diagnostic toast or panel UI is added.

The desktop sender is retired; one owned task/singleton protects each Core. Separate
hosts do not share a journal, so this is not global exactly-once/failover coordination.

## Validation

`tests/git-monitor-scope.test.mjs`, `tests/git-monitor-settings.test.mjs`,
`tests/git-monitor-diagnostics.test.mjs` and `tests/git-core-monitor.test.mjs` use
synthetic Core/GitHub/task transports and disposable files. They cover durable scope,
actual setup-action invalidation and config writes, startup/restart, selected states,
completed-workflow gates, CI/conflict dedup, receipts and bounded diagnostics.
Shared evidence/message tests retain policy coverage. No automated test installs
real tasks, edits saved settings or sends input to a real agent. Live activation
and delivery are not claimed by those fixtures.
