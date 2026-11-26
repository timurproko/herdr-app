# Design

## Context

See proposal.md for motivation. Inspection confirms two independent temp-write/rename helpers (`resultRecorder` and worker `atomic`) unconditionally delete temp content after a failed rename. `inspect` only settles unknown work from a complete receipt with the same token; `launch` and the model refuse unknown work indefinitely. Locks use exclusive creation, separate from the rename helpers. The worker already reads synchronously in one call, so the suspected reader is not proven to be the Windows lock holder; add transient-error tolerance without claiming that cause is established.

`deployAll` prints its final table before writing the final receipt. The last intermediate receipt already contains all rows on the reported failure path. Existing tests deliberately preserve installer/remote unknowns even after supervisor PIDs die: those safeguards must not become an accidental automatic replay. The detached runner is a copied, self-contained worker, and `customization.json` maps the same worker into Settings and workspace chrome.

## Goals / Non-Goals

**Goals:** Separate deployment completion from receipt-publication failure, recover legacy stuck runs conservatively, and make a deliberate retry possible after quiescence without a filesystem editor.

**Non-Goals:** No deployment from this branch, native changes, peer provisioning, terminal/agent restarts, process killing as recovery, remote probing by availability checks, background replay or change to installed-revision evidence.

## Decisions

### 1. Bounded IO retries with preserved publication evidence

Keep the canonical retry/atomic/read helpers in the self-contained update worker and reuse its exported helpers from `tools/deploy-all.mjs`. This avoids a second subtly different retry policy and avoids adding checkout dependencies to the detached runner. Adapt synthetic CLI fixture checkouts to include the canonical dependency.

Retry only EPERM, EBUSY and EACCES using short increasing delays (25, 50, 100, then 200 ms capped delays) under a three-second total write budget. Write temp content completely and close it before attempting replacement. If rename still fails, attempt a bounded in-place publication of the exact bytes. Retain the complete temp file until destination publication is verified; if in-place writing also fails, preserve it as the recoverable receipt rather than unlinking the last complete evidence. The reader accepts a validated complete recovery candidate for the expected run, not arbitrary temp JSON. Limit candidates/bytes, reject redirected paths, wrong tokens, malformed content and older-run candidates; deterministic run identity/ordering prevents a stale candidate overriding newer state. Successful publication cleans only its own superseded temp content. Missing space, denied directory creation or power loss cannot be guaranteed away: report persistence failure honestly and preserve whatever complete evidence exists.

Apply the same bounded behavior to status, check and runner writes and to lock acquisition/write/release sharing errors. Preserve `open(..., 'wx')`, token comparison and EEXIST refusal: never rename or in-place overwrite somebody else's lock. Close descriptors in finally, including failed lock-content writes. A lock that cannot be read is unresolved, not permission to replace it. Atomic replacement remains preferred; in-place fallback permits a transient partial read, handled conservatively by bounded read retries rather than publishing empty state.

All reads use a single read-and-close per attempt, no retained descriptor or stream. Retry sharing errors and briefly incomplete JSON from fallback publication within a small bounded read budget; distinguish unreadable from absent for action authorization. Keep the aggregate worker request below the existing 22-second transport bound; do not multiply independent full budgets across every inspect read.

Alternative rejected: only retry rename then throw/delete temp; it reproduces permanent uncertainty under a persistent scanner hold. Unbounded retries would instead freeze the updater.

### 2. Same-run terminal evidence, not PID death alone

Add a bounded, versioned run-qualified terminal log marker containing final outcomes before final receipt publication, so future runs retain unambiguous deployment evidence even if every receipt publication attempt fails. It is completion evidence, not an execution command. Preserve human-readable tables and original error detail.

Inspection resolves an unknown run only when recorded supervisor/CLI processes are dead, the relevant evidence is stable for at least five seconds (or the deadline has passed), and matching evidence proves its outcome. Prefer a validated complete primary/recovery receipt. For future runs, use the exact-token terminal marker; for legacy runs, require the matching status and intermediate receipt, the final complete table agreeing with all recorded machine rows, and a trailing receipt-write sharing failure identifying the result path. Never infer all-machine success from one earlier installer message, an unrelated log, a truncated table or checkout HEAD.

The reported legacy shape becomes `Deployed, but the result could not be saved.` with the log pointer, not an endlessly blocking generic unknown. Definite failure/partial outcomes keep their precise classifications. Keep installed revision tied to the existing manifest digest; log text alone cannot create verified provenance. A final row/marker explicitly naming installer or remote uncertainty remains genuinely unknown, not deployed.

Persist reconciliation with run identity checks and release only the matching stale update lock after conclusive settlement. No automatic deployment is started by reconciliation.

### 3. Explicit retry is a separate authorization path

