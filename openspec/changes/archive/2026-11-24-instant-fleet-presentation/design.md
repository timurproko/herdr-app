# Design

## Context

See proposal.md for the requested behavior. Two state layers already exist:

- `custom.fleet.display` version 1 persists bounded machine/parent/child/home/owner/adoption identity. `fleetContexts({presentation:true})` reads it independently of freshness, and Spaces already uses presentation links for row projection.
- `custom.fleet.links`, local witnessed tokens, dependency signatures and generation checks gate fresh actions. The shared read record has a 45-second transport lease and two-second post-receipt processing phase; Spaces invokes its lifecycle every 250 ms.

The presentation gap is concrete: `src/shared/space-preferences.js` calls `updateFleetDisplay(...,{disabled:true})` on off, which clears the durable display record. Crew's `invalidateFleet()` also clears it when disabled. Enabling therefore has no remembered pair to project. Space block drop/commit currently queries fresh `pluginWorkspaceLinks()` rather than the displayed links, so restoring the picture alone would still refuse remembered-pair dragging.

The exact live expired-read cause is NOT established yet. A read-only measurement using the same real Core `hc exec --json -- powershell -NoProfile -NonInteractive -Command ...` path yielded:

| Stage | Wall milliseconds | Stdout bytes |
| --- | ---: | ---: |
| PowerShell startup, command/path facts | 230 | 58 |
| PowerShell plus trivial Node start | 299 | 2 |
| Real Crew help | 2585 | 4854 |
| Real recorded-only `status --all --json` | 2239 | 411513 |
| Real `status --all --json --discover-prs` | 6402 | 434515 |
| Production help/status/projection wrapper, discovery | 7499 | 46105 |
| Same production wrapper, recorded-only | 2137 | 23103 |

These are sequential samples on a loaded machine, not additive stage costs or a latency guarantee. The Core child resolves the gh account wrapper first. The command already disables the PowerShell profile. The real wrapper completed below its 25-second discovery allowance in this sample and projected about 89% of bytes away. This refutes neither an intermittent transport stall nor native callback/decoder loss; it does not justify claiming that Settings ownership or App 0.1.18 is the root cause. No native real-path reproduction has run during planning. Raw replies stay in ignored local artifacts and must not be committed or copied into reports.

## Goals / Non-Goals

**Goals:** Preserve instant visual intent without laundering it into authority, reuse the existing identity record and lifecycle, and reproduce/repair the remaining native loss with measured real data.

**Non-Goals:** No new user setting, task/PR cache, polling service, binary patch, live installation test mutation, or edits to #56/#59/title-hover/checks-icon areas. No inferred first pair from space names or Crew pills. No guarantee while the UI event loop is paused or the machine sleeps.

## Decisions

### Preserve memory; gate visibility separately

Keep the existing bounded versioned `custom.fleet.display` identity format rather than adding another cache. Preference/plugin off invalidates generation, pending work, retries and action status but retains remembered identity. Presentation readers already gate on enabled state; use that gate to hide immediately. A completed current verified pair updates memory. A completed authoritative negative clears it, including owner/home replacement; transport or uncertain membership does neither. Preserve the established workerless-fleet retention rule when the exact extant pair remains valid.

On enable/restart/update, pure presentation joins exact machine-qualified native space IDs to the saved record and projects the picture in the same render. Names, saved timestamps or a role hint never create a pair. Missing-space memory is ignored immediately; the existing yielded lifecycle clears it only once the corresponding machine layout is ready. Unready remote snapshots must not erase durable history. Unknown versions remain read-only/fail-closed. The record remains host-local and excluded from preference export.

Alternative rejected: resurrect a previous complete fleet/status payload on toggle. That would revive obsolete task inventory and action permissions, increase persisted private data, and couple the visual switch to Git.

### Allow space-only block dragging from the displayed pair

Use the displayed remembered link for capture, target-edge resolution and commit revalidation in the existing linked-space reorder flow. Revalidate captured machine, both space IDs, displayed pair identity, enabled state and command acknowledgements throughout the commit. A fresh authoritative re-pair or member disappearance cancels an old gesture. This operation only reorders native spaces; it does not move terminals or tabs.

Keep current fresh-status checks for coordinator colour writes, consolidated inventory reads, robot navigation and any operational worker/terminal actions. Displayed badge colour may follow the coordinator's current colour without writing either saved colour. Do not globally replace fresh `pluginWorkspaceLinks()` semantics for other consumers.

Alternative rejected: weaken all fleet guards to accept persistence. It would grant operational authority from stale local state. Also reject displaying attached rows that cannot drag as one block: that fails the requested interaction.

### Keep inventory independent

Off still clears consolidated Git inventory and reads; on with remembered-only identity routes standard Loading without restoring rows/counts from a previous toggle. Fresh verified status resumes the existing inventory path. Existing same-context refresh failures can retain already-loaded Stale rows under their current rules. No generic Git list, paging, checks or header implementation needs modification.

