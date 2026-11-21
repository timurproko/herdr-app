# Proposal

## Why

Split the existing Herdr customization project out of private dotfiles into this public standalone repository, without redesigning the app or refactoring its tests and tools. Preserve current source behavior and the shared repository scaffold.

## What Changes

- Copy only the current 550 yadm-tracked customization paths into the repository root, excluding `preferences/pc.json`; import no yadm history, untracked files or live runtime state.
- Preserve LICENSE, shared AGENTS.md/CLAUDE.md, delivery/CI workflows, bootstrap and required-check scripts, and OpenSpec. Merge package metadata/scripts and ignore rules.
- Keep source code, tests, fixtures and docs as originally tracked except three authorized content edits: omit the personal snapshot, parameterize the clipboard smoke tool's hardcoded remote host, and neutralize personal names/comment in status-reveal fixtures. No wider genericization or portability rewrites.
- Keep all 41 previously unresolved SVGs exactly as in the original project, including provider marks and gradients. Record each honestly as "kept as in the original project, source not recorded"; infer no author, source or redistribution license. Undo the provisional Lucide/neutral substitutions in follow-up commits; do not rewrite published history.
- Keep established third-party notices: Apache-2.0 attribution/modification notes for the five Herdr-derived JS files and matched/derived SVGs, complete Lucide ISC/Feather MIT notices for identified icons, and existing Material/Paseo notices. Keep a per-file provenance manifest distinguishing evidence from unknowns.
- Adjust README and move still-valid old project AGENTS guidance into docs only where source location, deployment paths and shared instructions adoption require it. Retain feature descriptions and optional/private shell-integration information rather than rewrite documentation.
- Wire the existing CI to run only unmodified suites supported by Windows/Ubuntu runners without Herdr. Leave unsupported suites out with explicit reasons; do not split or rewrite tests/tools to increase portability. Keep the exact required check name `CI required`.

## Capabilities

### New Capabilities

- `customization-lifecycle`: existing packaging/deployment/preferences and reviewed native safety boundaries, with standalone source distribution.
- `workspace-experience`: existing layout, workspace/tab/pane interactions, profiles and narrowly gated tab movement.
- `plugin-integrations`: existing independently controlled panels, companion integrations and operational/account boundaries.

### Modified Capabilities

None; these are the first app capability records in the scaffold.

## Impact

The app's existing root layout and behavior are retained. Only minimal new-root path and CI-wiring adjustments are allowed beyond the three content edits. Native/live behavior is not exercised. Required CI tests the supported unmodified subset, not the entire original default unit command or installed-host integration. Unknown artwork provenance remains explicitly unresolved, by maintainer direction, not silently assigned to MIT or Apache.

## Approved direction

The maintainer explicitly approved this smaller repository-split scope and retention of all original artwork. The earlier replacement/gradient-last plan is superseded. The three task groups match the PR outcomes. The shared delivery bot, not the implementation agent, handles promotion and OpenSpec finalization.

## Follow-ups

Preference snapshot relocation to the Herdr home, relay hardening, removal of customizations from private dotfiles, and second-workstation setup remain out of scope. External shell wiring and unverified A1 rollout claims remain documented as optional/pending where installation guidance needs clarification.
