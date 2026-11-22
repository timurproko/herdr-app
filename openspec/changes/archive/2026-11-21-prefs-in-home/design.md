# Design

## Context

See `proposal.md` for motivation. The source wrapper `tools/preferences.mjs` overrides the runtime tool's already-home-relative `snapshotDir` with the checkout's `preferences/`. It also exports/imports layout overrides and native theme text there. `tools/runtime/preferences.mjs` stores per-host shared preferences and palette metadata; its direct CLI uses a separate default-home expression. Deployment resolves the home via `HERDR_APP_HOME || ~/.config/herdr-app`.

The visual files are personal portable snapshots, not shipped defaults:

- `preferences/layout.json` is a versioned layout override snapshot (currently 6px terminal padding). The wrapper projects it onto the authored layout only during explicit import. The authored layout defaults to 12px.
- `preferences/palette.json` is picker metadata exported/restored by the runtime tool through `.customizations/palette.json` ownership checks.
- `preferences/theme.json` is the native-schema personal `themes/custom-palette.json` backup seeded/restored by the wrapper with conflict refusal.
- `tools/build.mjs` and `customization.json` package `src/appearance/layouts/Custom.json` and `src/appearance/themes/Custom.json`, not any of these three snapshot files.

## Goals / Non-Goals

**Goals:** Make source-wrapper and direct-runtime snapshot locations agree, retain the current snapshot format/validation, and preserve a clean source/home boundary.

**Non-Goals:** No exporter refactor, new filtering, data/schema migration, CLI redesign, yadm wiring changes, native operations or automatic file relocation. No new runtime service or dependency.

## Decisions

### One private preference directory

Point the source wrapper at `path.join(home, 'preferences')` for host, layout, palette and theme snapshots. Preserve the runtime tool's existing home-relative default and align its direct CLI environment fallback with deployment, including an empty override. Keep the explicit home argument and current testing seams; do not introduce a new storage abstraction.

Keeping visuals in the checkout would split one personal backup across two owners and keep exports modifying public source. Moving all four snapshot categories is smaller and matches their observed use. Keeping the three visual files as public defaults is rejected because build/deploy do not consume them; the real defaults remain in `src/appearance/`.

### Retire public visual snapshots, not personal files

After approval, remove the three tracked visual snapshots and ignore the checkout's entire `/preferences/` directory, retaining protection for accidental legacy host files. Export/import must not fall back to, migrate, delete or inspect an old checkout host snapshot. Do not copy private data into this PR or into example fixtures.

### Preserve safety behavior

Only change location plumbing and its dependencies. Keep allowlists, credential checks, hostname validation/lowercasing, quiet writes, missing-host handling, palette ownership/conflict refusal, desktop-closed requirement and unrelated-state preservation intact. Tests must use disposable homes, with `HERDR_APP_HOME` set to the fixture for subprocess commands. No preference import, deploy, enable, disable, remove or rollback may target the real Herdr home.

### Focused regression coverage

Extend preference tests to cover both the source wrapper and runtime entrypoint. Use an isolated fixture checkout/home, synthetic JSON and a test-only desktop-check stub where necessary; never query or modify real sessions. Cover environment/default/explicit home selection (default-home tests isolate the apparent user home), per-host lowercasing, export/import of available visual snapshots, missing-host behavior, legacy host bytes remaining untouched, and no checkout writes. Retain the existing guard/round-trip tests and demonstrate build independence from deleted visual snapshots. Wire any new fixture test into the existing hosted test runner if needed.

## Risks / Trade-offs

- [Visual snapshot removal changes optional restore inputs] → Document manual preservation before updating, alongside unchanged shipped defaults; do not silently substitute shipped defaults for a missing personal snapshot.
- [An old checkout snapshot could be mistaken for the active backup] → Ignore it, leave it untouched, and clearly name the new path in docs.
- [Private snapshots can still contain personal information] → Keep existing private-backup warnings and place them under private dotfiles ownership; no claim of public-safe filtering.
- [Direct-runtime and source-wrapper defaults could diverge again] → Exercise both paths with environment and explicit-home fixtures.

## Migration Plan

This is documentation for the maintainer, not an operation this change performs:

1. Before updating/removing old source copies, preserve any desired personal visual snapshots (`layout.json`, `palette.json`, `theme.json`) in the selected home's `preferences/`. Reconcile existing destination files manually rather than overwriting them blindly.
2. The maintainer's existing host snapshot must move from **`~/.config/herdr-app/customizations/preferences/pc.json` to `~/.config/herdr-app/preferences/pc.json`** for the default home. With an alternative `HERDR_APP_HOME`, the target is **`$HERDR_APP_HOME/preferences/pc.json`**. Other legacy checkout host files similarly belong at `<selected home>/preferences/<hostname>.json`.
3. Version those files in private yadm/dotfiles, never this public repository. No automatic pull/import hook or desktop restart is added.
4. Restoration remains an explicit user action with the desktop closed; tests exercise only temporary homes. Existing local checkout host snapshots are left untouched by tools.

If reverting to the old tool version, the maintainer must manually supply any desired snapshots at its old location; the app does not reverse-migrate, delete new-home snapshots or roll back live settings. No live installation is needed to review or implement the path change.
