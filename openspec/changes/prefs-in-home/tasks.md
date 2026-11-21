# Tasks

## 1. Preference tools use the selected Herdr home without touching legacy checkout snapshots

- [ ] 1.1 Route source-wrapper snapshot access to the selected home's `preferences/` and align runtime CLI home fallback with deploy; fixture assertions cover environment, empty/unset default and explicit-home precedence without touching the real user home.
- [ ] 1.2 Extend focused fixture coverage for lowercase host filenames, host and visual export/import, missing-host preservation, unchanged legacy checkout host bytes and no checkout writes; retain existing schema, quiet-write, credential, palette-conflict and desktop-open rejection coverage.
- [ ] 1.3 Update preference command documentation and tool comments with the home-based paths and unchanged explicit-restore safety rules; check examples against both tool entrypoints and run only the targeted preference fixtures with disposable `HERDR_APP_HOME` values.

## 2. Personal visual snapshots leave public source, with private ownership and manual relocation documented

- [ ] 2.1 Remove only tracked `preferences/layout.json`, `palette.json` and `theme.json` and replace their ignore exceptions with protection for the entire checkout preference directory; verify authored `src/appearance/` defaults are unchanged and legacy host files remain ignored.
- [ ] 2.2 Add or update the focused checkout/build fixture to show build succeeds without preference snapshots and packages the existing authored defaults; connect added preference fixtures to the hosted test runner where needed.
- [ ] 2.3 Update README ownership/source-layout/preferences sections and applicable development, architecture and testing docs; remove the resolved relocation follow-up and explain the visual files are personal snapshots, not shipped defaults.
- [ ] 2.4 Document manual preservation of visual snapshots before updating, no automatic host migration/deletion, private yadm ownership and the exact move from `~/.config/herdr-app/customizations/preferences/pc.json` to `~/.config/herdr-app/preferences/pc.json` (alternative: `$HERDR_APP_HOME/preferences/pc.json`); inspect the resulting docs and diff for stale checkout-storage claims.
