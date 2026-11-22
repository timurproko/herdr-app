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

Both commands use `<Herdr home>/preferences/`, never the checkout: home is
`HERDR_APP_HOME` or `~/.config/herdr-app`, matching deploy. Host snapshots use
`<lowercase-hostname>.json`; portable visual backups are `layout.json`,
`palette.json` (picker metadata) and `theme.json` (native-schema theme).
The underlying `node tools/preferences.mjs export|import [home]` and
`node tools/runtime/preferences.mjs export|import [home] [hostname]` entrypoints
also accept an explicit home, which takes precedence over the environment.
The lower runtime helper handles host settings and palette metadata. Full deploy
also installs a supported **export-only** entrypoint with all four snapshot classes:

```powershell
$HerdrHome = if ($env:HERDR_APP_HOME) { $env:HERDR_APP_HOME } else { Join-Path $HOME '.config/herdr-app' }
node "$HerdrHome/.customizations/runtime/scripts/export-preferences.mjs" export "$HerdrHome"
```

It requires `export` and an explicit home, uses the recorded installed layout base,
and works without the source checkout. Import and extra arguments are refused.
`npm run preferences:export` shares the same export operation, preferring the
installed base and retaining authored-layout validation for source-only usage.
No profile or pull hook is installed; preference restoration remains explicit.

Import is explicit: close Herdr Desktop first, leaving Core/terminals running.
Existing palette conflicts must be reconciled, not overwritten. Snapshots are
credential-filtered **private backups**, not anonymized or public-safe files;
keep them in private dotfiles, never this repository. Session data and per-space
color IDs are excluded; space colors remain machine-local in `shared.json`.

## Typical explicit host installation (not performed by this import)

```powershell
# Run from this checkout; choose HERDR_APP_HOME explicitly if needed
npm run check:host-api
npm test
npm run deploy
npm run doctor
```
