# Proposal

## Why

Crew workers currently appear as an unrelated numbered space, and the coordinator's usual non-repository directory leaves Git unable to show the fleet's pull requests. An optional attachment should make the relationship visible, move both sidebar entries together, and provide one task-linked PR overview without changing native terminal ownership.

## What Changes

- Add **Connect fleet space to coordinator** under Settings → Spaces as a portable boolean, default **off**. Off preserves today's independent spaces, numbered badges, Crew tags, reorder behavior and folder-based Git panel.
- With the switch and Crew plugin on, attach a verified same-machine fleet immediately below its coordinator. Keep both real spaces independently selectable; use a link glyph instead of the fleet's number, a subtle child inset, and omit the Crew tags on both linked rows. Do not merge tabs or move terminals.
- Dragging either linked row moves the coordinator/fleet block, coordinator first, using supported space-order commands and the existing reorder interaction.
- With the coordinator space selected and Git enabled, show the distinct PR links of its eligible Crew tasks across repositories, independent of the selected coordinator tab's directory. Reuse Git rows, Open/Closed, PR menus and related-agent navigation; preserve ordinary Git elsewhere.
- Resolve ownership from read-only Crew status and exact live terminal/pane membership, not names, folders alone, or the boolean coordinator label. Fail closed on missing, stale, ambiguous or cross-machine evidence.
- Use only recorded `tasks[].pr` from `crew status --json`. Label the overview as possibly incomplete for tasks that have not reported yet; keep the source behind an adapter for future discovery, without calling it or depending on a Crew change.

## Capabilities

### New Capabilities

None; extend the existing workspace and plugin boundaries.

### Modified Capabilities

- `workspace-experience`: Optional fleet attachment, portable preference and same-machine block reordering.
- `plugin-integrations`: Task-linked, multi-repository Git context for a verified coordinator, with source, lifecycle and stale-result safeguards.

## Impact

- Spaces/settings/preferences: `src/features/spaces/main.js`, `src/features/settings/spaces-ui.js`, `src/shared/space-preferences.js`, `tools/runtime/preferences.mjs`, shared reorder presentation and targeted fixtures.
- Integration: Crew-owned status/binding helpers under `src/plugins/crew/`, generic registry/API contribution points, and build mappings. Other features must not import Crew implementation files.
- Git: `src/plugins/git/mod/` aggregate controller/rendering, repository-qualified PR identity, shared webhook routing and existing agent navigation. No new automatic CI-fix authority, service, native patch, Core-document writer or terminal input.
- Documentation and fixture-only coverage in this repository; no deployment or real-terminal tests as part of planning.
- External read-only investigation: `D:/Git/crew/crew.mjs` and its README. No external files changed.

## Approved scope

1. **Default:** off; existing installs remain unchanged.
2. **Git scope:** aggregate only while the switch is on and the coordinator space is selected. Off, fleet selection and other spaces retain folder-based Git.
3. **Eligible tasks:** live `working` and `reported` tasks, including plans awaiting approval; exclude stopped, failed, closed and absent workers.
4. **Presentation:** only task-linked PRs, grouped by repository, task-scoped Open/Closed counts, and no single active pin. Both linked rows omit only their Crew tag.
5. **PR completeness:** recorded links only for now, possibly incomplete for unreported tasks. No pre-report discovery or Crew dependency; preserve an adapter seam for a future source.

Implementation is approved with these decisions. No deployment is authorized.
