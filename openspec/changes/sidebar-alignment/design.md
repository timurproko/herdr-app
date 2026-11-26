# Design

## Context

See proposal.md. Main is `cccc239` and already contains merged PR 92. Spaces uses 8px row padding, a 22px parent-fold wrapper, machine headers with 16px chevron slots, and 24px rename buttons. Agents already has a fixed 32px right-aligned number slot, 7px compensating margin and 6px metadata gap. Tab rename already uses 24px buttons, a 2px button gap and a 4px input-to-actions gap.

## Goals / Non-Goals

**Goals:** reuse existing tokens, plain metadata text, inset icon controls and native motion; consolidate placement rather than add a visual pattern.

**Non-Goals:** change native identity/shortcuts, selection, compact rail, captured whole-block reorder, connector geometry, Enter/Escape/blur rename semantics, Git data authority/read cadence, native binaries, or any other panel's animation.

## Decisions

### 1. Adopt Agents' number rail and machine chevron axis

Logical pixels measured from the sidebar right edge `W`; row highlights end at `W-8`. Multiply every coordinate by 1.3 at 130% zoom. Example absolute positions use W=300, not a required sidebar width.

| Shared rail / control | Logical x position | W=300 example | Occupants |
| --- | --- | --- | --- |
| Label L | right edge W-79; max width 48 | right 221 | Agents machine label; collapsed coordinator Crew |
| Number N | W-73 to W-41, width 32, text right | 227–259 | Agents time/group count; collapsed coordinator child count |
| Expanded Crew / machine plus | right edge W-41; plus target width 24 | right 259; plus 235–259 | Expanded Crew, and machine + in its own row |
| Chevron/status C | centre W-20; existing 16px slot W-28 to W-12 | centre 280 | Machine/coordinator/Agents group chevrons and ordinary Agents status dots |
| C hover / rename Cancel | 24px target W-32 to W-8 | 268–292 | Matching machine/coordinator hover bounds; X on every space row |
| Rename Confirm | 24px target W-58 to W-34 | 242–266 | Check, 2px before Cancel; input ends 4px before Check |

**Recommend the adaptive arrangement:** expanded coordinator `name … Crew chevron`, collapsed `name … Crew count chevron`. Expanded Crew ends on N's right edge, the same right edge as the machine + target; collapsed Crew moves to L and count occupies N, exactly like Agents machine/time metadata. Children have no fake count or chevron; rename still uses C. This requires moving the current + target's right edge from W-31 to W-41 (10px left), while retaining the chevron glyph axis and Agents number positions. Crew uses Agents' regular 12px `t.dim` metadata styling, no pill fill/padding/border, preserving its existing tooltip. Unrelated tags and worktree metadata retain their own semantics.

**Visible alternative, not recommended:** hold Crew permanently on L, including expanded state, and align + to L (right W-79). This avoids Crew shifting on collapse but moves + a further 38px left and leaves an empty count column when expanded. The recommended compact arrangement better follows the person's plus alignment request without a large machine-header shift; approval of this plan selects it.

Centralize these rail parameters/presentation in the existing shared UI layer. Do not globally change Agents' child-fold component/count order or blocked-status badge sizing. Machine/coordinator chevron hover targets must match, not just SVG centres. Cancel replaces disclosure while editing, using the exact tab rename gaps and existing icon-button component. Leave 8px of sidebar outside the 24px trailing target rather than inventing new edge padding.

### 2. Git line coverage is incomplete on current main

`startCISweep` in `src/plugins/git/mod/main.js` only starts an event-driven pass when a loaded PR has pending CI. It expires after 2.4 seconds regardless of request completion. `renderFleet` additionally suppresses it while verification is stale. Therefore it does **not** cover cold first reads, warm return verification, updates without pending CI, or long background reads. The removable header bulb exists only in coordinator rendering (`warm && aggregate.updating`); ordinary Git has no such header bulb.

