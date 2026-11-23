# Design

## Context

See proposal.md for motivation and specs/plugin-integrations/spec.md for the behavior contract. This is a follow-up to merged PR #18, plus the person's later request to remove section-header counts.

Observed code:

- `src/plugins/git/mod/main.js:repositorySection` appends `liveCIInfo(..., 'repository', repo)` inside each expanded body. `renderAggregate` already computes notices in `aggregate.repositories()` order and puts the global setup card after `task-pulls-scroll`.
- Ordinary `render` puts its one `liveCIInfo` below `renderPulls`; this path is not the target.
- `GitNotices.sync` yields reads through its existing request lifecycle and returns `repository` only for confirmed false membership. Pending/unknown results are quiet; its scope/serial encode relay, account, membership revision and explicit refresh invalidation.
- `ClaudeAccount.render` currently combines presentation with controller callbacks. Its existing `pillTrigger(..., {chevronSize:12})`, `pillMenu`, `dropdown(..., {above:true})`, `menuSurface` and `menuRow` are the visual source of truth.
- `sidebarSectionHeader` is shared with Spaces. Git supplies a flexible truncated name plus a fixed count strip. Removing only Git's strip frees name width without changing the shared header shell.
- `tests/fleet-git.test.mjs` explicitly requires header counts and enrollment notices to disappear when folded. Those assertions and the existing folding spec must change together.

## Goals / Non-Goals

**Goals:** Keep domain state in the existing controllers, make account/enrollment presentation literally shared, and move enrollment UI without moving or adding service work. Keep every action bound to an immutable opening snapshot.

**Non-Goals:** No enrollment action, GitHub inventory lookup, auth change, auto-fix change, Crew reader/discovery change, PR label-pill change, native popup replacement, deployment or merge. Leave account worker/list/switch behavior and ordinary Git card behavior unchanged.

## Decisions

### 1. Extract pure choice-menu presentation, not an account controller

Add a focused shared UI module under `src/ui/` and package it into workspace-status and Git via their existing manifests. Both callers must use it for the trigger and menu body/wrapper, not just reproduce constants. The helper composes the existing `pillTrigger` with `chevronSize:12`, `menuSurface`, `menuRow`, `pillMenu` and upward `dropdown`.

Preserve the account surface exactly: 180px minimum / 360px maximum width, 280px maximum height, scrolling, original menu padding and shadow, `U.row` height, 8px row horizontal inset, shared hover and keyboard-highlight treatment, and a fixed `U.smallIcon` trailing selected slot. Domain callers provide content/labels, selected artwork, highlighted index, focus and callbacks. Preserve account empty/error rendering and its status-bar-only outer margin. Account authentication, worker reads, caching and switching remain in `ClaudeAccount`.

Let left mouse-down reach native Popover; do not add a trigger click handler that toggles a second open-state owner. Preserve the account opener's right-button propagation guard. Alternative rejected: a new custom popup or merely copying its CSS/constants, because neither guarantees actual component parity.

### 2. Derive one footer from existing notice decisions

Reuse the `renderAggregate` pass that already calls `GitNotices.sync` for the section list. Build an order-preserving unique canonical-name list from entries whose decision is exactly `repository`. Do not rescan GitHub, synthesize missing membership, use socket state as readiness, or start IO in the picker opener.

Remove only enrollment UI from repository bodies. Preserve scoped PR errors and repository-specific diagnostics in those bodies, and keep existing stale-verification and global setup behavior. Append a single `.flex_none()` footer after `task-pulls-scroll` when global setup is not missing and the choices list is nonempty. Preserve the card's existing info glyph, copy `Add this repo in Settings`, raised surface, border and padding. Its text-side shared pill trigger adds the same muted trailing chevron and gap as the account control, not another chevron asset/style. Always offer the dropdown for a single choice.

Do not change `liveCIInfo`'s ordinary call sites or navigation contract. Alternative rejected: showing the first eligible repository directly or hiding the control with a folded body; these violate the requested stable footer and explicit choice behavior.

### 3. Snapshot scope and eligibility; close obsolete menus

