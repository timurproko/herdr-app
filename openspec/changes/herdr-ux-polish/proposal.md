# Proposal

## Why

Connected Spaces currently put disclosure before Crew, add a redundant collapsed count, and indent the child beyond its intended badge/name anchors. Coordinator Git exposes Stale in its header and places Loading below a growing partial inventory, unlike existing panel feedback.

## What Changes

- Put the coordinator's Crew pill before its far-right collapse chevron, preserving existing pill and control styling.
- Omit connected-space child counts in both disclosure states; only the chevron direction indicates collapse.
- Anchor the existing Agents-style connector at the coordinator badge's horizontal centre and align the child badge's left edge with the coordinator name's left edge, at 100% and 130% zoom.
- Remove Stale from the coordinator Git header without weakening freshness, read or worker-navigation guards; preserve sanitized verification diagnostics on Loading.
- Put one standard Loading bulb/text at the top left of the body directly below Open/Closed. Hold newly loading partial inventory until its first reads settle, with immediate applicable repository failure notices.
- **Approval decision:** literal loading-only on return conflicts with PR #84's immediate retained sections. Recommend keeping previously shown compatible sections on return and during refresh, placing any Loading above them, and staging new partial sections rather than blanking known content. The four concrete cases and failure/cooldown rules are in design.md; approval of this plan must explicitly accept this exception or request a revision before implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: connected-space disclosure order/count and connector/badge alignment, preserving independent native identity, shortcuts, compact rail and paired reorder.
- `plugin-integrations`: coordinator loading admission, top-of-body feedback, retained return/refresh presentation and verification diagnostics without a Stale header label.

## Impact

- Source: `src/features/spaces/main.js`, existing shared primitives in `src/ui/ui.js` as narrowly needed, and `src/plugins/git/mod/{aggregate,main}.js` plus the existing section projection if required.
- Regression coverage: Spaces layout/interaction and fleet reorder tests; coordinator return, deferred repository, read-notice, truthful-total and presentation/window tests.
- Evidence after approval: synthetic-only disposable native fixtures, inspected screenshots for each item at 100% and 130%, verified release 0.1.18 executable, and exact-head Windows/Ubuntu manually dispatched CI results.
- Update relevant README/architecture/testing guidance with the approved presentation contract; no Trello, Settings plugin UI, native binary changes, new dependencies, live sessions or installation/PATH changes.
- Planning only: no implementation, screenshots or test workflow dispatch until approval. Never manually mark ready or merge.
