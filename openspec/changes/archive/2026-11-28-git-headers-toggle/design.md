# Design

## Context

See `proposal.md` for motivation. `src/plugins/git/mod/main.js` currently loads a lowercased canonical repository set from `custom.git.task-repositories.folded` in `init`. `repositoryHeader` mutates and persists that set. Both ordinary `renderPulls` and coordinator section/reveal projection consume it, while each render path independently draws the Open/Closed strip. Individual folds already outlive repository resets and panel recreation.

The screenshot's selected-agent PR is above a collapsed ordinary repository header; the bulk action must preserve that pin. Coordinator reveal, safety-selection epochs, headerless failures and cold/warm publication already have their own guards. PR #104 is concurrently changing this same render path.

## Goals / Non-Goals

**Goals:**
- One fold policy and one button builder used by both existing views, with only narrow call-site changes in `main.js`.
- Restore disclosure before cached or fresh target rows paint, independently of the source of PR facts.
- Preserve existing presentation/read boundaries and local-only persistence.

**Non-Goals:**
- No render-path refactor, new Settings field, portable preference schema, extra panel feedback, network work, polling or native patch.
- Expand all means disclose all sections, not fetch all cursor pages or bypass coordinator mounted-row caps.
- No mixed-state third mode; the two-state icon describes the saved global default, not every individual exception.

## Decisions

### 1. Global default plus repository exceptions

Represent state as a versioned local record containing a collapsed-default boolean and canonical repository overrides. An individual toggle records the opposite of that repository's effective state; if it now matches the default, remove its override. A bulk toggle flips the saved default and clears the entire override map, not merely visible repositories.

This gives unseen repositories the chosen state and retains intentional one-off changes. A visible-repositories-only bulk update was rejected because another agent could still expand unexpectedly. Forcing the global state after every individual click was rejected because it would make the existing chevron ineffective. Keeping separate ordinary/coordinator state was rejected because the same repository should behave consistently in both views.

### 2. Narrow persistence owner and migration

A small Git-local fold helper owns parsing, canonicalization, effective lookup, individual/bulk updates and versioned localStorage persistence. Use a new namespaced key such as `custom.git.repositories.disclosure`; when it is absent or invalid, load valid entries from the existing folded set as collapsed exceptions under expanded default. A successful first write establishes the new record as authoritative so a later restart cannot reapply legacy folds. Preserve the legacy key as rollback data rather than deleting unrelated state.

Read saved state at initialization and reconcile it on existing context/show entry before section publication, so a recreated or retained panel cannot overwrite a newer saved bulk choice with a constructor-time snapshot. No write or notification runs from render; mutations happen only in event handlers, and existing lifecycle hooks handle reconciliation. Valid local storage survives app restart and Git disable/re-enable; it is not a portable or remote-machine preference. Storage failures remain best-effort in memory, consistent with current fold persistence. Unsupported-version data must not be rewritten merely by rendering.

Avoid a separate per-agent or per-space fold map: current memory is already keyed by canonical repository and the requested default is client-global across selected machines.

### 3. Reuse existing disclosure consumers

Route ordinary section visibility, real/preview header chevrons, coordinator `TaskReveal.project` folding and safety-selection projection through the same effective-state view. Where the existing projection expects `.has(repo)`, provide an equivalent policy-backed lookup rather than enumerating only today's repositories. Preserve the existing individual-toggle scope checks and advance the same selection epoch on both individual and bulk changes so late safety results cannot publish into a different revealed selection. Retire incompatible pending pin motion through its existing cancellation API, without moving the pin or changing agent selection.

Repository facts, counts, pagination cursors, section eligibility and enrollment remain independent of disclosure. A fold alone must not clear a loaded page, synthesize an empty state, suppress a headerless failure or change unknown totals. Existing scroll/reveal projection handles changed content with its current bounds.

### 4. One minimal icon button

Append a flexible spacer and the same shared icon-button treatment used by the panel tools to each Open/Closed strip. Keep the strip's 40px height, tab label padding, selected appearance and count-free semantics. Use a 24px target, matching muted glyph and subtle hover/focus treatment, with paired collapse/expand glyphs following the existing Herdr outline style. The icon depicts the chosen expanded/collapsed default; the accessible action is respectively `Collapse all repository sections` or `Expand all repository sections`. Individual exceptions do not change this indicator. No badge, mixed-state label, tooltip explanation, menu or extra button is introduced.

Package any needed Git-owned icon assets through `src/plugins/git/panel.json`, not through an unrelated panel. No new UI framework or dependency is needed.

### 5. Keep overlap with PR #104 small

At implementation time inspect the current state of #104. If its fix is merged, rebase this task onto the updated default branch before touching the affected render sites. If it is still in flight, coordinate the dependency and retain the narrow helper/call-site shape; do not copy, revert or independently refactor its render lifecycle. Resolve only actual overlap and rerun the relevant targeted guards on the integrated result. Planning itself changes no render code.

When building on #104's still-unmerged head, retain its source changes and archived
planning/finalization artifacts, but keep the canonical `openspec/specs/` baseline
byte-identical to the actual default branch until this PR's bot finalization.
Otherwise the bot refuses the completed draft with `draft-delivery-specs-diverged`.
The active disclosure delta remains pending and owned by this PR; #104 retains
ownership of its separate loading/render spec delta in its archive. Do not copy
that delta into this change, which would duplicate its added requirement when
both PRs finalize. This is spec-baseline bookkeeping only, not a runtime rollback,
archive rewrite, force-push or permission to merge either PR. A read-only bot
preparation preview must accept the canonical baseline and apply the disclosure
delta without modifying #104's archive.

## Risks / Trade-offs

- [Mixed individual disclosure differs from the global icon] → The indicator intentionally represents the chosen default; its next action is deterministic and clears all exceptions. Cover both symmetric cases in tests and document this explicitly.
- [A warm entry snapshot or retained view restores obsolete folds] → Keep disclosure separate from cached PR inventory and reconcile the saved policy before destination publication; test coordinator/worker and different-repository transitions.
- [Bulk folding leaves stale safety or motion geometry] → Reuse individual fold invalidation and existing motion cancellation; exercise fold/reveal invariants and pinned remaining counts without new scheduling.
- [New storage unavailable] → Keep working in memory, never add UI messages; durable restart behavior requires functioning native localStorage just as current individual folds do.
- [PR #104 changes the nearby render contract] → Integrate its actual final code before implementation publication, preserving its deferred lifecycle and render-safety rules.

## Migration Plan

After plan approval, land two outcome groups: first the persistent fold policy with migration tests; then the shared strip control and both render integrations with focused fixtures and updated Git documentation. Run only relevant tests, especially the new disclosure fixture, existing Closed-fold exploration, section-reveal invariant, label-only tabs and selected-agent entry/pin guards. Do not run the full suite or modify the live installation.

Rollback removes the new helper/control and uses the preserved legacy folded set. It does not translate a collapsed global default into an unbounded list of repositories; rollback may therefore restore the old per-repository presentation rather than the newest bulk preference. No PR facts, host state or credentials need migration or rollback.
