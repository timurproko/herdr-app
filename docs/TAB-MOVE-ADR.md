# ADR: cross-space tab moves without a Herdr rebuild

Status: implemented, guarded same-machine backend (local and connected remote). Document mutation was explicitly
authorized by the user for this feature. Investigation and development did not
write live layout documents. The implementation is exercised with synthetic Core
fixtures; live concurrent-client/session continuity still needs isolated validation.
This is a narrow exception, not permission for other features to edit Core documents
or for Custom to rebuild/patch native Herdr.

## Decision

Implement an explicit **Move to...** action behind one replaceable tab-move
service. Prefer a reviewed native command if Herdr eventually supplies one;
until then use a tightly restricted, version-gated Core-document adapter.
The UI must not know document shapes or call document RPCs.

Scope: tabs between existing spaces on the **same machine**, including remote
`remote-workstation`. No cross-machine migration. The remote extension has separate routing,
qualification, session/identity checks and synthetic isolation tests. A fixed
read-only Node/hc probe verifies the actual remote hello; the worker stays local
and forwards document calls through `on` and terminal calls through qualified
addresses. No remote App or companion deployment is required.

User interaction: do not open the moved tab or switch to its destination. Keep the
source space open with a normal Start page when moving its final tab. This is a
move-specific policy, not a change to the ordinary close-on-last-tab preference.
No hover tooltips or loading text in the menu. Start compatibility preflight when
the parent context menu opens, with hover/entry as fallbacks; destination names
come immediately from the existing native snapshot. Use the Spaces icon for Move,
a divider below Back, distinct submenu row IDs, and mutually exclusive keyboard
selection/pointer hover (no first-row selection on mouse-open).

This reduces update maintenance to a small compatibility boundary. It does not
make an app-private document format a stable public contract.

## Evidence checked

Installed versions inspected: Herdr App **0.1.15**, local Core **0.1.21**, remote
A reviewed remote Core **0.1.19**, protocol generation **1**. The remote schema confirms the same
version-checked document API; a live, read-only scoped worker probe returns ready. The local native source checkout is 0.1.14; the relevant
**v0.1.15 release sources were inspected separately**, rather than assuming they
matched the checkout.

Read-only checks:

- Installed `herdr-app commands`: `tab.move` only accepts `id` and `index`.
- Installed `hc schema` and live `hello`: `doc.get` / `doc.set` are present.
- `doc.set {name, version, value, on?}` persists atomically, checks the expected
  version, emits a doc event, and reports `conflict` on a stale version. The schema
  documents a 1 MiB serialized-value limit. This is a public opaque-document API;
  interpreting the `herdr-app` value is the private dependency.
- Live `doc.get {name: "herdr-app"}`: root `spaces`, spaces with
  `id/name/folder/tabs`, tabs with `id/name/root`. No live snapshot was saved.
- An in-memory-only relocation on a clone preserved the entire tab and total tab
  count, and left the fetched original untouched. This is NOT an end-to-end move test.
- Release `src/mirror.rs`: replacement restores per-tab view state by stable tab
  ID; v0.1.15 also retains unknown fields on spaces and tabs through `rest` maps.
- Release `src/window.rs`: external document updates replace the machine's model;
  terminal views/mod instances are keyed by pane IDs. Stable IDs avoid deliberately
  recreating those views. Actual UI/session continuity still needs isolated tests.
- Release `write_where`: refreshes the human-readable `where` label, but does not
  relocate `herdr.space` / `herdr.tab`. The worker must address membership labels.
- Custom's Start tab is bound to a space through `props.spaceId`; it is an internal
  placeholder, not a movable work tab.

Sources:

- https://raw.githubusercontent.com/herdrdev/herdr-app/v0.1.15/src/mirror.rs
- https://raw.githubusercontent.com/herdrdev/herdr-app/v0.1.15/src/mirror_sync.rs
- https://raw.githubusercontent.com/herdrdev/herdr-app/v0.1.15/src/window.rs
- Installed `herdr.d.ts`, `hc schema`, and command catalog.

## App 0.1.16 document-contract review

