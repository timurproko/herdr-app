# Design

## Context

See proposal.md for motivation and specs/plugin-integrations/spec.md for behavior. At base 1478073, pulls.js already includes labels in PR_FIELDS, list GraphQL and batched targeted GraphQL, normalizes them through pullLabels and preserves them across narrow check reads. The report's missing-label query observation predates this base; do not duplicate or reduce the existing first:100 label reads.

AgentLinks currently admits only live agents with panes, tabs and working directories. It verifies the canonical repository, then matches footer/tab number or branch. main.js has separate ordinary and aggregate agentButton paths. The aggregate path uses verified Crew task identity, not arbitrary branch inference. The ordinary path preserves immediate focus and deferred pin-swap animation. Both currently use a 24px title reservation.

The reference label manifest was read from timurproko/MyWorkflows's default branch during planning: stable keys under-review, review-approved and review-changes-needed currently name robot-prefixed Review, Approved and Rework; previous names include Under review and Changes needed. The brief requires Build as the forward name and Approved as soon as review approves, independently of CI.

## Goals / Non-Goals

**Goals:**
- Separate stage facts, role-specific target identity, target availability and rendered action behavior.
- Support currently deployed label names immediately and optional future Crew terminal metadata without waiting for Crew changes.
- Preserve fleet identity checks, repository separation, existing reads/cadences, row height, metadata anchors and ordinary pin motion.

**Non-Goals:**
- No Crew status schema extension, new crew status fallback process, label mutation, delivery promotion/approval implementation or new CI state.
- No native/installed mod edits, persistent target IDs, transcript reads, input injection, new scheduler or deployment into the person's running app.
- No changes to the customization updater files owned by the separate PR.

## Decisions

### 1. Pure managed-stage mapping over existing label facts

Add a small stage contract/helper alongside the Git facts with stable semantic keys and explicit current/previous name arrays. Cover Build/Rework/Changes needed, Review/Under review and Approved, with the current robot-prefix forms and the plain display names allowed by the workflow. Use exact managed aliases, not fuzzy substring or label-colour recognition. Derive stage in pullRow for every read shape, preserve it through narrow state/check updates and recalculate on authoritative label replacement/removal.

The checked-in aliases are a compatibility snapshot, not a runtime synchronization mechanism for arbitrary future label renames. No UI-time remote manifest lookup is added: it would add network dependencies and read pressure for a three-value presentation. Keep the manifest source/keys documented so later published renames can update this small contract and its table tests. If inconsistent managed assignments briefly coexist, prefer Build, then Review, then Approved, conservatively avoiding an approval claim over an active work label; preserve all original label pills.

Keep GitHub reviewDecision and checks unchanged. crew.approved is optional metadata, never authority to synthesize Approved, never a CI-dependent stage and never a merge permission.

### 2. Role matching is distinct from the legacy robot matching

Read labels from the exact terminal record: crew.kind, crew.pr, crew.round, crew.finding and crew.approved. Validate full canonical GitHub PR identity rather than comparing only numbers. An explicit crew.pr takes precedence over inferred branch links and prevents a contradictory branch from matching another PR.

Extend related with a role-aware path while leaving its no-role legacy behavior for robot fallback and existing CI-fix callers. Build admits ship/fix kinds and uses crew.pr or a canonically verified repository plus head branch. Review admits only review kind and matching crew.pr; it must not read a reviewer's base branch, footer or tab title as review authority. Prefer exact matches, then selected terminal, then stable model order.

Use existing host terminals, panes, agents and machines snapshots for availability. Explicit review links need no matching head branch and do not require a fabricated working-directory link. Ended terminal records or bounded in-memory last-observed metadata can explain an ended target but cannot pass live focus checks. Absence without evidence says unavailable rather than asserting death. Check disconnected machine status before interpreting a missing remote agent as ended. Do not start repository/footer reads against disconnected machines.

In aggregate mode keep PR admission task-scoped and navigation within the current verified same-home task sources. Integrate role selection into the existing aggregate target/focus boundary as needed; do not bypass its freshness/scope checks by directly focusing a globally discovered reviewer. A same-PR reviewer must be a verified live task member of that coordinator's home. Historical-only or stale aggregate rows may show managed stages but gain no worker focus.

