# Design

## Context

See proposal.md for motivation and specs/customization-lifecycle/spec.md for behavior.

Observed today:

- `deployPeer` in `tools/deploy-all.mjs` records any non-connected inventory entry as `skipped: offline (...)`, without dispatch. A connection lost after dispatch is already a failed unknown outcome and must stay so.
- `runRemote` in `tools/deploy-all-worker.cjs` deliberately excludes full desktop ownership as `needs its own full deploy`. This is not an eligible shell target.
- Both `outcome` in `src/services/updates/update-worker.cjs` and `updateProjection` in `src/shared/customization-update-model.js` treat every non-success peer row as partial. The duplicated policy must agree for detached Settings and ordinary CLI runs.
- `customizationRowState` offers Update only for `check.available`. The worker derives that field solely from the manifest-linked desktop revision versus public main. Once the desktop is current, no Update is offered for pc2.
- A real `deployAll` run already inventories and revisits peers even when desktop HEAD is unchanged; eligible peers always run their installer. There is no behind-peer memory beyond the latest, replaceable result.
- Provenance is a successful desktop commit tied to the ownership-manifest digest, not checkout HEAD or peer bookkeeping. Check now and automatic checks intentionally never inspect peers.

## Goals / Non-Goals

**Goals:** separate benign exclusions, failure diagnostics, installed desktop availability and pending peer work; keep CLI and Settings consistent across replacement/restart.

**Non-Goals:** automatic deployment on reconnect, periodic peer scans, remote desktop deployment, new provisioning, preference changes, deployment during this task, or changes to native update behavior.

## Decisions

### 1. Use a narrow benign-outcome classification

Add explicit peer skip classification for positively known offline/unreachable inventory states and the full-desktop exclusion. Preserve readable action/reason output. Both worker outcome and model projection must implement the same bounded policy and be covered together; do not let any arbitrary `skipped` result imply success.

Allow narrow recognition of existing receipts' exact known offline/full-deploy reasons so an already-saved offline result need not wait for another install to stop warning. Unknown inventory state, unknown result shape and other unsafe/missing-tool/source skips stay conservative partial outcomes. A reachable transport error, timeout or lock is never relabelled offline based on a later connection loss.

Alternative rejected: treating all skips as benign hides actionable reachable-machine problems. Treating the full-desktop exclusion as a warning is also rejected: this command intentionally cannot service it.

### 2. Preserve pending peer identities in the runtime result sidecar

Extend the existing `.customizations/deploy-all-result.json` bookkeeping with a bounded, validated set of deferred offline peer names, independent of `desktop` and its digest. Carry the set across incremental result writes and later CLI selections. Recover pending names from a legacy latest receipt's known offline rows when the new field is absent; do not infer an installed peer SHA from a skip.

A selected offline peer adds a fact; deployed/already-current or a confirmed full-desktop exclusion removes it. Not-selected rows and failed inventory cannot erase it. Remove a no-longer-configured peer only from a successful complete inventory. A later genuine failure keeps its diagnostics and unresolved pending fact. Dry-run does not write any of this state. Result/status readers expose only the sanitized pending-work fact needed by the row; no portable preferences or shared host documents are added.

Alternative rejected: relying only on the latest rows loses pc2 when a local-only run replaces them. A separate queue/daemon is unnecessary: this is discovery memory for the next explicit run, never permission to replay work.

### 3. Separate launch eligibility from update availability

Keep `check.available` and the existing dots strictly desktop-versus-published-main facts. Expose deferred peer work separately through inspection/projection. After a successful main check, permit the existing Update action for that work even if availability is false. The description remains `Up to date. Checked at ...` with no warning/details pointer, and the action is Update rather than a disabled recent-check confirmation. Existing busy/check-error/failure-freshness/unknown/lock guards still win.

Reconcile historical completed Settings job state with its matching authoritative final result so a stale saved `partial` state cannot override the newly recognized benign result; never reconcile an unrelated token, unfinished run, live lock or unresolved unknown result into success.

Alternative rejected: marking pc2 pending as `available` would create the persistent badge the brief forbids. Always allowing redeploy without remembered work would change the ordinary current-row action for everyone.

### 4. Keep catch-up explicit and bounded

The next normal Update already calls deploy-all for every configured peer, even at equal main, so retain that execution policy. pc2 gets the then-current published revision on the first later explicit Update while it is reachable, eligible and passes the existing source/ownership/lock gates. This can be a peer-only catch-up offered with the desktop current, or the person's next ordinary update after another main change. Turning pc2 on, Check now, automatic main checks and relay hints alone do not deploy it. No special command is required.

A desktop-equipped peer is quiet but not pending shell work. Its own desktop checks/Update remain responsible for its full installation.

## Risks / Trade-offs

- [Drift between worker and UI policy] → Exercise the real result recorder, worker, projection and row for the same offline/full-desktop/failure matrix, including Settings-token and tokenless CLI paths.
- [Losing pending facts on overwrite or selection] → Cover incremental writes, local-only/remote-only runs, offline repetition, failed inventory and app reload using disposable homes.
- [Masking unsafe uncertainty] → Preserve all source, provenance, ownership, lock, timeout and unknown replay gates; specifically assert stale current-row callbacks cannot launch after a lock/unknown transition.
- [Current description beside Update may look unusual] → This is deliberate quiet catch-up, with no new status text or badge. Documentation explains exactly when pc2 updates.
- [Returning peer not installed immediately] → No reconnect installation is promised; the brief's next-update policy remains an explicit action rather than a scheduler.

## Migration Plan

This PR first delivers planning artifacts only and waits for approval. Implementation then proceeds in the three PR outcome groups, with focused fixture checks before pushes. Update README, COMMANDS and TESTING wording alongside the final outcome, and run `CI=true npm run test:ci` once after integration as specifically requested.

Refresh against latest origin/main before implementation handoff, including #32 and #33 if merged by then. At planning time #32 is on main and #33 is still open. Leave the PR draft and do not mark ready, merge or deploy. Inspect and report checks on the exact final head; draft app suites are intentionally skipped by current repository CI, so do not claim a ready-head matrix ran. Await implementation authorization before executing implementation validation.

Deployment after an eventual approved merge remains a separate user action. Existing documented backup-ID/stock-layout/later-edit recovery gates are unchanged; there is no automatic rollback or restart.
