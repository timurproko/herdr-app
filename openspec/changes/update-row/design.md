# Design

## Context

See proposal.md for motivation. Custom already draws Updates in `settings/main.js:updates()`; `render()` and workspace-chrome own its dots. PR 6's deploy:all already supplies clean-main checking, full desktop deploy and independent peer shell attempts. Its four fixture suites cover these paths. Closed PR 5 was read **only for findings**: native updates have no third-party registration; shared state can drive Custom's dots; hc exec creates no terminal; a replaceable mod cannot supervise its deploy. Its larger design is not reused.

## Goals / Non-Goals

One third row and one all-machine action. No machine rows, news, extra settings, rollback UI, manifest schema change, native patches, daemon, scheduler or history. Planning/tests never touch the live home or machines.

## Decisions

### 1. Source: managed desktop clone

Only use `~/.local/share/herdr-app` on the desktop. Create it from the fixed public HTTPS repository on main on first **Update**, not Check (120-second clone bound). Reject redirected paths and linked worktrees; never use cwd, `D:/Git/herdr-app` or crew worktrees. Existing clones retain deploy:all's clean-main/origin/equal-or-behind gates, with no stash/reset/repair/branch switch, dependency installation or prepare.

**Confirmed from code:** running `node tools/deploy-all.mjs` from that clone already fetches and fast-forwards it, invokes the full desktop deploy and attempts eligible existing peer shell checkouts. No source-routing change is needed. Its only addition is durable result reporting, below. Existing remote skip/failure behavior and independent attempts remain unchanged; main can advance between machines as today.

### 2. Revision and Check: sidecars, not manifest changes

Have real deploy:all runs atomically write `.customizations/deploy-all-result.json` under the selected Herdr home after the desktop and each peer: time, optional launch token, outcomes/commits/backup IDs/reasons, and last successful desktop SHA plus its ownership-manifest digest. Preserve that successful record across peer failures. A local failure marks installation unverified; dry-run writes no sidecar.

Trust the installed SHA only while its manifest digest matches and no later local failure makes it uncertain. A changed ordinary/scoped deploy or rollback therefore yields `revision unknown`, not a stale revision. This is a last successful full-deploy record, not an audit of manual file edits. Never use clone HEAD as installed evidence. Old installations show unknown until a successful Update.

Check makes one noninteractive, 15-second `git ls-remote` request for fixed public main, comparing that SHA with the installed record: equal = current; different/unknown = Update available. Failure = `Check failed. Try again.` It neither clones/fetches a checkout nor probes peers. This is smaller than deploy:all --dry-run, which would check all machines. Keep latest attempt/success/availability/error in `update-check.json`, outside preferences.

### 3. Self-update: one detached, finite runner

Package one self-contained built-ins-only launcher/runner in `src/services/updates/`. A short local facade hc exec copies it to `.customizations/update-runner.cjs` **outside replaceable runtime** and starts detached Node with redirected stdio/unref. Return after startup acknowledgement. The runner asynchronously supervises the managed clone's existing deploy-all CLI with captured HERDR_APP_HOME/cwd and a launch token; no terminal is created.

Keep one exclusive launch lock, one atomic `update-status.json` (token, PID, start/deadline, state, log path) and one latest `update.log`. Duplicate clicks/windows attach to the active run; never overwrite its runner/log. All supervisor code loads before deploy. Existing subprocess limits remain, plus a **30-minute overall deadline** that stops only its own local child tree. Dispatched remote work can remain uncertain; never replay it automatically.

Read status on Updates entry/reload and once per second only while that page shows an active run. Chrome reconciles on mount/hourly checks. Shared state is only a runtime projection for redraw/dots. Closing Settings or replacing its mod neither cancels nor relaunches the job.

