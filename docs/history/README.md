# Custom skin for Herdr App

A private, reversible skin for **Herdr App 0.1.13 / 0.1.14**. Same spaces, agents, tabs,
panes, commands and side panels; quieter typography, consistent icon rails,
compact controls and neutral dark surfaces with optional accent tinting.

## Enable / disable

Double-click **Enable Custom.cmd** or **Disable Custom.cmd** in this folder.
Alternatively, in Herdr Settings select the **Custom** layout to enable it,
or **Herdr / main** to return to the original. The existing Ctrl+Shift+L
layout shortcut still works (it cycles through all installed layouts).

From PowerShell:

```powershell
cd "$env:USERPROFILE\.config\herdr-app\custom-skin"
.\skin.ps1 Enable
.\skin.ps1 Disable
```

If script execution is restricted, use the `.cmd` files or:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\skin.ps1 Enable
```

Enable opens Herdr if necessary. Switching layouts does **not** close terminals,
kill agents, change workspaces or replace the core document. Existing layout
click preferences remain Herdr's own per-layout state.

## Isolation

Installed into `%USERPROFILE%\.config\herdr-app` (or `HERDR_APP_HOME`):

- `layouts/Custom.json` and `layouts/custom.svg`
- `themes/Custom.json`
- `mods/custom-*` (15 private panels, including local assets)
- `.customizations/manifest.json` (file ownership/hashes)

Standard installation never edits shipped `main`, shipped mods, `settings.json`,
`keys.json`, program definitions, core configuration or session documents.
Explicit, reversible **palette and feedback frame exceptions** are described below. They retain their app-owned identities; other shipped frames are untouched.
The existing app zoom and terminal font size are honored. The skin's palette
and spacing apply only while its layout is selected. Its footer gear (or
collapsed footer **… → Settings**) opens a private settings clone.
**Look → Color scheme** contains the accent dropdown; there is no separate
Theme page, duplicate Custom card or Customize button.
Opening it writes nothing. Explicit changes to ordinary fonts/zoom/alerts/etc.
remain Herdr's normal app-wide settings; palette edits are skin-local.
**Look → Size** groups Zoom and Padding; **Fonts** contains Terminal, Preview
and Interface fonts separately. Padding has no description and changes the
Custom layout's native terminal insets equally on all four sides (0–48px before
zoom); Reset restores 12px. Changes apply live and are saved in
`layouts/Custom.json`, not global settings. Whole-cell leftover space is centered
and edge background colors extend through the insets only in a Herdr build
with the native centering/fill fix; stock 0.1.14 still leaves horizontal
leftover space on the right and contrasting strips around some TUIs.
The installer protects deliberate layout edits as personal-file conflicts.
Jump, Settings, Add machine and skin-opened worktree dialogs share one shell.
Built-in `app.settings`, confirmation/rename dialogs and notifications are not
globally replaced; they remain available and inherit the active theme.

Private mod references are routed within this skin; existing commands and
machine/agent behavior are retained. Original shared data such as project
colors and agent sorting still describes the same Herdr world. No telemetry,
new executables or JS animation timers are added. Clones retain Herdr's
file/git/machine reads and user-invoked commands. A bounded startup worker
waits for new terminals before setting their right-click preference.

As requested, terminal right-clicks in Custom paste through Herdr's native paste action. The live pane header sets `herdr.right-click=menu` through core, retrying transient startup failures silently. The private terminal-menu hook resolves the clicked pane/terminal pair, dismisses itself, focuses that pane and pastes; stale targets never paste into a different terminal. The hook receives no Shift modifier, so Shift+right-click uses the same paste path. Sidebar/tab/agent context menus remain. The per-terminal routing preference persists across layouts; other layouts still use their own terminal menus.
Split, zoom and close commands remain available through header tools and keys.

## Localhost previews over SSH

The bottom status bar reads the focused terminal's `custom.preview.url` label
from Herdr's existing live metadata. **No background terminal reads, history
requests, scrolling, or key injection.** URLs survive new output and app reloads
because the core remembers the label; they are not a server-health indicator.
File-only panes have no preview. Status glyphs share fixed 16px slots and compact
14px artwork (the smaller branch drawing is optically compensated at 16px), with
4px icon/text spacing and 16px between items. Preview has an 8px hover inset on
each side, cancelled by negative margins so neither text nor neighboring items
move. Its browser icon changes to a compact arrow only after a successful open.

Agents should publish the URL once when their server is ready (run on the
server's machine, using that agent's own terminal id):

```sh
hc label "$HC_TERMINAL_ID" custom.preview.url=http://127.0.0.1:5182/
```

From this computer an agent/person can instead use an explicit qualified id:
`hc label remote-workstation/test-terminal custom.preview.url=http://127.0.0.1:5182/`.
There is no **Preview** placeholder. The context menu is headed **Localhost** so its commands have clear scope. Right-click the **status bar** and choose
**Read screen** to inspect only the current visible screen once
(`hc read --lines 0`) and remember its URL as that terminal's label. The localhost
item then appears; reading alone never opens a browser or starts a tunnel.
If the URL is not visible, show it first. The same explicit action is available
as `herdr-app do custom-workspace-status.refresh-previews`.
Never use history reads for automatic URL detection: Herdr may scroll a
full-screen app and restore it to collect history, interfering with agent use.

The first click on a known localhost item establishes its SSH tunnel and opens
it. Later clicks open the cached forwarded URL directly—no Node helper, core
query, terminal read, or SSH setup. To deliberately rebuild the connection,
right-click the **status bar → Reconnect**. Only that selected forward is stopped
and recreated; other preview connections are untouched. `Connecting…` replaces
the address during setup. Right-clicking the **localhost item** itself offers
only **Close**, which removes that terminal's preview label and closes its
forward. Menu actions keep the target captured when the menu opened, even if
focus changes. No repository copy or public listener is needed. Paths, queries and
fragments are retained, except plain health probes (`/api/ping`, `/health`,
`/healthz`, `/readyz`, `/livez` without a query/fragment), which open the app's
home page instead of probe JSON.

Requires Node and OpenSSH on this computer and working noninteractive SSH
credentials. The target comes from `hc machine ls`, not the machine's display
name. Command/`--via` connections are not supported. Tunnels bind only
`127.0.0.1`; the original port is preferred (important for apps that check the
Host header), otherwise a free port is chosen. Apps that insist on their original
port may reject that fallback; free the local port and retry after closing the
Custom layout's previews. HTTPS still needs a certificate accepted by your browser.

Only a click starts a tunnel or opens a browser; discovering a URL never fetches
it. SSH/auth failures produce a notification. Tunnels stay alive while the status
mod is mounted, even when another terminal is focused. Switching layouts or
quitting releases them; after a crash they expire within roughly 45 seconds of
the last local lease renewal. A 15-second heartbeat only touches local lease
files and starts only after a remote preview was opened; it never queries core
or any terminal. Closing an individual terminal does not stop an already-open
tunnel. The helper is `mods/custom-workspace-status/previews.cjs`; its small runtime
lease files live under `data/previews/`. No core or remote configuration changes.