Alternative rejected: reuse the existing generic related match for every chip. That can focus the builder for Review and cannot link a reviewer on the base branch reliably.

### 3. One title-line stage control with a stable reservation

Replace agentButton's managed-label presentation with stageChip, retaining a small internal legacy robot path when no stage exists. Build uses the theme's amber/yellow token (ansi3), Review purple (ansi5), Approved green (ansi2); dimmed opacity and subtle inset hover follow existing app UI tokens, not hard-coded GitHub RGB text. The GitHub source definitions establish the hue roles (9a6700, 840479, 1a7f37); the live palette provides readable app colors. Existing label pills keep their exact names and their existing GitHub-derived colors.

Text cannot fit inside the old 24px icon reservation. Use one bounded, shared stage-width reservation across all PR variants, including robot-only and empty rows, sufficient for Approved and normal round captions with existing UI font/padding. Preserve its right edge at the existing 3px row-highlight inset, the 74px row and three line boxes. Right-align the unchanged 24px robot control inside that common reservation, preserving its alignment with the header chevron. Long round numbers remain bounded with a full caption tooltip rather than overlap. Update the robot-only 24px reservation specification explicitly; do not silently weaken layout tests or change lower-line allocation.

Live Build/Review clicks stop propagation and focus only the captured role target after fresh model/context validation. Preserve ordinary immediate navigation and pin-motion source/target capture. Approved has no focus handler and lets the row open its captured PR. Unavailable Build/Review chips consume their own click without focusing or opening the row, have no button role/pointer affordance, and expose ended/unavailable/disconnected explanations. Ghost controls remain entirely noninteractive.

For valid completed crew.round=n, Build displays n+1. Only a supplied finding adds back from review n: finding. Missing/invalid metadata retains plain Build; do not infer review count from PR labels, checks, approval SHA or task names. Sanitize and bound label text before using it in tooltips, never render findings as markup.

### 4. Verification stays grounded in existing fixtures

Extend tests/pr-agent-links.test.mjs with role metadata and machine status fixtures. Include same-PR worker/reviewer, base-branch reviewer, full URL repository isolation, ship/fix branch fallback, wrong/changed roles, exact-match priority, ended/disconnected/no-target states, reconnect, optional metadata, captured stale clicks and no-label robot behavior. Check that Approved always opens the PR and never focuses an agent under pending, success and failed checks, and no forbidden CI chip exists.

Cover label parsing in array/connection reads with current/previous names, unknown/null labels, authoritative removal and query reuse. Exercise ordinary, pinned, scrolling, coordinator, Closed and ghost rows, preserving coordinator scope rejection and ordinary motion. Extend geometry/budget guards narrowly for the new text reservation/control rather than disabling main-relative tests; retain the mounted row/item caps, no new probes and existing lower-line layout.

Update README and docs/TESTING.md to explain the three stages, round convention, legacy compatibility, unavailable reasons, robot fallback and the independence of approval and checks. Describe render-tree assertions as fixtures, not native pixel proof.

## Risks / Trade-offs

- [Crew has not published all labels yet] → Show label-derived stage with no invented round, finding or target; old unlabeled rows keep the robot.
- [A text control reduces title width] → Reserve one stable width across rows and retain native truncation/full-title tooltip; test narrow panels and supported zooms.
- [Role or machine changes after render] → Revalidate exact captured identity, role, PR, model and coordinator scope at action time; never silently substitute another target.
- [Historical target identity lingers] → Keep any last-observed metadata bounded and runtime-only; it can explain disabled chips, never authorize focus.
- [Broader local suites include host/private assumptions] → At implementation handoff run the project's full npm test once in an isolated disposable environment, with commands/results explicitly recorded; do not point it at the person's working installation, hide environment failures or weaken tests. Use the documented isolated hosted runner for additional safe integration evidence if needed, not as an unreported replacement.

## Migration Plan

No data migration or live label rename is performed. Existing PR label reads immediately recognize current aliases; the later Rework-to-Build rename is covered without a new app change. New Crew metadata enriches the same control when available. Rollback is the prior customization build through the existing guarded deployment path, without modifying terminals or labels. Implementation validation will use synthetic fixtures first; any disposable native instance must use outside-checkout evidence/scratch and be stopped before handoff. No app instance is started for this planning phase.
