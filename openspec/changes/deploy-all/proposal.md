# Proposal

## Why

Updating the desktop and Core-only peers currently requires separate manual deployments. The maintainer chose one watched terminal command instead of the Settings updater proposed in closed PR 5.

## What Changes

- Add `npm run deploy:all`: fetch and require clean, non-ahead, non-diverged local main before any machine deployment; fast-forward and use the existing full deployment.
- List peers with `hc machine ls --json`; update eligible existing `~/.local/share/herdr-app` main checkouts through bounded, terminal-free `hc exec --on`, using shell-only deployment on each remote's default Herdr home.
- Add `--dry-run`, `--only` and `--skip-local`, independent machine outcomes, source commit/backup reporting and meaningful exit codes.
- Document remote prerequisites and explicit one-time clone/first shell deployment; cover behavior with disposable Git/home/transport fixtures only.
- Exclude Settings/UI, installed provenance, new managed local clones, remote provisioning/repair, unattended work and scheduling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: explicit multi-machine deployment orchestration with source refusal, remote eligibility, selection, dry-run and per-machine reporting.

## Impact

Add a small tools entrypoint and self-contained remote worker, one package script, fixture tests, README guidance and `docs/COMMANDS.md` instructions. Reuse existing deployment ownership, conflicts, lock and backup journals without changing their schemas; no native API changes or new runtime dependencies. No real deployment or pc2 contact is authorized during development.
