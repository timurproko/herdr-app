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

Every plugin gets a card: icon, name, version, on/off switch and `description`. Below it,
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

A `toggle` may be **live**: `live: { state(cx), set(cx, value) }`. Its value is not saved by the
registry; it lives where the plugin says (a file on the chosen machine, say). `state(cx)` returns
what the plugin's last check saw, `{ shown, value }`, or null before the first check, and the row
is drawn only while `shown`. Flipping the switch runs `set` like a requirement's fix and then
re-checks the plugin, so the switch shows what is really set; a refusal is said on the row.

## Requirements

`prerequisites: [{ id, label, about, check(cx), fix? }]`. `check` returns
`{ status: 'ready' | 'missing' | 'recommended' | 'error', detail?, configuredValue?, fix?, selection? }`.

- `fix: { label, busyLabel?, statusLabel?, primary?, manual?, requiresEnabled?, confirm?, run(cx) }`:
  the row's button. `manual` fixes are left out of Install all; `confirm: { title, detail, label }`
  asks first.
- `selection: { key, label?, options: [[value, label]], value }`: a dropdown in the row,
  saved into setting `key` (e.g. which Cloudflare account). Changing it re-checks the plugin.

## List sections

A list of things added to the plugin (project folders, repositories): a scope row (what it
belongs to, then Add), the description, and one row per item with **Remove** on hover.

```js
{ id: 'projects', label: 'Projects', section: true, about: 'Git folders crew may work in on this machine.',
  list: {
    scope:  { label: 'Machine', setting: 'machine' },   // a machine setting → machine dropdown
         // { label: 'Account' }                          // or the check's `selection` → dropdown
    picker: { kind: 'folders', label: 'Add project' },   // the folder browser on the scope's machine
         // { kind: 'items', label: 'Add repo', search: 'Search repositories…' }
    add(cx, folder) {},        // folders: called once per ticked folder
    candidates(cx) {},         // items: → { items: [{ id, label, detail?, disabled? }], add(cx, ids) → { errors } }
    remove(cx, id) {},
  },
  check: async cx => ({ status: 'ready', statusLabel: '3 projects', usable: true, rows: [{ id, label, path?, detail? }] }) }
```

- The **check** returns the added `rows` (`path` for folders, so the browser can tick them;
  `detail` is a note shown after the label), `usable` (Add works now), a `statusLabel` for the
  header badge and, for an account scope, the `selection` to offer.
- **folders** picker: folders already added start ticked; unticking one calls `remove`. The
  button says Add, Remove or Apply; the footer counts what this visit changes.
- **items** picker: `candidates` runs only when the popup opens (listing can be slow). The
  popup has a search field (`search` is its placeholder), Loading bottom left, and Add.
- One change runs at a time; refusals become the section's detail. Lists start collapsed.
- A deep link `{ section, search }` (Settings props `pluginSection`, `pluginSearch`) opens
  an items picker filtered to that search.

## Space tags

`spaceTags(space, cx)` → `[{ label, tooltip? }]`: small pills at the right edge of a space's row
in the Spaces sidebar (Crew: the space running its coordinator), drawn like a pane header's
role pill. Synchronous and cheap: it runs on every draw, from live data only (`panes()`,
`terminals()` through the plugin API). Only enabled plugins are asked; at most 3 tags each.

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
