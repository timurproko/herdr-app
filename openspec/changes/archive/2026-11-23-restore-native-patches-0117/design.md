# Design

## Context

See proposal.md for motivation. This branch starts at main `278e78531a5d23164cfce750c1c1710451ad7db3`, not PR 23. That PR's archived investigation is read-only evidence, not implementation to reuse.

The existing registry lists reviewed originals and one replacement graph per patch. `frame-patch.mjs` checks exact stock/owned hashes and, for an owned entrypoint masking stock, looks for a reviewed original in the executable. `startup-frames.mjs` refreshes only prior opt-ins; unsupported originals are successful skips. Original bytes are retained in local v1 recovery records. The canonical originals currently contain facade imports, making genuine native feedback unrecognizable.

Investigation evidence to recheck during implementation:

- `herdrdev/herdr-app` 0.1.16: `034f8b85f7e6bb71f8ff55cb4a80c548b2578c0f`.
- 0.1.17: `a751b75b0418bf13950f7627d122bb934ac2c46c`.
- `defaults/frame/feedback/main.js` is identical between these commits: LF SHA-256 `29da2cc452b3054c15218fe23c3c542b12de018e8a797308640b0fd8b840f80b`; observed embedded CRLF SHA-256 `cc8a38b49fea6e0bcfccddfc74e30d92c327f4fe67574fadee3e9f451d869659`.
- Observed embedded 0.1.17 palette SHA-256 `bd625652992f7a35b776d3e42d0ca269a234014780ad658570447dd84061098f`. Its only release-source change adds `themes()`/`settings()` and replaces hardcoded themes with dynamic mode/layout-filtered choices.

These are prior observations, not a new installed-host verification claim.

## Goals / Non-Goals

**Goals:** Exact-byte reviewed compatibility, minimal per-original replacement selection, continued prior-release behavior, and reuse of existing ownership/recovery/advisory policy.

**Non-Goals:** Structural transforms, any-version compatibility, a new transaction architecture, new patch opt-ins, public-version allowlist changes, built-in-mod patches, binary modifications, live UI operations or deployment.

## Decisions

### 1. Store stock verbatim, separately from authored facade code

Reacquire the two pinned release sources as raw evidence and compare the installed 0.1.17 executable stock read-only. Store each supported byte format explicitly with provenance (tag, commit, path, SHA-256, newline format and embedded comparison where applicable). Shared feedback content can serve both releases without inventing a feedback source change. Correct the 0.1.16 palette canonical original as necessary to keep actual stock recognized; retain existing reviewed legacy coverage.

Originals must bypass facade rewriting, formatting and Git newline conversion where necessary. Only executable Custom replacements import `./host.js`. Do not normalize unknown runtime bytes to manufacture a match, and do not trust a live patched frame as stock. Provenance tests hash the stored originals and assert native imports; architecture/import tests must distinguish preserved stock data from authored executable code.

Alternative rejected: changing only an App review version, or replacing `herdr` with `./host.js` in originals, does not prove native compatibility.

### 2. Add a small reviewed-original-to-payload mapping

Keep the existing registry and workers. Add only the mapping/selection needed for a separate 0.1.17 palette replacement, preserving the 0.1.16 replacement. Match current stock first; when owned code masks stock, select using exact reviewed embedded native evidence. An old ownership hash alone never chooses a new payload. Missing or incompatible evidence remains the existing advisory skip, with no writes.

Keep helper packaging shared and v1 opt-in/recovery compatibility. Apply/check must agree on the selected payload; helpers remain before entrypoint, no-op application remains idempotent, and restoration preserves correct reviewed stock after a reset/update. Preserve prior original recovery evidence and do not silently downgrade 0.1.17 to an older saved original.

Port the release's native `themes()` enumeration and filtering into the 0.1.17 Custom replacement without changing stable theme command IDs/arguments or other catalog/search/history/dispatch behavior. Preserve all current Custom rendering, routing, rename and close handling. Other layouts use the correct release's native rendering/routing. No general-purpose variant framework or structural transformer is needed.

Alternative rejected: one old full-file replacement loses dynamic theme choices; PR 23's structural approach exceeds the requested maintenance model.

### 3. Ground regressions in stock fixtures and retain existing safety cases

Use byte-faithful 0.1.16/0.1.17 stock fixtures, preferably the canonical originals rather than duplicate maintained copies. Extend frame registry/palette/feedback/startup/upgrade fixtures and deployment/update advisory composition coverage as needed. Exercise initial apply, existing-owned refresh against synthetic embedded stock, 0.1.16-to-0.1.17 upgrade, check/no-op, restore, absent opt-in, unknown stock and unknown binary. Unknown cases must preserve target/helper/record/backup bytes and keep automatic operations successful; dependency conflicts, corrupt records and concurrent edits must still fail.

Run the actual 0.1.17 palette catalog with synthetic `themes`, dark/light settings and multiple layouts. Include a theme absent from the old hardcoded list, each mode, active-layout and other-layout themes, and command dispatch assertions. Retain Custom navigation/Usage/rename/close and non-Custom routing/render regressions. Feedback tests retain the unchanged native sending controller and existing compact attachments/JSON/sent behavior.

Run focused checks while implementing, then the explicitly requested `CI=true npm run test:ci` before the implementation report. Installed-stock comparison is read-only and separate from fixture success; do not run deployment or native interaction tools.

## Risks / Trade-offs

- Exact matching remains per-version maintenance → unknown future stock skips safely with the existing advisory; this change promises no any-version support.
- LF/CRLF conversion can invalidate real evidence → preserve explicit raw byte formats and assert their digests after build/checkout.
- Stale owned patches can mask updated stock → use current reviewed embedded bytes for payload selection, retaining recovery safeguards.
- Full replacement duplication can drift → keep the new palette narrowly based on the existing Custom implementation plus the observed native theme delta; test both releases.
- Fixtures cannot prove native pixels or real interaction → report that limitation and leave live inspection for separately authorized installation.

## Migration Plan

This task performs no installation. After approval, implementation and later maintainer-controlled installation, only previous palette/feedback opt-ins refresh automatically. With Custom active on reviewed 0.1.17, the person will see Custom's styled command palette again, with fixed headings, scroll fades, keyboard navigation, enabled Usage entry, Custom Settings/pickers, inline rename and last-tab-aware close, plus native dynamic themes filtered by mode/layout. Feedback will again refresh with compact attachments, muted drag/add guidance, Add image, expandable JSON details and the simplified Feedback sent thank-you view. Other layouts retain native presentation/routing; unknown future stock remains untouched with an advisory.

Removal uses existing guarded restore/backups; no blanket frame replacement, opt-in migration, session changes or application restart is introduced.
