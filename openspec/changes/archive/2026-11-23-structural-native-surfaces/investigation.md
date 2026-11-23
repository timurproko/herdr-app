# Read-only native-surface investigation

## Evidence

Inspected installed files and executable read-only; all extracted/downloaded scratch output stays under ignored `.artifacts/native-investigation/`. No installed frame, record, setting or binary was written. These are source/provenance observations, not live interaction evidence.

- Upstream repository: `herdrdev/herdr-app`.
- Release 0.1.16 resolves to commit `034f8b85f7e6bb71f8ff55cb4a80c548b2578c0f`.
- Release 0.1.17 resolves to commit `a751b75b0418bf13950f7627d122bb934ac2c46c`.
- Both releases' complete `defaults/frame/{palette,feedback}/main.js` were obtained using `gh-axi api --full`, decoded, and diffed. No downloaded code was executed.
- Installed executable SHA-256: `75527414eb23a95c9f0a15e88a17996223f12cc9b18d0b87c4726cc64e6c1ac2`.
- Unique embedded `palette/main.js` through `palette/mod.json` delimiters identify 15,674 palette bytes at offset 39,661,812; SHA-256 `bd625652992f7a35b776d3e42d0ca269a234014780ad658570447dd84061098f`.
- Unique embedded `feedback/main.js` through `feedback/mod.json` delimiters identify 6,497 feedback bytes at offset 39,654,943; SHA-256 `cc8a38b49fea6e0bcfccddfc74e30d92c327f4fe67574fadee3e9f451d869659`.
- Each extracted source equals its pinned 0.1.17 release source after CRLF-to-LF comparison. Native bytes are kept raw for recovery; newline comparison here is provenance analysis, not rewritten stock.

## Targets, lifecycle and replacement

Upstream 0.1.17 `src/mods.rs:25-28,72-93,390` describes/implements `frame/` seeding: startup deletes and rewrites the directory from embedded `FRAME_MODS`, then discovers the modules as `frame-<name>`. Native `src/window.rs:3674-3693` directly opens `frame-palette` for `app.palette` (toggle popup, width 620, top offset 60) and `frame-feedback` for `app.feedback` (keyed feedback window, width 680, captures message/from/layout). These are not ordinary `mods/palette` or `mods/feedback` packages.

Custom's registry maps `frame/palette` and `frame/feedback`; `frame-patch.mjs` currently copies a complete authored `main.js` plus UI/look/facade/routing helpers. It stores a v1 opt-in/recovery record and hashes, compares the target with catalog originals or owned hashes, and checks a reviewed original occurs in the binary if an owned patch masks stock. `startup-frames.mjs` enumerates prior records only, holds a startup lock and invokes the same engine after Custom mounts; deploy also calls that repair path. Helpers are written before main, but the existing state-first/per-file writes are not a complete rollback transaction on mid-apply failure.

Palette's authored replacement copies native catalog/search/history/stock rendering, adds a Custom virtual-list render and routing. Feedback's authored replacement copies native state/attachment/send code and adds Custom rendering, viewer and one-use draft support. Both use the sole host facade. Whole-file copies therefore freeze native implementation details even though the public facade remains compatible.

## Exactly what changed in 0.1.17

### Palette

The complete 0.1.16-to-0.1.17 JavaScript diff contains only:

1. Add native `themes` and `settings` imports.
2. Remove the hardcoded graphite/ink/moss/atom-one-dark `app.theme` entries from `NAMED`.
3. Capture `const shown = layouts()` and reuse it for layout entries.
4. Enumerate `themes()` dynamically. Offer the half matching `settings().dark`; suppress a theme belonging to another listed layout, but retain the active layout's own theme (`shared('layout')`). Generate the existing stable `app.theme` IDs/titles/arguments for those choices.

All other named entries, generic command discovery, fuzzy search, history, key labels, dispatch and stock rendering are unchanged in this release diff. Replacing this file with today's Custom copy would regress these new native choices. Installed palette main equals embedded stock exactly and no longer matches its owned patch hash.

### Feedback: no stock JavaScript change

The two pinned release feedback files are byte-identical (LF SHA-256 `29da2cc452b3054c15218fe23c3c542b12de018e8a797308640b0fd8b840f80b`). Installed native feedback embedded bytes differ only by CRLF. The installed visible feedback main is the old owned patch (SHA-256 `dccf45e47cc847e112ee93e2b073d67eaf75dadc5a42d5335c680b636c1acc85`), not stock; the local record's original matches current embedded feedback stock exactly. There is no new feedback form/action in this source diff to port.

### A false-negative in the catalog originals

Both canonical `original.js` snapshots already import `./host.js`, whereas real stock imports `herdr`. After undoing only that facade rewrite and normalizing line endings, each canonical original equals the pinned 0.1.16 source. Neither canonical original can occur byte-exactly in the current binary because it is not byte-faithful stock. Thus feedback's rejection is not evidence of a changed native form; the current gate rejects valid current stock evidence. Preserve this distinction in documentation and tests rather than inventing a feedback source change or fabricating another baseline.

## Supported alternative feasibility

- The installed `herdr.d.ts` exposes command/layout/theme catalogs, overlay creation, commands and shared state. A private palette is feasible for Custom-owned openers/keys, but the native `app.palette` entrypoint remains hardwired and there is no documented global frame/command interception or palette-contribution hook. Merely re-binding a key misses native buttons/CLI entrypoints and native future catalog logic.
- Feedback preview is public, but `src/mods.rs:1029,1081-1145` explicitly restricts paste/pick/attach/send to the module identity `frame-feedback`. `herdr.d.ts:372-382` documents the restriction. A private overlay cannot retain complete feedback behavior through those public APIs; do not spoof identity, bypass the restriction or send directly to the network endpoint.
- A tiny structural bridge inside the two existing approved frame targets, with Custom behavior factored into owned helpers, is the least-coupled complete solution for the current host. It still depends on private source structure; it is not a fully public extension point.

## Validation before plan handoff

`CI=true npm run test:ci` passed on Node 24.22.0: **149 supported Windows suite entries; 3 documented exclusions**. Log: `.artifacts/native-investigation/plan-test-ci.log`. This validates the unchanged implementation baseline, not the proposed transforms. New 0.1.16/0.1.17/future and recovery fixtures belong to implementation after approval. No deployment, native UI operation, feedback submission or installed-home mutation was performed.
