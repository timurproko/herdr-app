# Design

## Context

See proposal.md for motivation and specs/workspace-experience/spec.md for the observable contract. The inspected mockup is `C:/Users/tprokopiev/.claude/cache/paste-screenshot/screenshot-d2efc34db7.png`: a thin grey elbow starts under badge 1, turns toward the muted crew label, and leaves the branch marker at the right.

Currently `crew/plugin.js` suppresses tags for either end of a fleet binding. Spaces renders `linkBadge()` in expanded rows, compact rows and paired drag previews; expanded rows add 8px of content padding, which would shift a replacement elbow away from the parent badge. The machine header uses a 16px chevron slot after 4px right padding, while space rows use 8px padding and put plugin tags after the branch slot. The rendering fixture explicitly encodes that old marker-before-tag order.

## Goals / Non-Goals

**Goals:** Keep the existing plugin and Spaces ownership boundaries; derive all attachment presentation from the existing verified binding; make geometry predictable at native logical-pixel scale and app zoom.

**Non-Goals:** No new Crew/status protocol, state migration, preference, polling, native patch, deployment or live-session mutation. No changes to pair dragging, compact selection-only interaction, Git aggregation eligibility/reads/refresh/authority, unrelated space order or icon visibility settings. Repository folding is local UI state, not a portable preference.

## Decisions

### Suppress only the bound child tag

Change the Crew declaration's suppression predicate to match only a verified context's child. Let the existing role detector produce the coordinator's normal Crew pill and tooltip. Do not special-case Crew in Spaces or suppress all worker tags: ordinary unbound workers retain their current tags. Cover verified, invalidated, disabled and unrelated-space cases through the packaged plugin harness.

### Use one vector elbow motif, anchored to the parent's badge column

Replace the chain asset used by Spaces with a small no-fill SVG elbow using a thin rendered stroke (target 1 logical pixel), rounded caps/join and inherited `t.muted` foreground. Keep the person's actual palette rather than hard-coding screenshot grey. Register the emitted asset through `customization.json`; remove only the obsolete Spaces chain mapping if it has no remaining consumer.

In the expanded row, preserve the outer left anchor and let a wider connector slot provide the child's existing 8px text inset. The vertical stroke sits at the ordinary badge's horizontal centre, not at the centre of the wider child slot. It begins near the row's top, below the parent's badge, and bends at the fleet label's vertical centre into a short horizontal stroke. Keep the row height and selected/hover surfaces unchanged; explicitly give the child label its muted style rather than relying on inherited foreground. Reuse the motif for the child in paired drag previews so no chain remains there.

For the compact rail, propose a 16px elbow in the existing centred badge slot, with its vertical stroke aligned to the coordinator badge's centre and its short arm pointing right. Keep the existing space selection handlers, target size and name/directory tooltip; do not add a second badge, branch icon, text character or drag action. A chain replacement confined to expanded mode was rejected because the rail would keep contradicting the relationship metaphor.

### Anchor branch markers independently of tags and child indentation

Use a trailing layout rail with the same 4px right inset and 16px fixed icon slot as the machine header chevron. Place plugin pills before the branch slot when the marker is visible, eliminating the current last-pill negative margin in that combination. Preserve the tag-only row's current right-edge treatment and normal rename room. Do not move the machine chevron or its plus button to accommodate rows. Parent/fleet indentation belongs only to the leading/name area, never to the trailing rail.

Extend render-tree assertions to compare the actual header and row right inset plus half-slot width, not only an arbitrary margin value. Include local and remote headers, ordinary and attached worktrees, coordinator/worker Crew pills, unrelated/multiple tags, long names, hidden worktree icons and rename mode. Preserve existing normal-worktree avatar/order assertions.

### Remove aggregate-only wording without replacement

Delete only the `Recorded task PRs` header annotation and the entire `git-task-incomplete` notice from `renderAggregate`. Keep the Git title, Open/Closed tabs, Refresh/Pin/Close controls, repository-scoped errors, setup/enrollment notices and empty states. The source remains recorded task PRs; removing the generic incomplete notice must not introduce guessed links or alter eligibility.