## Look

- 248px default sidebar; original collapse and resizing behavior
- Spaces/Agents scrollbars show only while scrolling and fade away natively. A passive 40px bottom gradient hints at overflowing content, clears at the end of wheel/trackpad scrolling, and recalculates after resize/folding. Retained native scroll positions and row hitboxes remain in charge; no polling or animation timers are added. `lib/sidebar-scroll.js` is the shared implementation.
- Aligned 40px brand and tab strip
- 28px list rows and icon-button hitboxes; 2px list gaps; 32px section/pane headers
- 16px icon slots, 14px compact glyphs, 1.5px pane SVG strokes
- Consistent 8px gaps, 12px content gutters, 6px control corners
- One shared 8px dialog-shell radius (`U.dialogRadius`), matching the native palette
- 13px UI labels, 12px metadata, medium-weight group headings
- Stable timestamp/status rails; Pin/Unpin is in the agent's right-click menu
- Collapsible group headers use left-aligned labels without decorative icons; counts and chevrons remain
- Expanded computer headers omit device glyphs and retain right-hand 6px connection bulbs; the collapsed rail uses monitor/server icons with host tooltips. A 3px Add-to-bulb gap balances the 8px bulb-to-chevron gap without shrinking the Add hitbox.
- Collapsed footer menu order: Usage, Hosts, Settings. Inset tab ×, machine + and pane tools share a faint adaptive hover tint instead of a dark tile over the selected parent.
- Agent group counts and elapsed times share right-aligned 32px numeric cells and matching 16px trailing icon slots.
- Matching 7px machine-connection and agent status bulbs: working softly flashes blue, idle is neutral gray-white, unacknowledged Done stays solid green
- No space-item bulbs or duplicate pane-header activity indicator
- Hover tools fade in natively over 140ms, overlaying the folder without an empty toolbar gap
- Pane zoom disabled when alone; unzoom always available
- 8px breathing room below the Agents divider in both sidebar modes
- Agent sorting is available in expanded and collapsed headers through the same 28px control/menu, with current-mode glyph and tooltip; sorting never expands the rail
- Consistent centered 28×28 collapsed rail controls with 6px corners and inset highlights
- No redundant bottom chevron on Windows/Linux
- Distinct normal-hover, selected and selected-hover backgrounds
- Agent rows show only the session name (no folder prefix or separator) in priority, grouped and pinned views; unnamed sessions fall back to a meaningful live title or agent name. Titles use all available space before metadata. Their color follows Spaces: white when selected, gray when unselected, regardless of activity. Agent glyphs use the same 16px size in sidebar rows/subrows, tabs/drag previews, pane headers, Jump and profile menus. Monochrome glyphs stay foreground-white in both selection states; only names/details (and rail numbering) follow selection. Branded artwork, status colors and secondary metadata retain their own treatment.
- 28px tabs/standalone controls with 6px corners; inset close/host/pane tools are 24px with 4px corners
- Shared soft icon hover; parent row stays highlighted under inset tools
- 16px numbered badges keep the same space number/color in expanded and collapsed Spaces. Expanded repository rows always show a branch icon/name, including main/master and branch-named worktrees; transient Git failures retain the last known branch.
- Right-click a space: a compact color row starts with a dashed **Automatic** circle, followed by seven color swatches. There is no heading or separate Reset action. Automatic restores computed coloring and remains selected after the sidebar assigns its color; choosing a solid swatch returns to an explicit color. The existing persisted `space.colors` map updates expanded/collapsed badges and the next Jump snapshot; a skin-owned `custom.space-color-auto` flag remembers explicit automatic choices. Legacy colors retain their selection until Automatic is chosen. Left/Right moves through all eight circles, Enter applies, and Up/Down returns to commands. Space numbers, names, focus and terminals are unchanged; local and remote targets stay independent.
- Identical 14px chevrons in 16px slots; expanded header +/sort controls and trailing chevrons/status slots share a centerline 20px from the sidebar edge. Ages/counts stay aligned; machine add/bulb spacing remains 3px and bulb/chevron gap 8px.
- Context menus open neutral, highlight only hovered/keyboard-targeted rows, and share a 1px content baseline adjustment
- Matching 36px sidebar/content bottom bars
- Icon-only host/settings footer; collapsed rail has one centered … menu for Hosts/Settings
- Consistent 16px semibold dialog titles and top-right × close buttons (Escape still works)
- One scrollbar-spacing contract in `lib/ui.js` for Jump, command palette, Settings, Usage, Add machine, worktrees, confirmation and Feedback (including JSON preview): scrollbar lanes docked to the right edge with no added right inset, 8px top/bottom/left insets, an 8px row gutter and matching trailing clearance for forms. Native thumb shape is fixed by Herdr; the mod API exposes placement/visibility but not thumb radius. Inner stacks own padding; already-padded dialog bodies compensate rather than double the inset. Static and scrolling Jump rows keep the same width; visibility policies remain unchanged.
- Centered Jump dialog with stable opening geometry and one synchronous opening snapshot: no delayed host lookup or late status-driven row reveals. Reopen to refresh membership; search and the quiet-space toggle remain interactive. Bulbs share the sidebar's 7px filled-circle component: working pulses blue, idle is neutral gray-white, Done stays green, blocked is red, and unclassified/shell-only rows use a neutral bulb. File-only rows instead use their colored file-type icon, with file-pane identity included in the opening snapshot; file-like agent tab names and mixed agent/file tabs keep their agent indicator. No outlined/text-symbol bulbs or redundant “finished” label. Space badges reuse the sidebar component, numbers and colors, including teal `~` and saved custom colors. Numbers follow the opening sidebar order and stay unchanged when priority sorting or search rearranges the dialog.
- Add machine uses blue + Add text actions aligned with Added status
- Stronger 16px section headings, shared 4px title/description gap; no redundant Accent color or final-content dividers; other note/action separators remain
- Floating font/accent dropdowns select above/below placement rather than expanding the page or covering their trigger
- Tab dragging shows a dimmed source, insertion marker and agent/program-name-only preview
- The status bar hides agent totals and “needs you” counts; attention indicators remain in the sidebar and pane headers. The branch follows the machine label and the selected terminal's live folder on its own machine, not the space's first tab. Read-only Git checks refresh checkout changes every five seconds; non-repositories, detached HEADs, file-only panes and unavailable hosts show no branch, and late replies never leak between terminals.
- Jump creation labels use sentence case: New tab, New space, New space on <machine>; one inert shared divider separates commands from existing results (not shown for searches or commands-only lists)
- Shared lowercase shortcut labels (`alt-t`, `ctrl-shift-p`, `f2`) across menus and status
- Neutral selected surfaces and subtle focus borders, not bright outlines
- Custom terminal ANSI palette; terminal program content remains program-owned

