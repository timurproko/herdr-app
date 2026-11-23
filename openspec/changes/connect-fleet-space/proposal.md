# Proposal

## Why

Crew workers currently appear as an unrelated numbered space, and the coordinator's usual non-repository directory leaves Git unable to show the fleet's pull requests. An optional attachment should make the relationship visible, move both sidebar entries together, and provide one task-linked PR overview without changing native terminal ownership.

## What Changes

- Add **Connect fleet space to coordinator** under Settings → Spaces as a portable boolean, proposed default **off**. Off preserves today's independent spaces, numbered badges, Crew tags, reorder behavior and folder-based Git panel.
- With the switch and Crew plugin on, attach a verified same-machine fleet immediately below its coordinator. Keep both real spaces independently selectable; use a link glyph instead of the fleet's number, a subtle child inset, and omit the Crew tags on both linked rows. Do not merge tabs or move terminals.
- Dragging either linked row moves the coordinator/fleet block, coordinator first, using supported space-order commands and the existing reorder interaction.
- With the coordinator space selected and Git enabled, show the distinct PR links of its eligible Crew tasks across repositories, independent of the selected coordinator tab's directory. Reuse Git rows, Open/Closed, PR menus and related-agent navigation; preserve ordinary Git elsewhere.
- Resolve ownership from read-only Crew status and exact live terminal/pane membership, not names, folders alone, or the boolean coordinator label. Fail closed on missing, stale, ambiguous or cross-machine evidence.
- Document PR discovery honestly: current Crew status exposes recorded task PRs, not every newly opened PR while a worker is still writing its first report. Full pre-report discovery needs the separately specified Crew enhancement below; this repository must not edit Crew.

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

## Person-owned decisions for plan approval

1. **Default:** recommend off so existing installs behave exactly as before; the request defines on/off behavior but does not explicitly choose an installation default.
2. **Git scope:** recommend aggregate mode only while the switch is on and the coordinator space is selected; off is exactly today's folder-based Git. Selecting the fleet itself retains ordinary folder-based Git.
3. **Eligible tasks:** recommend unfinished `working` or `reported` tasks with an exact live worker terminal, including idle/done/blocked agents and plans awaiting approval; exclude stopped, failed, closed and absent workers. “Working subagents” would otherwise omit reported plans precisely when their PRs need attention.
4. **Presentation:** recommend repository-grouped task PRs only (not every PR in those repositories), Open/Closed counts for those distinct linked PRs, no single pinned PR in coordinator aggregate mode, and no repository-wide header action for the aggregate. Both linked rows lose only their Crew tag; unrelated tags stay.
5. **PR completeness:** recommend the full requested overview, including newly opened pre-report PRs, with the separate Crew enhancement in `design.md` as a prerequisite for complete discovery. Current recorded links remain usable, but missing discovery must be identified as incomplete, not accepted as “all PRs.” Approving a narrower recorded-links-only scope instead is the person's decision. The app must not substitute transcript searches, broad branch guesses or writes to Crew records.

Implementation remains blocked on plan approval, including these decisions. All implementation outcomes remain unchecked.