### Reuse a shared section header and local persistence for repository folding

Spaces currently builds machine headers inline, using the existing `chevron` helper and fixed trailing slot; there is no standalone machine-header component to import. Extract the expanded section-header shell and chevron into `src/ui/ui.js`, then consume that same helper in both Spaces and Git. Keep Spaces' drag control wrapper, plus/status controls, captured machine fold action and compact header path intact. Use the same height, padding, muted typography, rounded hover treatment, click target and chevron direction for repository headers, with accessibility labels/expanded state appropriate to each repository.

Store a set of canonical lowercase `owner/repository` keys under a dedicated Git `localStorage` key, matching Spaces' existing `machines.folded` JSON-set approach without sharing or modifying its key. An absent key means all repositories expanded. Restore state on controller creation, retain it through tab switches, context refresh, temporary repository absence and panel recreation, and write only on an explicit header toggle. No preference export, Crew state, host document write or new timer is needed.

Each repository header shows its name plus Open and Closed task-PR counts derived from the current aggregate rows, followed by the shared right-edge chevron. Counts remain visible and update while collapsed; global tab counts do not change. Folding hides that section's PR rows and repository-specific body errors/enrollment prompt, never the header or global setup notice. Reopening restores current rows and notices. Collapse is presentation only: it neither triggers an extra fetch nor cancels or stops the existing webhook-driven updates, and it never causes an empty-list message merely because all sections are folded.

Cover independent toggles, default expansion, same/new controller persistence, Open/Closed switching, refresh/new links, zero counts, errors, no extra reads, and counts changing while a repository is collapsed. Existing non-aggregate Git behavior and machine-header controls retain their regressions.

### Update active documentation and exercise existing fixtures broadly

Replace README and docs/TESTING.md wording that promises two hidden tags and chain glyphs, and remove the documented generic incomplete-list notice from README/docs/ARCHITECTURE.md. Document collapsible aggregate repositories, visible counts and local fold persistence. Keep archived proposals as historical records; the deltas update the active workspace and plugin specs through normal finalization. Add focused packaged-plugin, render-tree and drag-preview regressions without expanding production imports just to satisfy test stubs.

After approval and implementation, run quick affected tests, then one full `CI=true npm run test:ci` run using Node 24 as `.github/workflows/tests.yml` does. In particular, retain git-location, pr-agent-links and sidebar-refresh in the integration run; fix missing stand-in exports if production imports change rather than weakening or excluding suites. Do not substitute `npm test`, whose installed-host/private-environment effects differ from hosted CI.

## Risks / Trade-offs

- [A render tree cannot prove native pixels or SVG rasterization at app zoom] → Inspect connector geometry against the supplied mockup, assert numeric anchors and asset stroke properties, and report native visual validation honestly; do not deploy merely to obtain a screenshot.
- [Pills could push the branch marker off its axis in narrow sidebars] → Keep trailing slots non-shrinking, allow title/metadata to shrink, and cover long labels and tag combinations.
- [Compact space is too small for a full tree and label] → Show only the same elbow motif in the normal badge slot and retain the tooltip; this is the explicit rail proposal for approval.
- [Existing stand-in modules can miss newly imported helpers] → Update affected UI stand-ins for the shared header component and run the full CI-selected suite before implementation handoff, particularly git-location, pr-agent-links and sidebar-refresh.
- [Removing the generic incomplete notice could be mistaken for broader PR discovery] → Keep recorded-link limits in documentation and preserve the existing exact-link source, scoped errors and tests; add no replacement UI notice.
- [Extracting the machine header could regress its actions or row geometry] → Share the presentation shell only and retain machine-specific control handlers, plus/status layout and compact behavior under existing fixtures.

## Migration Plan

No migration or deployment is part of this task. After plan approval, deliver the source/tests/docs through this same draft PR, without marking it ready or merging. Existing preferences and live native spaces remain untouched; reverting the source change restores the prior presentation.