The Move submenu was hidden by its exact-version gate after the desktop updated
from 0.1.15 to 0.1.16. This is a separate private-contract review, not an inference
from the public facade's compatibility profile.

Compared the upstream `v0.1.15` and `v0.1.16` release sources read-only:

- `src/mirror.rs` and `src/mirror_sync.rs` are byte-identical: document capture,
  replacement, stable-ID view restoration, qualification and versioned CAS are unchanged.
- `src/window.rs`'s `write_where`, document flush/drain and `documents_updated`
  reconciliation are unchanged. New mod-VM recovery does not change the layout or
  terminals; ephemeral move requests remain non-replayed.
- `src/model.rs` adds within-space reorder/shift, unselected creation and zoom
  helpers; no shared document shape or cross-space move command is added.
- `src/layout.rs` adds inert `font_weight`, `terminal_line_height`,
  `terminal_cell_width` and `terminal_scroll_speed` node look fields. The adapter
  now preserves these fields. Root-only `window_blur` remains unsupported inside
  tab documents, as do unknown structural fields.

Explicitly allow Apps **0.1.15 and 0.1.16**, with the existing exact Core
**0.1.19/0.1.21**, generation, identity, method and shape checks retained. Unknown
versions still fail closed. Synthetic tests cover every reviewed App/Core pair,
read-only preflight, typography preservation, local/remote moves and unknown
versions. The live worker may be inspected read-only; never test a move on live
sessions. Disposable two-client continuity/concurrency validation remains outstanding.

Validation: `npm test` passed (including 116 adapter assertions and deferred menu
fixtures), `check:host-api` passed, focused adapter-only deployment preserved all
713 unselected outputs, `doctor` passed, and `check:native` passed all 17 mods.
Read-only installed-worker `inspect` returned `ready`, with no metadata repair
needed, for both this computer and the remote workstation. No live tab move was performed. A live
window screenshot was inspected, but the destination submenu still needs a manual
interaction check; fixture coverage is not a claim of live move continuity.

Release source base: `https://raw.githubusercontent.com/herdrdev/herdr-app/v0.1.16/`.
See also [the public compatibility review](HERDR-0.1.16-REVIEW.md).

## Boundaries and proposed files

Paths below are relative to `customizations/`. `shared/tab-moves.js` uses the existing
Tabs command receiver in `features/tabs/rename-keys.js`; no second nextCommand
consumer competes with keyboard handling.

| Layer | Responsibility |
|---|---|
| `src/features/menu/main.js` | Destination list, existing sidebar badges/names, disabled/error states |
| `src/shared/tab-moves.js` | Mounted-view controller, request lifetime, selection acknowledgement |
| `src/services/tabs/move-tab.cjs` | One explicit operation: validate, plan, commit, verify, repair metadata |
| `src/integration/herdr/documents/` | Reviewed version profiles, document schema/identity rules, pure move planner, restricted RPC transport |
| `tests/tab-move.test.mjs`, `tests/tab-move-ui.test.mjs` | Synthetic document, conflict, failure, compatibility and UI fixtures |

Expose a domain operation such as:

```js
moveTab({ requestId, machine: null, sourceSpaceId, destinationSpaceId, tabId })
```

Never expose `setDocument(name, value)` to UI/features. The transport may write
only the `herdr-app` document and only a value produced by the validated move plan.
No raw document is stored in mod shared state or portable preferences.

Package canonical helpers/workers through `customization.json`; installed mods and
`dist/` remain generated. Use the existing host facade for all mod-facing APIs.
Prefer running a packaged worker locally through `exec`; do not require a new
remote companion, daemon, native-file patch, or native build.

The popup must hand off to a mounted owner before closing. Pending requests travel
as JSON on the ephemeral native mod-command string channel (ordinary command args
are not delivered by nextCommand). They carry short expiries and one-shot ownership;
they are never persisted or replayed after restart.
Coordinate duplicate local requests, but use Core CAS as the authoritative guard
against other processes/screens. A Custom-only lock cannot lock native Herdr.

## Operation contract

### 1. Prepare and validate