Modal layout uses the canonical `lib/modal-layout.js`: section stacks have no additive gap, rows and leading action bands use a 64px minimum and symmetric 12px content insets. Machines/Profiles Add buttons and the Terminals default selector share that first-content baseline after the same heading (4px title/description gap, 12px trailing inset); no per-page padding is added. Standard rows retain their divider policy; standard divider slots have 12px on each side, Jump uses those same 12px insets before New tab; its “1 quiet space” / “2 quiet spaces” toggle has no upper divider or “earlier:” prefix; compact context/+ menu dividers use 8px on each side. Ordinary body/footer boundaries use 16px insets. The fixed-height compact confirmation uses the same 8px scroll viewport inset with its 8px footer token. Framing borders, input outlines and miniature layout previews are not content dividers.

Jump and the sidebar share `lib/space-title.js`: space names are 13px regular-weight content labels, white for the active space and muted for inactive spaces. Badge lettering keeps its separate avatar styling.

Settings keeps one machine selector in its header on Core, Profiles, Terminals and Usage, using the same canonical `lib/machine-picker.js` as the Usage dialog (150px trigger, 7px connection bulb). Selection is shared between those pages; app-wide pages show no misleading machine selector. Active profile or terminal edits disable machine switching to retain the draft and its original target. Profiles/Terminals use a 28px refresh icon beside the header machine picker instead of a refresh/description content row. Its native spin and tooltip indicate loading; repeat clicks and refresh during editor drafts are disabled. Manual terminal refresh bypasses the discovery TTL. Disabled machine selectors are dimmed just like Refresh and have no active dropdown wrapper while either editor has a draft.

**Settings → Core** is a separate, machine-scoped page. It always shows actual status, the preferred **Standard user / Administrator** mode, and **Start at Windows sign-in**. Terminals and terminal editors contain only shell configuration. Options edit a draft; **Discard / Apply** appear in the fixed footer only when something changes. Apply saves the mode and enables/disables the sign-in task **without starting, stopping or relaunching core**. The footer shows **Unapplied changes** or **Restart required — Stop, then Start**. Change notices never resize the header machine picker. Unknown/stopped core state never implies standard-user privileges.

**Status** is read-only: a bulb plus Running/Stopped/Unknown. It is the actual core process state, not the header dropdown’s connection-ready indicator; the two can differ during reconnection. The separate **Start / Stop** row contains the matching action; there is no Relaunch row/button. Apply permission changes, then Stop and Start to use them. Stop ends running commands/agents; kept tabs recover as fresh shells, not resumed commands. Attached clients can independently restart a stopped core. Start reuses an existing core and never stops it. Start and Stop never toggle autostart. No OS changes happen merely by opening Settings or changing a draft.

All four rows remain present during initial loading and refreshes. Initial cold checks use subtle native skeletons, not dashes or guessed values. Same-machine snapshots survive closing/reopening Settings, so repeat visits show the last checked values while refreshing; controls remain disabled until verification. Failed checks clear the snapshot. Clean cached drafts follow fresh backend preferences without creating false unapplied changes; user-edited drafts are preserved. Loading is indicated by the header spinner, not a temporary Checking row. The permission menu and trigger share one 170px width.

Remote management runs over the already-configured SSH host directly, **even while that machine’s core is stopped**. It uses batch/key authentication and existing known-host trust, sends trusted source on stdin, and verifies the paired core identity/session before acting. It never silently pairs a replacement host, prompts for SSH credentials, or falls back to elevated core bootstrap. Custom `--via` transports are explicitly unsupported. Successful Start/Relaunch reconnect the local core’s existing machine link using `machine.connect`, not the interactive login command. Status reads do not bootstrap the remote core and measure its actual token, not the SSH caller’s token.

Windows actions use same-user **Limited / Highest** interactive-token scheduled tasks, never SYSTEM or stored passwords. Start/Stop/Relaunch require the same user signed in on that machine; autostart can be configured for a future sign-in. Local administration requests Windows UAC when needed; an already-authorized administrative SSH connection can register the selected task remotely. Elevated-to-standard relaunch uses an elevated stop coordinator and a separate Limited starter. Old holders must exit and the replacement’s token is verified. Task actions, PowerShell/native cwd and native core child processes all start in the user home; explicit project folders remain unchanged. Durable receipts prevent blindly repeating an indeterminate action.

Autostart remains optional and is stored per core session under `%LOCALAPPDATA%/herdr-core-permissions/`. Administrator autostart runs elevated without another UAC prompt; its enabled row says so. The sign-in task never stops an existing core. **SSH before desktop sign-in is not enforced**: another launcher can still win startup. No UAC/SSH policy, core binaries, or machine connection definitions are modified. Disable the sign-in switch and Apply to remove this skin’s owned task without relaunching. Update checks keep the previous description and a real disabled **Checking…** button instead of replacing both description and action with progress text.

Tab, pane-header and sidebar program icons use the identical `lib/program-icon.js` renderer: 16px centered slots/glyphs with an explicit 13px text-metric context, so a metadata-sized header cannot shrink its icon. Pane leading padding accounts for the card/tab outer insets and aligns the first icon rail with tabs.

Unnamed terminal and agent tabs show their one-based tab number, including drag previews; explicit names and file basenames are preserved. Double-click, F2 and Rename from the menu/palette edit the name **inside the tab**, with the shared inset field styling. It expands natively over 180ms from the measured tab footprint, without a shrink/jump or a JavaScript animation timer. The compact 120px-minimum field has adjacent ✓ Apply and × Cancel tools; the ordinary status/close rails are hidden only while editing. Repeated F2 is a no-op in the editor's scoped key context, preserving the draft, selection and focus. An empty input shows its actual number as a placeholder. ✓ or Enter saves; saving empty restores automatic numbering rather than writing a literal number. ×, Escape, blur and outside clicks discard the draft. Concurrent rename/reorder/removal or space changes invalidate stale edits. The scoped `rename` patch redirects native prompts before their first paint; other layouts and offscreen tab targets retain native behavior. No shortcuts are changed. Its ownership record is `frame-rename.json` and uses the same guarded startup repair/restore as other frame patches.

Spaces use the same inline naming pattern: right-click **Rename**, Shift+F2/palette rename, or double-click the sidebar row. The existing 28px row keeps its numbered color badge and replaces its title/branch tail with an inset input and 24px ✓/× tools. Enter/✓ saves; Escape/×, blur and outside clicks cancel. Empty input restores automatic folder naming and shows the current folder as a placeholder. Background and remote spaces are renamed by their exact IDs without selecting them. Collapsed rails expand and folded machine groups open before editing. Native input state is created only after yielding out of render; stale/removed/moved/externally-renamed targets cannot receive old drafts. Repeated rename shortcuts preserve the draft/caret. Hidden sidebars and other layouts retain native prompts. The existing scoped `rename` frame patch now redirects both tabs and spaces before the dialog paints; no global shortcuts are changed.

