# Custom architecture

This is the decision guide for future customization work. Read it before adding a
feature or changing runtime files. See [the audit findings](ARCHITECTURE-AUDIT.md)
for resolved issues and remaining coupling risks.

## Ownership model

| Area | Owner | Rule |
|---|---|---|
| Checkout `src/` | Custom source | Edit here |
| Checkout `tools/`, `tests/`, docs | Custom development | Build/deploy/test logic only |
| Checkout `dist/` | Generated | Disposable; never edit |
| `mods/custom-*` | Installed Custom output | Flat direct children required by Herdr; never edit |
| `layouts/Custom.json`, `themes/Custom.json` | Installed Custom output | Deploy from source |
| `.customizations/runtime/` | Installed workers | Generated from the project |
| `.customizations/backups/`, `recovery/` | Machine-local safety data | Never sync or use as source |
| Unprefixed `mods/*`, `frame/*`, native layouts | Herdr | Read-only except approved registry patches |
| `shared.json`, `data/`, `.state/`, sessions | Herdr runtime state | Access narrowly through supported APIs; never rewrite wholesale |

Herdr discovers mods as direct `mods/<name>/mod.json` children. A nested
`mods/custom/feature` hierarchy is therefore not supported. `custom-*` is the
runtime ownership namespace. Herdr may add `gpui-kit.d.ts` and `jsconfig.json`
inside those directories; those two files remain host-generated.

The report uses Herdr's `installed.json` as read-only ownership evidence, never
assumes that every unprefixed directory is vanilla, and flags uncatalogued mods
as unknown. Catalog membership does not prove bytes are stock: use integration
baseline checks for reviewed coverage and `doctor` for Custom ownership hashes.

Run this read-only inventory whenever ownership is unclear:

```powershell
npm run report:ownership
```

## Choose the least-coupled extension

Use the first row that can implement the request.

1. **Existing private feature mod** — add behavior under `src/features/<feature>/`.
2. **New private mod** — use `custom-<name>` and compose it into `Custom.json` or
   open it explicitly as an overlay.
3. **Shared UI/model/service** — place reusable code in `src/ui/`, `src/shared/`,
   or `src/services/`; package a local copy into each sandboxed mod.
4. **Layout/theme change** — use `src/appearance/` and preference projection.
5. **Herdr facade adapter** — handle public API/command renames centrally under
   `src/integration/herdr/`.
6. **Native compatibility patch** — last resort, requires explicit approval,
   reviewed stock snapshots, guarded restore, tests, and a registry entry.

Never rebuild Herdr/herdr-core, edit native binaries, or patch an unprefixed mod as
a shortcut. The former `confirm`, `prompt`, and `toast` patches demonstrated why:
Herdr quarantined them as `*-edited-*` and warned after every relaunch.

## Adding or changing a private mod

1. Put canonical code in `src/features/<feature>/`.
2. Name the runtime mod `custom-<feature>`.
3. Add its entry to `customization.json.features` when it is a new mod.
4. Map every entrypoint, asset, worker and shared helper in
   `customization.json.files`.
5. Import host APIs only from local `./host.js`.
6. Add the mod to `src/appearance/layouts/Custom.json` or open it explicitly.
7. Add focused regression coverage and update integration expectations.
8. Run validation and deploy through the guarded tools.

The build deliberately injects these integration files into every mod:

- `host.js` — sole direct `herdr` importer.
- `compatibility.js` — reviewed version/API/command profiles.
- `identity.js` — stable Custom identity.
- `terminal-labels.js` — current namespaced working-directory/home reports.

Do not manually duplicate those files in feature folders.

## Dependency boundaries

- `src/appearance/`: layout/theme composition, not service behavior.
- `src/features/`: one user-facing feature and its local controller.
- `src/ui/`: reusable presentation and interaction primitives.
- `src/shared/`: reusable models/state helpers/assets.
- `src/services/`: filesystem, process, network, terminal discovery and privileged work.
- `src/integration/herdr/`: host facade and compatibility only.
- `src/integration/shell/`: shell reporting hooks.
- `src/integration/native-patches/`: approved native exceptions only.

Large built-ins-only Node workers may be listed in `compressedNodeWorkers` in
`customization.json`. The build emits a deterministic gzip/Node wrapper at that
same mapped output path, preserving the full canonical source byte-for-byte.
This keeps `hc` remote `node -e` transport below Windows' 32K command-line limit;
it changes packaging only, not credentials, endpoints or collector behavior.

A UI mod may call a narrow service worker. A service must not depend on rendered UI.
Runtime UI mods, deployed workers and shell hooks must never import from a source
checkout. Deploy owns `.customizations/runtime/shell/{bash-cwd-loader.sh,bash-cwd.sh,powershell-cwd.ps1,revision}`.
Profiles explicitly source the installed loader/reporter using `HERDR_APP_HOME` or
`~/.config/herdr-app`; exact profile lines are in README's Installed shell reporting.
Bash captures the loader directory when sourced and reads sibling files there.
Deploy publishes a deterministic content revision after script updates; compatible
payload changes reload only at idle prompts, preserving status and existing hooks.
Relocation or dispatcher structural changes require one explicit idle-prompt
re-source/new shell. No profiles, external yadm markers, terminal input or running
processes are changed by deployment.

## Host API changes

Feature code imports `./host.js`, never `herdr`. After a Herdr update:

```powershell
npm run check:host-api
```

- API or command rename: update `compatibility.js`.
- Return-shape change: normalize it in `host.js`.
- New API: add a thin facade export and contract entry, then use that export.
- Newer unreviewed Herdr version: required public APIs/commands and the import
  boundary still gate deployment, with a visible review advisory. Review metadata
  is not permission; App versions older than 0.1.13 or invalid version evidence fail.
  Tab-move retains separate minimum/capability/generation/shape checks and an
  advisory source audit. Native patches require independent reviewed-byte evidence.

Temporary diagnostic mods also receive the same facade through
`tools/temporary-mod.mjs`.

Herdr 0.1.16's public SDK, commands and stock provenance are reviewed in
[the compatibility record](HERDR-0.1.16-REVIEW.md). The separate tab-move document review below also permits App 0.1.16; neither
review opts in additional native patches.

Deployment accepts explicit `--source` selectors for mod/runtime-only updates when
unrelated branch outputs are already installed. It retains unselected ownership
hashes and bytes, never prunes, and leaves layout/preferences byte-for-byte intact.
Dependency reloads use the existing verified-owned entrypoint rather than an older
branch's copy. This remains a guarded build/deploy operation, not a manual runtime
edit or a way to adopt unknown output; see [commands](COMMANDS.md).

## State placement

| Need | Storage |
|---|---|
| Host/session state | Read through Herdr APIs; never copy session state into source. The explicitly authorized tab-move adapter is the sole Core-document write exception (below) |
| Custom cross-mod state | Namespaced `shared("custom.*")` keys |
| Per-mod ephemeral UI state | View fields or mod-local `localStorage` |
| Portable user preference | Private, versioned snapshot under `<Herdr home>/preferences/`, never the checkout; shipped defaults remain in `src/appearance/` |
| Generated deployment ownership | `.customizations/manifest.json` |
| Recovery/rollback | `.customizations/backups/` or `recovery/` |

Do not sync credentials, account caches, usage reports, sessions, `shared.json`,
`data/`, `.state/`, sockets or window files. Current runtime identifiers use only
`custom-*` and `custom.*`. Old namespace migration tools and label aliases have
been retired; third-party license notices retain their original attribution.

## Fleet context contributions

Crew owns `plugins/crew/fleet.js`: installed status supplies owner/task terminals
and task PRs. Verification prefers explicitly advertised `crew status --json --view
fleet`; legacy Crew uses projected `crew status --all --json`. Discovery runs later
as a separate lower-priority read with `--discover-prs` when shown Git needs inventory. See [the exact transport and Crew capability contract](FLEET-STATUS.md). `custom.crew.home=1` is only a role hint;
`crew.home` is a worker home tag. The resolver joins exact live machine-qualified
terminals to actual panes/spaces and verifies the fleet adoption identity. Missing,
ambiguous, moved or cross-machine identities fail closed. Unrouted custom homes
remain ordinary spaces. No Crew record is changed and no new companion is needed.

