# Design

## Context

See proposal.md for motivation. `src/plugins/crew/plugin.js` currently returns no tags when the presentation binding identifies the queried space as its child. The same function already identifies retained parents as coordinators before falling back to live role detection. Spaces renders all contributed tags with one shared pill renderer, before the trailing worktree marker. Its compact rail does not render those pills.

## Goals / Non-Goals

**Goals:** Correct the tag contribution without introducing a second pill renderer or making tags depend on fresh action eligibility.

**Non-Goals:** No change to the binding resolver, persisted identities, Git/task inventory, drag previews, native ordering, compact rail, worktree alignment or preference schema.

## Decisions

- Classify a presentation-bound parent as coordinator and child as worker in the Crew tag contribution; otherwise retain ordinary `crewInSpace` detection. Removing the child suppression alone is insufficient: a retained or finished fleet may have no live worker from which to infer its tag. This keeps tags consistent with retained chain-badge presentation without granting action authority.
- Reuse the existing Spaces tag slot and renderer. Do not add Crew-specific rendering to Spaces or copy pill styles; both rows then have identical styling and the existing worktree-axis rules apply unchanged.
- Update current README/testing guidance and add a delta for all three workspace requirements containing fleet-tag suppression, including the refresh scenario that currently forbids a fleet Crew tag. Leave archived historical decisions untouched.
- Extend packaged-provider assertions for live, retained, cold-restored, finished, detached and disabled cases. Extend expanded render assertions for the attached worker pill before its branch marker and verify the compact tree still contains no pill.

## Risks / Trade-offs

- [Live role fallback can lose a retained fleet pill] → Derive attached role from presentation binding, covering empty/finished fleet and restart fixtures.
- [A new pill might shift the worktree marker] → Keep the existing renderer and assert local/remote right-axis alignment with multiple tags and long names.
- [Over-broad fixes disturb unrelated work] → Touch only tag contribution, relevant tests, docs and this delta; do not alter fleet resolver or Git code.

## Validation and rollout

After approval, run targeted packaged Crew and Spaces rendering tests, then the requested `CI=true npm run test:ci` once. Bring the branch up to date with the repository default before final handoff, including any intervening merges of PRs 31, 28 and 29. Report required checks on the final head. No deployment or native UI mutation is authorized; no state migration is necessary. Reverting the source correction restores the earlier presentation.