Tab and space rename fields open with an unselected caret at the end, so native Backspace removes one character instead of the whole name. Explicit selections and repeated rename shortcuts preserve normal editor behavior. Named spaces hide the old folder/repository label while retaining ahead/behind counts. Empty space input previews the automatic folder name, never the previous custom alias; accepting empty still sends an empty name to restore automatic naming.

Numbers are logical pixels at zoom 1, not a global density/zoom override.

## Live folders in Herdr / Git Bash

`lib/directory.js` is the shared location resolver for Spaces, Jump, pane folder
chips, unnamed shell-tab tooltips, agent rows and + menu launches. It prefers an actual
non-shell foreground folder, then the shell's private `custom.cwd` report, then
a native PowerShell/CMD process-folder fallback and focus/pane/launch metadata. No prompt text is scraped. Automatically named
spaces follow the focused/last-selected terminal instead of the first old tab;
custom space/tab names and file-preview origins stay unchanged. Agent rows show only session titles, not folder names. + launches pass the
resolved folder explicitly. Space titles, pane folder chips and unnamed shell-tab labels retain a full-path tooltip.

Git Bash can keep its Win32 launch directory after `cd`, so its old core metadata
alone is insufficient. The tracked `.bashrc` sources `shell/bash-cwd-loader.sh` only for
interactive Herdr terminals (`HC_TERMINAL_ID` plus a real stdout TTY). Captured agent-tool shells are excluded. The stable dispatcher loads `shell/bash-cwd.sh`, which emits standard OSC 7 and updates
two private labels (`custom.cwd` / `custom.home`) through the local hc CLI when the
directory changes. It preserves prompt hooks/exit status, does not change PS1,
traps, zoxide or input bindings, and does not run agents. Herdr shells also skip
the global `.lastdir` restore, respecting their explicit launch folder. Shared
shell alignment now makes that restore opt-in outside Herdr too
(`DOTFILES_RESTORE_LASTDIR=1`); both terminal apps honor requested folders by default.

PowerShell has the same issue for a different reason: `Set-Location` changes its
logical location without necessarily updating `[Environment]::CurrentDirectory`.
The shared PowerShell `global.ps1` now sources `shell/powershell-cwd.ps1` in real
Herdr console sessions. It reports `Get-Location.ProviderPath` through OSC 7 and
the same changed-only private cwd/home labels. It chains Starship's documented
pre-command hook (or preserves the existing prompt as a fallback), retains prompt
output/native exit codes and personal hooks, retries failed labels silently, and
does not change Win32 process cwd, `cd`/zoxide, agents or terminal input. Captured
agent tools and non-filesystem providers are excluded. CMD needs no extra profile
hook: its live process cwd is read ahead of stale pane/focus snapshots. Switch
requests pass the resolved Windows/POSIX folder explicitly to every destination.

A PowerShell session opened before this hook was installed needs one new session,
or source only this hook once at its idle prompt (without reinitializing the whole
profile): `. "$HOME/.config/herdr-app/customizations/src/integration/shell/powershell-cwd.ps1"`.
No command is injected into existing shells.
Live regression covered all six directed PowerShell/CMD/Git Bash handoffs on each
of a local and a remote workstation, plus a cross-drive PowerShell-to-Bash case. Those
13 handoffs retained folders containing spaces, `#` and Unicode. Tests used fresh,
unadopted sessions with a virtual layout document, never user tabs or agents.

Yadm owns the Bash loader, reporting payload and `.bashrc` bootstrap on both PCs.
Its pull/push restart chain now includes the configuration-only `herdr-shell`
unit, which publishes an untracked content revision. Bootstrapped shells load
payload updates at their next prompt without manual sourcing or session restarts.
The unit works over direct SSH and needs no Herdr Desktop on the remote machine;
it never injects lines into `.bashrc` or sends input to running terminals.

New Bash terminals load the dispatcher automatically. A shell that predates the
initial bootstrap needs one new terminal, or this one-time load **after its current
command finishes**:

```bash
source "$HOME/.config/herdr-app/customizations/src/integration/shell/bash-cwd-loader.sh"
```

Do not reload the entire `.bashrc` just for this. The agent never types this
command into running terminals. Other machines receive the tracked files through
the existing yadm push → peer pull → restart workflow. Local overlapping edits can
still block a safe fast-forward and must be reconciled rather than overwritten. Native global commands/other layouts remain app-owned; the skin does
not mutate native workspace names or pretend a missing folder report is known.

## Customize the theme

Click the sidebar gear (or **… → Settings** when collapsed), then
**Look → Color scheme → Accent color**. The title/description are on the left,
the dropdown on the right. **Neutral** is first and the default, with equal
RGB channels in every neutral surface—no sepia/green cast. Other accents tint
the surfaces, borders, selections and highlights, not just small icons.

Preset selection saves and applies live without an Apply button. Red is replaced by the more distinct **Lime**. Choose **Custom** to reveal a clickable 32px color swatch before the dropdown: it opens a familiar SV square, native hue slider and hex input. Accent colors are opaque; changes apply while clicking/dragging the SV square or hue slider through the same bounded, serialized CAS path. Hex edits save on submission/blur. The redundant opacity label is omitted. The hex field has an unmodified native editor inside a styled wrapper: no custom mouse/focus interception or editor foreground/background override. Repeated popover-open notifications never replace its text or selection. Selection painting belongs to the native widget; the SDK exposes no per-input selected-text foreground, and live inverted selection is not verified. SV uses a retained native slider for pointer capture and release, plus two-axis position mapping. Hover changes no longer cancel gestures, press geometry stays frozen during dragging, and the marker is not cropped at edges. Its native hue-to-black base and masked white-to-black SVG use sRGB value gradients: bottom corners no longer expose solid hue through antialiasing, without changing HSV values. Custom mode and the last custom color persist, including when a custom color equals a preset. Switching back to a preset keeps the last custom color available. Older Red accents remain valid as Custom rather than being overwritten.

Keyboard arrows/Enter/Escape work, and outside clicks dismiss popovers. The picker uses native GPUI inputs/sliders and full-color SVG gradients, not an OS color dialog or web widget. Older custom surface brightness is retained while its hue follows the selected accent.

`themes/custom-palette.json` and `.customizations/palette.json` in the app home are
personal data, not installer payload. Install/Remove never overwrite or delete
them. The native theme has only Herdr-supported fields; ownership and palette
metadata live in the sidecar, with compare-and-swap writes and recovery states. Accent changes are allowed
only on the `Custom` layout (legacy lowercase names remain recognized); switching away during a save cannot recolor another layout.
Small accent glyphs get a contrast-adjusted color and filled buttons get readable
black/white text. Status colors retain their semantic meaning. Invalid colors
and unreadable text/surface combinations are rejected before saving. Existing
unrecognized or externally modified personal palette files are never overwritten.

