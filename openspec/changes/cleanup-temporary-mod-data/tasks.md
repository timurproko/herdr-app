# Tasks

## 1. Exact-name temporary-mod disposal

- [ ] 1.1 Add a small owned-lifetime cleanup API to `tools/temporary-mod.mjs` that removes only the claimed temporary mod and matching data directory, with idempotence and existing-directory protection; verify with disposable-home success and thrown-error fixtures in `tests/temporary-mod.test.mjs`.
- [ ] 1.2 Cover already-removed mod cleanup, unrelated installed/stock mod and data preservation, and any introduced interruption hooks with fixture assertions; run `node tests/temporary-mod.test.mjs` without invoking Herdr.

## 2. Temporary-mod caller cleanup

- [ ] 2.1 Route temporary-mod creation/removal in feature/native scripts and preview/inspection/retry/enrollment tools through shared disposal, protecting partial setup and cleanup-command failures; verify changed JavaScript with `node --check` and add fixture/static coverage for caller adoption without running native scripts.
- [ ] 2.2 Trace indirect/generated temporary mod names, including the reported feedback preview and plugins opener, in available source/history; fix any creator found and record absent provenance in the handoff if unavailable, with no real-home access or historical deletion.
- [ ] 2.3 Run the focused temporary-mod fixture and inspect the final caller inventory/diff for exact-name-only deletion and retained ownership guards; document the helper lifetime and uncatchable-termination limit beside its API.
