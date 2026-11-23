# Proposal

## Why

The enabled coordinator/fleet feature works, but its sidebar presentation hides the coordinator's Crew tag and uses a chain glyph instead of the person's tree-connector mockup. Worktree icons also sit off the machine-header chevron's centre line, especially beside a Crew pill; the consolidated Git panel adds unwanted wording and lacks collapsible repository sections.

## What Changes

- Keep the coordinator's Crew tag when its fleet is attached; suppress only the attached fleet's Crew tag and retain unrelated plugin tags.
- Replace the fleet's chain badge with a thin muted vector elbow that hangs below the coordinator's numbered badge, followed by an inset muted child name, matching the supplied mockup.
- Use the same elbow motif in the compact rail's fleet badge slot, retaining independent selection and the existing tooltip rather than inventing a text character or another chain icon.
- Align every visible right-edge space worktree icon with the machine header's fold chevron; place any Crew or other tag immediately to its left without displacing the icon.
- Remove the consolidated Git panel's `Recorded task PRs` heading text and `Recorded PRs · possibly incomplete until tasks report` notice entirely, without replacement wording.
- Give each consolidated Git repository section a machine-style chevron header, default expanded, with per-repository locally persisted folding and visible Open/Closed task-PR counts even while collapsed.
- Update regression coverage, README/testing/architecture documentation and the workspace and plugin specifications. Keep the setting default off, verified bindings, pair dragging and Git aggregation data/refresh behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: Correct attached fleet tag visibility and tree-connector presentation, and define consistent right-edge worktree-icon alignment for attached and ordinary space rows.
- `plugin-integrations`: Remove the aggregate overview's heading annotation and incomplete-list notice, and add independently collapsible repository headers with persistent local fold state and visible task-scoped counts.

## Impact

- `src/plugins/crew/plugin.js` owns the tag suppression correction; its packaged plugin fixtures cover role and binding cases.
- `src/features/spaces/main.js`, a packaged SVG asset and `customization.json` own connector rendering, paired previews and trailing icon/tag layout.
- `src/plugins/git/mod/main.js` owns aggregate presentation; `src/ui/ui.js` supplies one shared section-header component for Spaces machine headers and Git repository headers, without changing machine actions or drag guards.
- `tests/spaces-worktree-layout.test.mjs`, `tests/fleet-git.test.mjs` and related sidebar/drag fixtures cover rendering, repository folding/persistence/counts and unchanged interactions.
- `README.md`, `docs/TESTING.md`, `docs/ARCHITECTURE.md` and OpenSpec deltas replace the obsolete both-tags-hidden/link-glyph/incomplete-notice contracts; historical archived changes stay untouched.
- No new dependency, preference, discovery, service, deployment or native patch is required. Before implementation handoff, run the full supported hosted suite with `CI=true npm run test:ci` on Node 24, including git-location, pr-agent-links and sidebar-refresh rather than relying only on targeted tests.
