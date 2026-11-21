// Same ownership/focus rules as tab-rename.js, scoped to visible sidebar spaces.
import { InputState } from 'gpui-base';
import { shared, setShared, spaces, focused, run, layout, window as appWindow } from './host.js';
const SPACE_REQUEST = 'custom.space-rename';
const spaceRenameLayout = () => String(shared('layout') ?? '').toLowerCase() === 'custom';
const spaceRenameValue = s => s.named === false ? '' : s.name ?? '';
function renameSidebarNode(node) {
  if (node?.id === 'sidebar') return node;
  for (const child of node?.children ?? []) { const found = renameSidebarNode(child);if (found) return found; }
  return null;
}
const renameSidebar = () => { const s = renameSidebarNode(layout());return s && !s.hidden ? s : null; };
export function requestInlineSpaceRename(p) {
  if (!spaceRenameLayout() || p?.command?.name !== 'space.rename' || !renameSidebar()) return false;
  const all = spaces(), active = all.find(s => s.active);
  const id = p.command.args?.id ?? focused()?.space ?? active?.id;
  if (!all.some(s => s.id === id)) return false;
  setShared(SPACE_REQUEST, { token: `${Date.now()}-${Math.random()}`, id, active: active?.id, expiresAt: Date.now() + 5000 });
  return true;
}
function currentSpaceRename(owner, edit) {
  const all = spaces(), index = all.findIndex(s => s.id === edit.id), space = all[index];
  const sidebar = renameSidebar();
  return spaceRenameLayout() && sidebar && (sidebar.size?.px ?? Infinity) >= 160
    && space && index === edit.index && (space.machine ?? null) === edit.machine
    && spaceRenameValue(space) === edit.original && all.find(s => s.active)?.id === edit.returnSpace
    && !owner.folded?.has(edit.machine);
}
export function cancelSpaceRename(owner, cx, edit = owner.rename, restoreFocus = false) {
  if (!edit || owner.rename !== edit) return false;
  owner.rename = null;
  edit.input.release();
  const active = spaces().find(s => s.active);
  if (restoreFocus && edit.returnPane && active?.id === edit.returnSpace
    && active?.tabs?.find(t => t.active)?.id === edit.returnTab && focused()?.pane === edit.returnPane)
    run('pane.focus', { pane: edit.returnPane });
  cx?.notify();return true;
}
export function saveSpaceRename(owner, cx, edit = owner.rename) {
  if (!edit || owner.rename !== edit) return;
  const valid = currentSpaceRename(owner, edit), name = edit.input.value();
  cancelSpaceRename(owner, cx, edit, true);
  if (valid) run('space.rename', { id: edit.id, name }); // Empty restores automatic folder naming.
}
export function beginSpaceRename(owner, id, cx) {
  const all = spaces(), index = all.findIndex(s => s.id === id), sidebar = renameSidebar();
  if (!spaceRenameLayout() || index < 0 || !sidebar || (sidebar.size?.px ?? Infinity) < 160) return false;
  if (owner.rename?.id === id) return true;
  cancelSpaceRename(owner, cx);owner.cancelDrag?.(cx);
  const space = all[index], machine = space.machine ?? null;
  if (owner.folded?.delete(machine)) localStorage.setItem('machines.folded', JSON.stringify([...owner.folded]));
  owner.shown?.add(id); // A rename request need not wait for Git discovery.
  if (!owner.spaceRenameKeysBound && typeof cx.bind_keys === 'function') {
    cx.bind_keys(['f2', 'shift-f2'].map(keystroke => ({ keystroke, action: 'custom-space-rename.ignore', context: 'CustomSpaceRename' })));
    owner.spaceRenameKeysBound = true;
  }
  const original = spaceRenameValue(space), active = all.find(s => s.active), focus = focused();
  // Preview the title after an empty save, never the existing custom alias.
  const automatic = { ...space, named: false, name: '' };
  const input = InputState.new({ value: original, placeholder: owner.spaceRenameLabel?.(automatic) ?? '' });
  const edit = { id, machine, index, original, input, handle: cx.focus_handle(),
    returnSpace: active?.id, returnTab: active?.tabs?.find(t => t.active)?.id, returnPane: focus?.pane };
  owner.rename = edit;
  input.set_selected_range({ start: 0, end: original.length });
  input.on('change', (_e, cx) => { if (owner.rename === edit) cx.notify(); });
  input.on('submit', (_e, cx) => saveSpaceRename(owner, cx, edit));
  input.on('blur', (_e, cx) => cancelSpaceRename(owner, cx, edit));
  input.focus();cx.notify();return true;
}
export function syncSpaceRename(owner, cx) {
  if (!cx?.spawn) return;
  const edit = owner.rename;
  if (edit && !currentSpaceRename(owner, edit) && owner.spaceRenameClosing !== edit) {
    owner.spaceRenameClosing = edit;
    cx.spawn(async cx => { await cx.sleep(0);cancelSpaceRename(owner, cx, edit);if (owner.spaceRenameClosing === edit) owner.spaceRenameClosing = null; });
  }
  const job = shared(SPACE_REQUEST);
  if (!job?.token || owner.spaceRenamePending === job.token || appWindow()?.active === false) return;
  owner.spaceRenamePending = job.token;
  cx.spawn(async cx => {
    await cx.sleep(0); // Never allocate/release/focus a native InputState during render.
    try {
      if (shared(SPACE_REQUEST)?.token !== job.token || appWindow()?.active === false) return;
      const all = spaces(), sidebar = renameSidebar();
      if (!Number.isFinite(job.expiresAt) || job.expiresAt <= Date.now() || !spaceRenameLayout()
        || !sidebar || all.find(s => s.active)?.id !== job.active || !all.some(s => s.id === job.id)) { setShared(SPACE_REQUEST, null);return; }
      if ((sidebar.size?.px ?? Infinity) < 160) {
        if (owner.spaceRenameExpansion !== job.token) { owner.spaceRenameExpansion = job.token;run('layout.resize', { id: 'sidebar', px: 248 });cx.notify(); }
        return; // The next native layout frame claims the request after expansion.
      }
      setShared(SPACE_REQUEST, null);
      beginSpaceRename(owner, job.id, cx);
    } finally { if (owner.spaceRenamePending === job.token) owner.spaceRenamePending = null; }
  });
}