| Outcome | Row and single button |
| --- | --- |
| Running | `Updating all machines…` / disabled Updating… |
| All succeeded/current | New revision; Up to date plus successful post-run check time / Check now; if main advanced, Update available / Update instead. |
| Desktop succeeded, peer skipped/failed or inventory failed | New desktop revision; `Desktop updated; some machines skipped or failed. Log: <path>` / Check now unless newer main is confirmed. Routine checks retain this warning; log contains machine details/backup IDs. |
| Desktop refused/failed | `Update failed: <short reason>. Recovery: documented rollback. Log: <path>` / Check now. Old revision only if still verified; otherwise unknown. |
| Deadline/crash/missing final result | `Update outcome unknown. Inspect log: <path>` / Check now only while prior process/lock is unresolved. No success inference, automatic retry or stale-lock deletion. A late matching final result can settle it. |

Launch failure is reported directly, with log path if available. A definite failure needs a fresh successful Check and resolved prior process before another Update. Post-deploy check failure remains a check failure, not Up to date.

### 4. UI: one ordinary row; inexpensive dot/hourly check

Approved label: **Customizations**, followed by the short revision; keep it in one constant for renaming. Reuse `this.row()`, existing description typography and 112px button slot below herdr-core. No new heading/disclosure. Three normal states:

```text
Herdr 0.1.16                   [What's new] [Check now]
  Up to date. Checked at 17:41.
herdr-core 0.1.21                          [Check now]
  Up to date. Checked at 17:41.
Customizations a1b2c3d                     [Check now]
  Up to date. Checked at 17:41.

Customizations a1b2c3d                        [Update]
  Update available.

Customizations a1b2c3d                     [Check now]
  Check failed. Try again.
```

Seven-character installed SHA, or `revision unknown`. During a check keep the prior description and disable its button as Checking…; during deployment use Updating…. Error/log paths wrap in the same description area. Native rows/actions stay unchanged.

**Both optional additions are cheap:** OR confirmed Custom availability into Settings navigation and expanded Settings/compact More dot predicates, preserving native predicates, via facade shared/setShared. Opening Updates does not clear availability; failed checks neither invent nor clear a confirmed update. One hourly timer on mounted **non-footer** chrome, plus due-on-mount and Check now, shares persisted attempt time/a short lease across windows. Eager checking() contexts do no work. This runs alongside Herdr's hourly checks without modifying its updater; no timer deploys.

### 5. Failure and recovery

No automatic rollback. State the failing phase/short reason; log keeps full output and any backup ID. Document the existing recovery: switch to Herdr/main with `npm run disable`, then `npm run rollback -- BACKUP_ID`, from the managed clone with the same HERDR_APP_HOME. If failure preceded a printed backup ID, inspect existing journals as documented; never fabricate one or bypass later-edit/stock-layout safeguards. A stale runner lock requires explicit process/log inspection before retry.

### 6. Fixtures and honest limits

After approval, extend deploy-all fixtures and add runner/row tests using temporary homes/bare origins and mocked exec/hc/npm/deploy:all: managed-path refusal and first clone, sidecar/digest/unknown revision, byte-preserving dry-run, incremental mixed results, duplicate launch, reload/page disappearance, crash/deadline/missing result, recovery text, fake-clock hourly coalescing, native controls/dots and packaging closure. No live home, network machines, App, credentials or deployment is used.

**Only the maintainer can demonstrate in the real app:** typography/wrapping and three states, expanded/compact dots, actual detached survival through self-replacement and close/reopen, unchanged terminals/focus, real Core PATH/permissions and eligible-peer shell deployment. Agents cannot see this UI; fixture passes do not prove those facts. Any real deploy/recovery needs separate authorization.

## Risks / Trade-offs and migration

- Sequential install can partially write or break Settings: durable result/log survives; use documented manual recovery, never assume all-or-nothing.
- A large/slow peer list may exceed 30 minutes: report unknown and inspect before retry; no distributed transaction is promised.
- Record-less/manual installs cannot prove a SHA: show unknown, then establish it through explicit full Update and existing ownership guards.
- The feature cannot install itself when absent: the maintainer first installs the merged version through the existing path. No live deployment is authorized by this plan.