### Fix the native reader from real-path evidence, not a guessed timeout

Extend the opt-in disposable native transport harness to run or consume the real read-only command/home and preserve the real payload's size, task count and schema. For real command execution, explicitly pin the real Crew home and intended live read-only Core route; the disposable app's own Core/session must never be mistaken for the person's owner. Translate only owner/task terminal IDs into the fixture's inert topology after receipt when required, or replay a captured real reply through the production wrapper. Keep private raw output only in the worktree's ignored artifacts.

Instrument command start/finish, native raw receipt, lease phase/deadline, initiating mod, lifecycle owner/tick, decoder pieces, JSON/validation and publication. Run with Settings mounted, selected fleet and coordinator, distinct module copies and App 0.1.18/Core 0.1.22. Explicitly stop the initiating fixture view/continuation while another copy ticks; test cold and warm histories and late reply orderings. These measurements distinguish pre-receipt transport loss from native processing interruption and cross-instance ownership loss.

Implement shared owner/attempt liveness and phase/deadline recovery serviced by the existing Spaces lifecycle; it must not depend on the initiating Settings/Git copy's private maps or finally block. A healthy four-to-five-second command must remain single-flight, while lost owners/continuations become retryable within the active 2/5/10-second recovery interval plus one tick. Keep command execution bounded and distinguish active transport from finished response processing; do not merely shorten the 45-second lease to two seconds, which would duplicate healthy slow commands. Prefer lifecycle-owned verification with other entrypoints requesting/joining it if measurements identify transient view ownership as the cause. Preserve token/generation/dependency guards across every phase and reject late predecessor cleanup.

The approved implementation notes require recorded-only identity verification, with optional PR discovery as separate lower-priority work after recorded inventory. Use the newly installed explicitly advertised fleet view. Share capability evidence keyed by resolved CLI path and modification time so repeated verification/discovery reads and mod copies do not run help again; unchanged evidence is safe to retain across reloads/sessions because every command rechecks file identity. Keep versioned known/none/unavailable semantics, exact unsupported-flag fallback, finished Open/Draft eligibility and the existing bounded discovery cadence. Increasing a timeout or a synthetic-only pass is not a remedy.

### Measured implementation findings

A disposable native App 0.1.18/Core 0.1.22 run using the real command/home reproduced stranded Settings ownership: closing only the fixture Settings view at 300 ms left a transport-phase lease after the actual command finished at 3555 ms. No receipt callback ran; Spaces replaced the lease at 45119 ms and attached at about 48813 ms. This establishes the lost-owner mechanism; the old live log cannot identify which event interrupted that particular continuation. Real payload replay did not interrupt decoding.

The implementation therefore moves IO ownership to the recurring Spaces lifecycle. A cancelled/done native Task cannot renew its shared two-second liveness lease; replacement copies can recover within that interval plus a tick. Non-owner consumers witness in-flight verification without borrowing persisted tokens. Shared request intent is debounced and consumed privately, not cleared with a render-triggering write. Git's short-lived inventory demand crosses mod boundaries without render-time IO or another timer.

With the newly installed Crew fleet view, the final real three-copy native path verified in 590/683 ms, restored remembered presentation in 5 ms, and completed separate discovery at 3444/3276 ms. One help probe served all four reads. See docs/FLEET-STATUS.md for the full measured path, owner-reload fault, older real legacy replay, bounds and remaining historical uncertainty.

## Risks / Trade-offs

- Remembered identity can be obsolete until fresh evidence arrives → accept optimistic picture only, require exact extant spaces, and retain all operational freshness checks.
- Persistence is currently cleared by more than one path → cover preference changes, plugin changes, import, reload and startup; make one canonical memory mutation boundary and test each caller.
- Space IDs could be reused by the host → never match on names, keep qualified pair/home/owner/adoption identity, and revalidate authoritative replacements before publishing or committing a drag.
- Short liveness windows could mistake a slow healthy command for death → distinguish owner liveness from command completion, test real 4–5-second reads, and preserve bounded single-flight transport.
- The precise native loss may be load-dependent → retain phase traces in disposable artifacts, reproduce cross-instance death explicitly, and report remaining uncertainty instead of assigning a false root cause.
- Read-only live Crew discovery can hit real GitHub limits → use a bounded small number of measurements and replay captured real output for repeated destructive fault injection in the disposable app.

## Migration Plan

Reuse valid v1 pair records; no settings migration, task inventory persistence or portable preference change is needed. Existing installations whose off transition already erased the pair need one successful read before instant restoration becomes available. Implementation validation uses only disposable native app/Core instances and their inert terminals; cleanup stops only those instances. Do not deploy or change the person's app, settings, Crew home or running processes.

After approval, run targeted regressions per outcome, then the requested `CI=true npm run test:ci` once no other suite is running. Check the final head's required checks without marking the PR ready or merging. Report if draft policy defers required suites rather than claiming green checks that did not run. Rollback restores the prior source behavior without fabricating new pair memory.