Under **Look**, layout/font/zoom controls remain available. Custom exposes just
its accent control; other layouts retain the original appearance/theme controls.
Palette, Jump, font menus and worktree filtering share the same magnifier search field, neutral focus treatment and trailing × to clear nonempty text without dismissing the popup. The clear rail stays reserved so the editor does not move. Palette and Jump use the same centered magnifier and No results title, without a description; Jump no longer presents creation actions as search matches. Clearing restores the normal list and keyboard selection. Terminal font size precedes its right-aligned font dropdown. A matching **Preview font** row sits directly below Terminal font and above Interface font. Its independent 8–32px size (default 12px) and optional font-family choice save under the skin-owned `custom.preview-font` shared preference, never native terminal/UI font settings. Default inherits the terminal family, not its size. Open read-only file tabs apply family and size through live Editor refinements, retaining their existing editor state and bounded buffer without rereading local/remote files. An owner-bound 100ms preference watcher invalidates retained pane snapshots only when the effective font changes; repainting the window alone is insufficient. Changing font metrics can naturally alter wrapping/viewport geometry. Zoom and its normal 76px Reset button form a compact right-aligned group, without an invisible trailing alignment column. Machine row actions have equal widths, Show/Hide retains its width, update-check status has a fixed slot, and toggle thumbs slide natively over 140ms. All machine connection bulbs sit on the left in Settings.

The command palette has an explicit optional frame patch, scoped to Custom. Its shared surface helper delegates border/background/radius/shadow to the existing native host, avoiding a nested second frame. It pins the shared search field/full-width divider above an independently bounded list (wheel events cannot scroll the native outer frame). The current command-group heading stays pinned over the list; filtered matches show a pinned count such as “12 items” (or “1 item”), excluding headings. The native scrollbar is painted and hit-tested last, above the sticky heading. A small owner-bound range sync updates only when the native visible group changes, including scrollbar drags; native scrolling remains in charge. It still omits an Esc label/title header and uses native virtual scrolling, an auto-hiding scrollbar, 8px spacing before later sections and compact foreground-colored section headings for contrast. Other menus retain their small muted headings. Escape, fuzzy search, recent commands and keyboard navigation remain. Settings/Jump and existing private modal entries route to their Custom versions only while this layout is active. The status-bar palette hint changes only its background on hover.

Feedback has a separate optional UI patch: Email → Message → Attachments → collapsed JSON preview, with short labels and hints inside the fields. Native email/message leaves retain their own text/selection paint; the message leaf has an explicit 128px hit/paint area. The rounded content is clipped to the shared 8px dialog radius without a second border. The live Unicode character count sits in a reserved bottom-right rail inside the message field; over-limit drafts remain editable but cannot be sent. The 500px dialog keeps its action footer visible while attachments/expanded JSON scroll in the body. The preview shows the exact native draft payload and updates as you edit, without recreating the editors. A short visible note explains that app details help diagnose issues and can be reviewed before sending. Its tooltip retains the no-logs/install-ID privacy information. Labels use Settings-style white titles and muted descriptions. Message/email focus and hex focus enable a dedicated blue native UI selection token (pale blue in light mode); this does not edit saved terminal selection settings. The user confirmed partial selection in the isolated native fixture; the user still reports subtle or invisible highlights in the actual fields, so the blue-token projection is not a verified rendering fix. Shared title/close rail, 32px email/buttons, screenshot × controls and the blue + Add screenshot action remain. It stays the app-owned feedback frame, preserving protected attachment/send APIs and the original sending method; other layouts keep the stock form.

### Optional app-frame exceptions

```powershell
node scripts/frame-palette.mjs apply   # opt in; backup + ownership record first
node scripts/frame-palette.mjs check
node scripts/frame-palette.mjs restore # restore the original, remove owned helpers
node scripts/frame-feedback.mjs apply  # separate opt-in for Feedback styling
node scripts/frame-feedback.mjs restore
node scripts/frame-confirm.mjs apply   # separate opt-in: native confirmation styling
node scripts/frame-confirm.mjs restore
```

The currently opted-in UI patches are the only deliberate shipped-file exceptions: palette/Feedback frames, `mods/confirm`, the inline tab/space rename redirect in `mods/prompt`, and the narrowly scoped shell-handoff notice filter in `mods/toast`. Confirmation uses the shared 16px title/× header with no visible Esc label, one native outer frame, compact equal 76×32px Cancel/Close controls and clearer close-space consequences with singular/plural counts. Escape still cancels; native confirmation commands/targets are unchanged. Original/helper hashes live in `.customizations/frame-<id>.json` for each opted-in registry entry. Other layouts retain stock rendering/actions. Install/Enable refresh an already opted-in patch; Remove restores it before deleting private assets. Personal edits cause a refusal rather than an overwrite. Herdr rewrites its frame on startup. The private Custom brand now automatically reapplies these already-opted-in patches once when the layout mounts (including after a restart or switching into Custom). It runs one short-lived local Node worker with bounded startup retries, not a service, task or polling watcher. Current patches cause no mod/frame writes or reloads. Missing ownership records are never opted in automatically; unknown/newer stock and personal edits are refused, independently per dialog. The latest result is available through `shared("custom.frame-startup")`. Keep this bundle at `custom-skin/` in the app home; local Node is required. Enable or Install can still refresh patches manually. An unfamiliar newer app frame is never overwritten with an old version; it requires a reviewed patch update.

#### Extend automatic repair to another dialog

`frame-patches/registry.json` is the single extensible catalog for startup and
Install/Enable/Check/Remove. Add its reviewed stock snapshot, styled source and
one registry entry, then explicitly opt in with
`node scripts/frame-patch.mjs apply <id>`. No startup code or new wrapper script
is required. Full schema/example, validation and safe removal instructions:
[frame-patches/README.md](frame-patches/README.md).

Inputs, dropdowns, buttons and steppers now share 32px height, 6px corners,
13px labels and neutral focus outlines. Shared geometry/interaction primitives
live in `lib/ui.js`: dialog shell/header/body, controls, fields, buttons/text
buttons, dropdown, menus, headings, badges, chevrons, activity bulbs and reveal
motion. `lib/look.js` projects live catalog colors into skin-owned dialogs and coalesces appearance refreshes. Switching layouts does not close/recreate a settings modal or discard its section/draft state. Native settings/confirmation dialogs remain app-owned. The owned layout/theme filenames use **Custom** so stock settings also displays the capitalized name.

## Right-hand file explorer

