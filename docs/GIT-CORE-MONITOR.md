# Core-side CI auto-fix monitor

## What keeps running

CI auto-fix is a **standalone companion of each Herdr Core**, not a desktop-panel
loop. It uses public `hc ls/get/read/send` and GitHub CLI APIs. No Herdr/Core binary,
Core document, native update channel, agent process or permission is patched.

One Windows user task named **Herdr CI Monitor** runs on each explicitly installed
machine. It monitors **only that Core's local terminals**, never connected remote
terminals. Install on both the main PC and SSH `pc2`: closing either desktop leaves
its worker running; shutting down the main PC does not stop pc2's worker. SSH is
needed for installation/configuration, not for pc2's normal monitoring.

The host must remain powered on, awake, network-connected, and its Windows user
signed in. This is a limited interactive-user task, not a system/password service.
It starts at user logon and a repeating one-minute task trigger recovers a stopped
worker. IgnoreNew plus a process-owned singleton prevents overlapping workers.
It does not start/restart Core or agents. It cannot preserve agents through reboot
or Windows logout, or run before user sign-in. Other operating systems and custom
Core sessions currently refuse installation rather than claiming support.

## One-switch setup

In **Settings → Plugins → Git → Settings**, turn on **Auto-fix pull requests**. This
opt-in automatically provisions/updates a companion on this computer and connected
SSH machines; new connected hosts are picked up while the desktop is available.
There is no separate Background monitor section, status/Check row, machine picker
or repository input. Existing Git repository selections own the worker allowlist.
The durable confirmed added list is scoped to the current relay and GitHub account,
not the disposable webhook-notice cache. Removing every repository gives an empty
scope, never a fallback to old targets; missing/mismatched selection is also empty.
Normal operation is silent; actual provisioning/sync failures produce a warning.

Each target still needs Node.js, Git, gh logged into the required repositories,
and its own running default-session Windows Herdr Core. These prerequisites cannot
be bypassed by hiding status UI. Once provisioned, the worker needs no desktop.
A previously unconnected/unprovisioned host cannot install itself magically while
all managing desktops are off; connect it once while auto-fix is enabled.

Automatic setup pins the target Core identity and absolute executable paths, writes an
immutable versioned package under `~/.local/state/herdr-ci-monitor`, imports the
legacy desktop's bounded attempted-failure history on first installation, and
registers only its own limited-user task. It never copies GitHub or model-provider
credentials: each host uses its own gh keyring. Unknown task actions, package
changes, directories, journal shapes and Core identities are preserved/refused.
No install/start occurs merely from rendering Settings or native checks.

Installed machines are remembered in runtime-only `custom.git.monitor-hosts`.
Explicit changes to CI toggle, states or message synchronize to reachable managed
machines. Changes to the existing repository selections and newly connected hosts
are coalesced through the header's existing lifecycle event; there is no new timer
or periodic desktop status polling. Disabling Git also requests a pause. Closing the app
is **not** disabling monitoring. Configuration files on the worker host are the
authority while the desktop is absent. Offline hosts retain their last settings;
failed synchronization reports an error, not a successful revocation. Use the
host's local stop command if its managing desktop cannot reach it.

No pending settings mutations or terminal messages are saved for later replay.
When auto-fix is enabled, the existing desktop lifecycle ensures connected hosts
have the current owned companion package. Matching packages receive configuration
updates without restart; a changed package is installed through the same guarded
setup boundary. Disabled/eager-check contexts never provision. No pending setup
request is restored or replayed from disk. Updating Custom needs no preference
re-save or desktop/agent restart: startup/code reload synchronizes the durable scope
and updates reachable owned packages. Run an already-closed updated desktop once;
reconnect offline managed hosts to receive the change.

## Discovery and delivery

Every ~60 seconds, each worker reads its local Core inventory. It considers only
reported live agents in allowed repositories. A1 and Claude PR numbers come from
a verified current footer paired with a usage row, never conversation/history.
An explicit pair of public terminal labels `custom.ci.repository=owner/repo` and
`custom.ci.pr=123` can bind other agents. Otherwise, other agents require exactly
one open PR for their current non-main/master/develop branch. The PR an agent is
found on is remembered on its own terminal as `custom.ci.link.repository` +
`custom.ci.link.pr` (gone with the terminal; a new PR in its footer or branch replaces
it), so the same agent is still reached after a merge, when its footer or branch no
longer names an open PR. Explicit `custom.ci.*` labels are never overwritten.
Once a linked PR is merged, the agent gets the "Pull request merged" message once
(default: clean up its worktree); a closed, unmerged PR gets nothing. Unreadable or
ambiguous inventories fail closed. Several local agents linked to the same PR resolve
to its oldest live owner (stable address tie-break), remembered while it lives. A
later helper cannot take over because the owner is unselected or briefly unreadable.
No previously captured terminal IDs or PR assignments become a persistent queue.