Keep enrollment popup state local to the Git view (or a narrow owned picker controller), including a focus handle, index and opening token. At opening capture the ordered choices, selected terminal/tab and space, machine, aggregate coordinator/owner/home presentation scope, Open/Closed view and current notice configuration/refresh generation. Opening uses the already computed presentation only: no `notices.sync`, worker call, membership read or GitHub read.

Before navigation, compare the capture against current shown/enabled panel state, current selected location and aggregate presentation identity, view, notice generation and confirmed membership. Require the captured repository still to be rendered and eligible. Use pure cached checks, not a service request. A refresh or configuration/membership update can invalidate and close the whole menu. A later opening may pick up new choices; never splice an open list or change a row's captured value under the pointer. Hide/disable/close and context replacement retire the opening token, including previously retained callbacks.

Hover updates only the local index using shared `menuRow` states; Up/Down wrap through captured choices and Enter chooses. Escape/backdrop dismiss. Selection closes first, then opens exactly `{section:'plugins', plugin:'git', pluginSection:'repository', pluginSearch:capturedRepo}` only if the token/scope/eligibility still match. No enrollment, account change, preference mutation or auto-fix scope change results. Alternative rejected: index lookup against the current repository list, which can retarget during refresh or coordinator changes.

### 4. Count-free headers retain the shared shell

Remove Git's per-section Open/Closed computation and fixed count strip from `repositorySection`, not the shared `sidebarSectionHeader` component or global counts. Keep the repository label flexible with `flex_1`, `min_w(0)` and truncation, and reserve only existing header insets/chevron space. Use layout/text overflow evidence for a conditional full-name tooltip; a fitting name must not receive one. Keep measurement state local and scope-keyed, with changed-only notifications from layout callbacks rather than render-time notifications.

Expanded and collapsed headers both contain only owner/name and the shared fold chevron. Folding remains UI-only and persistent. Existing global tab totals continue to count folded sections and update through the normal lifecycle. Alternative rejected: abbreviating owner/name or reserving the removed count width, which would preserve needless truncation.

### 5. Test actual presentation and protect neighboring work

Exercise the real shared helper through both account and enrollment callers with instrumented element/Popover fixtures. Compare actual chevron asset, size, inherited muted colour, gap, anchor, pill offset, menu surface/bounds, row geometry, hover/highlight and selected-slot output. Do not satisfy parity with source-string tests or duplicated fake implementations.

Extend fleet/notices/account tests for zero/one/multiple choices, order/deduplication, membership completion, setup precedence, all-folded and long-content footer structure, keyboard/pointer/dismissal, exact Settings payload, refresh/tab/home/coordinator replacement and stale callbacks. Record read counters around open/navigation to establish no extra membership/GitHub reads and no enrollment calls. Preserve render-time write/read/notify guards and existing relay, shared PR row, labels, separators and ordinary-card regressions. Add packaging closure coverage for the shared helper.

Update README and architecture guidance during implementation; the delta replaces #18's count-in-header/fold-hidden-prompt requirements. Keep edits out of the label renderer and Crew status reader, which belong to concurrent tasks.

## Risks / Trade-offs

- [Extraction accidentally changes account interactions] → Preserve controller behavior and render actual shared output in account regressions, including no stopped left press and unchanged selected-slot width.
- [Async notice changes or stale callbacks retarget Settings] → Immutable opening choices plus generation, eligibility and captured presentation checks; close obsolete menus instead of mutating entries.
- [Layout tests do not prove native pixel rendering] → Assert real component trees, footer flex/scroll separation and conditional overflow behavior; disclose that no deployment or live UI exercise is authorized.
- [Concurrent PRs touch nearby fleet/row code] → Restrict edits to enrollment/header presentation, shared helper packaging and relevant tests/docs; do not modify label pills or Crew discovery.

## Migration Plan

No state/schema migration or deployment is performed in this task. Existing local fold keys remain valid. After plan approval, deliver the three outcomes in order with focused checks and per-outcome commits/ticks, then run the required `CI=true npm run test:ci` once on the implemented head. Keep the PR draft and never merge it. Maintainer-controlled installation can later publish the source changes through existing packaging; rollback is the ordinary source/package revert with no enrollment cleanup needed.
