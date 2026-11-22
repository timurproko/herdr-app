# Tasks

Each numbered group corresponds, in order, to one PR Implementation outcome. All operational checks use disposable homes and fake/unavailable native executables; none authorize a live installation or profile edit.

## 1. Owned shell runtime and sibling-based Bash reload

- [ ] 1.1 Add deterministic shell revision generation, the four owned runtime destinations and exact shell-path allowlisting; check build determinism, unsafe/linked path refusal and digest preflight in focused build/deployment fixtures.
- [ ] 1.2 Capture the loader directory from its source-time location and use sibling payload/revision files; update directory-loader fixtures to installed paths and cover alternate homes, spaces, later cd, status preservation, revision reload/retry, hook deduplication and interactive/TTY/identity guards with fake Core only.
- [ ] 1.3 Publish the shell revision after script replacements, including coherent expansion of shell source selectors; cover no-op timestamps, conflict-before-writes, owned-file reporting and journal rollback in disposable deployment fixtures.
- [ ] 1.4 Document exact installed paths/profile lines, loader relocation/re-source limits and deploy-owned revisions in README and architecture shell guidance; replace the audit's unresolved source-hook exception while preserving historical execution evidence, and check examples match the fixtures.

## 2. Checkout-independent full preference exporter

- [ ] 2.1 Share full export orchestration and pure layout validation without duplicating filters; retain source import guards and source-only authored-base fallback, with focused existing preference-home/filter fixtures demonstrating unchanged schemas and safety behavior.
- [ ] 2.2 Package the export-only entrypoint and complete local dependency graph, including canonical settings catalog rather than its source bridge; assert owned installed imports resolve and no checkout/build imports or test entrypoints are required.
- [ ] 2.3 Add installed CLI fixtures comparing all four snapshot classes byte-for-byte with source export, then run with disposable source unavailable; cover explicit-home precedence, no-op writes, absent visuals, invalid baseline/layout/palette/credentials and unsupported-action no-writes while preserving live bytes.
- [ ] 2.4 Document installed export syntax and private-backup limitations in README and docs/COMMANDS.md; check the documented export command in an isolated fixture and retain explicit-only source import with no new filters or pull behavior.

## 3. Core-only shell installation and guarded recovery

- [ ] 3.1 Add deploy:shell/deploy-shell as a fixed subset in the existing deploy flow, preserving non-shell manifest metadata and skipping layout/preferences/native work; cover fresh install, update, no-op and modified-file refusal without a Desktop executable.
- [ ] 3.2 Add explicit rollback:shell support for verified shell-scoped journals using the existing lock, backup ID, ownership and later-edit guards; test initial/update restoration, revision-last restore and mixed/tampered/newer-journal refusal without native patch/status calls.
- [ ] 3.3 Cover shell-then-full and full-then-shell deployment sequences, asserting identical shell ownership and untouched unselected files/layout base/preferences; include modified non-shell bytes to ensure shell mode never prunes or adopts them.
- [ ] 3.4 Document Core-only local installation, compatible full deployment and shell recovery in README/docs/COMMANDS.md; correct ordinary rollback to require a reported backup ID and stock layout, and check each documented mode against disposable CLI fixtures.

## 4. Remaining operational guidance and source-independent artifact paths

- [ ] 4.1 Replace remaining current fixed-source guidance in architecture Required workflow, Core monitor/tab-move/validation docs, Git setup help and ownership-report text; use a targeted scan and ownership-report assertions while retaining historical/migration mentions and architecture negative guards.
- [ ] 4.2 Move the two native screenshot scripts' default output from Herdr-home customizations/.work to checkout .artifacts resolved from their file location; add static path/output-directory coverage without executing either live script.
- [ ] 4.3 Update testing guidance and any runner registration required by the added fixtures, with source-path discovery/list checks showing coverage; perform only quick focused integration checks under a disposable HERDR_APP_HOME and record remaining live/remote checks as separate rollout gates.

## Workflow follow-up

- Wait for plan approval before implementation. Keep the PR draft; do not mark ready or merge.
- Live desktop deployment, Core-only peer installation, dotfiles migration and source cleanup are separate later authorized steps, not tasks to execute here.