The worker rechecks PR openness/head, complete latest-per-workflow Actions evidence,
run attempt, live terminal identity, fresh PR association, selected state and
configuration revision before sending. Each message comes entirely from its configured template. CI requires completed
failed/timed-out workflows; a failed job in a running workflow is not an early alert.
Conflicts and merged cleanup have their own switches, evidence and templates. Idle/Working use Core's exact `--if` predicate; Done
and Error use ordinary non-forced send. Core's input gate/draft protection remains
in control. Blocked, shell, unknown, removed and moved identities are never targets.
No raw logs, PR titles, credentials, force flags, interrupts or raw keys are sent.

A local atomic history file stores up to 512 attempted failures **before** submission.
Restarts retain unknown attempts and never replay them. Only a structured pre-input
Core refusal releases the worker's own claim. Crashes/timeouts after claiming remain
conservative unknowns. Installer history seeding never clears an existing journal.
No desktop auto-fix sender remains, so desktop + worker cannot double-send.
Different Core hosts still have separate journals: two agents on different hosts
assigned the same PR do **not** have global exactly-once/failover coordination.

## Local diagnostics

`status.json` and the management status command expose health, reason, target/attempt
and outcome counts plus sanitized lastEvent. Enabled empty scope and wholly skipped
candidates are **suppressed**, never healthy-ready. Infrastructure verification failure
is **unavailable**, unknown submission **uncertain**, and acknowledged delivery
**ready** for that cycle; task Running alone is not delivery evidence.

Separate `diagnostics.json` keeps at most 128 entries / 64 KiB and coalesces unchanged
reason episodes across restart. It records time, event/reason, kind, repository, PR
and target terminal where known, otherwise null. Reasons include no monitored
repositories, agent state not selected, workflow still running and already sent
(already recorded, including attempted/unknown receipts, not proof of acknowledgement).
Delivered/refused/unknown stay distinct. No raw output, templates, transcripts or
credentials are retained. Unknown/linked diagnostic files are preserved; best-effort
write failures cannot alter delivery/receipts. Probes do not persist diagnostics.
There is no new toast, panel marker or status polling UI.

## Commands

Run from your standalone source checkout on the managing PC:

```sh
node tools/core-ci-monitor.mjs status --on local
node tools/core-ci-monitor.mjs status --on pc2
node tools/core-ci-monitor.mjs install --on pc2 --paused
node tools/core-ci-monitor.mjs probe --on pc2
node tools/core-ci-monitor.mjs update --on pc2
node tools/core-ci-monitor.mjs stop --on pc2
```

`--paused` installs/updates without enabling messages. `probe` performs read-only
Core/GitHub verification and cannot claim history or send, even if auto-fix is on.
`update` reads the managing desktop's current public settings. CLI installation does
not itself enroll the host; normal enabled desktop lifecycle (or the explicit
enrollment helper) establishes automatic settings synchronization.
Stop pauses the host's config before disabling/stopping only the owned worker task.
It never stops Core or agents. A stale unknown singleton guard fails closed rather
than deleting potentially live ownership; investigate that host before recovery.

## Validation and limits

The automatic one-switch version passed 68 synthetic engine/task assertions,
settings lifecycle/provisioning tests, the full unit suite, 220 focused Git/Settings
deferred cases, disposable native fixtures, host checks, doctor and all 17 installed
native checks. The native preview confirms there is no background status/Check or
machine/repository setup UI. The broader integration suite has a separately known
unrelated theme-selection assertion; focused CI/Git/Settings checks pass.

On this user's explicit authorization, local and pc2 companions were installed,
then enabled only after the desktop sender was retired. Both report Running,
enabled, healthy and current packages after their launcher/SSH commands exited.
They use Idle/Done/Error and the current Git selections (`timurproko/a1` and
`timurproko/xrbuild`). A read-only pc2 probe discovered two live mapped targets and
submitted zero messages. No actual desktop close, PC shutdown, logout or reboot
was simulated, and no real CI-fix/push success is claimed.

Synthetic tests use fake Core/GitHub/task APIs and disposable state: local-only
routing, no-panel dependency, selected/blocked guards, stale evidence/identity/config,
ambiguity, durable receipts, unknown/refusal handling, read-only probes, singleton
ownership and limited-user scheduled task registration. No automated test sends
input to a real agent or installs a real task.

Explicit live installation is separate from tests: verify task/heartbeat after the
installer's SSH execution has exited, use read-only probes, then enable only after
the old desktop sender is removed. A healthy task/heartbeat and successful probe
are not a claim that a real CI fix, push, literal PC shutdown, logout or reboot has
been tested. State facts precisely; do not stop active desktops/agents to simulate
these conditions without further permission.
