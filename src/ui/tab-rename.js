// Presentation-only tab labels and an owner-bound inline editor. No terminal input.
import { InputState } from 'gpui-base';
import { shared, setShared, spaces, focused, run, window as appWindow } from './host.js';
const REQUEST = 'custom.tab-rename';
const isCustom = () => String(shared('layout') ?? '').toLowerCase() === 'custom';
const valueOf = tab => tab.named === false ? '' : tab.name ?? '';
const activeSpace = () => spaces().find(s => s.active);

export function tabTitle(tab, index, file = false) {
  if (file) return (tab.name ?? '').split(/[\\/]/).pop();
  if (tab.named === false || (!tab.named && /^tb\d+$/.test(tab.name ?? ''))) return String(index + 1);
  return tab.name || String(index + 1);
}

// The private Custom context menu requests an inline editor without modifying
// Herdr's native Prompt mod. Native palette/F2 prompts remain stock Herdr.
export function requestInlineTabRename(p) {
  if (!isCustom() || p?.command?.name !== 'tab.rename') return false;
  const space = activeSpace(), id = p.command.args?.id ?? focused()?.tab ?? space?.tabs.find(t => t.active)?.id;
  if (!space?.tabs.some(t => t.id === id)) return false; // Offscreen targets retain native behavior.
  setShared(REQUEST, { token: `${Date.now()}-${Math.random()}`, space: space.id, id, expiresAt: Date.now() + 5000 });
  return true;
}

function current(edit) {
  const space = activeSpace(), index = space?.tabs.findIndex(t => t.id === edit.id) ?? -1;
  return space?.id === edit.space && index === edit.index && valueOf(space.tabs[index]) === edit.original;
}

export function cancelTabRename(owner, cx, edit = owner.rename, restoreFocus = false) {
  if (!edit || owner.rename !== edit) return false;
  owner.rename = null; // Ignore blur/release callbacks from this old editor.
  edit.input.release();
  if (restoreFocus && edit.returnPane && activeSpace()?.id === edit.space
    && activeSpace()?.tabs.find(t => t.active)?.id === edit.returnTab && focused()?.pane === edit.returnPane)
    run('pane.focus', { pane: edit.returnPane });
  cx?.notify();
  return true;
}

export function saveTabRename(owner, cx, edit = owner.rename) {
  if (!edit || owner.rename !== edit) return;
  const valid = current(edit), name = edit.input.value();
  cancelTabRename(owner, cx, edit, true);
  if (valid) run('tab.rename', { id: edit.id, name }); // Empty stays empty: native automatic numbering.
}

export function beginTabRename(owner, id, cx) {
  const space = activeSpace(), index = space?.tabs.findIndex(t => t.id === id) ?? -1;
  if (!isCustom() || index < 0) return false;
  if (owner.rename?.id === id && owner.rename.space === space.id) return true;
  cancelTabRename(owner, cx);
  owner.cancelDrag?.(cx);
  if (!owner.renameKeysBound && typeof cx.bind_keys === 'function') {
    cx.bind_keys([{ keystroke: 'f2', action: 'custom-tab-rename.ignore', context: 'CustomTabRename' }]);
    owner.renameKeysBound = true;
  }
  const tab = space.tabs[index], original = valueOf(tab), focus = focused();
  const input = InputState.new({ value: original, placeholder: String(index + 1) });
  const edit = { id, space: space.id, index, original, input, handle: cx.focus_handle(),
    token: `${Date.now()}-${Math.random()}`,
    startWidth: Math.max(1, (owner.titleWidths?.get(id) ?? 8) + (owner.renameChromeWidth ?? 0)), expanded: false,
    returnPane: focus?.pane, returnTab: space.tabs.find(t => t.active)?.id };
  owner.rename = edit;
  input.set_selected_range({ start: 0, end: original.length });
  input.on('change', (_e, cx) => { if (owner.rename === edit) cx.notify(); });
  input.on('submit', (_e, cx) => saveTabRename(owner, cx, edit));
  input.on('blur', (_e, cx) => cancelTabRename(owner, cx, edit));
  input.focus();
  cx.notify();
  return true;
}

// Like shell handoffs, schedule native state creation in a task, never render.
export function syncTabRename(owner, cx) {
  if (!cx?.spawn) return;
  const edit = owner.rename;
  if (edit && !current(edit) && owner.renameClosing !== edit) {
    owner.renameClosing = edit;
    cx.spawn(async cx => {
      await cx.sleep(0); // spawn starts synchronously during render; native state work must yield.
      cancelTabRename(owner, cx, edit);
      if (owner.renameClosing === edit) owner.renameClosing = null;
    });
  }
  const job = shared(REQUEST);
  if (!job?.token || owner.renamePending === job.token || appWindow()?.active === false) return;
  owner.renamePending = job.token;
  cx.spawn(async cx => {
    await cx.sleep(0); // Resume in a task scope before creating/focusing native input state.
    try {
      if (shared(REQUEST)?.token !== job.token) return;
      setShared(REQUEST, null); // Claim once, including across mounted copies.
      if (!Number.isFinite(job.expiresAt) || job.expiresAt <= Date.now() || activeSpace()?.id !== job.space) return;
      beginTabRename(owner, job.id, cx);
    } finally { if (owner.renamePending === job.token) owner.renamePending = null; }
  });
}