Extend that same 1px accent line below the header into a single shown-panel work indicator: ordinary root/repository/list/targeted/page/manual/webhook/safety work, and coordinator cold inventory, warm reconciliation, verification and background updates. Reuse its native motion and existing controller lifecycle, restarting passes only while work is pending; no JavaScript frame loop, second track or overlapping CI-only sweep. Scope/enable changes retire old callbacks. Completion/failure stops the line; a dormant retry deadline or unresolved totals alone must not falsely keep an active request animation alive. Keep quiet cooldown/read policies unchanged.

Remove the coordinator header bulb and its tooltip entirely, with no Stale label or replacement header text. Warm rows, counts, folds and anchors remain mounted with no body Loading. Cold first visits keep top-left Loading below Open/Closed, coherent success publication and immediately visible actionable failures.

### 3. Cold Loading currently matches Files, but includes a pulsing dot

Both Files and Git call shared `panelMessage`: a 7px blue pulsing bulb, 6px gap, blue regular 12px Loading text, 8px row inset; Git adds its existing 2px vertical row inset. This is a second loading animation beside the moving line. Git Refresh also rotates during requests and its minimum feedback interval.

**Recommend for the one-animation requirement:** retain the exact cold message geometry/text/colour and its dot as a **static** 7px dot in Git only; make Git Refresh static-but-disabled while busy (including its minimum-feedback interval). Files and other consumers stay unchanged. Alternative for approval: omit the cold dot entirely, keeping Loading text; that differs visibly from Files. Shared `activity`/spinner and their tab/status/other-panel uses remain untouched. PR CI/task/status animations describe external states, not panel loading, and are outside this removal.

### 4. Validation and delivery boundary

After approval: targeted real-renderer geometry and handler fixtures cover 100%/130%, local/remote headers, 1/2/3 children, long names/truncation, collapsed count and simultaneous Crew/count, parent/child/ordinary rename and hover bounds. Update conflicting PR 88 no-count/pill/header-bulb expectations and relevant README/testing guidance through this change. Git fixtures cover cold/warm/background/ordinary work with and without pending CI, overlapping requests, finish/error/hide/scope replacement, quiet cooldown, static Refresh and no second loading animation.

Use a disposable synthetic-data native fixture, adapting the existing interface/rename fixtures, with output only under `C:/Users/tprokopiev/.crew/tasks/sidebar-alignment`. Verify the supplied 0.1.18 archive SHA-256 `e6e78e1bec1f47bd0d94dbc872a5670f4ac9c8f6740210b62365ab8b28f897c1` and executable-to-archive bytes before launch. Capture native 100%/130% screenshots, including two line-motion phases and completed/static states; stop all owned app/Core/server processes in finally. Install nothing and touch no live sessions.

Refresh main before finishing implementation. Dispatch `.github/workflows/tests.yml` on the exact final head and confirm Windows and Ubuntu results before the implementation report. No manual readiness, merge or auto-merge. This handoff is plan-only: no app launch, screenshots or implementation CI yet.

## Risks / Trade-offs

- [Crew shifts left on collapse] → disclose both layouts above; only the label shifts, never the count/chevron rails.
- [Shared component changes disturb Agents/Git alignment] → preserve Agents geometry and Git's existing independent 3px trailing inset; replace Git's Crew-pill-dependent oracle with explicit preserved geometry, not a Git layout redesign.
- [Old specifications describe Crew pills and header bulbs] → update all affected requirement/scenario wording in the same delta, preserving identity/authorization and diagnostic storage; cold static message can retain sanitized diagnostics, but removed header tooltip has no replacement.
- [Animation survives errors or context switches] → scoped lifecycle guards and completion tests, not a timeout pretending work completed.

## Migration Plan

No persisted-data migration or installation. Ship private customization source through the normal build; rollback restores the previous renderers. Leave fold identity/storage and external transport behavior unchanged.
