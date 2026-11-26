# Tasks

## 1. Sharing-tolerant updater persistence

- [x] 1.1 Add canonical bounded sharing-error retry/read/atomic helpers in the self-contained worker and reuse them in deploy-all receipt publication; fault-injection fixtures prove transient rename recovery and persistent-rename in-place fallback both leave a complete final receipt.
- [x] 1.2 Preserve and accept validated same-run complete recovery content when destination publication also fails; fixtures reject stale, foreign, malformed and redirected candidates and prove dry-run remains byte-preserving.
- [x] 1.3 Apply bounded IO handling to status, check, runner and lock helpers without weakening exclusive creation or token checks; tests cover all write sites, unreadable-state refusal, single-read descriptor closure, EEXIST and aggregate request budgets.
- [x] 1.4 Update synthetic checkout dependencies and packaging assertions for shared helpers; targeted deployment/runner checks prove no deployed worker imports its source checkout and no fixture falls through to real hc.
- [x] 1.5 Document publication/fallback behavior and permanent-storage limits in docs/COMMANDS.md; inspect the delivered command text against the fault cases and add a real locked-target disposable Windows fixture where the runner supports it.

- [x] 1.6 Separate pre-dispatch deadline expiry from post-dispatch timeout in the Windows supervision fixture; injected timer tests deterministically assert no pre-dispatch kill and exactly one post-dispatch kill without assertion retries.

## 2. Precise settlement of dead unknown runs

- [x] 2.1 Emit run-qualified terminal completion evidence before final receipt publication and reconcile it only after process death and settle/deadline checks; runner tests distinguish success, partial, failure, publication failure and explicit remote/installer uncertainty.
- [x] 2.2 Add conservative legacy final-table plus matching intermediate-receipt recovery for the reported receipt-write failure; sanitized fixtures cover the reported shape, truncated/foreign logs and missing evidence without reading the real archived files.
- [x] 2.3 Persist exact-run settlement, release only its own stale update lock and project deployed-but-result-unsaved diagnostics; runner/model tests retain manifest-digest revision verification and reject live owners or stale receipts.
- [x] 2.4 Update README and docs/COMMANDS.md missing-result classification guidance and current manual workaround; check that new text never treats local PID death or a deadline alone as proof that remote work stopped.

## 3. Deliberate unknown-outcome retry in the existing row

- [x] 3.1 Add separate recovery eligibility and a token-bound retry worker action with process/descendant, settle/deadline, fresh-check and exclusive-claim revalidation; fixtures prove unknown work never becomes ordinary canUpdate and cannot bypass deploy.lock or source gates.
- [x] 3.2 Add inline Retry update explanation, Cancel and explicit stopped-local/remote-work confirmation through the model, shared transport and Settings row; matrix tests cover current/available/failed/running/unknown, locks, remote uncertainty and missing/failed/fresh checks.
- [x] 3.3 Preserve prior unknown evidence before a claimed retry and reject late receipts, changed tokens, retained nodes and competing confirmations; isolated concurrency/row tests prove at most one new launch and no evidence loss on claim failure.
- [x] 3.4 Keep status, Check now, reload, startup, timers, focus and relay hints strictly non-dispatching; scheduler and runner tests prove zero replay until explicit confirmation and no replay on Cancel or close.
- [x] 3.5 Revise every conflicting README/docs/COMMANDS.md retry, CLI timeout and deferred-peer passage, retaining manual recovery for legacy records lacking identity; targeted updater suites and a disposable-home row exercise demonstrate the documented rule without touching desktop or pc2 state.
- [x] 3.6 Bind current CLI recovery to matching run identity and disassociate older terminal Settings status even for incomplete receipts; lifecycle regressions refuse Update, Retry and recovery while the newer CLI owner lives.
- [x] 3.7 Archive expired dead-owner retry claims at ordinary inspection, including completed-run crashes; lifecycle regressions keep live/unexpired claims and prove no automatic unknown replay.
- [x] 3.8 Add separate confirmed stopped-state recovery in Settings and the documented command; isolated tests preserve every stale file, log consent, keep journals/ownership/payload unchanged and start no deployment.
- [x] 3.9 Audit all locks/status/results/cache files including malformed/future legacy leases, lock-before-status writes and expired runtime-only intents; single-file, combined-orphan and stale-read fixtures prove safe refusal for live/unavailable owners and later explicit launch reachability without file editing.
