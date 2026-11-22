# Proposal

## Why

Custom Settings already presents simple Herdr and herdr-core update rows, but updating these customizations still requires a command. Add one equally simple row that updates all eligible machines through the existing deploy:all command without using the maintainer's development checkout.

## What Changes

- Add one **Custom customizations** row: short installed revision, short status, and Check now or Update; retain the two native rows unchanged.
- Run Update independently of the replaceable Settings mod, using a desktop managed clone at `~/.local/share/herdr-app` and existing deploy:all semantics.
- Keep only latest status/result/log files, including successful desktop revision and peer outcomes; surface partial failures and documented manual recovery.
- Add cheap Custom-owned dots and hourly checking while Custom is mounted; neither checks nor timers deploy.
- Exclude per-machine rows, change lists, new settings, rollback UI, daemons, schedulers and job history.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `customization-lifecycle`: Single Settings update action, managed desktop source, durable deployment results and reload-independent execution.

## Impact

`src/features/settings/main.js`, `src/features/workspace-chrome/main.js`, a small `src/services/updates/` worker/controller and shared update-state helper, `tools/deploy-all.mjs`, `customization.json`, fixture tests, README and command documentation. No native changes, manifest schema change or new dependencies; existing full/shell deploy, safety gates, journals and manual rollback remain authoritative. Planning and tests never access the live Herdr home or peers.
