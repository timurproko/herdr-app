# Header title ownership and interaction chrome

`src/ui/ui.js` owns `panelTitle`: every customization-owned header title that
opens a dropdown uses this component. It always uses `insetActionChrome`, the
same chrome used by ordinary inset `iconButton` tools: 24px high, 4px corners,
foreground colour with hex alpha `0a` (fallback `#ffffff0a`), and foreground text
on hover. There is no title-caller variant or opt-in. Neither ordinary icon tools
nor title triggers add a persistent pressed fill or keyboard-focus override;
native accessibility/focus behaviour stays unchanged. Pin's pressed state is a
separate Toggle contract.

Titles retain 8px inline padding, 8px content gaps and their existing shrink/max
width rules. Square icon tools retain centred glyphs inside their 24px targets;
content sizing is deliberately separate from shared interaction chrome. Hover
changes no layout properties. The pane's 200px title cap, folder/tool reservation,
absolute Crew/Ship pill and sidebar repository/folder labels remain untouched.

## Inventory

| Header | Ownership and renderer | Treatment |
| --- | --- | --- |
| Terminal shell/name dropdown | Custom: `src/features/pane/main.js` through `panelTitle` | Shared inset chrome; existing Open tab menu and eligibility unchanged |
| Split terminal panes | Same Custom pane renderer from `src/appearance/layouts/Custom.json` | Same component in every split, focused or unfocused |
| Remote-machine terminal panes/spaces | Same Custom layout/pane renderer; machine-qualified terminal address | Same chrome, no remote installation or native patch |
| Git, ordinary folder view | Custom plugin: `src/plugins/git/mod/main.js` through `sidebarTitle` | Shared component when multiple sidebar panels are enabled |
| Git, coordinator/fleet view | Same plugin's coordinator header through `sidebarTitle` | Same component; repository label and tools stay outside title flow |
| Files panel | Custom plugin: `src/plugins/files/mod/main.js` through `sidebarTitle` | Same component; lone enabled panel remains static |
| Other plugin sidebar title contributions | Generic `src/ui/sidebar-title.js`, driven by registry metadata | Inherit shared chrome without plugin-specific styling |
| Agent/program, busy shell, file, Start and other mod pane titles | Custom pane renderer, non-dropdown branch | Remain static; no new hover, chevron or menu |
| Usage dialog | Custom plugin: `src/plugins/usage/mod/main.js` | Static Usage title; its separate machine picker is a field, not a title dropdown |
| Usage sidebar summary/provider cards/settings | Same plugin | Summary opens the dialog; provider headings are static and account pickers remain separate content controls |
| Spaces and Agents top headers | Custom: `src/features/spaces/main.js`, `src/features/agents/main.js` | Static titles with separate options icon buttons |
| Local/remote machine sections; Git repository sections; Agents groups | Custom Spaces/Git/Agents renderers | Fold disclosures, not title dropdowns; existing full-row hover remains |
| Tabs, workspace brand/status, Settings, Jump, worktree/machine/confirmation dialogs | Custom feature renderers | Static headings or separate navigation/picker/icon controls, not title dropdowns |
| Stock layout terminal/panel headers, native peek/terminal-list panes, floating/native chrome not mapped to `custom-pane` | Herdr-owned `mods/pane`, `mods/files`, `mods/changes`, `mods/peek`, `mods/terminals-pane`, `mods/terminals-bar` and host layout chrome | Not changed; Custom's ownership does not extend to these surfaces |
| Native window/overlay frames, welcome, release notes and native Settings | Herdr-owned `frame/` and app chrome | Not changed; existing palette/feedback exceptions do not own these headers |

The native rows are exclusions, not claims of parity. This change adds no native
patch and edits no installed files. The current Custom layout maps its tab panes
to `custom-pane` independently of machine identity, so remote and split headers
are not separate implementations.

## Rendering regression

`tests/sidebar-plugins.test.mjs` evaluates the real shared UI, sidebar title and
Pane renderer with synthetic GPUI elements. It executes hover callbacks and
compares emitted fill/alpha/text style, height, radius and absence of custom
pressed/focus states against actual inset icon buttons across dark, light,
coloured and fallback foregrounds. It covers Files/Git, generic plugin metadata,
local/remote terminal identities, split/unsplit panes, focused/unfocused panes,
and Crew/Ship overlays. It also preserves title padding/caps, tool reservation,
menu props, plugin-disable guards and static-title eligibility. Both ordinary and
coordinator Git call the same tested sidebar title renderer.

These are render-tree/style regressions, not native screenshot or pixel-layout
proof. No desktop deployment, native patch, live terminal input or account action
is part of the regression.