Registry `pluginWorkspaceLinks()` and `pluginPullContext(space)` expose read-only
contributions; lifecycle events refresh them after yielding. Crew's `recordedSource`
adapter accepts discovery version 1 only with complete, valid status/URL/source/reason
combinations on every task. Known canonical HTTPS GitHub URLs become sanitized task
PRs. None means no PR on that read; unavailable (including budget-exhausted) means
unknown. Both survive live/history binding and the generic pull context's
`discovery: {version:1,tasks:[{task,historical,status,url,source,reason}]}` alongside
links. No-link diagnostics add no row or worker authority. Unsupported/missing versions
retain recorded-only links without asserting none; malformed v1 results fail the read
rather than publishing absence. Discovery never changes pair identity, live membership
checks or durable display records. The removed generic incomplete-list notice stays
absent for both new and older Crew. Coalesced per-machine reads use the existing
Spaces lifecycle, a 10-second TTL and expiring sanitized runtime facts under
`custom.fleet.links`; preference/plugin generations invalidate late responses.
The installed-tool reader uses the existing read-only machine transport with a
25-second discovery timeout and 15-second recorded-only allowance. Exact unsupported
view/discovery refusals permit capability fallback; all attempts share 40 seconds
inside a 45-second maximum transport envelope. Authentication, transport and timeout failures
never trigger it or mean none. Missing/unknown discovery versions reuse the first
payload, with no extra call. An explicit help advertisement is required because
old Crew silently ignores unknown status flags. Host-local capability evidence in
`custom.fleet.capabilities` is keyed by the CLI path and modification time, rechecked
cheaply on every read and reused across copies/reloads; unchanged installations do
not run help per request. This benign capability cache grants no action authority.
The existing PowerShell request
projects unused fields before native encoding without changing historical Open/Draft
eligibility. Bounded Base64/UTF-8 pieces yield real native task turns via zero-delay
one-shot callbacks; no new periodic recovery scheduler is introduced. Only the
recurring Spaces lifecycle owns native reads; transient Settings/Git entrypoints
request or join its service. Shared two-second owner liveness is renewed by that
lifecycle only while its actual Task is not done, bounded by the 45-second maximum
transport envelope. It does not extend action freshness. Raw receipt switches to a
separate two-second processing deadline before parsing or decoding. A dead task,
retired owner or abandoned processing leaves an expired-read marker; the existing
lifecycle replaces it independently of finally and prior attempt TTL/backoff. Generation, token and exact identity checks remain unchanged. There is no
new healthy polling loop; the existing 10-second TTL/refresh cadence is unchanged.
Spaces invokes the provider at init and from its existing 250 ms lifecycle, including
after cold start or mod replacement. A cold failed first read remains independent
until verification succeeds; remembered display survives uncertainty. Abandoned
transport ownership expires within two seconds plus one lifecycle tick, including
across module replacement. Older leases without liveness evidence receive the same
short recovery bound rather than a remaining 45-second wait. Recorded verification
publishes before discovery; enrichment cannot renew verification age or replace pair
identity and preserves unchanged previously discovered links during recorded refresh.
Failure-only recovery stores one generation-scoped retry deadline in those runtime
facts: 2 seconds, 5 seconds, then repeated 10-second delays measured from failed
completion. Every retryable reason has this cap, including timeouts and transport
errors on ready remote machines; no slower reason-specific schedule is introduced.
Unready remote layouts retain the existing read gate and resume eligibility when
ready. Persisted deadlines from the older 15/60-second policy are rejected rather
than delaying a replacement module. The existing 250 ms Spaces lifecycle services deadlines;
no second scheduler or timer is registered. Lifecycle-triggered reads respect the
deadline even if the old failed-attempt TTL would have expired; explicit Refresh
may bypass backoff but never an active reader. Success, disablement, disappearance
of applicable candidates or authoritative absence clears recovery. Partial PR
discovery alone does not escalate it. A new mod copy respects the shared deadline
without inheriting action permission, and expired abandoned reads leave a discard
diagnostic before replacement. Healthy and workerless-history refresh stay normal.
Sleep or a blocked UI naturally delays callbacks; this is not a wall-clock service.

Crew's `fleet-diagnostics.js` preserves bounded machine-scoped reason, time and
attempted/current generation under runtime-only `custom.fleet.diagnostics` (at most
256 entries). Current failures and obsolete discards have separate slots, so an old
reply cannot replace newer binding, freshness or failure facts. The last resolved
failure remains evidence, not action permission. Reasons are allowlisted; numeric
exit/timeout facts and bounded native owner/space references are allowed, never raw
process errors, task inventories, home paths, transcripts or credentials. Generic
presentation context carries only the relevant sanitized verification fact; Git
uses the standard panel Loading bulb's tooltip, or the retained Stale tooltip,
without importing Crew code. Empty verification adds no special header text. A uniquely
routed cold coordinator hint can route Loading even before a failure, with empty links, not a pair,
verified home or GitHub/worker authority.

The existing facade `writeTextFile` is exported by the plugin API for a narrow owned
log at `.customizations/fleet-verification.log`, not the updater's `update.log`.
Yielded best-effort read/CAS writes keep at most 128 lines / 64 KiB, serialize within
a mod and retry a conflicting write once. Shared episode markers deduplicate the
same reason/generation across copies. Logging failure sets a diagnostic flag and
cannot prevent verification; runtime facts remain available. No diagnostics IO
runs in render or native checking. This file and runtime key are never portable.
Only the default-off Spaces boolean is portable. Raw reports, task files and
pending ordering operations are not exported or replayed.

Successful publication separates durable identity (`custom.fleet.display`, version
1) from expiring status facts, pending leases and retry timestamps. The durable
record contains only bounded machine/space/home/owner references and adoption facts,
with one pair per machine; no task/PR inventory, reports, transcripts or credentials.
Public shared values are persisted by the SDK. Pure Spaces projection and Crew tag
reads restore that record in the first available native-space frame after a cold
start, mod replacement or layout switch, without render-time writes or IO. It is
excluded from portable preferences. Preference/plugin disablement hides the pair
and revokes fresh authority but preserves that memory for same-render enablement.
Completed negative results or ready native-space absence prune it; another
machine's loading layout cannot erase its record.

Presentation has no wall-clock expiry. Its bound is the lifetime of the exact pair
identities, not repeated re-earning after unrelated topology events. Fingerprints
include only parent/child presence, coordinator owner/home membership and fleet
adoption facts, never unrelated names/order/selection/tabs/panes. Errors do not
publish `status:null` or renew success age; independent attempt timestamps back off
retries. Crew lifecycle hooks explicitly yield before persistence, leases or reads,
including when native spawn begins inline.

Move and Git/worker action queries still require a current-runtime witnessed status
result, 30-second freshness, matching dependency fingerprints and exact live membership.
Persisted timestamps/tokens cannot authorize a cold module. Consumers can witness a
shared in-flight read, preserving coalescing across mod copies, but completed crash
leases are not fresh verification. Space-only block ordering uses the displayed
remembered link, revalidating exact captured pair identity and native acknowledgements
at commit. This exception reorders spaces only; it never permits terminal/tab moves,
worker navigation, messages or coordinator colour writes from remembered identity. Git requests presentation context
only to retain already-loaded same-home rows/counts/folds with a Stale badge, or a
standard Loading bulb with no extra header label or restored inventory on cold start.
There is no cross-toggle identity/inventory cache. Off or a scope change clears
the aggregate's entries; on shows Loading until fresh verification and facts arrive.
Existing same-context outages retain their pre-existing Stale meaning only.
Enabled current coordinator candidates pending verification or retry never fall
back to ordinary folder Git. Only a witnessed completed negative whose dependency
signature still matches the current native snapshot suppresses Loading. Old owner
results and diagnostic reasons alone never decide a new candidate's empty state. It starts no task
GitHub reads or worker navigation from stale context, and pauses its relay consumer,
not the chrome-owned shared broker or independent update checks. Fresh verification
resumes targeted reads and controls; different selected spaces or confirmed ownership
changes cannot inherit those rows. Git additionally matches the successfully
verified live-task membership, independently of the pair/adoption fingerprint: a
Core-first worker exit cannot silently remove its PR before Crew publishes the
closed record. A working/finished mismatch remains unverified rather than renewing
action freshness, while existing same-home rows stay explicitly stale.

Colour is a separate binding-scoped action, not live-worker navigation. The generic
`pluginAllows('spaces.color', {pair})` guard accepts the exact displayed pair only
after a successful status read in the calling mod (or a witnessed shared read).
That success records `displayIdentity` and its dependency fingerprint alongside the
existing expiring runtime status/token, not in the durable display record. The guard
requires the witnessed token, ordinary 30-second freshness, ready machine layout,
matching current owner/home and unchanged displayed pair/adoption fingerprint.
It therefore handles live, retained finished and retained empty fleets uniformly,
including remote pairs and cold restoration after the first successful verification.
Persisted display or a fresh owner without a matching successfully verified retained
child cannot grant colour permission. This does not broaden live move links, Git
reads, worker navigation or exports. Opening an attached menu emits the generic
refresh lifecycle; it yields before reads and joins the shared lease when possible.

`plugins/git/mod/aggregate.js` consumes the registry's explicit task context only
for the selected coordinator. It reads exact validated task PR URLs on that machine with
three bounded concurrent requests, keys rows by repository plus PR number, and
never probes the coordinator's directory. Working/reported live terminals are
eligible. Same-home closed-task records contribute validated links without live
worker authority; they cannot establish a fleet child. The verified owner/home
PR scope excludes the optional child so last-worker exit does not discard PR facts.
Full PR identities deduplicate before reads/counts; current live sources win robot
selection, and historical-only rows have no target. Captured robot callbacks still
require a current live source.

Historical-only Open/Draft rows remain eligible. Merged/Closed historical rows use
GitHub's existing `mergedAt`/`closedAt` fields and expire after 24 hours; missing,
invalid or future completion dates do not admit historical Closed rows. Live-task
rows retain normal eligibility. Repository/global counts use the same eligible
rows, and repositories containing only excluded history have no empty headers.
Candidate facts remain bounded for webhook reopen/merge events; aging does not poll
GitHub. The existing 1 MiB/4096-task source limits and three concurrent targeted GitHub
reads remain; status uses the 25-second discovery / 15-second capability fallback
bounds described above. No private task timestamps are read. There is no extra task heading or generic incomplete-list notice, single
active pin or repository-wide PR inventory in this mode. Missing task links
still cannot be inferred by the app from transcripts or branches.

