// A small folder browser for another machine: the system folder dialog only browses
// this computer, so remote folders are listed over `exec --on` and picked here.
import { div, svg } from 'gpui-kit';
import { h_flex, v_flex, Popover } from 'gpui-base';
import { exec, machines, settings } from './host.js';
import { U, menuSurface, control, itemHover, emptyState, dropdownPlacement } from './ui.js';
import { KIT, pickerHeader, pickerListHeight, pickerFooter, changeCount } from './settings-kit.js';

const psQuote = text => "'" + String(text).replace(/['‘’‚‛]/g, "$&$&") + "'";

// '' lists the drives; '~' is that machine's home. Windows machines (PowerShell).
export const LIST_SCRIPT = [
  '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)',
  '& { param($p)',
  "  if ($p -eq '~') { $p = $HOME }",
  "  if (-not $p) { @{ path = ''; parent = $null; dirs = @(Get-PSDrive -PSProvider FileSystem | ForEach-Object { $_.Root }) } | ConvertTo-Json -Compress; return }",
  '  $i = Get-Item -LiteralPath $p -Force -ErrorAction Stop',
  "  if (-not $i.PSIsContainer) { throw 'Not a folder.' }",
  "  $up = if ($i.Parent) { $i.Parent.FullName } else { '' }",
  '  $d = @(Get-ChildItem -LiteralPath $i.FullName -Directory -Force -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -First 500 | ForEach-Object { $_.Name })',
  '  @{ path = $i.FullName; parent = $up; dirs = $d } | ConvertTo-Json -Compress',
  '}',
].join('\n');

// { path, parent, dirs }: path '' is the list of drives, parent null means no way up.
export async function listFolder(machine, path) {
  const r = await exec('powershell', ['-NoProfile', '-NonInteractive', '-Command', `${LIST_SCRIPT} ${psQuote(path)}`], { on: machine, timeout: 20000 });
  if (r.code !== 0) throw new Error(String(r.stderr || 'Cannot list that folder.').trim().split(/\r?\n/)[0].slice(0, 200));
  const out = JSON.parse(String(r.stdout || '{}').trim() || '{}');
  const dirs = Array.isArray(out.dirs) ? out.dirs : out.dirs ? [out.dirs] : [];
  return { path: String(out.path ?? ''), parent: out.parent === null || out.parent === undefined ? null : String(out.parent), dirs: dirs.map(String) };
}
const join = (path, name) => path ? `${path.replace(/[\\/]+$/, '')}\\${name}` : name;

// The browser's state lives in `view.folderBrowser`: one open at a time.
// `from` is where it opens when there is no saved folder (and where it falls back to):
// '~' that machine's home, '' its list of drives.
// `selected` are the folders ticked to begin with (the ones already added, for a list).
export function openBrowser(view, cx, key, machine, start, { from = '~', selected = [] } = {}) {
  view.folderBrowser = { key, machine, from, path: null, parent: null, dirs: [], selected: [...selected], loading: false, error: null, serial: 0 };
  view.folderBrowser.placement = placement(view.folderBrowserBounds?.[key]);
  browse(view, cx, start || from, start ? from : null);
}
// The panel opens like a dropdown menu: under its button, or above it when there is more
// room there, its right edge on the button's. It is the plugin kit's picker: LIST is the
// folder list's full height, CHROME the rest (the path line and the actions).
const LIST = pickerListHeight(), CHROME = KIT.picker.height - LIST;
function placement(bounds) {
  try { return dropdownPlacement(bounds, LIST + CHROME, globalThis.window.viewport_size().height, settings().zoom); }
  catch { return { above: false, height: LIST + CHROME }; }
}
export function closeBrowser(view) { view.folderBrowser = null; }
// Switching machine starts again from the same place on that machine.
function switchMachine(view, cx, machine) {
  const b = view.folderBrowser;
  if (!b || b.machine === machine) return;
  // Ticked folders belong to the machine they were ticked on.
  Object.assign(b, { machine, path: null, parent: null, dirs: [], selected: [], error: null });
  browse(view, cx, b.from ?? '~');
}

function browse(view, cx, path, fallback = null) {
  const b = view.folderBrowser;
  if (!b) return;
  const serial = ++b.serial;
  b.loading = true; b.error = null;
  cx.spawn(async (cx) => {
    try {
      const listed = await listFolder(b.machine, path);
      if (view.folderBrowser !== b || b.serial !== serial) return;
      Object.assign(b, listed, { loading: false });
    } catch (e) {
      if (view.folderBrowser !== b || b.serial !== serial) return;
      // A saved folder that no longer exists starts from home instead.
      if (fallback !== null) { b.loading = false; browse(view, cx, fallback); return; }
      b.loading = false; b.error = String(e?.message ?? e);
    }
    cx.notify();
  });
  cx.notify();
}

// Ticked folders are kept by full path and compared the way Windows compares paths.
const pathKey = path => String(path).replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
const samePath = (a, b) => pathKey(a) === pathKey(b);
export function toggleSelected(b, path) {
  const at = b.selected.findIndex(p => samePath(p, path));
  if (at < 0) b.selected.push(path); else b.selected.splice(at, 1);
}

// trigger: the button that opens it. onPick(path, cx) receives the chosen folder.
// With `multi`, every folder has a checkbox (ticks are kept while browsing elsewhere on that
// machine) and folders are only ever chosen by ticking. `multi.existing` are the folders
// already added: they start ticked (pass them to openBrowser as `selected`), and unticking
// one asks for its removal. onPick receives { add, remove }: newly ticked folders and
// unticked existing ones. `multi.label(adds, removes)` names the button.
// `machineSwitch: false` leaves out the machine tabs, for a caller that chooses the machine
// itself (a dropdown beside the trigger): the browser then stays on the machine it opened on.
export function folderBrowser(view, t, { id, key, trigger, focus, onOpen, onPick, multi = null, machineSwitch = true }) {
  const b = view.folderBrowser?.key === key ? view.folderBrowser : null;
  const picked = b?.selected ?? [], existing = multi?.existing ?? [];
  const adds = picked.filter(p => !existing.some(e => samePath(e, p))), removes = existing.filter(e => !picked.some(p => samePath(e, p)));
  const box = (rid, path) => {
    const on = picked.some(p => samePath(p, path));
    return div().id(rid).size(U.row).flex_none().flex().items_center().justify_center().rounded(U.radius).cursor_pointer()
      .role('check_box').accessibility_label(`Select ${path}`).hover(e => e.bg(t.hover))
      .on_click((_e, cx) => { toggleSelected(b, path); cx.notify(); })
      .child(div().size(14).flex_none().rounded(3).border_1().border_color(on ? t.solid : t.input).bg(on ? t.solid : '#00000000').flex().items_center().justify_center()
        .when(on, e => e.child(svg('mods/custom-settings/check.svg').size(10).text_color(t.solid_foreground))));
  };
  // A folder that can be ticked: its checkbox, then the name that opens it. Drives cannot.
  const entry = (rid, name, path) => !multi || !b.path ? row(rid, name, 'mods/custom-workspace-chrome/folder.svg', cx => browse(view, cx, path))
    : h_flex().id(`${rid}-line`).w_full().gap(2).items_center().child(box(`${rid}-check`, path))
      .child(row(rid, name, 'mods/custom-workspace-chrome/folder.svg', cx => browse(view, cx, path)).flex_1().min_w(0));
  const row = (rid, label, icon, onClick, muted = false) => h_flex().id(rid).h(U.row).px(8).gap(8).items_center().rounded(U.radius)
    .cursor_pointer().hover(e => e.bg(t.hover)).on_click((_e, cx) => onClick(cx))
    .child(svg(icon).size(U.smallIcon).flex_none().text_color(t.muted))
    .child(div().flex_1().min_w(0).truncate().text_color(muted ? t.muted : t.foreground).child(label));
  const hosts = () => {
    const list = [...machines()].filter(m => !m.temporary);
    if (!list.some(m => m.name === null)) list.unshift({ name: null });
    return list;
  };
  // A segment of the machine switch, styled like the settings' choice controls.
  const segment = (m) => {
    const on = m.name === b.machine;
    return div().id(`${id}-m-${m.name ?? 'local'}`).flex_1().min_w(0).h(U.field - 6).px(10).flex().items_center().justify_center()
      .rounded(4).cursor_pointer().bg(on ? t.selected : '#00000000').text_color(on ? t.foreground : t.muted)
      .hover(e => e.bg(itemHover(t, on))).on_click((_e, cx) => switchMachine(view, cx, m.name))
      .child(div().truncate().child(m.name ?? 'This computer'));
  };
  // Header like the font picker's search: the machine switch above a divider, then
  // where you are, the folders, and the actions at the bottom.
  const content = () => menuSurface(t, v_flex()).id(`${id}-panel`).w(KIT.picker.width).p(0).pt(0).pb(0).track_focus(focus)
    .on_scroll_wheel((_e, cx) => cx.stop_propagation())
    .when(machineSwitch, el => el.child(div().id(`${id}-header`).w_full().flex_none().p(U.gutter).border_b(1).border_color(t.border)
      .child(control(t, h_flex()).w_full().p(2).gap(2).children(hosts().map(segment)))))
    .child(pickerHeader(t, `${id}-path`,
      svg('mods/custom-workspace-chrome/folder.svg').size(U.smallIcon).flex_none().text_color(t.muted),
      div().flex_1().min_w(0).truncate().text_size(U.meta).text_color(t.muted)
        // Where it is, even before the first listing arrives; loading shows in the footer.
        .child(b.path || (b.path === null && b.from !== '' ? (b.machine ?? 'This computer') : `Drives on ${b.machine ?? 'this computer'}`))))
    .child(v_flex().id(`${id}-list`).w_full().h(Math.max(120, (b.placement?.height ?? LIST + CHROME) - CHROME)).p(4).gap(U.rowGap).overflow_y_scrollbar()
      .when(b.parent !== null && b.path !== null, el => el.child(row(`${id}-up`, '..', 'mods/custom-settings/arrow-up.svg', cx => browse(view, cx, b.parent), true)))
      .children(b.dirs.map((name, i) => entry(`${id}-d${i}`, name.replace(/\\$/, ''), join(b.path, name))))
      .when(!b.loading && !b.error && b.path !== null && !b.dirs.length, el => el.child(emptyState(t,{id:`${id}-empty`,title:'No folders',icon:'mods/custom-workspace-chrome/folder.svg'}).flex_1()))
      .when(Boolean(b.error), el => el.child(div().text_size(U.meta).text_color(t.blocked).child(b.error))))
    // The kit's footer: Loading or what this visit changes (folders ticked here, not the
    // ones already added, and any unticked) on the left; Cancel and the action on the right.
    .child(pickerFooter(t, id, { loading: b.loading, count: multi ? changeCount(adds.length, removes.length) : '', onCancel: cx => onOpen(false, cx),
      ...(multi
        ? { confirm: multi.label?.(adds.length, removes.length) ?? 'Apply', enabled: !b.loading && adds.length + removes.length > 0, onConfirm: cx => onPick({ add: [...adds], remove: [...removes] }, cx) }
        : { confirm: 'Choose', enabled: Boolean(b.path) && !b.loading, onConfirm: cx => onPick(b.path, cx) }) }));
  // Where the button is on screen, noted as the pointer reaches it, decides above or below.
  const bounds = view.folderBrowserBounds ??= {};
  const anchored = trigger.on_mouse_move(e => { bounds[key] = e.bounds; }).on_mouse_down('left', e => { bounds[key] = e.bounds; });
  const above = Boolean(b?.placement?.above);
  return Popover.new(`${id}-popup`).open(Boolean(b)).overlay_closable(true).anchor(above ? 'bottom_right' : 'top_right')
    .track_focus(focus).on_open_change(onOpen).trigger(anchored)
    .when(Boolean(b), e => e.content(div().flex().flex_col().when(!above, s => s.pt(4)).child(content()).when(above, s => s.child(div().h(4).flex_none()))));
}
