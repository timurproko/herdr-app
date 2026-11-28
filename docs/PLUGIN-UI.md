# Plugin UI: declare it, don't draw it

A plugin's Settings UI is **declared** in its `plugin.js` (and, for a page of its own, in
a declaration file its `panel.json` hands to Settings). One renderer,
`src/features/settings/plugins-ui.js`, draws every declaration from one kit,
`src/ui/settings-kit.js`. A new plugin therefore needs no UI code, and every plugin looks
and behaves the same: same rows, buttons, badges, dropdowns, popups and sizes.

`tests/plugin-ui-contract.test.mjs` enforces it:

- the renderer, the kit and the folder browser name no plugin and use no plugin's wording;
- `plugin.js` and Settings extensions never import `gpui-kit`, `gpui-base`, `ui.js` or the kit;
- retired kinds (`folders`, `entries`, `checklist`, `searchable`, `pick`) are not declared.

A plugin's own panels and dialogs (its `mod/`, e.g. the Git sidebar or the Usage dialog)
are its own UI. What they have in common comes from the panel kit (below); what makes
each plugin itself (pull request rows, the file tree, quota cards) stays in the plugin.

## App-wide basics (`src/ui/ui.js`)

Every mod ships `ui.js`, so these are used across the whole app (pane and panel headers,
tabs, Spaces, every popup menu, Settings rows), not only by plugins:

| Part | Use |
|---|---|
| `iconButton(t, { id, icon, label, enabled, available, large, tooltip, color, onClick })` | the one small icon button: `enabled` false = inert (hidden until hover), `available` false = dimmed and inert, `large` = a bar's own 28px button |
| `menuRow(t, { id, icon, label, hint, trailing, highlighted, enabled, dim, pointer, onClick, onHover })` | the one popup-menu row: keyboard highlight, optional tick/pill (`trailing`) and shortcut (`hint`); `pointer` false while the keyboard chooses; `dim` false for an inert row that must not look greyed |
| `menuSeparator(t, id)` | a line between menu groups |
| `tag(t, id, label, { compact, tone })` | a pill; `tone` (a color) for a status such as "Needs you" |
| `panelTitle(t, { id, icon, label, labelId, labelColor, medium, shrink, menuLabel }, onOpen)` | a header title that opens a menu (the right panel's switcher, a terminal's shell menu); `icon` may be an element |
| `collapsible(t, { id, title, open, onToggle, chevron, trailing, label, on, tint, panel, inset, bodyInset, bodyPadY, bodyGap, bodyHeight }, body)` | the one expandable section (Settings' Requirements/Settings/list sections via `disclosure`, Usage's Resets): open, header and body share one panel that fades in behind both. `chevron` `"start"` (right/down before the title) or `"end"` (down/up after `trailing`); `on` is the card color it sits on, `tint` (default 0.5) how strongly the panel stands out from it (Plugins use 1), `panel` an exact color; a known `bodyHeight` slides the body open |

