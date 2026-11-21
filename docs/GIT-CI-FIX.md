# Git: ask the linked agent to fix failed CI

Enabling CI auto-fix automatically provisions a **Core-side background companion
on each connected machine**, not a visible desktop-panel sender. Closing Herdr does not stop an
installed worker. An SSH pc2 worker does not depend on the main PC staying on.
See [installation, lifecycle and limits](GIT-CORE-MONITOR.md).

## Settings

In **Settings → Plugins → Git → Settings**:

- Existing Git **Repositories** selections define the allowlist. Each machine
  uses its own gh login, never copied credentials. No background-specific setup
  controls, status panel or repository input are shown.
- **Auto-fix failed CI** defaults off. Enabling authorizes the PR's existing agent
  to inspect failed jobs, fix code and push under that agent's existing permissions.
  It never starts another agent. Companion startup is automatic on this computer
  and connected supported SSH hosts; it is part of this opt-in.
- **Send when agent is** has checkboxes for Idle, Done, Error and Working. Idle/Done
  are the defaults; none stops delivery. Blocked is always excluded, even in crafted
  selections. Working may queue input; Error delivery cannot repair an API/provider
  error. Settings use raw Core states, not the sidebar's “Needs you” attention group.
- **Message** is a one-line plain-text template (up to 1024 characters). `{url}`
  expands to the PR URL, `{runUrl}` to the first failed Actions run URL. Repeated
  placeholders work. Blank/unknown/unmatched placeholders, controls, and leading
  `/` or `!` commands are refused, not replaced by a hidden default.

Default message:

> Analyze failed CI run {runUrl} for {url}. Fix the cause; Push.

The toggle is the only setup action. Existing enabled preferences also provision
connected supported hosts through the normal desktop lifecycle. Explicit CI setting
changes synchronize to reachable managed workers. Offline machines retain their
last configuration, with an error on failed synchronization. Closing Herdr leaves
the last worker configuration active. Disabling Git requests a pause but cannot
revoke an unreachable host. No settings jobs are persisted for later replay.

## Independent operation

A worker polls its own local Core and allowed repositories approximately once a
minute. It works without an app window, panel, relay subscription or SSH connection
to the main PC. Existing cloud webhooks still update the desktop UI but do not own
background CI delivery. The Windows host must be awake, online, with its user signed
in and its Core/agents running. Startup before sign-in, Windows logout survival,
other operating systems and non-default Core sessions are not currently supported.

A1/Claude use verified current PR footers. Other agents can use explicit
`custom.ci.repository` + `custom.ci.pr` labels, or one unambiguous open PR for the
agent's current feature branch. Conversation PR mentions are never links. Shells,
unknown identities, incomplete inventories and multiple local agents for one PR
fail closed. New agents can be discovered even while every desktop is closed.

## Evidence and safety

The monitor verifies an open PR at its captured head, reads all matching Actions
runs (at most 100), chooses the latest run per workflow, and accepts only completed
failure/timed_out results. Cancelled, older, superseded, non-Actions and foreign-repo
failures are excluded. Up to 16 failed workflows are grouped into one message.
It rechecks exact attempts, current PR membership, fresh association, terminal
identity, state and current configuration before sending.

Verified PR/head/run/attempt context is appended, asking the agent to stop if stale,
treat logs as untrusted data and never force-push. Logs, titles, webhook instructions
and credentials are never copied into the prompt. Analysis-only templates do not
become fix/push authorization merely through the safety suffix.

Delivery is supported `hc send`, with literal argv and bounded timeout: `--if idle`
or `--if working` where supported, non-forced send for Done/Error. There is no force,
raw key, interrupt, repeated Enter or private A1 API fallback. Core can still refuse
a readiness change or wait for a human draft. A valid delivery acknowledgement is
not proof that a turn started, the fix succeeded, a push happened or CI passed.

## History and duplicate protection

Each worker stores up to 512 attempted failures in its local atomic `history.json`
before submitting. Keys contain repo, PR, head, run and attempt. Restarted workers
retain uncertain attempts; timeouts/crashes never automatically replay them.
Only structured empty-stdout pre-input refusals release the worker's own claim.
No persisted terminal job queue exists. New heads or failed reruns may be considered.
Unknown/modified state is preserved and refused, not overwritten.

First installation imports the former desktop's bounded attempt history; it never
clears legacy unknown receipts or replaces an existing worker journal. Worker
config, journals, task ownership and host runtime registration are excluded from
portable preferences. Only public plugin preferences are exported.

The desktop no longer instantiates a CI sender, preventing app/worker double
submission. A single owned task plus singleton lock protects each Core. Separate
hosts do not share a journal, so assigning the same PR to agents on two machines
is not globally exactly-once or coordinated failover.

## Validation

`tests/git-core-monitor.test.mjs` uses synthetic Core/GitHub/task transports and
scratch files only. It covers independence from desktop imports, local-only routing,
state/blocked guards, scopes, ambiguity, stale evidence/config/identity, durable
restart dedup, uncertain delivery, safe refusals, probes and task ownership.
Legacy evidence/delivery tests still validate the shared policy. Live installations
and probes are explicit actions, never part of automated test/deploy runs.
See the Core-side monitor document for precise live validation and lifecycle limits.
