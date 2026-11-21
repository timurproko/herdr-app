# Proposal

## Why

This repository contains only a scaffold; the working Herdr customization app still lives in private dotfiles. A curated, fresh-history import will make the app independently buildable and reusable without publishing personal configuration or implying permission for unattributed artwork.

## What Changes

- Import only the current files enumerated by `yadm ls-files -- .config/herdr-app/customizations`, flattening that directory into this repository's root. The inspected inventory contains 550 tracked files; no dotfiles commits or untracked/runtime files are imported.
- Preserve the repository's MIT LICENSE, shared AGENTS.md/CLAUDE.md, delivery workflow, existing CI workflow and required-check aggregator, workflow bootstrap, and OpenSpec root. Merge package scripts and ignore rules instead of overwriting the scaffold.
- Exclude the personal host snapshot entirely, retain only the three inspected visual snapshots, and provide a small synthetic example if a snapshot is needed. No real account IDs, infrastructure URLs, quota pins, or machine-specific profiles become public defaults.
- Apply the audit's targeted privacy edits, including explicit remote-target selection for the clipboard smoke tool, neutral account-switch fixtures, reusable PR-link diagnostics, and generic operational documentation. Preserve functional package names, public provenance links, and meaningful synthetic routing/path cases.
- Adapt installation to a checkout anywhere, deploying into `HERDR_APP_HOME` or `~/.config/herdr-app`. Move valid host/architecture guidance from the old project AGENTS.md into `docs/DEVELOPMENT.md`; remove obsolete source-location and delivery rules. Document external private shell wiring as optional/pending, not supplied by this repository.
- Add third-party notices, full Apache-2.0 and Lucide ISC/Feather MIT texts, and per-file provenance for native-derived code and all 89 SVGs outside the existing file-icon collection. Preserve Material Icon Theme/Paseo notices. The [41-file image decision table](image-decisions.md) proposes licensed replacements and explicitly holds gradient artwork and brand marks for maintainer decisions; none is silently relicensed.
- Make the app's host-free regression/build/deployment-fixture coverage run on Windows and Ubuntu in the existing CI, preserving `CI required`. Separate installed-host assertions from synthetic tests and identify every native/live exclusion; see [the runner proposal](ci-proposal.md).
- Introduce three high-level app capability specs rather than a spec for every feature. Existing behavior is imported, not redesigned; fail-closed native boundaries and explicit operational actions remain intact.

## Capabilities

### New Capabilities

- `customization-lifecycle`: single-source packaging, standalone conflict-safe deployment, durable preference preservation, native compatibility gates, and distributable source boundaries.
- `workspace-experience`: the Custom layout/theme, workspace/tab/pane interaction, profile launch behavior, and the narrow same-machine tab-move exception.
- `plugin-integrations`: independently controlled sidebar/integration plugins, external-operation boundaries, and account/credential privacy.

### Modified Capabilities

None. The scaffold has no existing capability specs.

## Impact

The imported root will contain `src/`, `tests/`, `tools/`, `docs/`, `upstream/`, visual `preferences/`, `customization.json`, merged package metadata, and standalone documentation. No native Herdr/Core source, binaries, live state, credential stores, or relay deployment is included. Node.js 20+ remains the declared minimum; CI retains its Node 20 runtime and Windows/Ubuntu matrix. Native compatibility remains limited to the versions actually reviewed in source; the A1 protocol-1 release minimum is not yet established.

### Approval decisions

Approve the three ordered outcomes represented in tasks.md, the default Lucide replacements, the three capability boundaries, and the runner split. Supply an authorship/license declaration for each of the three color-gradient SVGs (or request a separately agreed replacement), and decide whether to replace each of the three provider marks with neutral glyphs or supply its source and redistribution permission. Until then, those six assets are blocked from public import. No app files are copied in this planning change.

### Follow-ups, not this import

- Relocating preference snapshots into the Herdr home (retain current explicit export/import location semantics here).
- Hardening the webhook relay's unauthenticated admission, resource limits, token comparisons, and replay handling.
- Removing the old customizations subtree from private dotfiles.
- Configuring a second/remote workstation.

No deploy, enable/disable/remove/rollback command, preference import, native/live tool, provider access, relay call, or external mutation is part of plan validation. App tests have not been run; the imported suite's compatibility and the historically noted theme assertion remain unverified until implementation checks.