Custom's existing right panel now opens on **Files** by default, with a resizable 368px starting width. The icon-only **right sidebar toggle** at the right of the tab strip opens/closes it. Its 16px glyph is the exact horizontal mirror of the left-sidebar icon, inside the same 28px hover-only control. It closes either Files or Changes and restores the current valid view when reopened. Mouse presses stop at the control rather than reaching the draggable title bar; the toggle issues panel commands only. It remains available in Custom even if stock welcome's global panel preference disabled all panels. That shared preference and other layouts are not changed. Open/closed and active-view state now belongs to the native Custom layout as one persistent choice across agents, tabs and spaces. Legacy per-space panel choices are no longer applied.

The lazy tree follows the active tab's live terminal folder on its machine, including Windows paths on a remote workstation. It uses the shared directory resolver (foreground agent folder, shell cwd report, then native metadata), not stale pane/space launch folders. With no terminal focus it stays within the selected tab; late folder reads cannot replace the new tree or open files from an old root. Files/Changes headers use the same surface fill and divider as the native pane header, with the panel outline matching the focused terminal's input-color outline. Files uses the same 16px title-to-folder gap as terminal/agent pane headers. Refresh and × fade in only on header hover, using the same 24px hitboxes, 14px close glyph, compact 12px/1.5px-stroke refresh glyph, 8px right/4px top anchors and faint hover fill as pane tools. Hidden controls cannot act. Selecting a file creates a native mod-only tab with a bounded read-only viewer, not a terminal or external editor. The tree stays available and the viewer pins its original path/machine, even while focus changes. The viewer has one native pane header: colored icon, full path and hover-only Reload before split/zoom/close. Folder/file path tooltips belong to intrinsic-width text leaves, not their expanding header slots, and the path bounds stop before the tool rail. Hovering empty header space or between controls does not target the path tooltip. There is no duplicate content header or Read only label; the editor remains read-only. New native file-tab names store the full path while the tab strip and drag preview show the basename and colored file icon. Legacy basename tabs publish their header path in memory without being renamed. Reload requests are in-memory and scoped to the original space/path; copies of the same file in that space reload together. Binary/size limits remain. No file create/delete/rename or terminal/session action is performed. Existing per-folder/total limits, binary checks, stale-response guards and local folder watching remain intact. No new keyboard binding is installed.

File rows, file tabs, Jump file results, drag previews and pane headers share 54 bundled Material Icon Theme SVGs with the same 65% OKLab chroma treatment used by the Custom reference. They are static licensed assets, not a package/runtime dependency. See `mods/custom-files/icons/NOTICE.txt` and the two license files; manual regeneration is an explicit developer operation, never part of Install.

## Standalone account usage

Open **Usage** from the sidebar's simple round dial, summary bar, collapsed footer menu or command palette. Footer order is Usage → Hosts → Settings, with Usage leftmost and Settings right-aligned. Sidebar footer glyphs are 14px, matching the Agents sort icon, inside unchanged 28px click targets and 16px alignment slots. Settings navigation stays 16px. The matched 1.5px strokes and tighter centered dial viewBox remain. The modal supports machine selection, provider refresh and pinned quota windows. Its gear navigates to **Settings → Usage**, keeping the selected machine, for checking, sidebar summary and Used/Remaining preferences. Settings also offers a machine selector; options/pins remain scoped to each machine. Checking status sits beside the Usage title in a fixed header slot, so refresh does not shift the cards. The Usage list uses a definite-height, inset scroll frame and a real trailing spacer, giving the first and last cards equal top/bottom clearance even at the scroll limits. Refresh is cached for five minutes; missing quotas are never estimated from terminal text. The bottom summary uses the command hint's inset 28px/6px hover treatment: pointer cursor and background tint only, with stable text/progress colors. Its hover has the same symmetric 8px outer inset as list items; the flexible progress bar gives up the extra width rather than crowding either edge.

The footer combines **all explicitly pinned quotas per machine**, never an automatic Codex fallback. Each pin toggles independently. One pin keeps its progress bar; multiple pins form compact percentage groups with one icon per provider account, matching the modal selections. Per-value tooltips identify each quota; a narrow widget scrolls horizontally without resizing the sidebar. Unavailable pinned data shows **Refresh usage** with a refresh icon on the left. Clicking forces a refresh on that widget's machine without opening a modal; the control shows **Refreshing…** and suppresses duplicate requests while busy. Mixed pins retain healthy percentages and offer inline Refresh for missing values. The collapsed rail exposes the same recovery action. Errors remain retryable; a refresh never enables paused usage or changes pins, and never substitutes another quota. Removing the final pin or turning off **Summary in sidebar** hides the whole summary block in expanded and rail modes, reclaiming its 36px for the lists rather than leaving an empty slot. The permanently mounted sidebar header reacts to the active machine and preferences, restoring the block when a quota is pinned again; it does not undo a deliberate manual layout hide. No polling or additional usage collection is added. Usage remains accessible through the footer menu and palette. Legacy pin lists are preserved and all their selections are honored. Pin buttons retain their native pressed fill, border and distinct hover.

Plan tags start with a capital letter (Prolite, Team, Business). Claude's extra-usage state is a compact tag beside its plan, not a separate detail row. Reset captions separate the countdown from readable local time such as **Wed at 1:00PM**, without seconds or leading-zero hours; the full calendar date is available in the tooltip. Metadata uses normal weight, 18px line height and wrapping/spaced segments instead of a dense timestamp string.

The collector is our own Node-built-ins implementation. **No Custom app, CLI, daemon, package or checkout is used at runtime.** It reads existing Claude/Codex OAuth stores and supported Pi/OpenCode login stores; Copilot uses existing GitHub token environment variables or read-only `gh auth token` for the signed-in Copilot account. Credentials stay inside the worker on the selected machine, are sent only over verified HTTPS to fixed official Anthropic/OpenAI/GitHub endpoints, and are never returned to the UI. **Claude Usage automatically renews an expired OAuth access token, or renews and retries once after HTTP 401/403**, on whichever machine is being checked—not a particular-host special case. It rereads the current login first to pick up a CLI's newer token, uses only Anthropic's fixed token endpoint, and saves rotated tokens in the original native Claude/Pi/OpenCode JSON store. Per-file locking, guarded atomic replacement and original Windows ACL/owner-only Unix staging protect credentials; unrelated settings/providers are retained, with no token backups or secrets in usage caches/logs. Invalid refresh credentials require signing in with the CLI; macOS keychain-only logins remain read-only. Codex/Copilot authentication values remain unchanged and are not automatically refreshed. No automatic browser login, logout, daemon start/restart or CLI installation occurs. Remote machines need Node and their own CLI logins.

Copilot can optionally show monthly premium-request usage and a per-model Used/Discounted/Billed breakdown from GitHub's billing API, when the existing token permits it. No allowance is guessed and no extra OAuth scope is requested. See [the CodeQuota reference analysis](docs/CODEQUOTA.md) for the useful endpoint, rejected cap assumptions and current permission limitation.