Project recovery eligibility separately from ordinary `canUpdate`. Genuinely unknown work never turns into ordinary Update solely because its PIDs disappear or a fresh main check succeeds. Allow Retry update only after recorded processes are dead, the log/status has settled, and a successful fresh main check exists. When log evidence cannot prove dispatch ended, wait through the original 30-minute deadline (not merely five seconds); known live descendants or unresolved process discovery block retry. A missing/unreadable lock or status cannot silently imply safety. Tokenless CLI uncertainty needs the same evidence rules; legacy CLI records without enough process/dispatch identity remain investigation-only until the person resolves them using the documented manual procedure.

Use an inline confirmation in the existing row, no new settings page: `The previous update may have finished. Confirm local and remote update work has stopped before retrying.` Provide Cancel and Retry update. For uncertain remote work, require the person's explicit confirmation of that inspection; a dead local hc/CLI process or elapsed deadline does not prove a remote installer stopped. The worker accepts a distinct retry request bound to the captured unknown run identity, rechecks processes/time/current state and exclusive lock ownership, preserves prior evidence privately, then replaces only that run's stale bookkeeping and launches once through existing managed-clone/source/ownership gates. Never remove `.customizations/deploy.lock` or bypass installer conflicts. A late receipt or changed token invalidates the confirmation; duplicate clicks/windows cannot dispatch twice. Cancel, close, reload, Check now, timers, startup and relay hints never authorize retry.

Retain original unknown diagnostics if the retry cannot be claimed or started. Recovery candidates/acknowledgments are private, bounded latest-operation bookkeeping, not portable preferences or a new browsable job history. Preserve the acknowledged original files in private recovery storage before a confirmed new run overwrites its log/result.

Alternative rejected: clearing every dead-PID lock during inspect, or treating unknown like definite failure. Both permit unnoticed replay while remote work may still be running.

### 4. Isolated regression and documentation outcomes

Extend deployment publication and runner fixtures with injected filesystem errors/clock/sleep to cover transient locked-target rename, persistent rename fallback, retained complete temp when destination writes also fail, safe readers, all updater state writes and lock exclusivity. Where available, add a Windows-only subprocess fixture that opens a temporary target without delete sharing, then releases it; deterministic injected faults remain portable coverage, not a claim of native Windows sharing proof.

Expand runner/model/row tests for exact-token late completion, terminal receipt-write failure, partial/failed/ambiguous tails, live/dead processes, settle/deadline boundaries, descendants, remote unknown, unreadable state, fresh/failed main checks, canUpdate versus canRetry, confirmation Cancel/staleness and two simultaneous retry requests. Assert zero launch calls from status/check/automatic scheduling and exactly one only after deliberate confirmation. Run quick targeted suites, not broad installed-host tests.

All fixture homes are explicitly selected with HERDR_APP_HOME, fake transports cannot fall through to real hc, and scratch/proof output for this crew task goes outside the worktree into its task folder. Update README's missing-result paragraph and every contradictory `docs/COMMANDS.md` unknown/replay passage, including ordinary CLI timeouts, deferred peer work and manual recovery. No real state on this desktop or pc2 is read or changed by tests.

## Risks / Trade-offs

- [No filesystem can promise persistence under permanent permission/disk failure] -> Retain and consume complete recovery content where possible; never claim deployment failed solely because publication failed, or claim success without evidence.
- [PID reuse or inaccessible descendant facts] -> Treat potentially alive/unverifiable owners as active; do not grant retry from missing facts.
- [Remote execution outlives the local transport] -> Wait conservatively and require explicit stopped-work confirmation; clocks alone never prove remote completion.
- [Legacy logs lack a run marker] -> Require same-run corroboration and exact terminal shape; incomplete evidence stays honestly unknown.
- [Direct-write fallback exposes partial bytes] -> Prefer rename, close promptly, retry reads, retain a complete recovery copy and fail closed on unreadability.
- [Recovery during multi-window races] -> Bind confirmations, receipts and lock transitions to one run and revalidate at the worker boundary.

## Migration Plan

1. Plan-only draft PR first; implement only after approval. Land via the normal published-main flow; do not deploy this worktree or touch real runtime state during this task.
2. Existing readable receipts remain compatible; new optional terminal/recovery metadata is additive. Retain conservative behavior for legacy evidence that cannot be safely attributed. Add fixture coverage for old records.
3. A currently stuck old updater cannot fetch this fix through its blocked row. **What the person does today if it recurs before this ships:** stop clicking Update; preserve the matching status, result, lock and log privately. Inspect the recorded PIDs, all npm/installer descendants and every dispatched remote machine. Wait for live work and resolve any uncertain writes with documented rollback if needed. Only after all that work has stopped, move the active result, status and update lock into a new private recovery directory (leave a copy of the log and preserve backup journals), then reopen Settings and Check now before one explicit Update. Do not clear only the lock if the result is itself unknown; do not remove deploy.lock, reset the checkout, or repeat an uncertain remote request. This is a maintainer-only procedure; this task does not perform it.
4. README and command docs will describe evidence-based settlement and confirmed retry after rollout while retaining the manual procedure for older installations or unidentifiable CLI runs.
5. Payload rollback uses the existing documented disable/backup-ID rollback gates only. Runtime receipts/recovery evidence stay private and are not synced or silently discarded by rollback.
