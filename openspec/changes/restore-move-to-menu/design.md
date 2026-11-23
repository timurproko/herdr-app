# Design

## Context

See `proposal.md` for motivation. Investigation on main `e3beda6` found:

- `src/integration/herdr/documents/tab-move-v1.cjs:18-21` emits the exact reported text when the App version, running Core version, or protocol generation is outside `PROFILE`. Missing methods have a different diagnostic. The worker validates this before fetching the document; the menu replaces destinations with Back plus the refusal when preflight returns `ok: false`.
- Read-only `herdr-app --version` reports **0.1.16**. A real `hello` reports local Core **0.1.22**, generation **1**, and all five required methods (`doc.get`, `doc.set`, `terminal.get`, `terminal.list`, `terminal.label`). Thus the current failing condition is specifically `!PROFILE.cores.includes('0.1.22')`, not an App-version or missing-command failure. A synthetic invocation accepts 0.1.21 and reproduces the exact message for 0.1.22.
- `machine.list` reports connected `pc2` at Core **0.1.19**. `machineRpc` also validates the local routing Core's profile before its remote hello probe, so updating only a remote profile or the App facade would not fix this.
- Read-only byte comparison found installed `custom-tabs/tab-move-v1.cjs`, `custom-tabs/move-tab.cjs`, `custom-menu/tab-moves.js` and `custom-menu/main.js` identical to this checkout. The installed adapter's last-write timestamp is November 17; it was not replaced by today's copy-toast deployment.
- Git history introduces the exact gate in import commit `12867b4` (November 21; original branch commit `b247124`). The adapter, worker and bridge are unchanged between that import and `e3beda6`. The only later menu changes concern Settings opening/update dots. Copy-toast commits `7ab56d6` and `e3beda6` do not touch these files. The regression begins when the local server starts running unreviewed 0.1.22, not with a source change today. The precise local Core upgrade/start time is not established by repository history.
- Existing `tests/tab-move.test.mjs` deliberately asserts that Core 0.1.22 fails. Its reviewed matrix covers only 0.1.19/0.1.21; a passing old suite cannot catch this compatibility lag.

Pinned upstream comparison:

- Core 0.1.21: `1b0393f80c35b1dae34f37934d33d0144a8fc8d7`.
- Core 0.1.22: `6e2984629fcd600b0165f69b2e5b0bda5985ec1c` (release commit dated November 22, 19:10:27 UTC).
- Compare: https://github.com/herdrdev/herdr-core/compare/1b0393f80c35b1dae34f37934d33d0144a8fc8d7...6e2984629fcd600b0165f69b2e5b0bda5985ec1c
- Initial inspection of `api/doc.rs` retains expected-version comparison, atomic persistence/rollback on save failure, size limit, version advancement and doc events. `events.rs` adds named-document filters while preserving unfiltered document delivery; `remote.rs` still forwards document events and moves opaque document forwarding to `remote/run.rs` without localizing document contents. `terminal.label` adds an `unavailable` error, and terminal reads use revised persistence flushing. These require recorded review and failure regressions, not blind allowlisting. Nothing inspected establishes a missing tab-move capability on 0.1.22; native multi-client continuity remains unproven.

## Goals / Non-Goals

**Goals:** extend only the reviewed Core boundary, keep safety checks, restore normal destination actions on supported facts, and make future refusals actionable/readable. Use the user's described left icon-column chevrons literally.

**Non-goals:** deployment, updating/downgrading Core, changing native code or commands, testing mutations on live spaces, repairing live labels, broad menu redesign, automatic future-version approval or solving whole-document concurrent-client limitations.

## Decisions

### 1. Review and add only exact Core 0.1.22

Finish the pinned source/schema review of hello identity, doc CAS/persistence/events, terminal identity/labels, routing and connection behavior; record it in the tab-move documentation. Add 0.1.22 to the private document adapter's exact Core list only with the existing regression suite extended for that reviewed contract. Keep Apps 0.1.15/0.1.16 and Cores 0.1.19/0.1.21; do not add ranges, alter the public facade or bypass local-routing validation.

