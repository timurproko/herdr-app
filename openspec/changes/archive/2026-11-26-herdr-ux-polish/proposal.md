# Proposal

## Why

Connected Spaces put disclosure before Crew, add a redundant collapsed count and indent children beyond their intended anchors. Coordinator Git shows Stale and a bottom Loading line while exposing partial cold inventory.

## What Changes

- Put Crew before the coordinator's far-right chevron; omit child counts in both states.
- Support several same-machine connected project children, not just a pair. Every child badge aligns with the coordinator name; one continuous Agents-style stem starts at the coordinator badge centre, with intermediate branches and a last-child corner.
- Preserve native shortcut numbers, independent selection, compact badges and acknowledged whole-block reorder from the parent or any child.
- Never show a Stale label. Keep verification/read/action guards intact.
- Cold first visit: only standard top-left Loading below Open/Closed until admitted first reads settle; show applicable actionable failure notices immediately.
- Approved return/background behavior: show the previous compatible list immediately, no body Loading, and animate the header while updating. Stop animation and update the list in place on completion. Reuse `activity(t.working)` from `src/ui/ui.js`, the native softly pulsing bulb already used in Tabs headers and other status controls; no new visual language or JavaScript animation loop.
- Preserve truthful totals, quiet cooldown retry, bounded runtime memory and failure notices.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-experience`: multi-child connected block geometry, disclosure and safe navigation/reorder.
- `plugin-integrations`: coherent cold inventory admission, header-only warm progress and verification diagnostics without Stale text.

## Impact

Spaces, shared workspace-link projection, the Crew contribution boundary and Git aggregate/presentation are affected. Shared UI changes retain Agents defaults. Tests and inspected synthetic screenshots cover one, two and three children at 100% and 130%, plus cold/warm Git states and failures. Use only checksum-verified release 0.1.18 and disposable instances; stop everything started. No Trello, Settings plugin UI, native binary changes, real agent interaction, installation or PATH changes. Dispatch CI on the final branch head and confirm Windows/Ubuntu pass; never manually mark ready or merge.

## Approval

The person approved this plan including multi-child support and header-only progress on warm return/background refresh. Implementation may proceed after the artifacts and draft PR reflect that decision.
