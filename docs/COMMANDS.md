# Customization commands

Run customization commands from this standalone checkout, wherever cloned.
Deployment targets HERDR_APP_HOME or ~/.config/herdr-app, not the checkout parent.
See TESTING.md before running tests: the unchanged broad suite includes installed
host/private-environment assumptions; native/live commands need separate approval.

## Validate after a Herdr update

```powershell
npm run check:host-api
npm test
npm run test:integration
npm run test:native
```

`check:host-api` verifies that the installed Herdr version has a reviewed facade
profile, required APIs and commands still exist, and feature code does not import
`herdr` directly.

## Build and install

```powershell
npm run build              # generate dist/ only; does not modify Herdr runtime files
npm run deploy             # compatibility check, build, guarded install and backup
npm run doctor             # verify installed ownership, version and native patches
npm run report:ownership   # classify Custom, Herdr, unknown and recovery runtime
npm run check:native
npm run check:tab-move      # pinned upstream release diff + synthetic move/menu tests
```

For a candidate release: `npm run check:tab-move -- --release 0.1.17`.
For no network: `npm run check:tab-move -- --offline`. Host/deploy checks automatically
audit versions unknown to tab moving; they never auto-approve an unknown release.
See [tab-move compatibility](TAB-MOVE-COMPATIBILITY.md) for exit codes and limits.

`npm run deploy` reports a backup ID such as `1794317616472-43564`. Keep that ID
if the live result needs to be reverted.

For a focused update while another branch has unrelated changes installed, use
repeatable canonical source selectors (a directory selector must end in `/`):

```sh
npm run deploy -- --source src/plugins/git/ --source src/integration/herdr/host.js --source src/integration/herdr/compatibility.js --source src/features/settings/main.js --source src/features/settings/plugins-ui.js --source src/features/settings/sidebar-ui.js --source src/ui/settings-back.js
```

This still runs the compatibility check and full customization build. Only selected
mod/runtime outputs are installed; existing unselected ownership hashes, bytes,
layout base and preference files are preserved. Dependency-only changes reload the
exact installed, verified-owned entrypoint, not the current branch's entrypoint.
All conflicts are checked before writes. It requires an existing owned installation,
rejects unmatched/unsafe selectors, never prunes unselected or obsolete files, and
cannot update layouts/themes. Include every changed dependency's canonical source;
this option is not automatic dependency or branch merging. A later **full** deployment
still installs the complete current checkout, so reconcile its other branches first.

## Disable, enable, rollback or remove

```powershell
npm run disable
npm run enable
npm run rollback -- <backup-id>
npm run remove
```

Disable Custom before rollback when practical. `remove` removes only files owned
by the customization manifest; it does not uninstall or rebuild Herdr.

## Portable preferences

```powershell
npm run preferences:export
npm run preferences:import
```

Portable snapshots intentionally exclude session data and per-space color IDs.
Space colors are durable machine-local state in `shared.json`.

## Typical explicit host installation (not performed by this import)

```powershell
# Run from this checkout; choose HERDR_APP_HOME explicitly if needed
npm run check:host-api
npm test
npm run deploy
npm run doctor
```
