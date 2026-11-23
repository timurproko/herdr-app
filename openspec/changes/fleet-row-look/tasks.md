# Tasks

## 1. Attached fleet rows use aligned chain badges and left-aligned muted names

- [x] 1.1 Restore the historical outlined link SVG and its Spaces mapping, replace the connector helper with a 16px badge-sized muted icon in expanded and compact rows, and remove the unused elbow asset/mapping; rendering and manifest assertions show no remaining connector consumer.
- [x] 1.2 Match the fleet badge slot and vertical center to real ordinary badges and remove the fleet-name inset while retaining muted text; expanded and compact render-tree comparisons assert equal box dimensions, name anchors and theme color.
- [x] 1.3 Preserve coordinator Crew-tag visibility, fleet-only tag suppression, unrelated tags, independent selection, compact tooltips and the worktree-marker axis; existing targeted fixtures plus updated sidebar regressions pass for local/remote and tagged/untagged rows.
- [x] 1.4 Replace active elbow descriptions in README and docs/TESTING.md with chain-badge and left-aligned muted-name behavior; documentation matches this delta without editing archived changes.

## 2. Dragging either linked row shows one ordinary coordinator chip

- [ ] 2.1 Render the coordinator's ordinary numbered badge and name through the single-chip preview path for either grabbed pair member, leaving captured block sources and pressed ID untouched; Spaces fixtures assert exactly one coordinator chip and no fleet/chain preview for both gestures, with ordinary previews unchanged.
- [ ] 2.2 Remove the unused stacked-row preview option and its assertion from the shared reorder renderer/test without altering geometry or motion; reorder fixtures retain ordinary previews, both-source dimming, source cleanup and cancellation checks.
- [ ] 2.3 Replace stacked-preview wording in README, docs/TESTING.md and docs/REORDER.md with single coordinator-chip behavior while retaining paired movement and block-indicator guarantees; documentation and the spec delta agree.
- [ ] 2.4 Run the focused Spaces/reorder and existing pair persistence/ordering regressions, then CI=true npm run test:ci; record actual results and any native-visual validation limitation without deploying.