Copilot credit-based billing can report credits used without a finite cap. Such accounts show the actual used count, not a fabricated remaining percentage; redundant Chat/Completions/AI-credit unlimited notices are omitted. Copilot billing resets use the same countdown/date caption as other quotas. Calendar-only dates retain their supplied precision (for example, “Resets in 23d · Tue, Dec 1”), without inventing a reset time. Account identity is the last line of each card. Copilot shows its GitHub username on that bottom account line; other providers retain their email/account labels. The known CLI account is used directly, with a fixed read-only `/user` lookup only for tokens with no known username. No private-email lookup, additional GitHub scope, or login change is requested. The host dropdown has a 12px gap before the global actions (which retain their 4px internal spacing); provider refresh hitboxes are shifted 4px right within card padding, keeping their 28px size and the text rails unchanged. Enterprise GitHub usage is explicitly unsupported rather than sending credentials to the public host. Quotas, timestamps/account labels and display preferences are cached under skin-owned shared keys; no tokens are stored there. Provider SVG artwork is adapted from the reference Custom repository (Apache-2.0); it is not a runtime dependency.

**+ → Edit profiles** opens Settings → Profiles for that machine. Installed profiles are enabled by default; unavailable/unverified ones start disabled, without writing defaults. Explicit show/hide choices always win. Drag a row or its grip to reorder (5px threshold, source fade, insertion marker and the same icon/name floating preview as tabs); arrow controls remain. Drops cancel on leaving the list, Escape, machine/order/membership changes or a refresh, and save only the private menu order. Editors are titled **Edit profile** / **Add profile**. **Add a profile** is a plain, left-aligned action above the list, with a divider below it but none above it, and styled like **Add a machine**; it has no accompanying description. Show/hide and reorder menu entries, edit names/executable paths/JSON argument arrays, or add/remove private custom profiles. Profiles uses an agent navigation icon; its Terminal row has a gear shortcut to **Settings → Terminals**, not an agent-profile editor. Agent preferences use the per-machine `custom.profiles:*` shared keys; native `programs.json`, global keyboard shortcuts and running sessions remain untouched. Opening management does not persist defaults. Arguments are passed directly, without shell expansion; keep secrets in the CLI’s own login rather than profile arguments.

**Settings → Terminals** has a terminal navigation icon, a **Default terminal** selector for **+ → Terminal**, per-terminal switch-menu visibility, drag-and-drop/up/down order controls and an **Edit terminal** form. Drag a row or its grip to reorder: a 5px threshold prevents accidental moves, the source fades, and an insertion marker plus floating icon/name preview show the drop. The next shell-switch menu uses the saved order, with hidden terminals omitted; already-open menus remain stable. Leaving the list, Escape, refresh, machine changes or concurrent order/membership changes cancel the drag without saving. The form exposes name, executable, additional JSON argv and shell-specific startup switches: PowerShell banner/profile loading, Bash login/interactive/configuration loading, and CMD AutoRun. Profiles/configuration load by default; opting out can disable prompts, aliases and live folder reporting. Profile and terminal editors pin Save/Cancel and validation messages in a non-scrolling bottom footer; only the form fields scroll. Save applies only to future launches; Cancel/Escape retain existing settings. Visibility affects only the shell switcher: a hidden terminal may remain the deliberate default. **Default** retains the machine’s native shell and never appears in the switch menu. Native installed entries and existing custom launchers are configured separately per machine under `custom.terminals:*`; the selected default stays in the backward-compatible private Terminal profile. Preference export/import explicitly allowlists these settings, never discovery caches. Discovery reads shell files only: no terminal-profile/config/registry reads, shell execution, native configuration/PATH edits or local executable paths pushed to another machine. Existing sessions and explicit legacy argv remain unchanged; visibility, order and rename-only changes never normalize custom arguments.

Installed PowerShell/PowerShell 7 launchers use `-NoLogo`, matching the quiet startup configured in Windows Terminal. They do **not** use `-NoProfile`: the selected machine's ordinary PowerShell `$PROFILE` files still load, just as outside Herdr. Bash remains an interactive login shell (`--login -i`), and Command Prompt does not disable its machine AutoRun settings. Each machine discovers its own executable paths; no local paths or shell config files are pushed to another host. Old installed PowerShell selections with empty argv inherit the verified quiet launcher without rewriting preferences; explicit custom commands/arguments are preserved. Launcher-cache policy changes invalidate old banner-producing entries. This aligns shell startup, not terminal-host colors/fonts; Herdr retains its chosen appearance. Open a fresh tab or switch shells to use the new launcher—existing scrollback is never cleared.

The pane-header **shell switcher** lists explicit installed shell names only—no ambiguous Default entry. A matching compact divider and **Edit terminals** pencil row below the choices open **Settings → Terminals** for that menu’s machine, without launching or switching a shell. Arrow/Enter navigation includes this shortcut, even when every shell is hidden. Its machine-scoped catalog is warmed by the mounted tab bar, persisted across popup/app lifetimes and refreshed at most once a minute. Cached rows are copied synchronously and frozen for the popup lifetime; refreshes do not reorder/resize an open menu. Cold discovery reserves a fixed viewport. No loading/starting caption is drawn. Choosing a shell closes the menu immediately; the mounted tab-bar controller claims a machine/pane-scoped request and owns the bounded handoff task. Neither the popup's destruction nor the replacement header's remount cancels it. The current title stays unchanged while a thin 1px accent progress line advances along the bottom of the full pane header, spanning its title, folder and tool regions without being clipped by those slots. Only a genuinely ready replacement screen unlocks the final fill to 100%; after that native transition finishes, the same pane changes shells. Animation uses native GPUI width transitions, not a JS animation timer. The line belongs only to the outgoing terminal: the replacement header never replays it while awaiting the controller's completion update. The same keyed native width tracker stays mounted at zero while idle, so a later switch animates from zero rather than initializing at its target. Commit and completion/reset use zero-duration policies: commit holds at 100%, and reset is instantly hidden without a reverse fill. Failures clear the fill and show an error without closing the original session. Configured custom launchers also have an explicit editable name. Visibility/order/launch settings are composed before the opening snapshot, and stale launch settings are rejected rather than launching a different shell silently.