`tests/plugin-ui-contract.test.mjs` fails on any hand-built icon button or menu row in `src/`,
apart from a short, explained allowlist (the definitions, the pin toggle, colour swatches,
Git's pull-request robot).

## The panel kit

`src/ui/panel-kit.js`, shipped with each panel through its `panel.json` `shared` map:

| Part | Use |
|---|---|
| `headerTool(t, { id, icon, label, enabled, onClick })` | an icon button in a panel header, inert until the header is hovered |
| `contextMenu(t, { id, prefix, items, heading?, headingId?, focus, state, onChoose, onClose })` | a right-click menu; `items: [{ id, label, icon, separator? }]`; arrow keys, Enter, Escape and pointer highlight |
| `confirmDialog(t, { id, title, body, subject?, confirm, focus, onCancel, onConfirm })` | a question before an irreversible action; Escape cancels, Enter confirms |
| `panelMessage(t, id, { text, loading })` | what a panel shows instead of content: the working bulb while loading, else a muted line |
| `tag(t, id, label, { compact? })` | a small pill ("Max", "Owner"); `compact` for meta lines |
| `inlineDropdown(t, { id, text, label, options, selected, open, focus, onOpen, onSelect, optionPrefix? })` | a dropdown that reads as text (an account email) |

The contract test checks that the Files, Git and Usage panels import the kit and don't
rebuild these parts. Add a part here when a second panel needs something a first one built.

## The card

Every plugin gets a card: icon, name, version, on/off switch and `description`.
Optional `descriptionLinks: [{label, url}]` appends fixed HTTPS text links using the
existing inline-link styling. No URL is assembled from credentials or form values. Below it,
in this order, as declared:

| Declared | Drawn as |
|---|---|
| `prerequisites` without `section` | **Requirements**: one row each, Check, a status badge, Install all |
| `prerequisites` with `section: true, list` | a **list section** of its own (below) |
| `settings` (not `hidden`, not `place: 'requirements'`) | **Settings**: one row per field |

`advancedSettings: true` starts Settings collapsed.

## Settings fields

`settings: [{ key, type, label, about, default, … }]`, saved per plugin by the registry.

| `type` | Control | Extra |
|---|---|---|
| `toggle` | switch | |
| `choice` | segmented control | `options: [[value, label]]` |
| `select` | dropdown | `options: [[value, label]]` or `options(cx)`, `empty` |
| `multiselect` | dropdown of checkboxes | `options` |
| `machine` | no control in the card: the Settings header's machine picker sets it | `place: 'requirements'` names the machine at the head of Requirements; a list scope names it too |
| `text` | full-width field | saved on blur or Enter, `placeholder` |
| `longtext` | a row with ›, opening a page with a textarea | Apply/Discard footer while changed; `validate(value)` → error text or null, `normalize(value)` maps a stored value to what is shown, `tags: [[tag, meaning]]` are listed under the textarea and typed at the cursor on click, `maxLength` shows a `count / max` counter in the field, `toggle: '<key>'` draws that (hidden) `toggle` setting as a switch on the row, before the › |

| `profiles` | a row with ›, opening a page of the header machine's launch profiles | `role` (one the plugin gates: `gates['profile.role.<role>']`); `title`, the page's name when `label` would repeat its parent; `addLabel`, a button on Settings › Profiles that opens the page (Back returns to Profiles). The page lists the available profiles and any already in the role, each with a switch (in the role or not) and arrows (the role's own order). No edit or remove. Nothing is saved in the plugin's settings: membership and order live with the profiles. |

A profile in a role stays an ordinary profile: the + menu and the Start page list it under
Profiles, launched plainly, and again under the role's heading (`ROLE_LABELS`), in the role's
order, launched with the role, while `pluginGateReady('profile.role.<role>')` holds.

`hidden: true` keeps a setting out of the block (a list's scope, a generated value).

A `toggle` or `choice` may be **live**: `live: { state(cx), set(cx, value, snapshot) }`.
Its operational value is not saved automatically by the renderer; it lives where
the plugin says (a file on the chosen machine, say). The setter may synchronize an
additional public preference explicitly after private acknowledgement. `state(cx)` returns
what the plugin's last check saw, `{ shown, value, available?, statusLabel?, detail?, retry? }`, or null before the first check, and the row
is drawn only while `shown`. Flipping the switch runs `set` like a requirement's fix and then
re-checks the plugin, so the switch shows what is really set; a refusal is said on the row.
`available: false` blocks editing, `statusLabel` uses the existing unmet badge and
`retry: true` adds the standard Retry action for an explicit same-value application.
These are generic declaration capabilities, not plugin-specific render branches.

## Requirements

`prerequisites: [{ id, label, about, check(cx), fix? }]`. `check` returns
`{ status: 'ready' | 'missing' | 'recommended' | 'error', statusLabel?, detail?, configuredValue?, fix?, selection? }`.
A requirement's `statusLabel` overrides its row wording, not its status colour or summary
count. Crew uses the non-optional unmet state with **Outdated** when its selected
machine has a confirmed available update, retaining Update and the installed revision.
This is an attention notice, not a new coordinator-launch or project-action block;
unknown update evidence does not claim outdated, and optional tools remain Optional.

A prerequisite with `updates: true` also participates in connected-machine update
discovery. Its same check receives `updateCheck: true` (skip unrelated setup/list reads)
and returns `update: true` only for a confirmed pending update, `false` for confirmed
current/absent tools, or `null`/omitted for unknown evidence. A pending result retains
its existing `fix.run` update action; missing-tool installation is never a pending update.
Crew's tool and Trello's runtime declare this capability; Trello retains its existing
enabled-plugin and identity-bound runtime-install restrictions. Discovery captures
machine context without changing saved machine settings and runs
read-only checks through bounded execution admission. Unknown reads preserve confirmed
pending facts; disconnected machines do not contribute notification dots.

The ordinary requirement Update and Updates' batch share `plugins-operations.js`:
check, captured context, fix callback, settling recheck and update-action ownership.
`plugins-updates.js` owns discovery/connected-machine projection and batch ordering;
the Settings section uses existing row/heading/button components. Check tickets
reject older result publications across entrypoints. Runtime availability, read tickets,
progress and uncertain-action guards use `custom.plugin-updates`,
`custom.plugin-update-reads` and `custom.plugin-update-actions`, outside portable
preferences. A successful command still needs a fresh authoritative check to clear
pending state; no check, reconnect or abandoned Task automatically replays a write.

- `fix: { label, busyLabel?, statusLabel?, primary?, manual?, requiresEnabled?, confirm?, run(cx) }`:
  the row's button. `manual` fixes are left out of Install all; `confirm: { title, detail, label }`
  asks first.
A check may return `unavailable: {detail}` for a fixed, whole-setup connection
refusal. The renderer shows that detail once in an always-visible Requirements
block with Check and Unavailable, without a numeric fix count, dependent rows,
list sections or settings. Any independently completed group may supply it.
Its Check refreshes all setup groups to retire a refusal supplied by any group,
without provider token verification. Ordinary Requirements Check stays independent.
Other failures keep ordinary row diagnostics; this does not invent a ready state
or change registry status types. Machine/enable-session changes retire it and
stale controls cannot dispatch. Do not use raw provider exceptions as detail.

- `selection: { key, label?, options: [[value, label]], value }`: a dropdown in the row,
  saved into setting `key` (e.g. which Cloudflare account). Changing it re-checks the plugin.

## Settings execution capacity

Settings admits at most two check groups and four Crew command transports at once.
Compatible Requirements/section checks share only benign same-round probe facts,
not publication authority; manual Requirements Check remains independent. Crew's
Windows tool/platform/hook inventory answers twelve requirement rows in one command
(eleven version checks and Agent hooks). Its tool list derives from the actual version
requirements, including tasks-axi and quota-axi. An omitted or malformed version entry
gets one coalesced queued probe of that tool instead of an invented Error/missing result.
Optional Claude settings read/parse/schema failures cannot invalidate platform or tool
facts: only Agent hooks shows a neutral Optional notice, without a speculative fix.
Projects retains last-good rows even when platform, transport, home or list probes fail.
Confirmed badges, fix counts and list rows remain while refreshes wait (actions stay
locked); cold checks stay pending. Check/Refresh supplies activity separately.

The reported **16 execs are running already** limit is native Core, not an app-side
preference: [herdr-core v0.1.22 exec.rs](https://github.com/herdrdev/herdr-core/blob/v0.1.22/crates/herdr-core/src/exec.rs)
lines 22 and 40–47 hardcode `MAX_RUNNING = 16`; `run` acquires its slot before process
creation. There is no public setting to raise that constant in this customization.
No native file or cap is changed. Other native callers can occupy slots, so Settings
retries only the exact outer RPC `unavailable` refusal with 100ms exponential delays
capped at 2 seconds, rejoining the admission tail. Child stderr, thrown transport
errors, timeouts and uncertain submitted writes never authorize replay.

The view-task clock and captured generation guard every wait/dispatch; completed
native Tasks release abandoned ownership, and command leases cannot outlive their
bounded execution allowance. Closing/changing context retires queued work. This is
Settings-scoped admission, not a global semaphore or a change to fleet/Git lifecycles.

## Transient action forms

A prerequisite may declare `form: { fields, actions, when?, enabled?, help? }`.
`when(result)` controls whether the form exists; unavailable forms show no dangling
action buttons or hidden-input actions. Busy but available actions retain the normal
disabled feedback. This is an
explicit operational action, **not** a setting type. `fields` contain
`{ key, type: 'text' | 'secret', label, placeholder?, maxLength? }`; secret fields
use native `InputState.set_masked(true)` and start empty. `actions` contain
`{ id, label, busyLabel?, input?, primary?, when?(result), confirm?, run(cx, values, result) }`.
`busyLabel` changes only that action's in-flight text; undeclared actions retain
Working… (Trello's Save declares Saving).
Only an explicit action with `input: true` receives the transient field values.
`confirm` is explanatory text; confirmation snapshots never contain input values.
`help: { label, url }` opens a fixed HTTPS help page. `enabled(cx, result)` can
refuse unsafe or unsupported contexts.

The shared renderer owns the controls, busy/duplicate guards and clearing. Blur,
Enter, automatic checks and Install all never submit. Values are native view-local
input state, never registry/shared state, localStorage or preferences. Completed
submissions replace the input entities, including undo history. Cancel, close,
disable and machine changes clear inputs and invalidate pending callbacks. Action
results may contain public `detail` only, never input echoes. The renderer does
not display thrown exception text from secret actions.

Action/check context includes captured `machine` (`null` for this computer) and
`isCurrent()`. Check context also has `checkReason: 'automatic' | 'manual'`:
only an explicit Requirements Check is manual, not opening or an action recheck.
A requirement returning `refreshSections: true` refreshes its list sections after
publication without rerunning Requirements or repeating an opted-in list refresh. `result(id)` reads that view’s latest prerequisite result and an
opaque `session` object permits non-secret view/machine-local hint memoization.
`machineScoped: true` on a plugin rechecks it on header-machine
changes without a portable machine setting. A form action additionally receives
`onCancel(fn)`, which registers teardown for a bounded in-flight transport.

Plugin API `privateAction(target, payload, cx)` starts the installed allowlisted
Node bridge and uses native WebSocket frames to hand the value to the worker's
stdin. The reviewed host `exec` API has no stdin option: never invent one, encode
secrets in argv, or substitute temporary input files. The bridge uses only
127.0.0.1, a random single-use session, a 60-second hard lifetime and 256 KiB input;
it rejects browser Origin requests and replays. Its vendored ws dependency and
license are installed with the runtime. Only fixed owner workers are allowed;
there is no arbitrary command facility. Native checking refuses private actions. The fixed Trello route supports captured
direct-SSH destinations through the local bridge: Core/session/user/home readiness
precedes stdin secrets, strict existing host trust is required and no remote socket
or arbitrary command facility is exposed. The planned elevated Windows SSH route
requires the same SID/profile/home as a selected normal-user Core, but remains
hard-refused until protected-output implementation and real two-token storage
proof are complete. This refusal precedes even a Core pipe connection. Windows
public RPC opens use an explicit .NET Identification-level client, not Node's
impersonation-capable default pipe open. A fake server therefore cannot borrow
an elevated client's authority. Fixed public identity probes use an existing Core
RPC connection without autostart;
credentials never travel through Core. A digest-pinned public installer frame is
sent over SSH before READY to keep the fixed command within CMD limits; the
credential/action frame still waits for validated READY. Root, different users,
unsafe metadata and elevated/unverifiable Core remain refused with their actual
reason and next action; the elevated-Core error reaches the single card-level
explanation rather than duplicate requirement failures. No Core launch,
permission, SSH or UAC configuration changes occur. Closing/cancelling cannot promise an
already accepted private-store write was undone; reconcile destination status
explicitly before retrying. Runtime install is a separate explicit prerequisite
fix, using only public deterministic runtime files.

## Saved requirement rows

A requirement may declare `saved: { row(result), confirm?(cx, result), remove(cx, result) }`.
A non-null row `{label}` renders the same hover-Remove component as a list item,
not a different account widget. Optional `saved.replace: true` replaces the
requirement heading row with that saved name and displays its current status at
the right until hover reveals Remove; the default keeps the separate saved row. Removal uses the existing fixed confirmation footer
and fix lifecycle, binding the rendered revision, selected machine and view generation.
A saved row can replace a `form.when`-controlled empty state. Labels/confirmations
contain public names only; no stored credential is loaded into input fields.

## List sections

A list may opt into `list.refreshOnOpen: true`. Its existing disclosure then
rechecks that group on opening; an already-open section refreshes on entry or
machine change too. Check refreshes it even when collapsed. The check context's
`refreshList` boolean distinguishes these provider refreshes from local status
reads and post-Requirements result publication. A list result can return
`refreshRequirements: true` when changed metadata requires fresh account-row revisions;
this rechecks Requirements locally without repeating list refresh or manual verification.
No polling or new control is added.
An opted-in list check can call `publish(result)` with cached local rows before its
bounded refresh finishes; the same captured group/machine guards apply, and controls
remain locked until completion. Unopted lists retain their existing behavior.

A list of things added to the plugin (project folders, repositories): a scope row (what it
belongs to, then Add), the description, and one row per item with **Remove** on hover.

```js
{ id: 'projects', label: 'Projects', section: true, about: 'Git folders crew may work in on this machine.',
  list: {
    scope:  { label: 'Machine', setting: 'machine' },
         // { header: true }                              // captured Settings header machine   // a machine setting → machine dropdown
         // { label: 'Account' }                          // or the check's `selection` → dropdown
    picker: { kind: 'folders', label: 'Add project' },   // the folder browser on the scope's machine
         // { kind: 'items', label: 'Add repo', search: 'Search repositories…' }
    add(cx, folder) {},        // folders: called once per ticked folder
    candidates(cx) {},         // items: → { items: [{ id, label, detail?, disabled? }], add(cx, ids) → { errors } }
    remove(cx, id) {},
  },
  check: async cx => ({ status: 'ready', statusLabel: '3 projects', usable: true, rows: [{ id, label, path?, detail? }] }) }
```

- `list.hideUnavailable: true` omits Add while `usable` is false, leaving the same
  tools rail geometry; in-flight controls on otherwise usable lists keep normal busy feedback.
- The **check** returns the added `rows` (`path` for folders, so the browser can tick them;
  `detail` is a note shown after the label), `usable` (Add works now), a `statusLabel` for the
  header badge and, for an account scope, the `selection` to offer.
- **folders** picker: folders already added start ticked; unticking one calls `remove`. The
  button says Add, Remove or Apply; the footer counts what this visit changes.
- **items** picker: `candidates` runs only when the popup opens (listing can be slow). The
  popup has a search field (`search` is its placeholder), Loading bottom left, and Add.
  Candidates may return public `detail` for an incomplete-inventory explanation above the list.
  `picker.tabs: [[value,label]]` adds the existing segmented choice control, retaining
  the popup's height by reducing its list viewport. Candidate `tab` values select a
  category, the first tab is the opening default, and search filters within that tab.
  Selected IDs survive tab changes until Add or Cancel; changing tabs grants nothing.
  Optional `picker.tabStyle: 'tabs'` uses the lightweight app view-tab treatment
  rather than the field-choice segment; unrelated Settings choices are unchanged.
  `scope.divider: 'items'` draws the scope separator only when added rows exist;
  without that opt-in, scope rows retain their existing separator.
- `list.recheck: 'plugin'` refreshes all that plugin's prerequisite groups after a
  committed list action when the change also affects another requirement's readiness.
- One change runs at a time; refusals become the section's detail. Folder-change failures
  distinguish the attempted operation/target from the plugin's own explanation. An error
  may provide `folderMessage(path)` to compose a concise target-aware summary instead of
  the default operation sentence and plugin attribution. Crew uses this for Add, unticking
  folders and row Remove: **Could not add D:\Git\site.dev: another session owns the Crew home; change its projects from that session.**
  Crew usage refusals instead say **Could not add D:\Git\site.dev. Crew did not accept the project name site.dev; update the Crew tool and try again.**
  A known-outdated install names the machine to update; other known refusals give concise
  guidance, and unknown errors show only their first line's first sentence, never a usage
  block or multiline tool output. Full raw output stays in existing diagnostics only, if
  available; project changes add no new log. Other plugins keep the default wording with
  their declared name. Batch changes retain successes and refresh the authoritative list
  after reporting failures. Lists start collapsed.
- Crew names a project after its folder: 1–40 lowercase ASCII letters, digits, dashes and
  dots, starting with a letter, digit or one dot followed by one, with no consecutive or
  trailing dots. Safe dots stay, and a folder starting with a dot keeps one leading dot, so
  `D:\Git\xrbuild\.xrbuild` is added as `.xrbuild`, separate from `xrbuild`. An older Crew
  that refuses the name gets one request and the update message, never a retry under
  another name. A folder the last list already shows, under any name, is not sent again:
  Add says **Could not add D:\Git\xrbuild\.xrbuild: it is already added as xrbuild-private.**
- A deep link `{ section, search }` (Settings props `pluginSection`, `pluginSearch`) opens
  an items picker filtered to that search.

### Inline informational hints

A list can declare `descriptionHint: {label, entries: [[name, sentence], ...]}`.
The common renderer appends its accent-coloured label after the description with a
dashed underline, not a solid link underline. It has no click action. Hover uses
Usage's 400ms/100ms HoverCard; keyboard focus shows the same passive body through
Popup, without a focus trap. Entries use bold names followed by wrapping sentences,
a 440px body, 18px line height and 8px spacing, with the existing menu surface.
Crew uses three short entries for Delivery kinds, without column headers. The older
`{label, columns: [...], rows: [[...], ...]}` format still uses shared `panel-kit.js`
hintTable; Usage is unchanged. Existing descriptionLinks remain clickable links.

### Optional list-row choice

A list may declare `rowChoice: { label, options: [[value, label]], set(cx, row, value) }`.
Checked rows opt in with `choice: { value, revision, identity? }`; `revision` identifies
the confirmed resource/value. Optional `identity` is the stable registration identity
(independent of value), retaining focus handles when only the stored value changes.
Without it, focus reuse falls back to `revision`. Every reread still invalidates old
callbacks. No choice means the existing row is unchanged.
The common renderer keeps a quiet left-aligned, untruncated label and reveals `optionDropdown`
on hover, trigger/Remove keyboard focus or an open menu. Tab reaches the persistent
trigger and Remove; Enter/Space opens, arrows navigate, Enter selects and Escape
closes without applying. Focus handles are allocated when check results arrive,
never while rendering. Pointer-origin dismissal (selection, Escape or outside) moves focus to the list,
so only current hover or intentional keyboard focus reveals a closed row. Keyboard-origin
editing restores its persistent trigger. Quiet and revealed text share their left edge.
The choice owns 150px before the separate 80px Remove rail;
only the folder/label column shrinks. An open menu survives pointer departure.
The renderer captures row, machine and view-session identity; obsolete callbacks
cannot apply to replacement rows or machines. Setters are explicit list operations,
not saved plugin settings, and selecting the confirmed value is a no-op.
The setter returns `{ value }` only after its owner confirms the stored selection;
the pending menu choice never changes the label. Application is single-flight, then
rechecks the authoritative section while retaining the confirmed body. A failure is
one short row-local line, not a duplicate section error. An error with `uncertain:
true` blocks that row until a successful fresh check; it never replays the setter.
Failed checks must return retained confirmed rows with `usable: false` rather than
inventing empty results. Machine/session/registration replacement retires errors and
menus, and a retired completion cannot clear a newer operation's busy state.
Completed list work releases its ownership token; setup cleanup checks its own owner,
so a later machine switch cannot mistake a setup action for earlier list work.

Crew supplies this declaration only for valid `project-kinds` v1 rows after its
explicit `crew project --capabilities --json` probe. Its JSON list owns the home,
registered name, folder and kind; `set-kind` receives that captured home/name and
`--expected-path`, never `project add` or a configuration-file write. It rechecks
capability before dispatch and validates the full stored-value acknowledgement.
A valid stored-value success is accepted even while a coordinator owns the home,
without an app-side owner gate. Older Crew's `home-owned` setter refusal says only
**Delivery kind was not changed. Refresh and try again.** Other refusals remain Crew's
policy, with no bypass. Add/Remove ownership wording is unchanged.

## Settings section rows

An enabled plugin can declare `settingsRows(section, context)` returning toggle rows
`{key, title, about, available, statuses}`. The key binds an existing hidden typed
plugin setting; Settings uses `pluginSettingsRows(section)` and the standard row,
toggle and status badge, not plugin-rendered UI. Status entries contain public
`machine`, `detail`, `label` and `status` facts. Queries must be effect-free. Captured
change callbacks recheck plugin enablement and current availability before saving.
Crew contributes its single global project-space choice to `spaces`; selected
machine and fleet attachment do not scope this preference. Private target/status
state stays outside portable plugin settings.

## Space tags

`spaceTags(space, cx)` → `[{ label, tooltip? }]`: small pills at the right edge of a space's row
in the Spaces sidebar (Crew: the space running its coordinator), drawn like a pane header's
role pill. Synchronous and cheap: it runs on every draw, from live data only (`panes()`,
`terminals()` through the plugin API). Only enabled plugins are asked; at most 3 tags each.

## Existing-session group priority

`agentGroupFirst(group, {terminals})` is a pure metadata contribution for the grouped
Agents panel. The registry asks declarations, including disabled ones because turning
a plugin off does not end existing sessions. Providers must use only the supplied
snapshot: no reads, writes or action authority. Agents stably partitions complete group
objects, promoting marked groups without changing member order, ids, folds, counts,
selection or drag handlers. Crew marks groups containing a live terminal whose exact
address matches a member and whose coordinator-launch metadata is present. Group names
never establish a role. Priority mode retains its existing ordering.

## A page of its own

For preferences that belong on their own Settings page (Usage), `panel.json` declares
`"settingsPage": { "mod": "custom-settings", "section": "<id>", "entry": "<file>", "export": "<name>" }`,
and that export is a page declaration, not UI code:

```js
export const usagePage = {
  id: 'usage', title: 'Usage', about: 'Account quota preferences for the selected machine.',
  machine: true,                       // values are per machine: the Settings header's machine
  enabled: () => pluginIsEnabled('usage'),
  // Optional, machine pages only: a Refresh after the header's machine dropdown.
  refresh: { label: 'Refresh usage', busyLabel: 'Refreshing usage…', enabled: machine => …, busy: machine => …, run: (machine, cx) => … },
  fields: [
    { key: 'enabled', type: 'toggle', label: 'Check usage', about: '…', get: machine => …, set: (machine, value, cx) => … },
    { key: 'percentages', type: 'choice', label: 'Percentages', options: [[false, 'Used'], [true, 'Remaining']], get, set },
  ],
};
```

The plugin owns where values live (`get`/`set`); the generated `plugin-pages.js` passes the
declaration to `pluginPage()`, which draws it with Settings' own rows.

## The kit

`src/ui/settings-kit.js` holds every part and every size (`KIT`): row buttons 80×24, badges
72, scope dropdowns 150, Add popups 320×350 with a 56px header and 80×26 footer buttons.
To change how all plugins look, change the kit; to give plugins a new capability, add a
declaration kind to the renderer and document it here, never a plugin-specific branch.
