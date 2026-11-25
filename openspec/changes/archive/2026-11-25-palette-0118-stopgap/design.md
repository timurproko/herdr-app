# Design

## Context

See proposal.md for motivation. The registry already supports exact-original replacement selection; the installer and startup repair already preserve opt-ins, ownership and current-original recovery. The 0.1.17 replacement has the desired renderer but lacks 0.1.18's catalog additions. The scope reference was fetched read-only from `origin/fix/palette-0118`, files `openspec/changes/persistent-owned-palette/{stopgap,design}.md`; no edits were made to that branch.

### Observed source and Windows evidence

Pinned upstream `herdrdev/herdr-app` commit `9a9ae13d998e6ed74c76e8eb13bdeb2e1420f50c`, `defaults/frame/palette/main.js`, fetched via GitHub contents API and decoded from base64:

- LF: 19,238 bytes; SHA-256 `f8cbfb955ab3ef4474012dbb7103a7b8c5260c9c6ccde96aea6952a4980124dc`.
- Installed executable: `C:/Users/tprokopiev/AppData/Local/Programs/herdr-app/herdr-app.exe`; Windows FileVersion/ProductVersion both `0.1.18`.
- Executable SHA-256: `cfea987a8ccffa77fa4e4d463f9a9f13354510eb4e907ca818b5886613e1406c`.
- Unique embedded `palette/main.js` delimiter at 43,604,187; source starts at 43,604,202 and ends immediately before unique `palette/mod.json` at 43,623,872 (zero-based byte offsets).
- Extracted stock: CRLF, 19,670 bytes; SHA-256 `885bf88b82d43324fd29031eebc1427ee32a7329530fcd7c7039ebcfa883e06a`.
- Read-only assertions established that the complete delimited slice equals the pinned LF source with CRLF newlines, and equals `C:/Users/tprokopiev/.config/herdr-app/frame/palette/main.js` byte-for-byte.

These are distinct verified formats, not permission to normalize arbitrary target bytes. The app, executable and configuration were not modified or restarted. This proves installed stock provenance, not live interaction or visual correctness.

## Goals / Non-Goals

**Goals:** Use the existing registry and recovery mechanisms; preserve both the reviewed native catalog and existing Custom UI; keep temporary code removable with the eventual owned-palette migration.

**Non-Goals:** No new runtime permission mechanism, structural/fuzzy transforms, installer redesign, binary patch, keybinding ownership, new opt-in or live deployment. No edits to PR 64's branch or other open tasks.

## Decisions

1. **Separate exact originals and release payload.** Add `original-0.1.18.js`, `original-0.1.18-windows.js` and `main-0.1.18.js`; extend provenance, registry `originals`/`mainByOriginal` and explicit packaging mappings. Retain all earlier entries, 0.1.17 replacement bytes and feedback. Merely adding a hash pointing at the old replacement would discard new native features and is rejected. Leave the capability-based host gate unchanged.
2. **Rebase the catalog, retain the renderer.** Carry native 0.1.18 manifest collection, argument/target validation, Mod grouping, canonical IDs/deduplication and object/first-argument/index binding matching into the release variant. Keep asynchronous reads per opening, native theme discovery/filtering, search/ranking/history and explicit clone-source dispatch. Reuse the established shared UI/look/routing/fade helpers, not a new parallel skin.
3. **Activation-only Custom policy.** Preserve entry IDs and displayed bindings. Preserve Settings/picker/machine/worktree destinations, untargeted inline rename and close handlers, including native fallback and last-tab policies. Explicit rename/close/clone arguments bypass untargeted/default substitution unchanged. Gate Usage using its existing enabled-by-default plugin preference without shipping the entire plugin registry into the frame or changing 0.1.17 behavior. Non-Custom layouts retain native presentation and dispatch.
4. **Real-stock differential tests.** Extend `tests/palette-native-stock.test.mjs` to compare actual stock and replacement catalogs/dispatch with real 0.1.17 and 0.1.18 fixtures. Cover sorted/hidden/unreadable/malformed manifests, missing targets, invalid and duplicate contributions, canonical argument order, object/index binding edge cases, explicit/default clones, explicit targets, themes, Usage and routing. Extend `tests/regression/palette-ui.test.mjs` to run the new variant through existing fixed geometry, pinned/count headings, virtual-list range, empty navigation, reset and fade/rail cases; add missing keyboard/scroll assertions where required.
5. **Use existing isolated update tests.** Cover absent opt-in, LF/CRLF apply/check/no-op/restore, 0.1.17-to-0.1.18 reset and old-owned-mask refresh, retained raw backups, current-original restoration, unknown/ambiguous-byte skip and full target/helper/record preservation. Existing conflict/corrupt/concurrent-write and capable-future-host tests remain authoritative; do not weaken them.
6. **Keep retirement local.** Limit production additions to the palette directory and declarative mappings. No persistent worker, new key binding, installer hook or opt-in schema. PR 64 can later stage the owned palette and retire this registry exception using its separate migration plan, without changing feedback.

## Risks / Trade-offs

- [Native updates can change palette bytes again] → Preserve loud exact-byte skips; this stop-gap makes no future-version immunity promise.
- [Copied native behavior can silently regress] → Compare real native functions/catalogs and dispatch against the release-specific replacement, including new argument shapes rather than only source-string assertions.
- [Routing helpers currently discard explicit rename arguments] → Guard explicit native targets in the new variant's activation path without changing 0.1.17's payload or broadly intercepting commands.
- [Fixture success is not live GPUI proof] → Record this limitation in the review note; no live install/restart is authorized to obtain that proof.
- [Required checks execute after delivery promotion] → Leave this task's PR draft; never promote or merge it manually. Report the final head's actual checks and any missing/skipped gate honestly.

## Migration Plan

After approval, implement the two outcomes in order, including their focused tests and documentation. Before pushing use focused fixture/build commands. At implementation finish, when no other suite is running, run the explicitly requested `CI=true npm run test:ci` once; do not deploy, restart or mutate the live home. Bring the branch up to date with default `main`, complete the delivery body, and report final-head required checks under the applicable workflow rules.

After maintainer merge, the person obtains restoration through their ordinary customization Update; prior opt-ins alone may refresh. Rollback uses the existing ownership checks and restores the reviewed current original rather than 0.1.17 bytes. A later unknown native file remains untouched. The eventual owned-palette task retires this exception separately.
