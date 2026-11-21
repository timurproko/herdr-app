# Custom — development contract

## Non-negotiable host boundary

- Read `ARCHITECTURE.md` before adding a feature or new runtime path.
- Work at the **mod / layout / theme** layer using supported Herdr APIs.
- **Do not build, fork, replace, or patch Herdr/herdr-core binaries** for a customization request. Do not change native Rust/GPUI sources, installers, update channels, process permissions or services as an implicit workaround.
- Native limitations must be explained, with supported alternatives. Native work requires separate explicit user authorization.
- Never edit shipped mods/layouts/frames directly. Herdr overwrites those on startup. Private mods use `custom-*`; the layout and base theme are `Custom`.
- Existing native-file compatibility patches are a narrow, explicit exception, not a pattern for new features. Preserve opt-ins; unknown upstream code must fail safely. Never opt in another patch without approval.
- Never edit the Herdr home's generated AGENTS.md, SDK declarations, installed.json, core documents, or layouts/.state/ by hand. The Herdr home is HERDR_APP_HOME or ~/.config/herdr-app, not this checkout's parent.
- Shell selection opens a new tab via native `tab.new`, leaving the existing terminal intact. The document-mutating replacement worker is retired; never reintroduce it or replay legacy shell-switch jobs. Profile startup is separate; see `docs/ARCHITECTURE.md`.
- Explicitly authorized exception: **Move to...** may relocate a tab in the `herdr-app` document only through `src/integration/herdr/documents/tab-move-v1.cjs`'s validated CAS boundary. No other document writers, general JSON editor, native rebuild, startup mutation/replay or live-session tests. Keep the App/Core version gate, ephemeral requests, preservation checks and partial-success handling; see `docs/TAB-MOVE-ADR.md`.

## Source ownership

- Author only `src/`, `tools/`, `tests/`, docs and `customization.json`. Personal snapshots belong in `<Herdr home>/preferences/`, versioned in private dotfiles, never this source checkout; shipped visual defaults stay in `src/appearance/`.
- Source may live in any standalone checkout. Run deployment from this checkout into HERDR_APP_HOME or ~/.config/herdr-app.
- `dist/` is generated. Installed `<Herdr home>/mods/custom-*/`, layouts, themes and `<Herdr home>/.customizations/runtime/` are deployment outputs, not canonical source.
- `customization.json` maps each packaged file to one canonical source. Shared helpers are authored once; the build copies them into sandbox-local mod packages. Do not duplicate helpers manually.
- `src/appearance/` owns visuals and layout composition. `src/ui/` owns visual primitives. Features own behavior. Services own external/privileged operations. `src/integration/` owns host identity, shell reporting and native compatibility.
- Keep runtime workers self-contained in the deployment. Never import source-checkout paths from UI mods.
- Feature/UI code must import Herdr functions from `./host.js`, never directly from `herdr`. `src/integration/herdr/host.js` is the sole native-module boundary; version aliases and shape adapters belong in `compatibility.js`.
- Keep public IDs stable and use `src/integration/herdr/identity.js`. No former product name in new identifiers/paths; retired namespace aliases and migration tooling must not be reintroduced. Preserve required third-party attribution.

## Preferences, updates and safety

- Personal preferences are not disposable payload. Use versioned, allowlisted preferences; preserve native settings and unrelated shared state.
- Native layout click state belongs to Herdr. Layout-file preferences use the dedicated projection sidecar and field-aware deployment merge.
- Never sync `shared.json`, credentials, account caches, sessions, window state, sockets, `data/`, rollback journals or generated output.
- Never delete or rewrite unknown/modified files to make installation succeed. Stop on conflicts. Do not invent baseline hashes or silently adopt edits.
- Normal feature deployment must not stop/restart terminals, agents, cores or the desktop; never inject terminal input. Preserve existing focus and topology.
- Shell/profile, network/auth and core-management behavior must remain explicit feature actions. Tests use disposable fixtures, not real credentials or running sessions.
- No broad cleanup of `*-edited` native files, old data, or migration backups. Those may contain user edits. Use `npm run report:ownership` to classify runtime before cleanup.

## Development commands (native operations require explicit authorization)

1. Read README and the relevant feature. Consult AGENTS.md, herdr.d.ts and gpui-kit.d.ts in the resolved Herdr home as read-only API truth.
2. Make a focused source change; register new outputs/dependencies in `customization.json`.
3. Use the supported hosted subset documented in TESTING.md; the original `npm test` includes installed/private-environment assumptions. `npm run check:host-api` needs an installed host. `npm run build` builds **only customization files**, never Herdr.
4. For an explicitly authorized installation, `npm run deploy` (conflict-safe and idempotent), `npm run doctor`, and `npm run check:native` target the resolved Herdr home.
5. When native UI validation is explicitly authorized, inspect the relevant real UI. Native initial checks do not prove deferred rendering, interactions, or visual correctness.
6. Report tests actually run, remaining manual checks and compatibility limits. Do not claim all future native updates are compatible.

Use `npm run test:integration` explicitly for read-only checks against the installed host. Never run smoke tests that start/stop cores, alter privileges or create terminals without explicit approval. Keep native patch originals and third-party licenses byte-faithful. No automatic pull hook may import live shared state or restart Herdr.
