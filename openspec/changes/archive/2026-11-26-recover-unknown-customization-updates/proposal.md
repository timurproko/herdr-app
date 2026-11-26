# Proposal

## Why

A transient Windows sharing error can discard the final deployment receipt after every machine has updated, leaving Settings permanently blocked on an unknown outcome. Completed work needs durable evidence, and genuinely uncertain work needs a deliberate recovery path rather than hand-edited runtime files.

## What Changes

- Retry updater rename/read/write sharing failures with bounded backoff; retain complete final content even when replacement cannot succeed, without weakening exclusive locks.
- Reconcile dead, settled runs from same-run receipts and conclusive log tails, distinguishing deployed-but-result-unsaved from genuinely unknown outcomes without inventing installed provenance.
- Offer a token-bound Retry update confirmation for eligible unknown runs; never automatically replay, and retain protection while local descendants or dispatched remote work may still run.
- Cover write faults, recovery, action guards and duplicate/stale confirmations with isolated fixtures, and revise README and command recovery guidance.
- Record the safe pre-release manual workaround in the design; this task itself never edits the person's desktop or pc2 runtime state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Durable updater publication, evidence-based reconciliation and deliberate unknown-outcome retry within the existing single-row interface and deployment safety boundaries.

## Impact

- `tools/deploy-all.mjs` receipt publication and terminal evidence.
- `src/services/updates/update-worker.cjs` IO, process/settle checks, inspect and launch boundaries.
- `src/shared/customization-update-model.js`, `src/shared/customization-updates.js` and `src/features/settings/customization-update-row.js` recovery projection, transport and confirmation.
- Updater/deployment tests, disposable fixture support, README and `docs/COMMANDS.md`; packaging assertions if needed to retain self-contained deployed runners.
- No native binaries, real-home changes, remote deployment, new daemon, portable preferences or automatic rollback.