- Require the user's feature authorization and a fresh explicit per-click request,
  plus a reviewed running App/Core profile,
  protocol/method support, matching target Core identity/session and a ready layout.
- Do not confuse `hc --version` with the running server version: inspect `hello`.
- Resolve the clicked IDs, not whatever happens to be focused when execution starts.
- Reject the same space, missing/duplicate IDs, a moved/stale source tab, unsafe
  numeric document versions, unknown structural shapes and unsupported bindings.
- Reject internal Start tabs. Other mod panes retain their exact props; do not
  rewrite arbitrary strings named `space` or `spaceId`. A known space-bound custom
  mod needs an explicit policy before its tab is enabled for moving.
- Prepare/acknowledge the source Start tab through existing public commands before
  moving, regardless of the ordinary close preference. The worker must not create
  placeholders directly in a document. A source-bound busy lease prevents normal
  lifecycle cleanup from removing that placeholder during the move.
- The UI always requests `keepSource: true`, so moving its last tab cannot close
  the source or force a switch. Do not call `space.close` or `tab.close` on work:
  those commands can kill terminals. After the lease clears, normal lifecycle
  cleanup resumes; an already-empty Start-only space stays. No `view.json` edits.

### 2. Plan losslessly

Read the current document and plan a change on a deep clone:

- Remove the complete existing tab object from the source and append it to the
  destination (before a trailing internal Start tab). Preserve tab/pane/container IDs, terminal addresses, names, layout
  weights, props and permitted extension fields.
- Keep unrelated spaces, tabs and fields structurally identical. Do not recreate
  the document from `spaces()` / `panes()`; those are incomplete UI projections.
- Validate that the tab appears exactly once, no terminal references/IDs were
  added or lost, and only allowed membership/empty-source changes occurred.
- Retaining unknown data is not proof it is safe to move. Unknown structural fields
  may hide terminal references (for example newer floating panes); refuse them
  until reviewed. Known inert extensions can be preserved without interpretation.
- Enforce the serialized-size limit and retain the read version for CAS.

### 3. Commit and acknowledge

Submit one `doc.set` with the exact read version. Never submit an unconditional
write. A conflict allows only a small bounded re-read/re-plan, with unchanged
clicked-tab/source preconditions; never resend the stale whole-document snapshot.
Abort if the tab has since moved or changed in a way the request did not authorize.

On timeout/disconnect, the result may be **unknown**, not failed: read back and
classify current membership before allowing a retry. The document API has no
operation idempotency token; a request ID alone does not provide exactly-once writes.
Do not automatically repeat an old request or undo a move performed by someone else.

Verify the accepted topology in Core and wait for the app's `spaces()` snapshot to
show the tab in the destination. Report failure/unknown if this cannot be confirmed;
never optimistically claim completion solely because the worker started.

### 4. Reconcile metadata and selection

After a confirmed commit, update only the moved tab's terminal membership labels
using `terminal.label`, preserving unrelated labels. Keep `herdr.tab` stable and
set `herdr.space` to the destination's machine-local ID. Let Herdr update `where`.
For repair, derive desired membership from the CURRENT document, not a saved request.
Recheck terminal identity/current placement before each write and verify afterward.
Parent/child terminal inheritance and new sub-agents require explicit test coverage;
do not blindly relabel unrelated descendants or rewrite agent startup environment.

Document writes and label writes are **not one transaction**, and terminal labels
have no CAS. Checks reduce but cannot eliminate a race with other clients. A label
failure must report **moved, metadata repair needed**, not “move failed.” Never roll
back the whole layout automatically to compensate for a label problem. If safe
bounded repair cannot be confirmed, leave a diagnostic and offer explicit repair.

Keep any bounded operation diagnostics machine-local and excluded from export.
Diagnostics do not become an automatic persistent move/repair queue. A restart must
not replay mutation jobs or restore old full-document snapshots over newer edits.

After UI acknowledgement, do not select the moved tab or its destination. Keep
the source space open and leave user navigation alone. Other clients keep their
own focus. No edits to native view files. Terminal processes, cwd and startup environment do
not change; this feature changes layout membership, not execution context.