`ui/ui.js` owns `sidebarSectionHeader`, the common machine/repository header shell
and right-edge chevron; Spaces retains its own actions and guarded folding.
Aggregate repository headers start expanded and show only canonical owner/name
plus the shared chevron, never repository Open/Closed counts. The flexible name
uses all remaining width; a clipped invisible natural-width probe and the label's
available width enable its full-name tooltip only on actual overflow. Geometry is
local, scope-keyed and updated after layout with changed-only notifications, not
render-time effects. Top-level tab totals still include folded repositories.
Sections persist a canonical repository-key set in localStorage
(`custom.git.task-repositories.folded`), like Spaces' `machines.folded` set.
Explicit toggles are UI-only: no preference export or Crew/host-document writes,
and no new fetch or cancellation. Fold state survives tab/context changes and
panel recreation. Scoped rows/errors and repository-specific diagnostics fold with
the body; global setup stays visible. Counts and webhook-driven facts continue
updating while folded. Rendering derives selected-tab sections from eligible rows
or an applicable `readNotice`, before applying folds. Empty sections have no header,
but disappearing sections retain saved fold keys. A settled tab with no qualifying
sections uses ordinary Git's **No open pull requests** / **No closed pull requests**;
notice-only and folded eligible sections are not empty. Pending/unverified feedback
is unchanged. The selected presentation is sliced into replacement pages of ten
items including headers, notices and rows, with repeated continuation headers.
Paging applies after folding, preserves full counts/inventory and starts no IO;
its per-page scroll identity resets position and Previous/Show more remain outside
the viewport. Page state is per coordinator home and tab. Distinct-string native
probe widths use a bounded zoom/style-keyed cache; PR label presentation caches
immutable facts, never native callback-bearing elements. Coordinator rows build
at most three pills but retain all names in metadata/strip tooltips. See
[GIT-RENDER-BUDGET.md](GIT-RENDER-BUDGET.md) for measurements and native-check limits. The cross-tab repository inventory remains separate from this render
projection so membership reads, enrollment and webhook updates do not lose hidden sections.

Coordinator enrollment uses one non-shrinking footer after `task-pulls-scroll`.
`GitNotices.presentation` is a pure cached snapshot of confirmed unenrolled
canonical names, deduplicated in full repository inventory order, including sections
hidden in the selected tab; pending/unknown is quiet.
`EnrollmentPicker` uses the shared `ui/choice-menu.js` presentation even for one
choice, with its explicit compact trigger height of 20px instead of the account
pill's default 28px. That matches ordinary Git's 20px icon/inline row inside the
same 8px horizontal / 6px vertical card padding: icon, message, Settings and the
added 12px chevron share one vertical centre, without a taller nested pill. The
message remains single-line. Account pill dimensions, gaps and popup geometry
remain unchanged; the native popup still receives the opener press. It captures choices plus coordinator/home, selected location, view and
notice configuration/refresh generation. Opening starts no read. Revalidation
uses current cached facts before passing the captured repository to Settings;
configuration, membership or scope changes close an obsolete menu rather than
moving entries under the pointer. Escape/backdrop dismiss; local hover and arrow
navigation share menu-row highlighting. Global missing setup takes precedence;
ordinary Git's card is unchanged. No picker action enrolls or changes account.

The existing single authenticated WebSocket routes repository invalidations into
the aggregate index. Bursts coalesce behind each in-flight PR read; reconnect/show
catches up. Local status refreshes fetch newly linked PRs only, not unchanged
GitHub facts or CI. Repository failures retain same-binding rows with one applicable notice per
repository and selected tab. Known Closed failures never leak into Open; expired
historical rows and their errors cannot leave empty sections. Cold historical-only
failures are a Closed history-load notice, not invented PR state. Execution results
retain exit/signal/timeout facts: local spawn failures, abnormal Windows NTSTATUS
and process timeouts offer Refresh to retry, not an automatic retry promise or a
GitHub outage claim. Authoritative targeted task-PR absence (exact PR resource
resolution or HTTP 404) clears that PR's facts and leaves no row, count, notice,
hint, tooltip or empty repository header, for both live and historical sources.
A module-session canonical repository/number cache survives entry resets, context
changes and panel recreation. Historical-only misses remain suppressed for the
session; live misses can recheck after five minutes on the existing shown-panel
lifecycle, with unchanged concurrency/visibility guards and no new timer. A changed
recorded URL reads immediately; no separate head discovery is introduced. Successful
rechecks restore ordinary facts; real failures leave the absence cache and use the
normal notice path. A separate session set deduplicates one sanitized customization
console/log line per identity, even across successful or repeatedly missing rechecks.
Uncertain repository resolution and arbitrary local not-found text remain errors,
not cached PR absence. Explicit refusals and connectivity failures take precedence
over quoted missing-resource text. No missing-PR account probe or login claim is
introduced. Real permission/authentication refusals
identify the repository and effective GitHub account (or honest unknown identity),
with one identity read reused per repository/refresh and discarded afterward.
Ordinary failed responses revalidate captured request/repository identity before
starting that diagnosis. Only explicit DNS/connection failures mean GitHub is unreachable. Mixed
causes reduce to one truthful summary; partial recovery removes only recovered
failures. Setup is global and enrollment links capture each repository. Hidden/disabled or
superseded contexts cannot start follow-ups or publish stale results. Neither
presentation nor setup notices enroll repositories or grant auto-fix authority.
Ordinary folder Git retains its pin motion, pagination and existing agent matching.

## Right-sidebar tab pins

`shared/panel-state.js` is the single owner of `custom.panel.tabs` (version 1):
`{ default: {open,view}, pins: { [qualifiedTabId]: {space,open,view} } }`. Valid views
come from plugin sidebar declarations (the shipped stable IDs remain `files` and
`changes`). It uses supported native layout commands; no Core or layout-document
writes. Availability is only a projection: disabled pinned views fall back to the
first enabled panel and both disabled hides the sidebar. Stored choices survive
so re-enabling restores them. With no pins, the existing global choice is captured
only when availability first masks it; ordinary navigation stays native. This tab-runtime state is deliberately excluded from
preference export. The unpinned default stays separate from pinned choices; the
legacy `custom.panel.view` reopen hint follows only the shared/default choice.

Files/Git headers share `ui/panel-pin.js`. Their Close actions, the tab-bar toggle
and the panel switcher all use `changePanel`, recording the source tab before
commands queue. The switcher captures its target when opened; stale popups cannot
retarget another tab. Mounted Tabs calls `syncPanelState` for every navigation
path, yielding before state/command work. One in-flight projection, a captured
store/binding check and acknowledgement grace prevent intermediate native layout
frames or a superseded task from corrupting a pin/default or creating a command
loop. No new polling, terminal interaction, focus command or window restart.
Unknown state versions are preserved and disable pin changes.

## Shared empty-state component

`ui/ui.js` exports `emptyState(t,{id,title,icon})` for lists, panels and pickers.
It owns centering, 24px icon size, the shared gap, regular `U.font` text in `t.muted`,
and removal of trailing periods. Contexts may supply an existing icon and concise
title, not duplicate the markup/style. Search/palette/Jump, repositories, worktrees,
folders, Agents, terminals, machine lists and Usage share this contract. The right
sidebar's Files/Git empty messages deliberately retain their original compact,
top-aligned text-only presentation, without a centered icon.
Loading/error diagnostics and disabled-feature explanations remain separate states.
Shared UI updates retain the public `rolePill`/`ROLE_LABELS` helpers used by the
independently installed Firstmate views; no Firstmate behavior or preferences change.

## Reorderable UI components

`ui/reorder.js` is the shared drag interaction for Tabs, Spaces and sidebar footer
icons. The `strip`, `list` and `icons` variants expose their geometry/presentation
through one API: threshold, guarded controls, suppressed hover/tooltips, source
dimming, insertion markers, zoom/scroll-aware previews and return/fade cancellation
are not implemented in individual features. Features supply icons/labels and domain
constraints/commit callbacks only. New reorderable surfaces should use the
[component API](REORDER.md), not copy another feature's mouse handlers/timers.

## Settings sections and sidebar shortcuts

`src/ui/settings-sections.js` is the canonical section catalog. Register a page there
with `{ id, title, icon }` (and `platform` if needed). Settings navigation, Look's
Left sidebar configuration and both expanded/compact sidebar shortcuts derive from
that catalog. A new section gets an off-by-default shortcut targeting its Settings
page automatically; implement its page normally and package its icon as usual.
Look's **Left sidebar ›** navigation uses the same 32px height, 8px horizontal
padding/gap and rounded hover as Settings' left navigation, with its chevron on the right.
Its 8px left hover padding sits outside the text anchor, keeping the label aligned
with other Look rows. The chevron compensates its SVG's blank right third; the hover's
right extension is reduced by the same amount to retain the chevron's original
position. Auto/stretch width absorbs these margins. The visible glyph's right gap
equals the label's left gap (not merely the invisible icon box's padding).

Optional `plugin` metadata gates runtime navigation/configuration/shortcuts through
the plugin registry, while the pure catalog retains the ID for portable preference
validation. Disabling never deletes that section's saved shortcut order/visibility.
`machineScoped` lets plugin pages reuse the common Settings machine picker.

Optional `shortcut` metadata on the section customizes initial visibility, side,
initial order, icon or action. Existing Usage keeps its quota dialog through that
metadata. Do not add ID switches or parallel section lists to footer/menu code.
The global Settings shortcut is a separate required escape hatch, not a toggle.
Existing saved visibility/order/placement values still win over initial defaults.