Extend the matrix with local 0.1.22 and 0.1.22 routing to pc2-like 0.1.19, plus unknown local/remote versions, generation/method/identity refusal, conflict/expiry/unknown writes and label-save failure/repair. Replace the old explicit 0.1.22 rejection fixture with a genuinely unreviewed version. Add an integrated preflight-to-menu fixture so real contract rejection cannot be hidden by an always-successful mocked capability. Refusals include detected App/Core/generation versus reviewed facts, without Core IDs, document payloads or terminal labels.

If the remaining review reveals an incompatible safety contract, stop and report that precise incompatibility for a revised plan; do not silently enable it. Presence of methods alone is not review evidence. Removing the gate or forcing destinations enabled was rejected.

### 2. Use one leading SVG navigation convention for this menu

Current parent: left `layers.svg` at 14 px, plus right text `›` in the shortcut hint container (11 px, `t.dim`, right-aligned in a minimum 16 px column). Current Back and refusal/repair rows: leading `chevron-left.svg` / `chevron-right.svg`, 14 px `t.muted`, centered in `slot`'s fixed 16 px icon column, row padding 8 px and gap 8 px. Destination rows substitute numbered colored badges for that icon. Both chevron SVGs use a 24-unit viewBox and 2-unit rounded outline strokes.

Other app navigation uses the same 14 px muted SVG family: Settings page links use a trailing centered 28 px `chevronSlot`, and collapsible headers can use leading chevrons. Side placement is contextual, not a reason to use a font glyph.

For **the parent Move to row**, replace the leading Layers icon with the existing right-chevron SVG, **14 px, theme-muted, same centered 16 px left slot as Back**, and remove the trailing text `›` entirely. Keep row label alignment, Back's left-chevron, repair/refusal right-chevron and destination badges. This is the proposed reading to approve or correct, not a claim of inspecting an unavailable screenshot attachment. Update the ADR's former Spaces-icon instruction and its fixture assertion; leave other menu/Settings rows alone.

### 3. Explanations are wrapping content, not truncated actions

Render `custom.move-empty` as an inert, muted explanatory row/block: preserve its leading right-chevron for alignment, but replace the standard single-line `menuRow` label treatment with wrapping text and content-driven height. Account for that height in the menu viewport budget so removing `truncate()` does not merely cause vertical clipping. Retain the bounded 320 px list viewport with scroll access for longer explanations and ordinary 28 px destination/Back rows. Any shared helper extension must be opt-in with unchanged defaults for all other menus. Keep accessibility text, no tooltip/loading placeholder, and non-actionability on click/Enter.

Tests assert the complete message text, no truncation on the explanation node, multiline height budgeting, scroll reachability, exact icon asset/size/color/slot/side, absence of the trailing text glyph, destination badge preservation, and Back/Left/Escape behavior. Render-tree evidence is not GPUI pixel validation.

## Risks / Trade-offs

- [A reviewed API does not prove real session continuity] → synthetic moves only; retain the ADR's outstanding disposable native two-client/concurrency check and make no live-move claim.
- [0.1.22 persistence and routing changes affect failure classification] → explicitly review and cover unavailable labels, failed CAS persistence, remote forwarding and unknown results before enabling.
- [Removing single-line truncation still clips a fixed-height popup] → exercise viewport height and bounded scrolling, not just presence of full text in a tree.
- [Screenshot interpretation might instead mean a trailing SVG] → state the leading-chevron replacement explicitly in the proposal/report and await approval before coding.
- [Actual local upgrade time is unknown] → report the version-transition cause and source-history bounds, not an invented timestamp or blamed deployment.

## Migration Plan

No migration or deployment in this task. After approval, change only authored source/tests/docs and build into ignored `dist/` for fixture verification. Rollback, if later requested, is reverting that source change; never downgrade Core or edit installed mods as part of this task.