## Compatibility and update procedure

`npm run check:tab-move` automates pinned upstream source comparison and synthetic
adapter/menu regression checks. The ordinary host/deploy check runs it automatically
when the App version is unknown to tab moving; known versions remain offline there.
It reports changes but never writes compatibility approvals or bypasses the runtime
gate. See [audit commands, provenance and limits](TAB-MOVE-COMPATIBILITY.md).

Use a separate document-contract profile, not a blanket “App API is compatible” flag.
The existing `check:host-api` does not check private document formats or CAS behavior.

- Key profiles by reviewed App version, running Core protocol/capabilities/version,
  and supported document shape. Start with the inspected versions only after tests.
- Revalidate runtime capabilities/shape per operation. Never cache permission for an
  unknown new version or infer compatibility from matching field names alone.
- An unknown profile disables ONLY **Move to...**, with an actionable explanation.
  The rest of Custom continues working. No forced downgrades or update suppression.
- After an update: review the release's mirror/layout/reconciliation changes, capture
  sanitized synthetic fixtures, run contract/failure tests and disposable two-client
  integration checks, then add the new reviewed profile. UI should stay untouched.
- If a compatible native move API appears, implement/review that backend behind the
  same domain operation. Do not select it merely because a similarly named command
  exists; validate argument and behavior contracts. Retire the fallback independently.
- No compatibility promise about unreviewed peers: other connected App versions may
  interpret/write the same document differently and cannot all be gated by this mod.

`AGENTS.md` / `docs/ARCHITECTURE.md` now document the narrow exception.
`tests/architecture.test.mjs` permits exactly one validated CAS call site in the
adapter and retains the ban for all unrelated source, retired shell-replacement
jobs and other document names. The generic ban was not globally removed.

## Required tests before enabling

1. Remote scope: strict qualified-ID ownership, remote hello and Core version,
   pinned machine/session changes, `on` for document calls, qualified terminal
   routing, unqualified labels and exclusion of other machines' terminals.
2. Pure planner: split/nested layouts, weights, floating content policies, terminal
   and mod panes, unknown inert extensions, duplicate/missing IDs, no-op destination,
   Start exclusion, space-bound props and both final-work-tab preferences.
3. Preservation: unchanged tab payload, stable reference multiset, unrelated data
   identical, native view focus/zoom restoration by ID, no terminal creation/killing.
4. Mock transport: conflict/re-plan limits, concurrent source edits/moves/closes,
   malformed/oversized docs, unsafe versions, expiry, duplicate clicks, unexpected
   server identity, disconnect before/after acceptance and unknown outcomes.
5. Metadata: per-label failure, worker crash between phases, concurrent label edits,
   parent/sub-agent inheritance, dead/restarted terminal, explicit repair against
   latest membership and A1 color-matching integration.
6. Disposable App/Core integration: two clients editing concurrently, observe a
   committed external move, restart clients, verify no loss/duplication/session
   restart, stable pane/mod instances and focus rules. No tests on live workspaces.
7. Compatibility: unknown App/Core versions/structural fields fail closed; a fixture
   native backend can replace the document backend without changing menu code.
8. UI: correct same-machine destination list/order/badges, stale menu, no destination,
   keyboard navigation, no loading text/tooltips, no automatic follow, final-tab
   source retention and partial-success text.

Use existing fixture/build/host checks plus explicit isolated integration tests.
An initial mod check is insufficient evidence that asynchronous moving is safe.

## Known hard limit

Core CAS protects changes already committed to the document. It cannot protect
another App client's **unflushed in-memory edits**. Herdr's release implementation
uses whole-document last-accepted-write semantics and may show “Layout changed
elsewhere” when an external change wins. The mod has no public quiesce/transaction
API spanning that model and terminal labels.

Therefore this can be a maintainable, guarded compatibility feature, not a fully
atomic equivalent of native cross-space moving. If disposable concurrency/label
checks reveal unacceptable behavior, stop rather than adding a competing layout
watcher; a native move API remains the clean long-term solution.