The snapshot validator derives its allowed IDs from `settingsShortcuts()` too.
`tools/runtime/settings-sections.js` is a development-only re-export; the build maps
the canonical catalog directly to `scripts/settings-sections.js`, so the packaged
snapshot tool is self-contained. The regression fixture adds one synthetic catalog
entry and checks automatic configuration, expanded/compact navigation, icons and
safe preference export/import, including rejection of invalid values and unknown IDs.

## Plugins

Optional integrations people switch on in Settings > Plugins. Each plugin is
self-contained in its own folder and talks to the app only through the plugin API:

```
src/plugins/
  api.js            GPUI plugin API: host facade, spaceColor(id), pluginFile(id, name)
  api.cjs           Node plugin API: shared A1 command transport and protocol validation
  registry.js       on/off state, settings, hooks/events/transforms, checks (features import this)
  <id>/plugin.js    the plugin's declaration (entry point)
  <id>/*            its own helpers, workers, assets and *.test.mjs tests
```

- **Adding a plugin is adding a folder.** `tools/plugins.mjs` finds every folder with a
  `plugin.js`; the build packages the registry, the API and every plugin folder into
  each mod listed in `customization.json` `plugins.mods` (as `plugins.js` and
  `plugins/<id>/…`, which Herdr resolves like any relative import) and generates
  `plugins/index.js` (the list) and `plugins/where.js` (which mod this copy is in).
  `plugins.order` sets hook priority and the order on the Plugins page; unlisted
  plugins follow alphabetically. No per-file manifest lines.
- **Boundaries are tested** (`tests/architecture.test.mjs`): a plugin file imports only
  `../api.js`, or `../api.cjs` for Node workers, its own folder and packages (`gpui-kit`, `node:`).
  `api.cjs` owns the single shared A1 client, never color/membership policy. Explicit
  `plugins.nodeWorkers` entries embed that canonical adapter and the worker verbatim
  into deterministic compressed self-contained transport; remote hosts need no companion.
  `api.js`
  reaches only the host facade, Spaces' color state and `where.js`; features use plugins
  only through the registry (`./plugins.js`), never a plugin's files. Plugin tests run
  with `npm test` and load code as packaged through `tools/plugin-harness.mjs`.
- Mods cannot load each other's code and mod commands reach only shown copies, so every
  plugin mod carries its own copy; only state is shared at run time.

- A plugin declares `id`, `name`, `category`, `version`, `icon`, `description`,
  `settings` (typed `toggle`/`choice`/`multiselect`/`machine`/`text` fields with defaults), `prerequisites`
  (`check()` returning `ready`/`missing`/`recommended`/`error`, optional `fix`), and how it
  joins features: `hooks`, `events` and `transforms` (below).
- A `multiselect` setting holds a unique array of declared option values, including
  an empty selection. Settings renders a native dropdown with controlled checkboxes
  that stays open between selections. Changes save immediately through the registry;
  disabled/closed/dismissed callbacks cannot save. Portable snapshots retain bounded
  unique plain-string option arrays, never nested objects or runtime request data.
- A `machine` setting holds a Herdr machine name, or `null` for this computer. Settings
  draws it with the shared machine picker. The registry only checks the type, so a
  machine that has been removed shows up as a failing check. Changing it re-checks the plugin.
- A `text` setting is one line of text (up to 1024 characters, no control characters;
  empty means not set), drawn full width with an optional `placeholder`. It is saved
  on Enter or when the field loses focus, and the plugin is re-checked only if the value
  changed. Plugins must quote it themselves before it goes into a command (Firstmate
  passes its folder to git as a separate argument and single-quotes it for PowerShell).
- A setting marked `hidden: true` is stored and validated like any other but not drawn
  in the Settings block. A prerequisite may declare
  `pick: { machine, folder, label, changeLabel }`. Its row then gets an Add/Change
  button that opens a folder browser (`features/settings/folder-browser.js`) with a
  machine switch. It lists folders over `exec({ on })` with PowerShell, so it works for
  remote machines, which the system folder dialog cannot browse. Choosing a folder saves
  both settings and re-checks the plugin. Firstmate uses this so the clone's machine
  decides where every other requirement is checked and installed.
- `check(context)` and `fix.run(context)` receive `{ setting(key) }`, the same accessor
  hooks get. `checkPlugin` passes one context object to every check in a round, so a
  plugin can share work between its checks (Firstmate does this, using a WeakMap keyed
  by the context). A check may return `fix: null` to hide a fix that cannot help right
  now. A fix with `manual: true` only helps a person do the step (Firstmate's Open shows
  Windows Settings > For developers on the folder's machine); it is drawn as a plain
  button and "Install all" skips it. Fixes run one at a time. "Install all" runs every offered fix in order and stops
  at the first failure, then the plugin is re-checked.
- Plugins today: VS Code Remote, A1 session colors, and Firstmate (a setup checklist
  for the machine that runs Firstmate, run through `hc exec --on <machine> --json`;
  pinned, SHA-256-verified exe installs into `%USERPROFILE%\.local\bin`, global npm
  installs through PowerShell. Its Agent hooks row reads `~/.claude/settings.json` there
  for each installed axi tool's SessionStart hook (matched like the installer does: the
  hook command contains the tool name) and runs `<tool> setup hooks` only when the person
  presses Set up. Developer Mode's Set up (another machine only, manual) runs one fixed
  `reg add` over `ssh <machine's target>` from this computer: an administrator's Windows
  OpenSSH login is elevated, herdr-core is not. On this computer the button opens
  Settings instead. It never edits PATH or restarts a core).
- State is `shared('custom.plugins')`: `{ [id]: { enabled, settings } }`, allowlisted
  and validated for preference sync. A plugin that took over an older preference
  supplies `state: {get, set}` instead (A1 session colors keeps
  `custom.match-agent-session-color`).
