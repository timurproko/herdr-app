# Design

## Context and approved revision

The installed App is 0.1.16; read-only local `hello` reports Core 0.1.22,
generation 1 and all required methods. The original adapter allowed only reviewed
Cores 0.1.19/0.1.21, producing the reported refusal before reading a document.
The same local gate blocks routing to pc2's reviewed Core 0.1.19. Installed
adapter/worker/bridge/menu bytes matched main e3beda6 at investigation. Git
introduced the unchanged gate with import 12867b4; neither copy-toast commit
7ab56d6/e3beda6 touched the adapter, worker or bridge. Failure starts when the
unreviewed Core runs; exact local upgrade/start time is not established.

The original approved implementation reviewed and added 0.1.22. The person then
explicitly changed the policy: future unreviewed versions must not disable the
feature when its real requirements still hold. This revision supersedes exact
reviewed-version eligibility, not the safety of individual moves. See proposal.md.

## Goals / Non-goals

Use capability/minimum-version/generation/shape checks for both local and remote
moves. Retain known reviewed versions solely as source-review/audit evidence.
Preserve captured targets, CAS, identity/session binding, preservation, expiry,
acknowledgement and partial metadata success. Chevron and message scope stays as
previously approved. Do not deploy, change native code, update/downgrade Core,
test writes on live sessions, or change any unrelated version gate.

## Decisions

### 1. Capability eligibility, not reviewed-version permission

Minimum known working releases: **App 0.1.15 / Core 0.1.19**. Accept newer stable
versions, including unreviewed versions, when their runtime contract checks pass.
Parse numeric release components rather than comparing version strings; malformed
or missing versions cannot establish the minimum and must explain that fact.
Do not treat a prerelease of the minimum as the stable minimum.

Core `hello` must retain generation **1**, identity and methods `doc.get`,
`doc.set`, `terminal.get`, `terminal.list`, `terminal.label`. Remote routing also
requires `machine.list`/`machine.exec` and its own validated local Core handshake,
then a separately verified target hello and pinned machine/session. Use the same
minimum/capability policy at both levels. The opaque App document has no explicit
on-wire generation: it must pass the existing v1 structural validator; unknown
structural fields still refuse rather than pretending methods imply shape safety.

At the App bridge, inspect the public command catalog for the commands the
source-Start preparation/selection restoration actually uses: `tab.new`,
`tab.move`, `tab.settle`, `tab.select`, `pane.focus`. Missing commands explain
which capability is unavailable, both at preflight and before executing a handed
off mutation. Do not mistake within-space `tab.move` for a native cross-space API.

Do not remove the worker's comparison between the captured running App version and
its current executable version: it prevents an update during an open menu from
using stale authorization. It is not a reviewed-version pin. Do not change the
separate release-source auditing tool's reviewed status/exit policy or the general
host/deploy gate in this task; inventory these honestly in the report.

The pinned Core 0.1.21-to-0.1.22 review is complete and remains useful evidence:
`docs/TAB-MOVE-CORE-0.1.22-REVIEW.md` records source hashes, CAS persistence,
backward-compatible document event filters, opaque remote forwarding, Windows
plain-connection EOF behavior and `terminal.label` unavailable errors after an
in-memory update. Future permission does not depend on extending that list.

Regressions cover unknown newer App/Core versions with complete capabilities,
missing methods/commands, unknown generation, below-minimum/malformed versions,
local routing and remote targets, preservation/conflicts/unknown writes, and label
failure before/after in-memory application. Connect real worker preflight through
the domain bridge to the menu, not an always-ready stub.

### 2. Leading SVG navigation chevrons

The parent used left `layers.svg` at 14px and right text `›` at 11px `t.dim` in a
right-aligned shortcut column. Back/refusal use 14px `t.muted` outline SVGs centered
in a 16px left icon slot, with 8px row padding/gap. Settings page links instead use
the same SVG family in a trailing 28px chevronSlot; collapsibles support a leading
chevron. The glyph family is shared, side placement is contextual.

Replace only the parent's Layers icon with the existing right-chevron SVG,
**14px theme-muted in Back's centered 16px left slot**, removing its trailing text
arrow. Keep Back's left-chevron, repair/refusal chevrons, destination badges and
other Settings/menu rows. Update the obsolete Spaces-icon ADR/test instruction.
The person approved this interpretation; no screenshot attachment was inspected.

### 3. Wrapping inert explanations

Render `custom.move-empty` as a muted note with its leading right-chevron,
normal wrapping and intrinsic, non-shrinking height, not a single-line truncated
button. Budget its measured logical height in the at-most-320px scroll viewport;
reserve the full bound before its first measurement. Ignore late measurements
from replaced/closed text. Keep ordinary 28px rows, keyboard Back/Left/Escape,
no loading text/tooltips, and no action on note click/Enter. Tests simulate native
layout callbacks; they do not prove pixels or actual scrolling.

## Specific risks and trade-offs

- **Silent CAS change:** if `doc.set({name:'herdr-app',version,value})` stops
  checking the expected version but keeps generation 1 and its method name, it
  could replace a concurrent client's newer whole-document layout with a stale
  snapshot, losing tabs. A readback cannot restore the overwritten state. If it
  acknowledges before atomic durable persistence, a crash could lose an accepted
  move. Capability discovery cannot prove these semantic guarantees. The user
  accepts capability-based eligibility; retain the real expected-version call,
  shape/preservation checks and honest uncertainty, not the exact-version pin.
- **Labels have no CAS:** unavailable can follow applied in-memory labels. Keep
  partial-success/explicit-repair handling, never roll back a committed layout.
- **Unflushed clients:** Core CAS does not protect other Apps' unflushed memory;
  existing ADR limits and outstanding disposable continuity checks remain.
- **Geometry:** removing truncate alone still clips a fixed-height list. Use
  intrinsic rows, logical native measurement and bounded scrolling; pixel checks
  remain separate, not silently claimed by fixture passes.
- **Other exact gates:** inventory their locations/behavior without changing
  public-host deploy eligibility, native-patch stock protection or audit policy.

## Migration

No persistent state migration or deployment. Source/tests/docs only, with ignored
customization output built for fixtures. No native update, restart, label repair
or live document mutation is authorized by this change.
