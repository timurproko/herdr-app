# Development safety and ownership

Read README.md and ARCHITECTURE.md before adding a feature or runtime path.
Source can live in any checkout. Installation targets `HERDR_APP_HOME` or
`~/.config/herdr-app`; host-relative paths below are beneath that resolved home.

## Host boundary

- Work at the mod/layout/theme layer through supported Herdr APIs.
- **Do not build, fork, replace, or patch Herdr/herdr-core binaries** for customization work. Native Rust/GPUI sources, installers, update channels, permissions and services are not implicit workarounds. Explain native limits and supported alternatives.
- Do not edit shipped mods/layouts/frames directly; Herdr regenerates them. Private mods use `custom-*`; layout/theme are `Custom`.
- Existing registry-backed native-file compatibility patches are narrow explicit opt-ins, not a pattern for new features. Unknown stock fails safely; no new opt-in is implied.
- Read the installed SDK declarations and host-generated instructions as read-only API evidence. Never hand-edit installed.json, SDKs, core documents or layouts/.state.
- Shell selection opens a new native tab and leaves existing terminals intact. Never revive the retired document-mutating shell-replacement worker or replay old jobs.
- The sole document-write exception is explicit **Move to...**, through the validated versioned CAS tab-move boundary described in TAB-MOVE-ADR.md. Preserve machine identity, App/Core gates, ephemeral requests, preservation checks and partial-success handling; no general document editor or live-session test.

## Canonical source

- Author `src/`, `tools/`, `tests/`, docs, customization.json and deliberately public visual preferences. `dist/`, installed custom mods/layouts/themes and `.customizations/runtime/` are outputs, never canonical source.
- customization.json maps packaged output to one canonical source. Build-injected helpers are shared authoring, necessary sandbox-local copies, not manually maintained duplicates.
- Appearance owns visuals/layout; UI owns reusable presentation; features own behavior; services own external/privileged operations; integration owns host identity, shell reporting and native compatibility.
- Workers must be self-contained after installation, never import absolute paths into a source checkout.
- Feature/UI code imports Herdr functions via local `./host.js`. Only the host facade imports native `herdr`; version aliases/shape adapters stay centralized.
- Keep public IDs stable and current Custom identity. Do not restore retired namespace aliases/migrations or rename away required third-party attribution.
- Shared root AGENTS.md/CLAUDE.md are not the old app-specific safety guide; this document preserves the valid product guidance from that former file.

## Preferences and session safety

- Personal preferences are durable, not disposable payload. Preserve native settings, unrelated shared state and layout click state. Layout preference projection uses the dedicated sidecar and field-aware merge.
- Credential-filtered snapshots are **private backups, not anonymized exports**. Pins, paths, plugin settings and automation choices can identify people/accounts/infrastructure. Public visual snapshots are explicitly allowlisted; host exports are ignored. Snapshot relocation remains a follow-up.
- Never commit shared.json, credentials, account caches, sessions, window state, sockets, data/, rollback journals or generated outputs.
- Never delete/rewrite unknown or modified files to make installation succeed. Stop on conflicts; do not invent hashes or silently adopt edits.
- Feature deployment must not restart terminals/agents/cores/desktop or inject terminal input. Shell/profile, auth/network and core-management actions remain explicit feature actions.
- Do not broadly clean native `*-edited` files, old data or migration backups; they may be personal edits. Ownership diagnostics classify rather than discard.
- Tests use disposable homes and mock credentials/transport, not running sessions. Inspect reachable subprocesses first. Follow TESTING.md for host-free and native/live boundaries; a native initial check never proves real deferred rendering/interactions.

## Source checks

Register new outputs/dependencies in customization.json. Build only customization files, never Herdr. Add focused fixtures for changed behavior; host-free tests must not fall back to installed executables or real user profiles. Build and app-suite execution are currently blocked by the three held gradients listed in ASSET-PROVENANCE.json; do not fabricate them or skip their build mappings.

Retain stock snapshot bytes with their existing facade-import adaptation, full third-party notices and truthful modification/version provenance. No automatic hook may import live state or restart Herdr. Shell payloads remain available, but private external profile/yadm dispatcher integration is optional and not installed by standalone deploy.