Switching replaces a fresh idle-shell session, not a running agent or foreground program. The prepare step starts the new terminal off-screen in the same folder/size and waits for a ready screen. After the full-header progress line completes, a token-checked commit changes only the existing pane's terminal reference through compare-and-swap. Pane/tab IDs, order, names, geometry and other sessions remain intact. Crucially, the old process is retired in a second phase only after this window's pane snapshot acknowledges the replacement; killing before viewer acknowledgment could briefly prune and recreate the tab. A missing acknowledgment or changed session keeps the old process rather than closing unknown work. The explicitly opted-in toast patch suppresses only the native “Layout changed elsewhere” notice during this local, same-pane handoff in Custom; errors, other notifications, other layouts and later genuine layout changes retain stock behavior. Finished-agent toasts use the shared neutral 7px idle bulb, matching the idle agent shown after opening the notification; unread Done indicators elsewhere remain green. Its original/ownership record is `frame-toast.json`, with the same guarded apply/restore/startup repair as the other patches.

The menu independently checks executable files on the selected machine. Native Windows Claude/Copilot locations and npm Codex/Pi entrypoints are supported. In a historical remote-workstation check, native `knownAgents()` reported all agents absent despite existing executable/package files and npm on PATH. The private fallback correctly finds Claude/Copilot and resolves Codex to that machine’s Node executable plus `@openai/codex/bin/codex.js`, retaining configured arguments. The launcher now always uses a verified absolute executable, even when native detection says installed: previously it incorrectly retained bare `claude`, which failed in the launching PowerShell's PATH. Old cached launchers are invalidated. Configured arguments and explicit custom paths remain intact; a custom path is never replaced by an unrelated fallback. Discovery never executes an agent, reads CLI auth, edits PATH/shell profiles, or restarts core; an unavailable Node probe keeps native confirmed entries and labels other entries not checked.

## Optional personal terminal input profile

This is a separate, explicitly requested exception to the normal no-settings/no-key-edits rule. It is **not applied by skin Install/Enable**. Its copy-only broker requires Custom's visible workspace status mod; use Ctrl+Shift+C or restore the profile outside Custom. Remove restores this opted-in key/selection profile before removing the broker.

```powershell
node scripts/terminal-input.mjs apply                         # clipboard keys only
node scripts/terminal-input.mjs apply --selection             # also white selection + contrast correction
node scripts/terminal-input.mjs check
node scripts/terminal-input.mjs restore
```

Terminal-only bindings: `ctrl-c` → `custom-workspace-status.copy`, `ctrl-v` → native paste, `ctrl-c ctrl-c` → two ETX interrupt bytes. The mounted status mod receives the copy request asynchronously and calls native copy without an originating key event: an empty selection cannot replay Ctrl+C into Bash. It does not focus the status bar, read clipboard contents into JavaScript, send raw keys or interrupt a terminal. Other bindings are unchanged. The program decides what explicit double-Ctrl+C interrupts do; this never kills a tab through Herdr. A sequence prefix may defer single-key dispatch until the chord resolves.

**Copy does not yet discard the native terminal selection.** Herdr 0.1.13 has no exposed selection-clear command/API. The skin does not simulate Esc, mouse clicks, paste, scroll or layout changes to erase it; those could affect the running program or viewport. Clearing after successful copy needs a native app hook.

`--selection` sets personal `colors.selection` to white and `minimum_contrast` to 4.5. Contrast correction can also change low-contrast program text outside the selection; native selected-text inversion remains a renderer behavior, not a skin API. These preferences apply across layouts. Exact original file snapshots are stored in `.customizations/terminal-input.json`; restore refuses later personal edits rather than overwriting them. Backups survive skin removal.

### Plain-looking Bash paste

Bash Readline's active-region preview can display freshly pasted **plain text** in inverse video; that is not copied clipboard styling. The separate opt-in below appends `enable-active-region off` to `~/.inputrc`, preserving existing content and explicitly keeping `enable-bracketed-paste on` for multiline-paste protection.

```powershell
node scripts/readline-paste.mjs apply
node scripts/readline-paste.mjs check
node scripts/readline-paste.mjs restore
```

New Bash sessions read it automatically. In an existing **Bash prompt**, run `bind -f ~/.inputrc` once, or press Ctrl+X then Ctrl+R. Nothing is injected into running shells/agents. `.customizations/readline-paste.json` stores the exact original file, and later personal edits cause a restore refusal rather than being lost. This independent Readline preference can remain after changing/removing the skin.

## Install / update / remove

```powershell
.\skin.ps1 Install   # installs this bundle; does not enable it
.\skin.ps1 Check     # owned-file hashes and all native mod checks
.\skin.ps1 Remove    # returns to main, removes only owned/unmodified skin files
```

Install preflights every destination and refuses to overwrite conflicting
personal files. Updates replace only previous unmodified skin files. Remove
preserves personally modified files and unrelated mods, including other
`custom-*` names. Identical files, including mod assets/helpers, are not rewritten.
A no-change Install emits no mod/frame writes, avoiding unnecessary hot-reload
storms. When a dependency changes, only its affected mod entrypoint receives a
final refresh after the dependency copy. Already-current frame patches are also
left untouched; startup-restored stock frames are still reapplied explicitly.
App-owned look overrides survive. Herdr's per-layout/mod preferences may remain; they
are inert on other layouts and let a reinstall retain your choices.

Clone code is pinned to 0.1.13, not overwritten by Herdr updates. After an app
upgrade run Check. New upstream functionality/fixes are not automatically
merged into private clones; update the bundle deliberately. Switching to main
always uses the app's current shipped panels.

## Development / checks

Edit this bundle, not shipped app files, then run Install to sync changes.
Shared visual helpers live in `lib/ui.js`; copy that file to each clone's
`ui.js` after editing it so imports remain sandbox-local. Keep `preview-font.js`
identical in Settings and Files; keep `profiles.js` identical in Settings and New menu. `modal-layout.js`, `program-icon.js`, `machine-picker.js`, `space-title.js` and `directory.js` copies must match their canonical files under `lib/`. Regression tests enforce all shared contracts.

```powershell
npm test
.\skin.ps1 Check
```

The Node test verifies original-file hashes, unchanged layout topology,
private assets and 589 deferred render/hover cases (priority, grouped, rail,
empty). Installer regressions watch a disposable app home to require zero mod
writes on no-change installs and only the affected helper/entrypoint on updates.
Frame tests also require no-change apply to preserve file identities. These
checks are not a replacement for a native screenshot/manual check.
`baseline.json` records original 0.1.13 inputs; `baselines/0.1.14.json` records the reviewed update without changing that history. Every changed stock file was verified byte-for-byte against source embedded in the installed 0.1.14 executable. `scripts/record-stock-baseline.mjs` is an explicit review-time tool, not automatic adoption of user files. Reviewed palette/confirmation originals for both versions are retained; a stock reset on upgrade rebases the restore backup so removal does not downgrade 0.1.14. Unknown future stock still causes a refusal. `scripts/scaffold.mjs` is a
one-time seed, **not** an updater; it refuses to replace existing clones.

Native screenshot inspection also covers the live workspace, Files, picker
and launch menu. Historical screenshots/logs/generated SDK files are archived outside yadm,
not shipped in this bundle. Keep personal terminal captures out of source control.