- Features name moments; plugins join them three ways, all only while enabled, each
  given `setting(key)`:
  - `runPluginHook(name, context)`: the first plugin returning `true` handles it alone;
    otherwise the feature does its own thing. Hooks: `files.open` (Files' Open…).
  - `pluginEvent(name, context)`: every plugin hears it; nobody handles it. Synchronous,
    plugins start their own work with `context.cx`. Events: `spaces.refresh`
    (`{ owner, cx }`, whenever Spaces looks at its spaces).
  - `pluginTransform(name, value, context)`: the value passes through each plugin, which
    returns a new one or `undefined`. Transforms: `profile.launch` (the argv a profile
    starts with; `{ space, machine, profile }`).
  A throwing plugin is reported once per moment and skipped; the feature carries on.
  Moment names avoid Herdr's command namespaces (`agent.`, `tab.` …), which the
  host-API audit treats as native commands.
  - `pluginGate(name, context)` is the one **required** moment: exactly one enabled plugin
    must claim it and return a prepared object, otherwise the result is a refusal with a
    reason and the feature must stop. Nothing is swallowed and there is no "carry on
    without it". Gates: `profile.role.firstmate` (`{ machine, space, profile, argv, cwd,
    token }` captured at the click; returns `{ cwd, labels }`). Use a gate only where a
    silent fallback would be wrong; everything else stays a hook/event/transform.
- Add a hook only where a feature can fall back cleanly. Integration plugins keep
  their hooks free of UI; Settings draws their controls from their declaration
  (`features/settings/plugins-ui.js`).

### Plugin-owned agent context actions

`pluginMenuItems('agents.context',{terminal})` freezes enabled plugin contributions
when the context menu opens. Core Menu invokes ordinary actions without knowing
plugin-specific policy. This reusable registry infrastructure remains available,
but A1 contributes no Rename action, eligibility guard or naming gate. Agents has
no inline name editor, expiring rename request or double-click rename path; clicks
retain normal pane selection/sub-agent peek behavior in every presentation.

The retired `renameSession` preference is ignored by declarations and remains
readable in old portable snapshots without destructive migration. Tab and space
inline rename remain independent. The shared Node client still validates external
`session.get` / `session.rename` calls; A1 owns external automatic-name control through
its exact-session boolean `sessionAutoName` settings API. No sidebar control calls it.
Nothing writes native title/reporting state, creates an alias, polls names or echoes
A1 name changes. Vanilla A1 → Herdr updates remain independent of plugin switches.

### Direct plugin configuration links

Settings accepts ephemeral `{section:'plugins',plugin:<known-id>}` overlay props.
`initPlugins` validates the ID, expands its Requirements/Settings disclosures and
scopes the initial checks to that plugin. Plugins marked `advancedSettings` keep
manual fields collapsed under Settings instead of opening them with prerequisites. `pluginsPage` shows only the target card;
the fixed dialog header uses `ui/settings-back.js`, shared with Sidebar settings.
Its `{id,parent,onBack}` contract derives visible text from `parent` and the
accessibility label as `Back to <parent>`; missing parent names fail explicitly.
Plugin pages show ‹ Plugins and Sidebar settings show ‹ Look. Clicking the parent
or pressing Escape returns to the parent section. Ordinary navigation clears the target. Unknown IDs fall
back to the full catalog. No plugin preference, selection or credential is changed
by opening a link. Prerequisite fixes may opt into primary styling with
`fix.primary`; this is presentation only. `fix.manual` continues to exclude manual
actions from Install all regardless of their color. Install all itself uses the
same primary control style. Git's bottom info notice uses this route through the standard
Settings overlay and says Set up Git in Settings for missing setup, or
Add this repo in Settings for an unenrolled repository. The enrollment link also
passes ephemeral `pluginSection:'repository'` and `pluginSearch:<owner/repo>` props,
captured from the rendered repository. Settings validates the target section against
that plugin's declarations, collapses Requirements, expands the section and seeds
only its searchable input once. Invalid targets/queries are ignored; ordinary setup
links retain their defaults. Git's Repositories disclosure starts collapsed on ordinary
Plugins/setup entry; the explicit enrollment link still expands it. No account,
repository checkbox or preference is changed.

`plugins-ui.js` supplies prerequisite action context with a canonical live-directory
reader and validated compare-before-write setting updates. Checks still pass through
the registry's one check/error boundary. This preserves a separately installed
registry extension rather than overwriting its branch's code. Results synchronize
unfocused public inputs; closed views and disabled plugins cannot save stale results.
Confirmation-required actions show a fixed footer outside scrolling content, bind
the approved action/account/repository snapshot, and are excluded from Install all.
Account choices are public setting selections, not secret input fields. A
`section` prerequisite uses the same disclosure as Requirements. All plugin headers
and rows reuse `statusRail`: 80px action column, 10px gap, 72px right-hand status
column. Disclosures are ui.js `collapsible` (chevron first): open, header and body share one panel, and the header's 8px inset matches the body's. **Check** stays left of the status with fixed 80×24 dimensions (including min/max
constraints) and keeps its label while disabled. Checking headers show a leading
blue bulb followed by blue **Checking** text in the right-hand status column.
Requirements and each section have independent jobs, result merging and per-group
completion tokens. A Requirements Check never runs section checks, and a section
Check never reruns Requirements. Initial checks and setup-setting changes schedule
both groups independently, so either can finish, show errors or refresh again without
waiting on the other. A group's reply merges only its own IDs and rejects superseded
or closed-view completions. Context memoization stays within a group, not between
groups. Ordinary rows retain prior results or remain quiet; only an individually
running action gets its own bulb. Buttons reject duplicate pre-paint clicks. Ready
and All ready badges both occupy the full 72px status width.
Plugin captions show only the version; category metadata remains available to the
registry but is not rendered. Collapsed state keeps header controls and search state. `searchable` adds a
local InputState filter. Optional `checklist` data renders controlled native
individual checkboxes without a bulk All option, with a fixed 240px viewport,
non-shrinking content and an explicit always-visible scrollbar. `configuredValue`
renders a read-only value instead of an editable preference field. Native Checkbox
uses `checked` + `on_change` (not `on_click`). Changes edit a per-view draft; only
Apply snapshots values and calls enabled-only actions. Plugins uses the same fixed
`modalFooter` editor row as Core, with Unapplied changes, Discard and Apply. Discard
has no remote effects. Partial success clears only acknowledged edits; failures stay
pending. Rechecks retain drafts and reject changed relay/account/repository identity.
Search, collapse, stale nodes, close and Install all cannot apply drafts. Plain
`overflow_y_scroll` pairs with the explicit Scrollbar; the viewport stops wheel
bubbling after native scrolling so the outer page does not also move. Empty search
results reuse `emptyState` within the same viewport and do not show an empty scrollbar.
A checklist can provide its shared `emptyState` title/icon for filtered results.
Section loading and zero-inventory states omit the list viewport entirely: loading
shows only **Repositories will appear here.**, while an empty account retains its
account-switch guidance. Neither has a large icon or duplicate empty-state label.
A populated inventory with zero filter matches retains search and the shared No results
state inside the normal viewport. `statusLabel: null` hides a section's redundant
status badge without suppressing checks or errors.
Section prerequisites may return public `selection` options, rendered as reusable
choice tabs (with `hideLabel` for a redundant visible title). Switching is blocked
during that section's check, mutations, drafts or stale callbacks; a valid choice
saves only its declared setting and reloads that section. Repository lists, search,
checkboxes and Apply depend on their own check state, not unrelated Requirements.

### Plugin-owned sidebar mods

Files and Git are independent, enabled-by-default plugins. Each contributes
`sidebar: {id,name,mod,icon}` in `plugin.js`; the registry's `sidebarPanels()` is the
single availability catalog. UI consumers do not switch on plugin IDs. The generic
`ui/sidebar-title.js` provides a dropdown only when several panels are enabled;
Tabs renders no toggle when none are enabled. `workspace.panels` stays native and
is not used as plugin enable state.

`src/plugins/<id>/mod/` owns that plugin's separately packaged native mod, including
its assets and service code; `panel.json` declares the stable mod name and explicit
shared-source dependencies. `tools/plugins.mjs` copies those files only into their
own mod sandbox. Peer mods receive only `plugin.js` and integration helpers, never
the panel implementation. This is an intentional plugin-boundary extension: mod
code imports its local injected `host.js`, `ui.js`, registry and declared shared
helpers, while ordinary plugin hooks still import only `../api.js`/`api.cjs`.
Panel manifests cannot import another plugin's sources; architecture tests verify
local dependency closure. The stable feature/mod registrations in
`customization.json` and layout stack children remain compatibility anchors.

Plugin manifests can also declare sandbox-local `extensions` and a `settingsPage`.
The build validates their relative paths/feature targets, copies only that plugin's
sources, and generates the Settings `plugin-pages.js` dispatcher. Core Settings
imports that generic dispatcher, never a particular plugin page. Shared dependencies
may reference the owning plugin, but never a peer plugin. Plugin-owned Node workers
use the same validated, byte-preserving compression as central workers.

No native rebuild, document writer, new watcher or background timer is introduced.
Disabled panels gate request starts, async follow-ups and stale results; Git's
agent-link controller uses the same enable guard. Existing file viewers remain
usable independently of the browser sidebar, and explicitly confirmed in-flight
recycle operations may finish. Disabled/re-enabled panels reuse their normal
refresh lifecycle. Panel switching and stale popups recheck current availability.

## Git webhook updates

`src/plugins/git/` owns public relay/repository settings, setup prerequisites and
explicit credential/webhook actions. Local keys live only in
`.customizations/git-webhook.json`, never shared state or preference snapshots.
`setup.cjs` runs only for Settings checks/actions; it verifies relay authentication
and secret fingerprint, and changes only the approved repositories' exact relay URL.
GitHub webhook secrets go over `gh api --input -`, not command-line arguments.

`actions.js` owns Install/Login/Configure and repository-checkbox prerequisites, sharing readonly
facts per check round. `cloudflare.cjs` installs Wrangler 4.162.0 privately on explicit
Install, delegates browser authorization to Wrangler, validates the chosen account,
and configures only its dedicated fingerprint-owned Worker. It uploads keys over
stdin and returns only a verified public relay URL. Wrangler logging/telemetry are
disabled; the supported auth-token command stays inside the Node worker. Existing
account subdomains and unrelated Workers are never replaced. No wizard, daemon,
automatic background provisioning, private auth-store parsing or credential export
is involved. Node/npm installation, cloud changes and webhook creation remain
separate explicit actions. Configure starts on its first click; repository checkbox
changes are drafts whose explicit approval is Apply, using the existing editor
footer rather than another confirmation panel. Core and Plugins Apply/Discard
controls both use `ui/modal-layout.js`'s `editorActionButton`: 88×32 logical pixels.
Repository hover rows use `U.radius` and symmetric `U.gutter` scroll insets so
rounded highlights have the same left/right breathing room.
`repositories.cjs` reads all pages of the current GitHub account's active admin
repositories, not local clone folders. Checkboxes reflect server hook state, never
persisted desired-state jobs. Individual checkbox actions bind the repository,
GitHub login and relay URL, revalidate immutable repository IDs before mutation,
and report failures. Unchecking removes only the matching receiver's webhook. Mutations share
the existing cross-process setup lock; duplicate/unknown hooks fail closed. The canonical receiver is `src/plugins/git/relay-worker.js`, packaged
with the plugin; the optional manual tools entrypoint only re-exports it.

`mod/notices.js` owns notice decisions independently of socket/agent state. Missing
setup is global; enrollment is cached by repository, never terminal ID. Checks are
one-shot on configuration revision, visibility or explicit Refresh. A repository
switch clears the prior enrollment notice immediately; unresolved roots and pending
membership checks stay quiet. Only the current repo's confirmed unenrolled result
shows the notice; cached same-repo results need no new check. Unknown connectivity does not claim setup is
missing. Settings publishes public membership facts via `notice-state.js` in the
runtime-only `custom.git.webhook-state` key; no credentials or secret hashes are
shared/exported. Configured non-Git contexts and enrolled repos have no prompt.

`relay-client.js` owns a single authenticated native WSS subscription through
Git's mounted non-footer `sidebar.sync` lifecycle, using a short renewable public
owner lease and a handoff grace period across duplicate mounts/windows. The plugin
API exposes only a supported socket factory; features subscribe through the
registry, never plugin imports or credentials. `sidebar.close` invalidates queued
startup, pending credential/connect replies and the socket immediately; disabled
Git revokes ownership and closes transport. Panel visibility/repository changes do
not reconnect it. Transport failures use bounded jittered backoff; missing/invalid
keys block until explicit retry or configuration change.

`mod/webhooks.js` consumes bounded public per-repository invalidation revisions and
ready generations from runtime-only `custom.git.relay-runtime`. A small retry key
requests the owner's retry, never creates a panel socket. The render-facing
consumer coalesces revision changes behind `cx.spawn` and an explicit microtask;
only then can it invoke panel callbacks, arm a CI sweep or start reads. Delivery
rechecks view scope, visibility, plugin enablement, relay configuration and
transport scope; stop/replacement invalidates queued callbacks. Hidden panels still
do no PR/agent reads. GitHub events and successful reconnection invalidate every
loaded page rather than just the pinned PR. Snapshot refreshes are single-flight with one coalesced dirty
flag, retain expanded depth, renew cursors, and guard repository/machine/request
identity before reads and writes. `pulls.js` owns one-shot state-and-check safety reads for shown Open/Draft rows:
45 seconds without confirmed enrollment, 120 seconds enrolled even during relay
outages. Uncovered pending/unknown checks also remain eligible. One repository batch
shares the ordinary pull lease or aggregate queue, with 90/180/360/720-second failure
backoff and at least 15 minutes for rate limits. Visibility, offline machines, scope
and fresh coordinator identity are rechecked at dispatch/publication. The thin probe
reads only number, state, draft/completion/head facts and the last commit's rollup
STATE (40-PR chunks). Only changed heads/summaries fetch contexts (20-PR chunks),
under the same non-overlapping lease. Unchanged 5/30-row cycles use one request
and no context lists. Primary/secondary refusals keep values for at least 15
minutes or a longer Retry-After; hourly remaining quota cannot override that.
Labels/tasks/review and all displayed values remain during reads. Ordinary totals are repository-wide;
aggregate totals and 24-hour history eligibility derive from current task PR state.
Coordinator safety selection uses the same bounded presentation page, with page
identity in the request scope so Previous/Show more rejects obsolete replies.
Full tab totals and the event inventory remain independent of paging. Thin/detail
API reads use repositoryRead's per-child GH_REPO transport and guarded refusal
diagnostics; complete ordinary pages apply their combined totals even on append.
Full metadata/pagination refreshes still use event/manual reads.
The local branch/footer and agent-link discovery lifecycle is separate.

**Check-fact ordering rule:** every list, targeted/older-PR, fallback and event
read carries a context epoch and monotonically issued read generation. Publication
is per repository/PR: a reply from an invalid epoch or older than that PR's
published generation is discarded. All ordinary paths share one snapshot lease;
older-PR reads cannot start during a list/event/fallback snapshot, and events
coalesce behind any current reader. Aggregate targeted reads and fallback share
the same per-PR publication guard and aggregate queue. A discarded or failed read
never leaves a lookup cache key blocking the next attempt; failed replacement
snapshots release the related-PR cache key while retaining last-good rows. Failed
standalone older-PR reads use a separate 10-second retry deadline (not a cached
success key) to avoid a render-driven failure loop.
Safety selections use at most 40 PRs per thin command and 20 per changed-row detail
command under the same repository lease, checked again before each command and committed only after the
complete selection succeeds. No oversized selection is retried unchanged.

The explicitly configured private Cloudflare Worker uses
a hibernating Durable Object. It verifies raw-body GitHub HMAC, bounds input and
clients, authenticates WebSocket subscribers, and forwards only invalidation
metadata, adding only validated push ref or PR action/merged/base fields for exact
main filtering. Protocol 1 remains compatible; configuration reports notice version
2 so Settings can offer explicit Configure for an old relay. It is not installed
or provisioned by customization deployment. There
is no local daemon, native rebuild or persistent deferred job queue. Opening and
reconnection catch up from authoritative GitHub reads rather than replaying jobs.
The public `checking()` API is exposed through the facade to prevent subscriptions
during eager native checks. See [setup and trust boundaries](GIT-WEBHOOKS.md).

Custom's updater owns its separate 120–180 second jittered availability cadence,
persisted failure backoff and startup/idle-activation/sleep catch-up. A fixed-repo
`updates.watch` subscription only accelerates it: authenticated main hints bypass
healthy freshness under the same worker lease and persisted 15-second rate floor,
never failure backoff or installation gates. One dirty generation and a short
debounce bound storms; a deferred hint survives check-lease contention. The worker
rechecks its cache after acquiring the lock. Checks compare remote main with
manifest-linked installed provenance; no event SHA, checkout HEAD or local tracking
ref becomes installed truth. Disabled/unconfigured Git cannot disable this updater
fallback. Runtime counters, leases, retry state and credentials are never portable
preferences. Native App/Core update behavior is unchanged.

Git's opt-in auto-fix now automatically provisions a **Core-side companion on each
connected supported machine**, authorized to operate after desktop closure and main-PC shutdown. The
panel no longer instantiates `CIFix`; the old controller remains only for legacy
manual tooling/evidence tests, not an automatic delivery path. Shared pure
`ci-evidence.js`, `ci-delivery.js`, `ci-footer.js`, `ci-history.js` and `ci-states.js`
own policy for both legacy tools and the new worker.

`monitor-engine.js` verifies only its local Core's live agents, repository allowlist,
current footer/explicit-label/unique-feature-branch PR mapping, fresh terminal
identity, selected state, open PR/head and latest complete Actions attempts.
`monitor-runner.js` owns the ~60-second loop, per-Core singleton and atomic bounded
attempt history; uncertain sends survive restarts and are never replayed. No private
agent API, force, interrupt, raw keys, transcript-based PR matching or credentials
are used. A blocked target is never eligible. Different Core hosts have separate
histories, not globally coordinated failover.

`monitor-host.cjs` is explicit limited-user Windows scheduled-task setup; it never
patches Core, restarts an agent, elevates, stores a password, or copies credentials.
`monitor-control.cjs` transports its owned code/public config/history over supported
local/SSH `hc exec` with stdin. Enabling auto-fix authorizes guarded provisioning;
there is no separate Background status/Check section, machine picker or repository
input. Existing Git repository selections own the scope. `ensureMonitors` yields
from the header's existing lifecycle event and coalesces connected-host/config
changes without a timer, desktop polling or persisted setup jobs. It checks package
hashes and installs only missing/outdated owned companions; ordinary settings
updates do not restart them. Native checking/disabled contexts cannot provision.
Explicit preference changes synchronize to reachable hosts recorded in runtime-only
`custom.git.monitor-hosts`.
Offline hosts retain their last config, with failed sync reported. Closing the app
does not disable monitors. Registry `onSettingChange`/async `onEnabledChange` are
explicit preference-action hooks, not render observers or persistent job queues.
The host must remain awake/online with its Windows user signed in; other OS/custom
sessions and pre-logon/logout operation are not claimed. Build/tests never install
tasks or send to real agents; the enabled runtime provisions authorized hosts. See [worker lifecycle](GIT-CORE-MONITOR.md)
and [message/evidence rules](GIT-CI-FIX.md).

The 1px native CI pass is owned by the panel body immediately below the header,
independent of pin/agent selection; no JavaScript frame loop is used. Merge-conflict
icons require GitHub's explicit `CONFLICTING` mergeability, never a CI failure or
`UNKNOWN`. The red-circle wrapper owns its native hover tooltip. Both circle and
X are SVG strokes with no fill, matching PR icons' 2-unit rounded stroke style.
The normal or hovered row background shows through without hard-coded colors.

## Complete Usage plugin

`src/plugins/usage/` owns the quota dialog, summary, settings UI, collection store,
models, account-display selection and compressed collector. Stable `custom-usage`,
`custom.usage.<machine>.*`, Settings `usage` and footer IDs remain unchanged.
The plugin is enabled by default; existing per-machine preferences remain independent.

Generic `pluginIsEnabled(id)` gates UI and request boundaries. Optional
`onEnabledChange` handles explicit toggle cleanup/invalidation. Usage increments
runtime-only `custom.usage.generation`; the store captures it around worker-file
reads and local/SSH execution. A disabled or obsolete generation cannot launch
follow-up work or publish results. Stale loading flags cannot block a fresh
collection after re-enabling. Already-executing workers are not killed.

The generic `pluginEvent('sidebar.sync')` moment runs from the permanently mounted
header. `lifecycle` handlers receive the current `enabled` flag even when disabled,
so plugins can hide/reclaim owned UI; ordinary enabled-only events are unchanged.
Usage's handler performs only existing narrow layout reconciliation, with no polling,
credentials, provider reads or render-time commands. Disabled dialog copies close
by captured overlay ID after yielding; stale shortcuts/settings controls are guarded.
The Settings page and footer/Look entries are availability projections, not destructive
preference migrations. Node preference validation still knows disabled section IDs.

`ui/choice-menu.js` owns pure account-style pill/choice presentation: the 12px
muted chevron, upward native Popover, menu bounds and shared row/selected-slot
geometry. Callers supply focus, index and callbacks; the account controller keeps
its authentication, loading, cache and switching behavior. Left trigger presses
bubble to native Popover rather than a second JavaScript opener.

Claude session switching is not quota collection: its read-only terminal-label
identity helper is shared in `src/shared/claude-context.js`, independently of Usage.
The collector, credentials, caches and session/account IDs are never exported with
portable plugin preferences. No native source or Core document changes are needed.

Usage's widget is navigation only, even while stale or loading: it preserves pin
positions/provider identity, shows `---` for unavailable, failed or stuck snapshots,
and opens the selected machine's dialog. Routine automatic refreshes retain the
current numbers until successful replacement. `reportDisplayable` allows the next
minute tick after the ten-minute TTL and holds good values through a bounded
135-second in-flight request. Missed ticks and hung requests become actionable;
expired loading leases release manual refresh controls and invalidate late replies.
A prior collector error stays visible during recovery until a successful result. Its reusable quota-value cell keeps healthy text at its original intrinsic width
and alignment. `on_size_change` converts its rendered widths through the captured app zoom into
logical widths without triggering a reflow;
unavailable placeholders reuse those measured widths. An invisible layout-only
reference covers an initial stale snapshot without displaying its old percentage.
No oversized fixed value/caption columns are introduced. Each pinned quota renders
its own icon/value pair, even for the same provider. Pair identity and fallback
artwork come from pin keys. Per-view metadata retains only icons, captions and
measured widths (never cached quota values), scoped by host and pin set.
`reportFresh` retains the strict ten-minute age contract for cross-machine reuse;
widget and card presentation instead share `reportDisplayable` so scheduled work
does not flash placeholders or demand manual action. Cards retain clearly marked last-known
values; their **Refresh required** action and refresh icon force a scoped collection,
with the existing single-flight/generation guards and Retry-After handling. The
Claude-card refresh collects every Claude account on the selected machine, including
hidden accounts and new discoveries, without querying or replacing other providers.
The selected report ID still owns feedback; per-account Retry-After and last-success
history remain intact. Account selection and pins are not rewritten by refreshing.
The Usage view coordinates one active refresh icon: only the initiating provider or
global icon rotates; all refresh controls stay disabled through collection and
the existing 600ms feedback floor. Live click guards also reject stale pre-paint
callbacks, without starting feedback on a second control. No widget leaf starts collection. The existing minute timer also redraws age-dependent status.
The mounted view observes window activation, selected machine and Check usage changes,
then yields before calling the same guarded refresh path; no click/modal is required
and no additional timer is introduced. Collection completion time cannot postpone an
older reused or unrefreshed report's expiry. Automatic collections reuse fresh reports
from this machine as well as peers, so one expiring account does not re-query healthy
siblings. Manual refresh still bypasses reuse; Retry-After and generation/single-flight
guards remain unchanged.

The collector discovers the default A1 Codex OAuth store (`~/.a1/agent/auth.json`)
even when the desktop/SSH environment lacks `PI_CODING_AGENT_DIR`. Login candidates
remain grouped by account identity, so a fresh A1 copy can replace expired CLI copies
without changing pins, borrowing another account, rotating credentials or launching
a CLI. Discovery adds only a local read; credentials remain worker-private.

## A1 space-color matching

All of it is the A1 plugin (stable ID/folder `src/plugins/a1-colors/`); Spaces and Tabs
only announce `spaces.refresh` and `profile.launch` and know nothing about A1.
The plugin owns its master switch and `matchSpaceColor` setting under
`custom.plugins`. The retired `renameSession` field is ignored. `state.js` reads the legacy
`custom.match-agent-session-color` only as the fallback for unset master/color choices;
explicit generic preferences win without destructively rewriting legacy records.
No plugin switch gates vanilla A1 → Herdr name reporting. For each Spaces view copy it keeps `session-sync.js`, a single-flight,
per-machine synchronizer targeting every live reported A1 pane in each space,
not only the focused agent. Space color and membership changes trigger a new
sync immediately; unchanged groups get a five-second fallback check.
Its worker `session-color.cjs` (shipped in the plugin folder, found with `pluginFile`)
uses the shared Node plugin API (`../api.cjs`) for versioned descriptor discovery
and exact runtime/session `accentColor` settings reads/updates, only when it differs. It checks fresh captured
terminal/session/space/tab bindings and a short expiry before writing; nothing
is persisted for later replay. Disabling stops new work, not already-applied or
in-flight changes. Only A1 Current color changes, never its saved Default.

Space colors remain the source of truth in `custom.space-colors`, mirrored to
`space.colors`. Matching neither migrates unrelated stored state nor rewrites
space colors. Named mapping aligns
hues (including the pink-tinted Red swatch); saved hex colors map to the nearest
A1 palette because the API does not accept RGB. No private endpoint records,
transcripts, input injection or native patches are involved.

A1's shared integration API requires exact session and runtime UUIDs but exposes no terminal inventory.
The native contract uses `a1.session`, `a1.runtime` and `a1.at` labels,
written by A1 itself to its local Core. Only complete fresh native identity is
accepted; partial bindings fail closed. This requires no remote App/customizations/companion.
Live matching validates the target's fresh identity and acknowledged settings API,
not a desktop installation's version; see [A1's integration contract](A1-COLOR-CONTRACT.md).

The API separately validates the exact active runtime. There is no companion,
older-protocol adapter or stored-state cleanup path. Explicit profile A1 executable
paths survive their shell wrapper as the launch-time `custom.profile.a1-command`
routing hint, captured and rechecked by the worker, never used as identity authority.
The generic client never falls back from an explicit installation to another PATH A1.

The plugin's `profile.launch` transform (`launch-color.js`) targets the merged protocol-1 A1 contract,
without version/capability negotiation or compatibility retries. With matching
on, an explicit interactive A1 profile launch in an existing identified space
receives `--session-color <latest-space-color>` in its actual startup argv, before
any literal `--` prompt boundary. This selects the matching color before A1's
first startup/trust/editor frame. Profile names/IDs do not matter: only a recognized
A1 executable and interactive argument grammar qualify. Explicit user color
options, wrappers, comparison/CLI commands and unknown flags remain unchanged.
Disabled matching adds no option. Actual startup argv is the only launch-color
payload; queued colors are never authoritative. No settings or persistent shell
color environment are written. Older A1 installations are not automatically
negotiated; update them before using this launch path with matching enabled.

Manual shell starts and new-space launches without a known space ID retain
identity-driven live matching after startup. Existing live synchronization also
handles subsequent space-color changes. Identity/membership changes schedule
immediate sync; matching retains a five-second fallback for live API changes.
Unavailable identity/control is silently skipped, with no warning toasts. No private runtime inventory is read.

## Empty spaces and close policy

`shared/space-preferences.js` owns the version-1 `custom.spaces.preferences`
switches (`confirmLastTab: false`, `closeOnLastTab: true`, and optional
`connectFleetToCoordinator: false` by default). Settings'
Spaces page edits only those switches through the host facade; the preference
exporter allowlists and type-checks them without exporting runtime identities.

Herdr cannot retain zero-tab spaces through its public commands. The mounted
Custom Tabs view starts `shared/space-lifecycle.js`: when retention is enabled,
it prepares connected spaces with one terminal-free `custom-space-start` mod tab.
This is a supported layout operation, not a document write or native override.
`run()` enqueues commands while model readers retain the current snapshot. Pending
creation therefore returns not-ready without being treated as an immediate error.
A five-second `custom.spaces.start-pending` lease coordinates requests across mod
copies; it is runtime-only, expires, and never replays deferred close/create jobs.
The lifecycle observer acknowledges the actual Start pane on a later snapshot,
then settles/moves it. Missing acknowledgements warn once after ten seconds;
loading/offline/removed spaces are not failures, and exceptions/backoff are isolated
per space rather than blocking other local/remote preparations.
It restores selection/focus after preparation, hides only a sole Start-mod pane
from the Custom tab strip, and settles it out of native tab-next/previous while
work exists. Normal terminal exits leave that tab in place. Steady state issues
no structural commands. Re-enabling auto-close removes only terminal-free Start
tabs alongside work; it never closes already-empty spaces or real processes.
A split Start tab is ordinary work, never automatically removed.

`isAutomaticSpace` exempts spaces whose id is Firstmate's own adoption label
(`fm-<home>`, optionally machine-prefixed): reconciliation treats them as auto-close
regardless of the preference and closes a Start tab left alone there, so Herdr removes
the space. Ids Herdr issues (`sp` + 32 hex) and any other id are unaffected.

The controller observes new/reconnected spaces every 250ms; it cannot intercept
native creation/removal atomically or override another client's space.close.
A space that disappears before observation cannot be recovered without new native
APIs. Preparing spaces requires Custom's mounted tab bar and a ready machine
layout. Prepared Start tabs persist across desktop shutdown because they are
ordinary machine-layout mod tabs, not runtime shared-state snapshots. Other
layouts/clients can expose those mod tabs, and need the private mod installed to
render them. No fake terminal, daemon or terminal input is used.

`ui/close-space.js` applies the policy to explicit Custom close entry points,
counts only work tabs, and ensures retention before closing the final work tab.
`features/confirm` captures the space and (for retention) tab ID; stale targets
never fall back to focus. Explicit Close space retains its confirmation when
work remains, but bypasses it for a Start-only empty space across all preference
combinations. Other mod panes and mixed Start/terminal splits remain protected.
`shared/profile-actions.js` is the shared +/Start-page launch path, using existing
machine-scoped discovery and the tab bar's profile worker. Merely showing a Start
page never starts a terminal or agent. Compact icon rows mirror menu visibility,
including unavailable profiles. The content has no large title, icon or Edit
profiles action; a checkered racing flag belongs before Start in the pane header and uses the
same programIcon wrapper/16px geometry and 2px rounded outline as the robot glyph.
A visible-page metadata check follows the existing Tabs catalog without extra
discovery. Unavailable or pending rows ignore clicks while keeping their normal
text/icon colors: no native disabled style, opacity changes or added status content.
Explicit bounded profile-list height prevents later rows being clipped by native
scroll-container measurement.

`ui/directory.js` stores the last valid live location in the bounded, machine-bound
runtime map `custom.spaces.last-directory`. `ensureSpaceStart` captures it before
returning, both from explicit final-tab closes and the existing 250ms lifecycle
observer. With no terminal panes, directory resolution uses that record before the
original launch folder. Start and + launches share the same resolver; direct native
commands are unchanged. Empty unnamed spaces keep their last directory label.
Missing reports cannot overwrite a valid snapshot with a fallback HOME, and paths
never cross machine identity. The map is not a preference and is never exported.

## Cross-space tab moves (explicit document-write exception)

**Move to...** in the tab context menu lists other spaces on the **same machine**,
including connected machines such as `pc2`, with sidebar badges/names. Cross-machine
moves are rejected. Enter/Right opens the list; Left/Escape returns. Compatibility
inspection starts as soon as a valid tab's parent context menu opens (hover/entry
are fallbacks). Destinations appear immediately from the existing model snapshot,
without loading text; unverified actions cannot write. No item tooltips. Mouse-open
does not select the first destination; keyboard selection suppresses pointer hover,
and separate submenu row IDs prevent retained parent-hover state leaking across.

`shared/tab-moves.js` sends a short-lived domain request over the existing native
mod command channel to the mounted Tabs receiver (`features/tabs/rename-keys.js`).
There is no persisted mutation queue or restart replay. The popup never owns the
write. A bounded shared busy lease coordinates local copies, not other clients.

`services/tabs/move-tab.cjs` orchestrates the operation; the document shape, exact
App/Core profile and **sole CAS write site** live in
`integration/herdr/documents/tab-move-v1.cjs`. The packaged local worker uses
`core-rpc.cjs` for a short-lived `hc connect` process; it never stops a Core. No
native rebuild/patch or new remote companion is used. This exception is explicitly
authorized for tab moves only; it does not apply to shell replacement or other docs.

The adapter requires App 0.1.15+ / running Core 0.1.19+ / generation 1, required
Core methods and App preparation commands. Newer unreviewed versions remain
eligible; the review list records evidence, not runtime permission.
Remote routing remains in that same adapter: validate the connected machine's
identity/session/version, verify its live hello using a fixed read-only Node/hc
probe, then route document calls with `on` and terminal calls with the exact
machine prefix. Normalize only terminal address/parent and clicked UI IDs, never
mod props or adoption-label values. Recheck the pinned binding around each call.
No remote App installation, new companion or cross-machine terminal migration.
Below-minimum/unreadable versions, missing capabilities and unknown generations/shapes
disable moving, not Custom. Whole tab objects and stable
pane/terminal IDs are retained; unrelated fields are not reconstructed from UI
projections. Unknown structural data, floating panes/custom pane headers/previews,
Start pages and detected space-bound mod props are refused. Moving never opens the
moved tab or switches to its destination. Prepare a normal Start tab through public
commands so even a final-tab move leaves the source space open. The shared busy
lease protects that preparation from the lifecycle's normal auto-close cleanup;
afterward ordinary close preferences resume without changing any saved setting.
Work is inserted before a target's trailing Start tab to avoid an extra reorder. No terminals are killed or
created by the move worker; cwd/startup environment do not change.

After committing, verify Core/app membership and reconcile only terminal adoption
labels, including verified unshown descendants (not children with their own panes
elsewhere). A label failure is partial success; the submenu offers explicit
**Repair move metadata** on the tab's current location. Repair derives desired
membership from the latest document and never writes that document. Timeouts are
unknown outcomes, not permission to replay or restore an old whole-document backup.
There is no automatic-follow selection request after a move; user navigation is
left alone. After a moved/partial result is acknowledged in the window snapshot,
Tabs sends a three-second `custom-spaces.tab-arrived:` presentation command (not
shared state). `features/spaces/tab-arrival.js` validates qualified destination/tab
membership, expiry and duplicate tokens, then sequences a native content-only pop
with three one-shot phase callbacks. No background/glow layer is added; hover and
selection surfaces stay still. New moves supersede old callbacks. Expanded rows
pop their icon/label; compact rows pop their badge; folded machines pop their
header label/icon without changing folding, focus or scroll. Hidden/unmounted views do not replay feedback.
Failures, unknown outcomes, missing acknowledgements and repairs send no arrival.

CAS cannot protect a native client's unflushed model edits; labels have no CAS or
transaction with the document. No competing watcher tries to make this atomic.
Capability/shape checks and synthetic failure tests reduce coupling but cannot
prove silent semantic compatibility: a generation-1 `doc.set` that stopped
honoring its expected-version CAS could overwrite another client's newer tabs,
even while its method name still exists. No exact-version pin is retained to
avoid that risk; native CAS/atomic semantics remain an explicit dependency. `check:host-api` reports the separate tab-move gate and,
for unknown App versions, automatically runs the development-only pinned-source
and synthetic regression audit. Known versions stay offline in that ordinary check;
`npm run check:tab-move` explicitly audits upstream evidence. No audit rewrites a
runtime profile, runs downloaded code, connects to a Core or proves native continuity.
See [audit commands and limits](TAB-MOVE-COMPATIBILITY.md).
See [the decision and limits](TAB-MOVE-ADR.md) and
`tests/tab-move.test.mjs` / `tests/tab-move-ui.test.mjs`.

## Native patch policy

The active registry contains only `frame/palette` and `frame/feedback`. A new patch
must have all of the following before approval:

- no supported private-mod/facade alternative;
- exact reviewed stock baseline(s);
- Custom-only behavior where possible;
- atomic apply/check/restore with unknown-edit refusal;
- explicit local opt-in record;
- disposable native test plus real UI inspection;
- documented behavior loss if retired.

Never patch `mods/confirm`, `mods/prompt`, `mods/toast`, or another built-in mod merely
to restyle it.

## Shell tabs and profile startup

The pane's shell menu is **Open new tab in…**. Selection uses `run('tab.new',
{space, folder, argv})` through the facade. Keep machine-qualified space IDs and
use the clicked pane's working directory. The existing terminal/tab/splits remain
untouched; there is no replacement worker, shell handoff queue or automatic kill.
Do not restore the retired `shell-replace.cjs` or replay old `custom.shell-switch`
state. Architecture tests forbid core-document writes everywhere except the exact,
explicitly authorized tab-move CAS boundary described above.

Profile launching remains a separate explicit action, implemented in
`src/services/terminals/profile-launch.cjs` and `src/features/tabs/profile-launches.js`.
It uses supported terminal APIs and adoption labels, with a disposable default-shell
probe when needed. Its existing `doc.get` space-existence check still depends on a
read-only internal shape; this narrower dependency is not covered by `check:host-api`
and must not acquire write access through the separate tab-move exception.
No profile startup path writes the core document.

### Profile roles (Run as Firstmate)

`shared/profiles.js` exposes `role` (`'firstmate'` or `null`) from a validated boolean
`firstmate` on the custom entry or its override, keyed by the stable profile key; the
Terminal row never has one. The editor's checkbox is separate from **Show in + menu**;
`ui/rolePill` marks role profiles in Settings, the **+** menu and the Start page.
`profile-actions.js` copies the role into the captured launch job and allows one pending
role job per machine. `tabs/profile-launches.js` runs `pluginGate('profile.role.<role>')`
before reading the worker source and treats any refusal as the job's failure: a
coordinator profile is never started as an ordinary agent. `roleLaunch` accepts only a
startup folder, `custom.*` labels and a scoped environment (`PATH` and `FM_*` keys) from the
gate; argv remains the profile's literal command, with optional transforms (A1 colors)
applied afterwards. The Firstmate gate prepends A1's `pi`-compatible launcher directory to
that terminal's `PATH` so Firstmate spawns A1 workers instead of stock Pi, and refuses when
the launcher is not installed on the clone's machine. `profile-launch.cjs`
re-validates the role request and adds `custom.profile.role` plus the gate's labels to
the `terminal.run` labels. The Firstmate plugin's gate (`prepareCoordinatorLaunch`) only
reads: configured machine/folder equality with the captured machine, machine state,
repository root, A1-only executable grammar, a label-filtered live-owner check and the
exact clone revision/dirty state. It installs, fixes, pulls or unlocks nothing, and its
labels record what was launched, not Firstmate readiness or ownership (Firstmate's own
session lock stays authoritative). The role is an allow-listed portable preference.

The built-in Claude profile now carries its profile ID through the startup queue.
At explicit launch time, the worker routes a configured `claude` executable through
the target machine's companion `claude-as.sh` launcher. Only that companion creates
and removes private credential/config mirrors; the customization does not copy login
files. `--command` preserves the configured binary, and `--` preserves literal CLI
arguments. Git Bash/Bash is resolved read-only on that host. Missing isolation support
fails before starting a visible agent, with no fallback to a shared login. Other agents
and custom launcher commands retain their configured behavior. Running sessions are
never converted or restarted by deployment.

Other intentional couplings remain: gpui-kit/gpui-base APIs, native command
argument/result shapes, and explicit external network/auth/core-management workers.
The facade handles public Herdr API/command naming; it cannot guarantee those
contracts. Native tests and focused integration/manual checks remain necessary.

## Required workflow

```powershell
# Run from your standalone source checkout, wherever cloned
npm run report:ownership
npm run check:host-api
npm test
npm run test:integration
npm run test:native
npm run deploy
npm run doctor
npm run check:native
```

Do not force a deployment through conflicts. Investigate unknown files and preserve
personal edits or recovery material before cleanup.
