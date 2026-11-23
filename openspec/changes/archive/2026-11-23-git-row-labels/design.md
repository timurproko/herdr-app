# Design

## Context

See proposal.md for motivation and specs/plugin-integrations/spec.md for the behavior contract. The supplied screenshot shows three logical lines per PR: title, number/author/time, and Owner/tasks/checks. Current source constructs a wrapping metadata flex containing the combined `pr.meta` byline and remaining items; wrapping currently determines the visual lines.

`mod/pulls.js` builds the paginated GraphQL query and normalizes check rollups. Its `PR_FIELDS` constant serves both the older active-PR lookups in `mod/main.js` and targeted coordinator lookups in `mod/aggregate.js`. Neither selection includes labels. `pullRow` in main.js renders ordinary, pinned, ghost and aggregate rows, so separate view implementations are unnecessary.

The current relay accepts all `pull_request` actions and sends repository invalidations without forwarding action or label bodies. The client accepts that event type without filtering actions. Existing repository refreshes reload loaded pages and older active PRs; aggregate invalidation refreshes linked PRs. These are already the correct places for label refreshes.

## Goals / Non-Goals

**Goals:** Extend shared PR facts and the existing shared renderer; deliberately constrain label geometry; retain existing stale-context, burst-coalescing and pin-motion guarantees.

**Non-Goals:** No coordinator grouping/eligibility changes, new timers/requests, relay protocol redesign, review-label management, plugin settings, native changes, deployment or live-session actions. Preserve existing PR menus, robots, check states and review-decision indicators.

## Decisions

### 1. Include labels in the existing PR selections

Add label name/colour selection to the existing paginated GraphQL PR nodes and `labels` to `PR_FIELDS`. Normalize GraphQL's label connection and gh's flat labels array into the same ordered array of name/colour facts. Preserve names verbatim, including emoji; accept validated six-digit hex colours and use a safe muted fallback for malformed colour data rather than interpolating arbitrary style values. Absent/null labels normalize to an empty array.

This avoids per-row label requests, whose cost would grow with pagination and coordinator task count. Existing refresh paths replace the entire facts snapshot, so adding/removing labels is not a special incremental state update. Prove labeled/unlabeled refreshes with fixtures; change no relay transport or event schema unless a real action filter is found after rebasing PR #17.

### 2. Keep one renderer and stable-height metadata

Remove the Owner pill in main.js's shared row, not in individual view containers. Render a distinct number/author/time byline followed by a constrained metadata line whose present groups are tasks, checks, then labels. Keep existing review-decision information after those groups when present. Expose structured byline facts rather than splitting text on a dot that might occur in user data; retain any text-form facts still needed by existing consumers/tests.

Use compact pills with the label's solid GitHub colour and a calculated light/dark contrasting foreground. Render every assigned label into a bounded single-line label strip with `min_w(0)`/overflow constraints and per-pill full-name tooltips; also provide a strip tooltip listing all assigned names so completely clipped pills remain discoverable. Long pill text truncates. The status row and strip use consistent height with and without labels. Preceding task/check text must also be shrinkable/truncatable at extreme widths, so fixed metadata cannot force horizontal overflow. Emit separators only between present groups, including label-only rows.

Wrapping individual pills was considered but rejected: it would change row heights on label events, causing avoidable visual jumps and disturbing existing measured pin motion. A placeholder for absent labels would waste width and is explicitly excluded. Separate view-specific row changes risk divergence and conflict with PR #18.

### 3. Share one metadata-dot element

Replace the tiny text dot with one fixed-size, non-shrinking muted dot centred in a consistent inline slot, with equal surrounding gaps. A roughly 3px round dot and restrained muted colour are the starting treatment; final values must be checked in render/layout fixtures. Use the same helper for the byline and all status/review/label group boundaries. Do not globally restyle unrelated prose such as setup notices.

A shape rather than a font glyph avoids baseline-dependent vertical positioning. Standalone separators must remain attached to their following group when text is constrained, not orphaned by wrapping.

### 4. Regression and documentation coverage follows each outcome

Extend the existing pull facts/pagination and fleet fixtures to cover both label payload shapes, exact emoji names, multiple/empty labels, colour fallback, paginated and targeted reads, refresh replacement and stale replies. Extend relay/client/controller fixtures to exercise labeled and unlabeled invalidations without extra per-row requests.

Exercise the actual shared renderer for ordinary/coordinator Open/Closed states, pin/ghost rows, task/check omissions, Owner removal, label order/colours/tooltips and identical separator geometry. Cover narrow bounds with constrained layout assertions rather than claiming VM render trees prove native pixels. Update README, docs/GIT-WEBHOOKS.md and docs/TESTING.md in the corresponding outcomes. Before reporting implementation, run `CI=true npm run test:ci`; do not deploy.

## Risks / Trade-offs

- [Native layout differs from fixture markup] → Use supported size/overflow/tooltip primitives, cover layout constraints in fixtures and report native-pixel validation as unperformed without deployment.
- [Many labels are clipped] → Per-pill tooltips plus a complete strip tooltip retain names without row-height changes.
- [Label colour has poor contrast] → Choose foreground from validated RGB luminance, preserving the supplied background colour.
- [Concurrent PR #18 changes aggregate UI or PR #17 changes relay transport] → Keep edits in shared row/data paths and targeted fixtures; incorporate latest main before final handoff and preserve those changes.
- [Metadata height changes from today's incidental wrapping] → Establish explicit logical lines once, then keep the metadata height stable across label refreshes; preserve existing row measurement callbacks and pin motion.

## Migration Plan

No settings, storage, relay or server migration is required. After approval, implement one outcome at a time in this branch and draft PR, with focused checks and docs alongside each outcome. Reconcile with latest main before implementation handoff. Deployment is excluded; any future authorized install uses the repository's normal guarded customization build/deploy path. Reverting the source change restores the previous presentation without data migration.
