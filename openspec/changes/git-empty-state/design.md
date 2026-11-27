# Design

## Context

See proposal.md for motivation. The task checkout starts at bbd4674, which already includes PR 97 (68fa7be) and PR 98 (8cdefb8). Their loading and connected-child ordering contracts must survive.

Observed source:
- `main.js` ordinary Git requests `panelMessage(..., rowInset: 2)`, deriving feedback from a 28px PR-title row plus inset. Repository headers instead use `sidebarSectionHeader` with `U.control` (28px). Ordinary header eligibility currently allows a known repository with zero rows when no PR is pinned.
- Coordinator messages also use the generic panel helper. Notices have independent `.px(8).py(4)` geometry and native height measurement.
- `task-reveal.js` creates a header for every settled projected section and can synthesize a leading header for a continued batch. Both paths must distinguish real PR sections from headerless notices.
- Existing specs explicitly allow headers/counts for notice-only sections after cold reads settle. The delta changes those exceptions rather than silently treating them as compliant.
- Spaces renders Crew contributions through `sidebarMachineLabel(t, tag.label)`. The plugin contribution is shared with other callers, so changing the provider would affect more than the sidebar.

## Goals / Non-Goals

**Goals:** Use canonical header geometry as the feedback oracle, keep empty-section suppression presentation-only, preserve coherent loading/reveal behavior and isolate sidebar casing.

**Non-Goals:** No global panel-helper restyle, new IO/scheduler, repository discovery, changes to fold persistence, PR ordering, pinned-row motion, enrollment or terminal badges. No deployment or interaction with the person's app, profiles, checkouts or real Crew homes.

## Decisions

### 1. Header-based Git feedback, not global PR-row padding

Use a Git-specific feedback presentation or an explicit opt-in to shared geometry so list-replacing text matches the real repository label's inner x, y and row height. Preserve colors and accessible semantics. A long error keeps the same first-line anchor and can grow for readability. Keep PR 97's pulsing Loading layout and header exclusion unchanged; its dot/text footprint is a separate preserved loading contract.

Reject changing `panelMessage` defaults: Files and other consumers still use their existing first-row alignment. Reject arbitrary extra spacer rows: they conceal rather than eliminate the mismatch and jump.

### 2. PR eligibility controls headers; notices remain independent

Ordinary Git requires positive remaining-row eligibility before rendering its header, retaining lone-pin behavior. Coordinator projection/reveal may retain a repository-scoped notice with zero rows, but must not create, count or synthesize a header for that section. Headerless notices ignore saved folds because no disclosure remains. A section with PRs can still fold normally, including its notice. Authoritatively empty sections disappear; all-empty/no-notice shows one empty message, not one per repository.

Update both the initial and continued-batch header paths, reveal accounting and measured notice heights so a header cannot reappear on paging or strand a notice. Preserve existing PR 98 ordering by filtering the existing projection, not rebuilding or sorting inventory. Do not remove fold keys or enrollment choices.

Reject dropping actionable notices along with empty headers: read failures are not proof of empty data. Retain quiet rate-refusal and last-good-row semantics.

### 3. Lowercase only at the Spaces rendering boundary

Render `crew` for the Crew plugin's role label in Spaces. Preserve contribution identity, tooltip, font, rails and detached/attached behavior. Do not modify shared provider labels or the terminal-pane renderer; an explicit regression must retain its `Crew` badge.

### 4. Current Crew round is not completed review count

Read-only evidence from this task's terminal t19r after plan report and approval shows `crew.round="1"`. Installed Crew 0.12.1 initializes `reviewRound: 1`, `taskReviewContext()` defaults to 1 and `publishTaskTerminal()` publishes that value unchanged. `recordReviewContext()` increments it only once per accepted CHANGES NEEDED review, excluding plan-stage reports. Git incorrectly adds another one when creating its caption. Use current round 1 (or missing) as `Build`, 2 as `Build 2`, and so on, without using plan events or findings as a heuristic. Preserve older missing-metadata behavior and update the regression's synthetic lifecycle sequence. No Crew code or real task records are changed.

### 5. Targeted regression and isolated native proof

After approval, extend existing loading, repository-count, section-reveal, error, worker-entry and Spaces layout regressions as relevant; retain the terminal-role regression. Add real-renderer geometry assertions at zoom 1 and 1.3. Cover Open/Closed, all-empty, mixed-empty, notice-only, folded, lone-pin, cold pending and warm retained states, plus connected-child ordering.

Adapt the existing checksum-verified disposable native loading fixture for before/after screenshots using baseline bbd4674 and the implementation head. Record panel-relative text x/y, text/row heights and deltas for the first repository header versus empty, informational and error messages at both zooms; label picture pairs and report actual pixels, not inferred padding. Include Spaces `crew` and unchanged terminal `Crew` proof. Place all captures, scratch and synthetic homes under `C:/Users/tprokopiev/.crew/tasks/git-empty-state`, never real homes. No browser is needed for native captures; if a browser is used for a report, load its documented tool help first. Stop every started disposable app, Core or server in finally and verify termination before handoff.

## Risks / Trade-offs

- Headerless notice batches could acquire synthetic continuation headers → cover `TaskReveal.leading` and `range()` behavior across reveal/cap boundaries.
- Suppression could hide folded failures → bypass folding only for zero-PR notices; retain ordinary fold behavior when rows exist.
- Cold uncertainty could become false empty feedback → reuse existing cold/warm admission and quiet-refusal state, not raw zero totals.
- Shared primitive edits could move unrelated panels → use Git-specific opt-in and assert preserved Loading/Files behavior.
- Text wrapping differs from one-line row geometry → compare first-line anchor and permit measured additional error height.
- Native pictures could accidentally use stale pooled output → rebuild from each source revision before disposable deployment and record source/executable hashes.

## Migration Plan

No data migration or live deployment is part of this task. After the recorded approval, deliver four outcomes (including current-round caption correction) with targeted tests in the existing draft PR, tick outcomes individually, push through origin and dispatch CI on the final branch head because draft PR suites are skipped. Report immediately without waiting for CI. Rollback is a source revert; local fold keys and shared tag data do not change.
