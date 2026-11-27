// Settings > Plugins: the renderer of plugin declarations. A plugin declares what it needs
// (settings, prerequisites, list sections, pages; see docs/PLUGIN-UI.md) and this file
// draws every one of them from the shared kit (settings-kit.js). Nothing here knows any
// particular plugin: wording comes from the declarations, geometry from the kit.
import { div, svg, image } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, Checkbox, TextareaState, Textarea } from "gpui-base";
import { U, slot, description, button, control, chevron, emptyState, dropdown, menuSurface, searchField, settingsRow, iconButton, chevronSlot } from "./ui.js";
import { KIT, badge, statusText, workingStatus, statusRail, actionButton, actionTrigger, checkButton, choice, pickerTabs, optionDropdown, skeleton,
  disclosure, fieldRow, scopeRow, removableRow, pickerHeader, pickerListHeight, pickerFooter, changeCount, changeLabel, actionInput } from './settings-kit.js';
import { PLUGINS, pluginEnabled, setPluginEnabled, pluginSetting, setPluginSetting, checkPlugin, pluginContext, pluginOptions, orderedPlugins, setPluginOrder } from './plugins.js';
import { reorder } from './reorder.js';
import { machinePicker } from './machine-picker.js';
import { editorActionButton } from './modal-layout.js';
import { folderBrowser, openBrowser, closeBrowser } from './folder-browser.js';
import {spaces,panes,terminals,focused,settings} from './host.js';
import {spaceDirectory} from './directory.js';

// The app's launch profiles, handed in by Settings (main.js) so this renderer stays free of
// the profile model: `{ list(machine) -> Promise<profile[]>, setRole(machine, key, role, on),
// order(machine, role) -> keys, setOrder(machine, role, keys) }`.
let profileService = null;
export function provideProfiles(service) { profileService = service; }

export { statusText };
const I = (name) => `mods/custom-settings/${name}.svg`;
const sectionKey = (plugin, item) => `${plugin.id}:${item.id}`;
const listId = (plugin, item) => `st-plugin-list-${plugin.id}-${item.id}`;
// A fixed, plugin-supplied connection refusal applies to setup as a whole, not
// three repairable rows. Any completed group can supply it; machine/session
// changes retire the results before the next card projection.
const setupUnavailable = (view, plugin) => pluginEnabled(plugin) ? view.pluginChecks?.[plugin.id]?.items?.find(item =>
  typeof item.unavailable?.detail === 'string' && item.unavailable.detail.length > 0 && item.unavailable.detail.length <= 600)?.unavailable : null;

// On the Plugins page the Settings header's machine picker is the only one: every plugin's
// machine setting follows it, and the cards name that machine instead of offering their own
// dropdown. Returns the ids of the plugins whose machine changed (to re-check them).
const machineName = machine => machine ?? 'This computer';
export function followSettingsMachine(view) {
  const machine = view.settingsMachine ?? null, changed = [];
  if (view.pluginMachine !== machine) {
    clearPluginForms(view);
    view.listPicker = null; view.pluginConfirm = null; view.pluginFixError = {};
    view.pluginRowChoices = new Map();
    if (view.pluginListOperation) { view.pluginListOperation = null; view.pluginFixing = null; view.pluginSettling = {}; }
    view.pluginSessions = Object.fromEntries(PLUGINS.map(p => [p.id, {}]));
    view.pluginMachine = machine;
    for (const plugin of PLUGINS) if (plugin.machineScoped) {
      changed.push(plugin.id);
      delete view.pluginChecks?.[plugin.id];
    }
  }
  for (const plugin of PLUGINS) for (const def of (plugin.settings ?? []).filter(d => d.type === 'machine')) {
    if ((pluginSetting(plugin, def.key) ?? null) === machine) continue;
    setPluginSetting(plugin, def.key, machine);
    if (!changed.includes(plugin.id)) changed.push(plugin.id);
  }
  return changed;
}

export function initPlugins(view, cx, requested = null, options = {}) {
  clearPluginForms(view);
  view.pluginMachine = view.settingsMachine ?? null;
  view.pluginForms = {};
  view.pluginSessions = Object.fromEntries(PLUGINS.map(p => [p.id, {}]));
  view.pluginTarget = PLUGINS.some(p => p.id === requested) ? requested : null;
  const target = PLUGINS.find(p => p.id === view.pluginTarget);
  const section = target?.prerequisites?.find(p => p.section && p.id === options?.section);
  const search = typeof options?.search === 'string' && options.search.length <= 200 && !/[\u0000-\u001f\u007f]/.test(options.search) ? options.search.trim() : '';
  view.pluginSearches = {}; // `${plugin}:${section}` -> the search field of a list's Add popup
  view.pluginChecks = {}; // id -> merged items and independently versioned check groups
  view.pluginFixing = null; // `${plugin}:${prerequisite}` while a fix or a list change runs
  view.pluginListOperation = null;
  view.pluginFixOperation = null;
  view.pluginFixError = {};
  // `${plugin}:${prerequisite}` -> true from the end of its action until the re-check that
  // follows has answered, so the row goes straight from "Updating" to its new status
  // instead of flashing its old one (and its button) in between.
  view.pluginSettling = {};
  view.pluginConfirm = null; view.pluginClosed = false;
  view.pluginOpen = view.pluginTarget ? {[`${view.pluginTarget}-settings`]:!target?.advancedSettings} : {}; // disclosures, popups
  if (section) {
    view.pluginOpen[`${view.pluginTarget}-requirements`] = false;
    view.pluginOpen[`${view.pluginTarget}-${section.id}`] = true;
  }
  view.pluginFocus = {}; // focus handles of popups, by the same keys as their open state
  view.pluginInputs = {}; // `${plugin}-${key}` -> { state, focused } of a text setting
  view.pluginTextareas = {}; // `${plugin}-${key}` -> { state, focused } of a longtext setting's page
  view.pluginTextPage = null; // { plugin, key } while a longtext or profiles setting's page is open
  view.rolePage = null; // { machine, loading, error, items } of an open profiles page
  view.folderBrowser = null; // the open folder browser (one at a time)
  view.listPicker = null; // the open item picker of a list section (one at a time)
  view.pluginRowHover = null; // the added item under the pointer, which shows its Remove
  view.pluginRowChoices = new Map(); // checked row identities and retained native focus handles
  for (const plugin of PLUGINS) for (const p of plugin.prerequisites ?? []) {
    view.pluginFocus[`${plugin.id}-${p.id}-selection`] = cx.focus_handle();
    if (p.form) view.pluginForms[sectionKey(plugin, p)] = newActionForm(p.form);
    if (!p.list) continue;
    view.pluginFocus[`${plugin.id}-${p.id}-pick`] = cx.focus_handle();
    view.pluginFocus[`${plugin.id}-${p.id}-scope`] = cx.focus_handle();
    if (p.list.picker?.kind === 'items') {
      const input = InputState.new({ placeholder: p.list.picker.search ?? 'Search…', value: p === section ? search : '' });
      input.on('change', (_e, cx) => cx.notify());
      view.pluginSearches[sectionKey(plugin, p)] = input;
    }
  }
  // A deep link with a search (the Git panel's "add this repository") opens Add, filtered.
  if (section?.list?.picker?.kind === 'items' && search) openListPicker(view, cx, target, section, { keepSearch: true });
  for (const plugin of PLUGINS) for (const def of (plugin.settings ?? []).filter(d => !d.hidden)) {
    if (def.type === 'machine') view.pluginFocus[`${plugin.id}-${def.key}-machine`] = cx.focus_handle();
    if (def.type === 'multiselect') view.pluginFocus[`${plugin.id}-${def.key}-multi`] = cx.focus_handle();
    if (def.type === 'select') view.pluginFocus[`${plugin.id}-${def.key}-select`] = cx.focus_handle();
    if (def.type === 'text') view.pluginInputs[`${plugin.id}-${def.key}`] = textInput(view, plugin, def);
    if (def.type === 'longtext') view.pluginTextareas[`${plugin.id}-${def.key}`] = textareaField(plugin, def);
  }
}

// A text setting is saved when the field loses focus or Enter is pressed (not on every
// key), and the plugin is re-checked only when the value actually changed.
function textInput(view, plugin, def) {
  const field = { state: InputState.new({ placeholder: def.placeholder ?? '', value: pluginSetting(plugin, def.key) ?? '' }), focused: false };
  const commit = (cx) => {
    const next = field.state.value().trim();
    if (next === pluginSetting(plugin, def.key)) return;
    view.pluginConfirm = null;
    setPluginSetting(plugin, def.key, next);
    field.state.set_value(pluginSetting(plugin, def.key));
    reloadPlugins(view, cx, plugin.id);
  };
  field.state.on('focus', (_e, cx) => { field.focused = true; cx.notify(); });
  field.state.on('blur', (_e, cx) => { field.focused = false; commit(cx); cx.notify(); });
  field.state.on('submit', (_e, cx) => { commit(cx); cx.notify(); });
  return field;
}

// A longtext setting is edited on its own page: a draft in a textarea, applied or
// discarded explicitly (never saved on blur), so a long message is never half-saved.
const longtextValue = (plugin, def) => { const value = pluginSetting(plugin, def.key) ?? ''; return def.normalize ? def.normalize(value) : value; };
const TAG_COLUMN = 80; // fits the widest tag chip, {runUrl}, at the meta text size
const tidyText = value => String(value ?? '').replace(/\r\n?/g, '\n');
function textareaField(plugin, def) {
  const field = { state: TextareaState.new({ placeholder: def.placeholder ?? '', value: longtextValue(plugin, def), rows: 14 }), focused: false };
  field.state.on('change', (_e, cx) => cx.notify());
  field.state.on('focus', (_e, cx) => { field.focused = true; cx.notify(); });
  field.state.on('blur', (_e, cx) => { field.focused = false; cx.notify(); });
  return field;
}
function openTextPage(view, cx, plugin, def) {
  view.pluginTextareas[`${plugin.id}-${def.key}`]?.state.set_value(longtextValue(plugin, def));
  view.pluginTextPage = { plugin: plugin.id, key: def.key };
  cx.notify();
}
// The page a setting row opens: a longtext's textarea, or a role's profile list (below). Both
// use the same page slot, back button and title.
function openTextDef(view) {
  const page = view.pluginTextPage, plugin = PLUGINS.find(p => p.id === page?.plugin);
  const def = plugin?.settings?.find(d => d.key === page.key && (d.type === 'longtext' || d.type === 'profiles'));
  if (!def || !pluginEnabled(plugin)) return null;
  if (def.type === 'profiles') return { plugin, def, field: null };
  const field = view.pluginTextareas[`${plugin.id}-${def.key}`];
  return field ? { plugin, def, field } : null;
}
export function closePluginTextPage(view) { view.pluginTextPage = null; view.rolePage = null; }
export function pluginTextOpen(view) { return Boolean(openTextDef(view)); }
export function pluginTextChanged(view) {
  const open = openTextDef(view);
  return Boolean(open?.field) && tidyText(open.field.state.value()) !== tidyText(longtextValue(open.plugin, open.def));
}

// --- A role's profiles (`type: 'profiles'`, `role`) ----------------------------------------
// The header machine's profiles that can be launched (and any already in the role, so they
// can be switched off), each with a switch for the role; a profile in it gets the role's pill
// on its row in + and on the Start page. No editing, removing or reordering here: that is
// Settings › Profiles. A plugin may change only a role it gates (`profile.role.<role>`).
const ownsRole = (plugin, def) => typeof plugin.gates?.[`profile.role.${def.role}`] === 'function';
function openRolePage(view, cx, plugin, def) {
  view.pluginTextPage = { plugin: plugin.id, key: def.key };
  view.rolePage = null; reloadRolePage(view, cx);
}
// Role pages another Settings page links to (Settings › Profiles: "Add a crew profile"):
// enabled plugins' `profiles` settings that carry an `addLabel`.
export const roleLinks = () => PLUGINS.filter(plugin => pluginEnabled(plugin) && ownsAnyRole(plugin))
  .flatMap(plugin => (plugin.settings ?? []).filter(def => def.type === 'profiles' && def.addLabel && ownsRole(plugin, def)).map(def => ({ plugin, def })));
const ownsAnyRole = plugin => Object.keys(plugin.gates ?? {}).some(name => name.startsWith('profile.role.'));
export function openRoleLink(view, cx, { plugin, def }) { openRolePage(view, cx, plugin, def); }
export function reloadRolePage(view, cx) {
  const open = openTextDef(view);
  if (!open || open.def.type !== 'profiles' || !profileService) return;
  const machine = view.settingsMachine ?? null, page = { machine, loading: true, error: null, items: view.rolePage?.machine === machine ? view.rolePage.items : [] };
  view.rolePage = page;
  cx.spawn(async (cx) => {
    try {
      const role = open.def.role, all = (await profileService.list(machine)).filter(p => p.key !== 'terminal' && (p.available === true || p.role === role));
      if (view.rolePage !== page) return;
      page.items = all; // in the Profiles order: a role has no order of its own to keep
    } catch (e) { if (view.rolePage === page) page.error = String(e?.message ?? e).slice(0, 300); }
    if (view.rolePage === page) { page.loading = false; cx.notify(); }
  });
  cx.notify();
}
function rolePageContent(view, t, plugin, def) {
  const id = `st-plugin-${plugin.id}-${def.key}`, page = view.rolePage, items = page?.items ?? [];
  const usable = Boolean(page && !page.loading && profileService && ownsRole(plugin, def) && pluginEnabled(plugin));
  const glyph = p => p.icon ? (p.tint ? svg(p.icon).size(U.icon).text_color(t.foreground) : image(p.icon).size(U.icon)) : svg('icons/shell.svg').size(U.icon).text_color(t.foreground);
  // `title`: the page's own name when the row's label would repeat its parent (Profiles ›
  // Profiles); the row keeps `label`.
  return v_flex().id(`${id}-page`).w_full().gap(10).pr(16)
    .child(view.heading(t, def.title ?? def.label, def.about))
    .when(Boolean(page?.error), el => el.child(description(t, page.error).text_color(t.blocked)))
    .when(Boolean(page?.loading) && !items.length, el => el.child(description(t, 'Checking profiles…').id(`${id}-loading`)))
    .when(Boolean(page) && !page.loading && !page.error && !items.length, el => el.child(description(t, 'No profiles are available on this machine.').id(`${id}-empty`)))
    .child(v_flex().id(`${id}-list`).w_full().border_t(1).border_color(t.border)
      .children(items.map((p, index) => h_flex().id(`${id}-row-${p.key}`).w_full().py(10).gap(8).items_center().border_b(1).border_color(t.border)
        .child(slot(glyph(p), U.icon))
        .child(v_flex().flex_1().min_w(0).gap(4)
          .child(div().min_w(0).truncate().text_size(U.font).text_color(t.foreground).child(p.name))
          .child(div().min_w(0).truncate().text_size(U.meta).text_color(t.dim).child(`${p.available === true ? 'Available' : 'Not found'} · ${p.command || p.key}`)))
        .child(view.toggle(t, `${id}-toggle-${p.key}`, p.role === def.role, (_e, cx) => {
          if (!usable) return;
          const on = p.role !== def.role;
          profileService.setRole(page.machine, p.key, def.role, on);
          page.items = items.map(item => item.key === p.key ? { ...item, role: on ? def.role : null } : item); cx.notify();
        })))));
}

export function pluginTextPage(view, t) {
  const open = openTextDef(view);
  if (!open) return div();
  if (open.def.type === 'profiles') return rolePageContent(view, t, open.plugin, open.def);
  const { plugin, def, field } = open, id = `st-plugin-${plugin.id}-${def.key}`;
  const usesDefault = tidyText(field.state.value()) === tidyText(def.default);
  return v_flex().id(`${id}-page`).w_full().gap(10).pr(16)
    .child(view.heading(t, def.label))
    // The feedback dialog's message field: same size, with a counter when there is a limit.
    // No right padding: the textarea's own scrollbar sits on the field's edge.
    .child(v_flex().id(`${id}-frame`).w_full().h(168).flex_none().pl(U.gutter).pr(0).pt(10).pb(6).gap(4)
      .rounded(U.radius).border_1().border_color(field.focused ? t.input : t.border).bg(t.surface)
      .child(Textarea.new(field.state).id(`${id}-text`).w_full().h(128).flex_none().accessibility_label(def.label))
      .when(Number.isSafeInteger(def.maxLength), el => {
        const count = [...tidyText(field.state.value())].length;
        return el.child(h_flex().flex_none().h(18).pr(U.gutter).justify_end().items_center()
          .child(div().id(`${id}-count`).text_size(11).text_color(count > def.maxLength ? t.blocked : t.dim)
            .tooltip(`Characters · maximum ${def.maxLength}`).child(`${count} / ${def.maxLength}`)));
      }))
    // The tags the text may contain, explained; clicking one types it at the cursor.
    .when(Boolean(def.tags?.length), el => el.child(v_flex().id(`${id}-tags`).w_full().gap(6)
      .child(div().text_size(U.meta).text_color(t.muted).child('Click a tag to add it. It’s replaced with:'))
      // Chips sit in one fixed-width column, so every meaning starts at the same left edge.
      .children(def.tags.map(([tag, meaning], index) => h_flex().w_full().gap(10).items_center()
        .child(div().w(TAG_COLUMN).flex_none().flex().child(div().id(`${id}-tag-${index}`).flex_none().h(24).px(8).flex().items_center().rounded(U.radius)
          .border_1().border_color(t.border).bg(t.surface).text_size(U.meta).text_color(t.foreground)
          .cursor_pointer().hover(e => e.bg(t.hover)).role('button').accessibility_label(`Insert ${tag}: ${meaning}`)
          .on_mouse_down('left', (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => { field.state.replace(tag); field.state.focus(); cx.notify(); })
          .child(tag)))
        .child(div().flex_1().min_w(0).text_size(U.meta).text_color(t.muted).child(meaning))))))
    .when(!usesDefault && def.default !== undefined, el => el.child(h_flex().w_full().justify_end()
      .child(button(t, `${id}-default`, 'Restore default', (_e, cx) => { field.state.set_value(def.default); cx.notify(); }).h(28))));
}
export function pluginTextActions(view, t) {
  const open = openTextDef(view);
  if (!open) return div();
  const { plugin, def, field } = open, value = tidyText(field.state.value());
  const error = def.validate?.(value) ?? null, changed = pluginTextChanged(view), enabled = changed && !error;
  return h_flex().w_full().h(U.field).gap(8).items_center()
    .child(div().id('st-plugin-text-notice').flex_1().min_w(0).text_size(U.meta).text_color(error ? t.blocked ?? t.muted : t.muted)
      .child(error ?? (changed ? 'Unapplied changes' : '')))
    .child(editorActionButton(view.button(t, 'st-plugin-text-discard', 'Discard', (_e, cx) => {
      if (!pluginTextChanged(view)) return;
      field.state.set_value(longtextValue(plugin, def)); cx.notify();
    }, { enabled: changed })))
    .child(editorActionButton(view.button(t, 'st-plugin-text-apply', 'Apply', (_e, cx) => {
      const next = tidyText(field.state.value());
      if (!pluginTextChanged(view) || def.validate?.(next)) return;
      view.pluginConfirm = null;
      setPluginSetting(plugin, def.key, next);
      field.state.set_value(longtextValue(plugin, def));
      reloadPlugins(view, cx, plugin.id);
      cx.notify();
    }, { enabled })));
}

// Secret inputs are native, view-local entities: never a registry setting. No submit/blur
// subscription, no localStorage, and no exception text (which could echo input).
function newActionForm(form) {
  const state = { fields: {}, epoch: 0, busy: false, result: null, cancel: null, confirm: null, confirmItem: null };
  try {
    for (const def of form.fields ?? []) {
      if (!['text', 'secret'].includes(def.type)) throw Error('Unsupported transient field');
      const input = InputState.new({ placeholder: def.placeholder ?? '', value: '' });
      if (def.type === 'secret') {
        if (typeof input.set_masked !== 'function') throw Error('Masked input unavailable');
        input.set_masked(true);
      }
      input.on('change', (_e, cx) => cx.notify());
      state.fields[def.key] = input;
    }
  } catch { state.unavailable = true; }
  return state;
}
export function clearPluginForms(view, only = null) {
  for (const [key, state] of Object.entries(view.pluginForms ?? {})) {
    if (only && !key.startsWith(`${only}:`)) continue;
    state.epoch++; state.busy = false; state.confirm = null; state.confirmItem = null; state.result = null;
    try { state.cancel?.()?.catch?.(() => {}); } catch {} state.cancel = null;
    for (const field of Object.values(state.fields)) { try { field.set_value(''); } catch {} }
  }
}
function submitActionForm(view, cx, plugin, item, action, confirmed = false) {
  const key = sectionKey(plugin, item), state = view.pluginForms?.[key];
  const machine = view.settingsMachine ?? null, epoch = state?.epoch;
  const current = () => !view.pluginClosed && pluginEnabled(plugin) && !setupUnavailable(view,plugin) && view.pluginForms?.[key] === state && state.epoch === epoch && (view.settingsMachine ?? null) === machine;
  const context = viewContext(view, plugin, current, machine);
  if (!state || state.unavailable || state.busy || view.pluginFixing || !current() || item.form.enabled?.(context, item) === false || action.when?.(item) === false) return;
  if (action.confirm && !confirmed) { state.confirm = action; state.confirmItem = Object.freeze({...item}); cx.notify(); return; }
  state.confirm = null; state.confirmItem = null; state.busy = true;
  const values = {};
  if (action.input) for (const def of item.form.fields ?? []) {
    const value = state.fields[def.key]?.value() ?? '';
    if (!value || value.length > (def.maxLength ?? 512) || /[\u0000-\u001f\u007f]/.test(value)) {
      clearPluginForms(view, plugin.id);
      state.result = { detail: 'Complete the input fields before saving.' }; cx.notify(); return;
    }
    values[def.key] = value;
  }
  // Values never enter the generic fix queue/confirmation snapshot.
  cx.spawn(async cx => {
    try {
      if (!current()) return;
      const result = await action.run({ ...context, onCancel: fn => { if (current()) state.cancel = fn; } }, values, item);
      if (current()) state.result = result ?? null;
    } catch { if (current()) state.result = { detail: 'Action did not finish. Check setup and try again.' }; }
    finally {
      for (const key of Object.keys(values)) values[key] = '';
      if (current()) {
        // Replace native entities too, discarding their undo history after submission.
        const result = state.result;
        const fresh = newActionForm(item.form); fresh.result = result;
        for (const field of Object.values(state.fields)) field.set_value('');
        state.epoch++; view.pluginForms[key] = fresh;
        reloadPlugins(view, cx, plugin.id); cx.notify();
      }
    }
  });
  cx.notify();
}
function actionForm(view, t, plugin, item) {
  const key = sectionKey(plugin, item), state = view.pluginForms?.[key], form = item.form;
  const machine = view.settingsMachine ?? null, epoch = state?.epoch;
  const current = () => view.pluginForms?.[key] === state && state?.epoch === epoch && (view.settingsMachine ?? null) === machine;
  const context = viewContext(view, plugin, () => !view.pluginClosed && current(), machine);
  const available = Boolean(state) && !state.unavailable && form.enabled?.(context, item) !== false;
  const enabled = available && !state.busy && !view.pluginFixing;
  const id = `st-plugin-form-${plugin.id}-${item.id}`;
  return v_flex().id(id).w_full().gap(8)
    .when(state?.unavailable, el => el.child(description(t, 'This host does not support protected input. Update the app or use headless setup.')))
    .when(available, el => el.children((form.fields ?? []).map(def => actionInput(t, {
      id: `${id}-${def.key}`, label: def.label, widget: Input.new(state.fields[def.key]), enabled,
    }))))
    .when(Boolean(state?.result?.detail), el => el.child(description(t, state.result.detail)))
    .when(available, el => el.child(h_flex().w_full().gap(8).items_center().children((form.actions ?? []).filter(action => action.when?.(item) !== false).map(action =>
      actionButton(t, `${id}-${action.id}`, state?.busy ? (action.busyLabel ?? 'Working…') : action.label,
        (_e, cx) => { if (current()) submitActionForm(view, cx, plugin, item, action); }, { enabled, primary: action.primary === true })))))
    .when(Boolean(state?.confirm), el => el.child(v_flex().gap(6)
      .child(description(t, state.confirm.confirm))
      .child(h_flex().gap(8)
        .child(actionButton(t, `${id}-cancel`, 'Cancel', (_e, cx) => { clearPluginForms(view, plugin.id); cx.notify(); }))
        .child(actionButton(t, `${id}-confirm`, 'Confirm', (_e, cx) => { const action = state.confirm, captured = state.confirmItem; if (action && captured && current()) submitActionForm(view, cx, plugin, captured, action, true); }, { enabled })))))
    .when(Boolean(form.help), el => el.child(button(t, `${id}-help`, form.help.label, (_e, cx) => {
      if (/^https:\/\//.test(form.help.url)) cx.open_url(form.help.url);
    })));
}

export function prerequisiteContext(plugin, alive = () => true, machine = null) {
  return {...pluginContext(plugin), machine, isCurrent: alive,
    enabled:()=>pluginEnabled(plugin),
    directory() {
      const space=spaces().find(s=>s.active);if(!space)return null;
      const all=panes(),list=terminals(),focus=focused(),tab=space.tabs?.find(t=>t.active)?.id;
      const pane=all.find(p=>p.tab===tab&&p.focused)??all.find(p=>p.tab===tab&&p.terminal);
      const {cwd}=spaceDirectory(space,all,list,focus,false);
      return cwd?{cwd,on:space.machine??null,binding:JSON.stringify([space.id,tab,pane?.terminal])}:null;
    },
    setSetting(key,value,expected) {
      if(!alive()||!pluginEnabled(plugin)||!(plugin.settings??[]).some(def=>def.key===key)||(expected!==undefined&&pluginSetting(plugin,key)!==expected))return false;
      setPluginSetting(plugin,key,value);return pluginSetting(plugin,key)===value;
    },
  };
}

function viewContext(view, plugin, alive = () => !view.pluginClosed, machine = view.settingsMachine ?? null) {
  const session = view.pluginSessions?.[plugin.id];
  const current = () => alive() && (view.settingsMachine ?? null) === machine && view.pluginSessions?.[plugin.id] === session;
  return { ...prerequisiteContext(plugin, current, machine), session,
    result: id => current() ? view.pluginChecks?.[plugin.id]?.items?.find(item => item.id === id) ?? null : null };
}

// Requirements are one check group; each section is its own, so a slow list never holds
// the requirements back (and the other way round).
const checkGroup=(plugin,id)=>plugin.prerequisites?.find(pre=>pre.id===id)?.section?id:'requirements';
function groupState(check,group){
  // Also accept an older in-memory view/fixture until its next refresh.
  return check?.groups?check.groups[group]??{}:{loading:Boolean(check?.loading),target:check?.checkingTarget??'requirements'};
}
const itemState=(view,plugin,id)=>groupState(view.pluginChecks[plugin.id],checkGroup(plugin,id));
// The Settings header's refresh on the Plugins page: every check of every plugin, again.
export const pluginsChecking = view => PLUGINS.some(plugin => view.pluginChecks?.[plugin.id]?.loading === true);
export function recheckAllPlugins(view, cx) {
  if (view.pluginClosed || view.pluginFixing || pluginsChecking(view)) return;
  for (const key of Object.keys(view.pluginFixError ?? {})) delete view.pluginFixError[key];
  reloadPlugins(view, cx);
}
export function reloadPlugins(view, cx, only = null, checkingTarget = null, {reason = 'automatic'} = {}) {
  if(view.pluginClosed)return;
  for (const plugin of PLUGINS) {
    if (!plugin.prerequisites?.length || (only && plugin.id !== only)) continue;
    const targets=checkingTarget===null?[...new Set(plugin.prerequisites.map(pre=>pre.section?pre.id:'requirements'))]:[checkGroup(plugin,checkingTarget)];
    for(const group of targets){
      const selected=plugin.prerequisites.filter(pre=>(pre.section?pre.id:'requirements')===group);
      if(!selected.length)continue;
      const machine=view.settingsMachine??null,session=view.pluginSessions?.[plugin.id];
      const previous=view.pluginChecks[plugin.id],round={loading:true,target:checkingTarget??group};
      const groups={...previous?.groups,[group]:round};
      view.pluginChecks[plugin.id]={...previous,loading:true,serial:(previous?.serial??0)+1,groups,
        items:previous?.items??plugin.prerequisites.map(pre=>({...pre,status:null}))};
      cx.spawn(async cx=>{
        const alive=()=>!view.pluginClosed&&(view.settingsMachine??null)===machine&&view.pluginSessions?.[plugin.id]===session&&view.pluginChecks[plugin.id]?.groups?.[group]===round;
        if(!alive())return;
        const context={...viewContext(view,plugin,alive,machine),checkReason:reason};
        // Keep the registry's checking/error boundary, but run only this group.
        // Context/memoized workers and completion tokens never span groups.
        const items=await checkPlugin({...plugin,prerequisites:selected.map(pre=>({...pre,check:()=>pre.check(context)}))});
        if(!alive())return;
        for(const pre of selected)delete view.pluginSettling?.[`${plugin.id}:${pre.id}`];
        if (group === 'requirements') for (const key of Object.keys(view.pluginSettling ?? {}))
          if (key.startsWith(`${plugin.id}:live-`)) delete view.pluginSettling[key];
        for (const item of items) prepareRowChoices(view, cx, plugin, item);
        const current=view.pluginChecks[plugin.id],byId=new Map([...current.items,...items].map(item=>[item.id,item]));
        const groups={...current.groups,[group]:{...round,loading:false,checked:true}};
        view.pluginChecks[plugin.id]={...current,groups,loading:Object.values(groups).some(state=>state.loading),
          items:plugin.prerequisites.map(pre=>byId.get(pre.id)??{...pre,status:null})};
        if (setupUnavailable(view,plugin)) {
          clearPluginForms(view,plugin.id);
          if (view.listPicker?.key?.startsWith(`${plugin.id}:`)) view.listPicker=null;
          if (view.pluginConfirm?.plugin===plugin.id) view.pluginConfirm=null;
        }
        if (group === 'requirements' && items.some(item => item.refreshSections === true))
          for (const pre of plugin.prerequisites.filter(pre => pre.section)) reloadPlugins(view, cx, plugin.id, pre.id);
        cx.notify();
      });
    }
  }
}

// Runs fixes one at a time (stopping at the first failure), then re-checks the plugin.
function runFixes(view, cx, plugin, items, confirmed = false) {
  const machine = view.settingsMachine ?? null, session = view.pluginSessions?.[plugin.id], operation = {};
  const current = () => !view.pluginClosed && !setupUnavailable(view,plugin) && (view.settingsMachine ?? null) === machine && view.pluginSessions?.[plugin.id] === session && view.pluginFixOperation === operation;
  if (view.pluginClosed || setupUnavailable(view,plugin) || view.pluginFixing || !items.length || items.some(item=>view.pluginSettling?.[`${plugin.id}:${item.id}`]) || (items.some(item=>item.fix.confirm||item.fix.requiresEnabled)&&!pluginEnabled(plugin))) return;
  if(!confirmed && items.length===1 && items[0].fix.confirm) {
    view.pluginConfirm={plugin:plugin.id,item:items[0]};cx.notify();return;
  }
  for (const item of items) view.pluginFixError[`${plugin.id}:${item.id}`] = null;
  view.pluginFixing = `${plugin.id}:${items[0].id}`; view.pluginFixOperation = operation;
  cx.spawn(async (cx) => {
    for (const item of items) {
      if (!current()) break;
      const key = `${plugin.id}:${item.id}`;
      view.pluginFixing = key; cx.notify();
      if((item.fix.confirm||item.fix.requiresEnabled)&&!pluginEnabled(plugin))break;
      (view.pluginSettling ??= {})[key] = true;
      try {
        if (!current()) break;
        await item.fix.run(viewContext(view,plugin,()=>current()&&view.pluginFixing===key,machine));
      } catch (e) { if (current()) view.pluginFixError[key] = String(e?.message ?? e).slice(0, 300); break; }
    }
    if (view.pluginFixOperation !== operation) return;
    const active = current();
    view.pluginFixOperation = null; view.pluginFixing = null;
    if (!active) {
      for (const item of items) delete view.pluginSettling?.[`${plugin.id}:${item.id}`];
      if (!view.pluginClosed) cx.notify(); return;
    }
    for(const def of plugin.settings??[])if(def.type==='text'){
      const input=view.pluginInputs[`${plugin.id}-${def.key}`];if(input&&!input.focused)input.state.set_value(pluginSetting(plugin,def.key));
    }
    reloadPlugins(view, cx, plugin.id); cx.notify();
  });
  cx.notify();
}

// A check may offer a choice (`selection: { key, label, options, value }`, e.g. the account
// to use): the shared dropdown, saved into that plugin setting, which re-checks the plugin.
function selectionDropdown(view, t, plugin, item, { loading = false, only = null } = {}) {
  const selection = item.selection?.options?.length ? item.selection : null;
  const id = `st-plugin-${plugin.id}-${item.id}-selection`, openKey = `${plugin.id}-${item.id}-selection`;
  const saved = String(selection ? pluginSetting(plugin, selection.key) ?? '' : '');
  const offered = selection?.options ?? [];
  const value = offered.some(([v]) => v.toLowerCase() === saved.toLowerCase()) ? saved : selection?.value ?? '';
  const locked = view.pluginClosed || !pluginEnabled(plugin) || Boolean(view.pluginFixing) || view.pluginSettling?.[sectionKey(plugin, item)] === true;
  return optionDropdown(t, { id, label: selection?.label ?? 'Account', value, options: offered, loading, disabled: locked,
    open: view.pluginOpen[openKey] === true, focus: view.pluginFocus[openKey],
    onOpen: (open, cx) => { view.pluginOpen[openKey] = open; cx.notify(); },
    onSelect: (next, cx) => {
      view.pluginOpen[openKey] = false;
      if (!locked && selection && next !== pluginSetting(plugin, selection.key) && offered.some(([v]) => v === next)) {
        setPluginSetting(plugin, selection.key, next); view.listPicker = null; view.pluginConfirm = null;
        for (const k of Object.keys(view.pluginFixError)) if (k.startsWith(`${plugin.id}:`)) delete view.pluginFixError[k];
        view.pluginInputs[`${plugin.id}-${selection.key}`]?.state.set_value(next);
        reloadPlugins(view, cx, plugin.id, only);
      }
      cx.notify();
    } });
}

function requirements(view, t, plugin) {
  const check = view.pluginChecks[plugin.id],checking=groupState(check,'requirements');
  const unavailable = setupUnavailable(view,plugin), checkBusy = unavailable ? Boolean(check?.loading) : Boolean(checking.loading);
  const items = (check?.items ?? plugin.prerequisites.map(p => ({ ...p, status: null }))).filter(item=>!item.section);
  const problems = items.filter(i => i.status && i.status !== 'ready');
  // Manual actions (fix.manual: e.g. opening a system settings page) need a person, so
  // Install all leaves them out.
  const fixable = checking.loading ? [] : items.filter(i => i.fix && !i.fix.manual && !i.fix.confirm && i.status && i.status !== 'ready');
  const recheck = checkButton(t, `st-plugin-${plugin.id}-recheck`, checkBusy,
    (_e, cx) => {
      if(view.pluginFixing||(unavailable ? view.pluginChecks[plugin.id]?.loading : groupState(view.pluginChecks[plugin.id],'requirements').loading))return;
      for(const item of items)delete view.pluginFixError[`${plugin.id}:${item.id}`];
      // A whole-connection refusal can have been supplied by any group. Recheck
      // all setup groups to retire it, without turning this into token verification.
      // Ordinary Requirements Check remains independent and explicitly manual.
      reloadPlugins(view, cx, plugin.id,unavailable ? null : 'requirements', {reason:unavailable ? 'automatic' : 'manual'}); cx.notify();
    }, !checkBusy&&!view.pluginFixing);
  if (unavailable) return v_flex().id(`st-plugin-${plugin.id}-unavailable`).w_full().p(8).gap(8).rounded(U.radius).bg(t.hover)
    .child(h_flex().w_full().gap(10).items_center()
      .child(div().flex_1().text_size(U.font).text_color(t.foreground).child('Requirements'))
      .child(statusRail(badge(t,'error','Unavailable'),recheck)))
    .child(description(t,unavailable.detail));
  const installAll = fixable.length > 1
    ? actionButton(t, `st-plugin-${plugin.id}-fix-all`, 'Install all', (_e, cx) => runFixes(view, cx, plugin, fixable), { enabled: !view.pluginFixing })
    : null;
  // A machine setting placed here (`place: 'requirements'`) heads the list: it names where
  // everything below is checked and installed (the Settings header's machine, which changes
  // it). Install all sits beside it; without such a row it stays on the header.
  const where = (plugin.settings ?? []).filter(d => d.type === 'machine' && d.place === 'requirements' && !d.hidden);
  const tools = installAll && !where.length ? h_flex().gap(6).items_center().child(installAll).child(recheck) : recheck;
  const summary = checking.loading&&checking.target==='requirements' ? workingStatus(t)
    : !items.every(item=>item.status) ? null : problems.length ? (problems.some(p => p.status !== 'recommended') ? badge(t, 'missing', `${problems.filter(p => p.status !== 'recommended').length} to fix`) : badge(t, 'recommended', `${problems.length} optional`))
    : badge(t, 'ready', 'All ready');
  // Closed until the person opens it: its header already says what needs fixing.
  return disclosure(view, t, `${plugin.id}-requirements`, 'Requirements', { summary, tools }, () => v_flex().w_full().gap(10)
    .children(where.map((def, index) => h_flex().id(`st-plugin-${plugin.id}-${def.key}-where`).w_full().gap(8).items_center().pb(10).border_b_1().border_color(t.border)
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(div().id(`st-plugin-${plugin.id}-${def.key}`).text_size(U.font).text_color(t.foreground).child(machineName(pluginSetting(plugin, def.key))))
        .when(Boolean(def.about), el => el.child(description(t, def.about))))
      .when(index === 0 && Boolean(installAll), el => el.child(div().flex_none().child(installAll)))))
    .children(items.map(item => {
      // A row whose action ended stays busy until its re-check answers (pluginSettling).
      const key = `${plugin.id}:${item.id}`, fixing = view.pluginFixing === key || view.pluginSettling?.[key] === true;
      const fix = item.fix && item.status && item.status !== 'ready'
        ? actionButton(t, `st-plugin-fix-${plugin.id}-${item.id}`, fixing ? (item.fix.busyLabel ?? `${item.fix.label}…`) : item.fix.label,
          (_e, cx) => runFixes(view, cx, plugin, [item]), { enabled: !view.pluginFixing&&!fixing&&(!item.fix.requiresEnabled||pluginEnabled(plugin)), primary: item.fix.primary ?? !item.fix.manual }) : null;
      const detail = statusText(view.pluginFixError[key] ?? item.detail ?? item.about);
      const row = h_flex().id(`st-plugin-req-${plugin.id}-${item.id}`).w_full().gap(10).items_center()
        // Name and detail wrap inside their own column, clear of the status and button columns.
        .child(v_flex().flex_1().min_w(0).pr(8).gap(2)
          .child(div().text_size(U.font).text_color(t.foreground).child(item.label))
          .when(typeof item.configuredValue==='string'&&Boolean(item.configuredValue),el=>el.child(div().id(`st-plugin-value-${plugin.id}-${item.id}`).min_w(0).max_w_full().truncate().text_size(U.meta).text_color(t.dim).tooltip(item.configuredValue).child(item.configuredValue)))
          .when(!item.configuredValue&&Boolean(detail), el => el.child(description(t, detail))))
        // A choice the check offers (an account) sits before the columns, like a list's scope.
        .when(Boolean(item.selection?.options?.length), el => el.child(div().flex_none().child(selectionDropdown(view, t, plugin, item))))
        // The row's button, then its status at the far right. The button column keeps
        // its width when a row has none, so buttons and badges each line up.
        // While a row's own action runs, its spinner carries the action's word ("Updating")
        // when the plugin names one; a re-check keeps the bare spinner.
        .child(statusRail(fixing||(checking.loading&&checking.target===item.id)?workingStatus(t,fixing&&typeof item.fix?.statusLabel==='string'?item.fix.statusLabel:null):item.status ? badge(t, item.status, item.statusLabel ?? undefined).w_full().justify_center() : null,
          div().flex_none().w(KIT.action).flex().justify_end().when(Boolean(fix), el => el.child(fix)),`st-plugin-${plugin.id}-${item.id}-status-rail`));
      const saved = item.saved?.row?.(item), savedContext = viewContext(view,plugin);
      const replace = Boolean(saved) && pluginEnabled(plugin) && item.saved.replace === true;
      const savedRow = saved && pluginEnabled(plugin) ? removableRow(view, t, `st-plugin-saved-${plugin.id}-${item.id}-row-0`, saved.label,
        (_e,cx) => {
          if(!savedContext.isCurrent())return;
          runFixes(view,cx,plugin,[{...item,fix:{requiresEnabled:true,confirm:item.saved.confirm?.(savedContext,item),run:context=>item.saved.remove(context,item)}}]);
        }, !checking.loading&&!fixing&&!view.pluginFixing&&!view.pluginClosed,
        replace ? (fixing ? workingStatus(t) : item.status ? badge(t,item.status,item.statusLabel ?? undefined) : null) : null) : null;
      return v_flex().w_full().gap(8).child(replace ? savedRow : row)
        .when(replace && Boolean(detail), el => el.child(description(t, detail)))
        .when(Boolean(savedRow) && !replace, el => el.child(savedRow))
        .when(Boolean(item.form) && pluginEnabled(plugin) && item.form.when?.(item) !== false, el => el.child(actionForm(view, t, plugin, item)));
    })));
}

// --- List sections ---------------------------------------------------------------------
// A section with `list` is a list of things added to the plugin (project folders,
// repositories): a scope row (the machine or account it belongs to, then Add), what the
// list is for, and one row per item with Remove on hover. Its check returns `rows: [{ id,
// label, path? }]`, `usable` (true when Add works now) and, for an account scope, the
// `selection` to offer. One change at a time, like fixes; what the plugin refuses is shown
// as the section's detail.
function runListAction(view, cx, plugin, item, action, everything = false, rowState = null, rowCurrent = null) {
  const key = sectionKey(plugin, item), machine = view.settingsMachine ?? null, session = view.pluginSessions?.[plugin.id], operation = {};
  const current = () => !view.pluginClosed && pluginEnabled(plugin) && !setupUnavailable(view,plugin) && (view.settingsMachine ?? null) === machine && view.pluginSessions?.[plugin.id] === session && (!rowCurrent || rowCurrent());
  if (view.pluginFixing || view.pluginSettling?.[key] || view.pluginClosed || !pluginEnabled(plugin) || setupUnavailable(view,plugin)) return;
  view.pluginFixError[key] = null; view.pluginFixing = key; view.pluginListOperation = operation;
  if (rowState) { rowState.error = null; rowState.uncertain = false; }
  cx.spawn(async (cx) => {
    try { if (current()) await action(viewContext(view, plugin, () => current() && view.pluginFixing === key, machine)); }
    catch (e) { if (current()) {
      if (rowState) { rowState.error = String(e?.message ?? 'Could not apply the change.').split(/[\r\n]/)[0].slice(0, 300); rowState.uncertain = e?.uncertain === true; }
      else view.pluginFixError[key] = String(e?.message ?? e).slice(0, 600);
    } }
    if (view.pluginListOperation !== operation) return;
    view.pluginListOperation = null; view.pluginFixing = null;
    if (!current()) { if (!view.pluginClosed) cx.notify(); return; }
    (view.pluginSettling ??= {})[key] = true;
    reloadPlugins(view, cx, plugin.id, everything || item.list?.recheck === 'plugin' ? null : item.id); cx.notify();
  });
  cx.notify();
}
const scopeSetting = (plugin, item) => (plugin.settings ?? []).find(d => d.key === item.list.scope?.setting && d.type === 'machine');
// The folder is the attempted target, not necessarily the resource the plugin refused.
const folderRefusal = (plugin, operation, path, error) => typeof error?.folderMessage === 'function'
  ? error.folderMessage(path)
  : `Could not ${operation} folder “${path}”. ${plugin.name} reported: ${String(error?.message ?? error)}`;

// The folders picker: the folder browser on the scope's machine. Folders already added
// start ticked and unticking one removes it; each change is tried and the refused ones
// are named afterwards.
function foldersAdd(view, t, plugin, item, canAdd, loading) {
  const spec = item.list, def = scopeSetting(plugin, item), pickKey = `${plugin.id}-${item.id}-pick`, id = listId(plugin, item);
  const machine = def ? pluginSetting(plugin, def.key) ?? null : null;
  const known = loading ? [] : (item.rows ?? []).filter(row => typeof row.path === 'string' && row.path);
  return folderBrowser(view, t, { id: `${id}-add`, key: pickKey, trigger: actionTrigger(t, `${id}-add`, spec.picker.label ?? 'Add', canAdd), focus: view.pluginFocus[pickKey],
    onOpen: (open, cx) => { if (open && canAdd) openBrowser(view, cx, pickKey, machine, null, { from: '', selected: known.map(row => row.path) }); else closeBrowser(view); cx.notify(); },
    multi: { label: changeLabel, existing: known.map(row => row.path) }, machineSwitch: false,
    onPick: ({ add, remove }, cx) => {
      const chosen = view.folderBrowser?.machine ?? null, moved = Boolean(def) && chosen !== machine;
      closeBrowser(view);
      if (moved) setPluginSetting(plugin, def.key, chosen);
      view.pluginOpen[`${plugin.id}-${item.id}`] = true;
      runListAction(view, cx, plugin, item, async context => {
        const refused = [];
        for (const path of remove) { try { await spec.remove(context, known.find(row => row.path === path).id); } catch (e) { refused.push(folderRefusal(plugin, 'remove', path, e)); } }
        for (const path of add) { try { await spec.add(context, path); } catch (e) { refused.push(folderRefusal(plugin, 'add', path, e)); } }
        if (refused.length) throw new Error(refused.join(' · '));
      }, moved);
    } });
}

// The items picker: a searchable list of what can be added, asked of the plugin
// (`list.candidates(cx) -> { items: [{ id, label, detail?, disabled? }], add(cx, ids) }`)
// only when it opens, since listing every candidate can be slow.
function openListPicker(view, cx, plugin, item, { keepSearch = false } = {}) {
  const key = sectionKey(plugin, item), machine=view.settingsMachine??null;
  const picker = { key, loading: true, error: null, items: [], add: null, selected: [], tab:item.list.picker?.tabs?.[0]?.[0] ?? null };
  view.listPicker = picker;
  if (!keepSearch) view.pluginSearches[key]?.set_value('');
  cx.spawn(async (cx) => {
    const alive = () => view.listPicker === picker && !view.pluginClosed && (view.settingsMachine??null)===machine;
    try {
      const found = await item.list.candidates(viewContext(view, plugin, alive, machine));
      if (!alive()) return;
      Object.assign(picker, { loading: false, notice: found?.detail ?? null, items: Array.isArray(found?.items) ? found.items : [], add: found?.add ?? item.list.add ?? null });
    } catch (e) {
      if (!alive()) return;
      Object.assign(picker, { loading: false, error: String(e?.message ?? e).slice(0, 300) });
    }
    cx.notify();
  });
  cx.notify();
}
function itemsAdd(view, t, plugin, item, canAdd) {
  const spec = item.list, key = sectionKey(plugin, item), id = listId(plugin, item);
  const focus = view.pluginFocus[`${plugin.id}-${item.id}-pick`];
  const picker = view.listPicker?.key === key ? view.listPicker : null;
  const close = (cx) => { if (view.listPicker === picker) view.listPicker = null; cx.notify(); };
  const content = () => {
    const search = view.pluginSearches[key], query = (search?.value() ?? '').trim().toLowerCase();
    const rows = picker.items.filter(row => (!picker.tab || row.tab === picker.tab) && row.label.toLowerCase().includes(query)), picked = picker.selected;
    const tabs = spec.picker?.tabs ?? [];
    const ready = !picker.loading && !picker.error;
    const line = (row) => {
      const on = picked.includes(row.id), off = Boolean(row.disabled);
      return h_flex().id(`${id}-item-${picker.items.indexOf(row)}`).w_full().flex_none().px(8).py(6).gap(8).items_center().rounded(U.radius)
        // The host knows this role as check_box; any other spelling makes Settings fail to draw.
        .role('check_box').accessibility_label(row.label).when(off, e => e.opacity(0.5))
        .when(!off, e => e.cursor_pointer().hover(s => s.bg(t.hover)))
        .on_click((_e, cx) => {
          if (off || view.listPicker !== picker) return;
          const at = picked.indexOf(row.id); if (at < 0) picked.push(row.id); else picked.splice(at, 1);
          cx.notify();
        })
        .child(div().size(14).flex_none().rounded(3).border_1().border_color(on ? t.solid : t.input).bg(on ? t.solid : '#00000000').flex().items_center().justify_center()
          .when(on, e => e.child(svg(I('check')).size(10).text_color(t.solid_foreground))))
        .child(v_flex().flex_1().min_w(0).gap(2)
          .child(div().min_w(0).truncate().text_size(U.meta).text_color(t.foreground).tooltip(row.label).child(row.label))
          .when(Boolean(row.detail), e => e.child(div().min_w(0).truncate().text_size(11).text_color(t.blocked).tooltip(row.detail).child(row.detail))));
    };
    return menuSurface(t, v_flex()).id(`${id}-panel`).w(KIT.picker.width).p(0).track_focus(focus)
      .on_scroll_wheel((_e, cx) => cx.stop_propagation())
      .when(Boolean(search), el => el.child(pickerHeader(t, `${id}-search-row`, searchField(t, search, { id: `${id}-search` }).flex_1())))
      .when(tabs.length > 0, el => el.child(h_flex().w_full().flex_none().px(U.gutter).py(4).child((spec.picker?.tabStyle === 'tabs' ? pickerTabs : choice)(t, `${id}-tab`, tabs, picker.tab, (tab,cx) => {
        if(view.listPicker!==picker||view.pluginClosed||!pluginEnabled(plugin)||!ready||!tabs.some(([id])=>id===tab))return;
        picker.tab=tab;cx.notify();
      }, ready))))
      .when(Boolean(picker.notice), el => el.child(div().px(8).child(description(t, picker.notice))))
      .child(v_flex().id(`${id}-list`).w_full().h(pickerListHeight()-(tabs.length?U.field+8:0)).p(4).gap(U.rowGap).overflow_y_scrollbar()
        .when(Boolean(picker.error), el => el.child(div().id(`${id}-error`).p(8).text_size(U.meta).text_color(t.blocked).child(picker.error)))
        .when(ready, el => el.children(rows.map(line)))
        .when(ready && !rows.length, el => el.child(emptyState(t, { id: `${id}-empty`, ...(picker.items.length ? {} : { title: 'Nothing left to add', icon: I('puzzle') }) }).flex_1())))
      .child(pickerFooter(t, id, { loading: picker.loading, count: picked.length ? `${picked.length} selected` : '', onCancel: close,
        confirm: 'Add', enabled: ready && picked.length > 0 && Boolean(picker.add),
        onConfirm: (cx) => {
          const ids = [...picked], add = picker.add;
          if (!ids.length || !add || view.listPicker !== picker) return;
          view.listPicker = null;
          runListAction(view, cx, plugin, item, async (context) => {
            const failed = Object.entries((await add(context, ids))?.errors ?? {});
            if (failed.length) throw new Error(failed.length === 1 ? `${failed[0][0]}: ${failed[0][1]}` : `${failed.length} could not be added. ${failed[0][1]}`);
          });
        } }));
  };
  return dropdown(`${id}-add-popup`, actionTrigger(t, `${id}-add`, spec.picker.label ?? 'Add', canAdd), picker ? content() : div(), { open: Boolean(picker), focus, align: 'right',
    onOpen: (open, cx) => { if (open && canAdd) openListPicker(view, cx, plugin, item); else close(cx); } });
}

const rowChoiceKey = (plugin, item, row) => JSON.stringify([plugin.id, item.id, row.id]);
// Called only from a completed check task, never render: handles belong to the view.
function prepareRowChoices(view, cx, plugin, item) {
  if (!item.list?.rowChoice) return;
  const prefix = JSON.stringify([plugin.id, item.id]).slice(0, -1) + ',';
  const entries = view.pluginRowChoices ??= new Map(), present = new Set();
  for (const row of item.rows ?? []) {
    if (!row.choice || !item.list.rowChoice.options.some(([value]) => value === row.choice.value)) continue;
    const key = rowChoiceKey(plugin, item, row); present.add(key);
    const old = entries.get(key), session = view.pluginSessions?.[plugin.id], machine = view.settingsMachine ?? null;
    // Registration identity owns focus; value revision/generation only owns callbacks.
    const identity = row.choice.identity ?? row.choice.revision;
    const state = old && (old.row.choice.identity ?? old.row.choice.revision) === identity && old.session === session && old.machine === machine ? old
      : { trigger: cx.focus_handle(), menu: cx.focus_handle(), remove: cx.focus_handle(), index: 0, session, machine };
    if (old?.row.choice.revision !== row.choice.revision) { state.error = null; state.uncertain = false; }
    if (state.uncertain && item.status === 'ready' && item.usable === true) { state.uncertain = false; state.error = null; }
    state.row = row; state.open = false; state.generation = {}; entries.set(key, state);
  }
  for (const key of entries.keys()) if (key.startsWith(prefix) && !present.has(key)) entries.delete(key);
}
function listRow(view, t, plugin, item, row, index, enabled) {
  const rid = `${listId(plugin, item)}-row-${index}`, key = rowChoiceKey(plugin, item, row);
  const state = view.pluginRowChoices?.get(key), spec = item.list.rowChoice, generation = state?.generation;
  const facts = () => view.pluginChecks[plugin.id]?.items?.find(p => p.id === item.id);
  const current = () => !view.pluginClosed && pluginEnabled(plugin) && !setupUnavailable(view, plugin) &&
    (view.settingsMachine ?? null) === state?.machine && view.pluginSessions?.[plugin.id] === state?.session &&
    view.pluginRowChoices?.get(key) === state && state?.generation === generation && state?.row === row && facts()?.rows?.includes(row);
  const available = () => enabled && current() && !state?.uncertain && !view.pluginFixing && !itemState(view, plugin, item.id).loading && facts()?.usable === true;
  const remove = (_e, cx) => {
    if (row.choice && (!available() || !(state.open || view.pluginRowHover === rid || [state.trigger, state.menu, state.remove].some(f => f.is_focused?.())))) return;
    runListAction(view, cx, plugin, item, async context => {
      try { await item.list.remove(context, row.id); }
      catch (e) { if (item.list.picker?.kind !== 'folders') throw e; throw new Error(folderRefusal(plugin, 'remove', row.path ?? row.label, e)); }
    });
  };
  let rowChoice = null;
  if (state && spec && current()) {
    const revealed = state.open || view.pluginRowHover === rid || [state.trigger, state.menu, state.remove].some(f => f.is_focused?.());
    const open = (value, cx) => {
      if (!available()) return;
      state.open = value;
      if (value) { state.index = Math.max(0, spec.options.findIndex(([v]) => v === row.choice.value)); state.menu.focus(); }
      cx.notify();
    };
    rowChoice = { revealed, remove: state.remove, widget: optionDropdown(t, { id: `${rid}-choice`, label: spec.label,
      value: row.choice.value, options: spec.options, disabled: !available(), open: state.open, focus: state.menu, onOpen: open,
      row: { quiet: !revealed, trigger: state.trigger, index: state.index, move: (delta, cx) => {
        if (!available() || !state.open) return; state.index = (state.index + delta + spec.options.length) % spec.options.length; cx.notify();
      } },
      onSelect: (value, cx) => {
        if (!available() || !state.open || !spec.options.some(([v]) => v === value)) return;
        state.open = false; state.trigger.focus(); cx.notify();
        if (value !== row.choice.value) runListAction(view, cx, plugin, item, async context => {
          if (!current()) return;
          const confirmed = await spec.set(context, row, value);
          if (!current() || !context.isCurrent()) return;
          if (confirmed?.value !== value) throw Object.assign(new Error('Could not confirm the change. Refresh before trying again.'), { uncertain: true });
          // Setter confirms the stored value, never the pending menu selection.
          row.choice = { ...row.choice, value: confirmed.value };
        }, false, state, current);
      } }) };
  }
  const line = removableRow(view, t, rid, row.detail ? `${row.label} · ${row.detail}` : row.label, remove, enabled, null, rowChoice);
  return state?.error && current() ? v_flex().w_full().gap(4).child(line)
    .child(div().id(`${rid}-choice-error`).text_size(U.meta).text_color(t.blocked).child(state.error)) : line;
}

function listSection(view, t, plugin, item, loading) {
  const spec = item.list, id = listId(plugin, item), key = sectionKey(plugin, item);
  const applying = view.pluginFixing === key || view.pluginSettling?.[key] === true;
  const locked = view.pluginClosed || !pluginEnabled(plugin) || Boolean(view.pluginFixing) || applying || loading;
  const canAdd = !locked && item.usable === true;
  // The scope: a machine setting is named (the Settings header's machine changes it);
  // otherwise the check's selection is offered as a dropdown.
  const def = scopeSetting(plugin, item);
  const scope = def || spec.scope?.header === true ? null : spec.scope ? selectionDropdown(view, t, plugin, item, { loading: loading && !applying, only: item.id }) : null;
  const add = spec.hideUnavailable === true && item.usable !== true ? null
    : spec.picker?.kind === 'folders' ? foldersAdd(view, t, plugin, item, canAdd, loading) : itemsAdd(view, t, plugin, item, canAdd);
  // Applying already has header feedback. Keep the last confirmed body, including
  // through its authoritative re-check, rather than collapsing and restoring it.
  const rows = loading && !applying && !spec.rowChoice ? [] : item.rows ?? [];
  const detail = view.pluginFixError[key] ?? item.detail ?? item.about;
  const enabled = !locked;
  return v_flex().w_full().gap(8)
    .child(scopeRow(t, { id, label: def ? machineName(pluginSetting(plugin, def.key)) : spec.scope?.header === true ? machineName(view.settingsMachine ?? null) : spec.scope?.label ?? 'Machine', dropdown: scope, action: add, separator: spec.scope?.divider === 'items' ? rows.length > 0 : true }))
    .when(Boolean(detail), el => el.child(description(t, detail)))
    // A row's note (an incomplete webhook) follows its name: one line per item.
    .when(rows.length > 0, el => el.child(v_flex().id(id).w_full().gap(U.rowGap)
      .children(rows.map((row, index) => listRow(view, t, plugin, item, row, index, enabled)))));
}

function prerequisiteSections(view,t,plugin) {
  if (setupUnavailable(view,plugin)) return [];
  const check=view.pluginChecks[plugin.id];
  return (check?.items??plugin.prerequisites??[]).filter(item=>item.section&&item.list).map(item=>{
    const key=sectionKey(plugin,item),busy=view.pluginFixing===key||view.pluginSettling?.[key]===true,checking=itemState(view,plugin,item.id);
    const summary=busy?workingStatus(t,'Applying'):checking.loading?workingStatus(t):item.status&&item.statusLabel!==null?badge(t,item.status,item.statusLabel):null;
    const tools=checkButton(t,`st-plugin-refresh-${plugin.id}-${item.id}`,Boolean(checking.loading),(_e,cx)=>{
      if(!view.pluginFixing&&!itemState(view,plugin,item.id).loading){delete view.pluginFixError[key];reloadPlugins(view,cx,plugin.id,item.id);cx.notify();}
    },!checking.loading&&!view.pluginFixing);
    // Lists start closed: their header already says how many there are.
    return v_flex().id(`st-plugin-section-${plugin.id}-${item.id}`).w_full()
      .child(disclosure(view,t,`${plugin.id}-${item.id}`,item.label,{summary,tools},()=>listSection(view,t,plugin,item,Boolean(checking.loading))));
  });
}

// --- Settings fields -------------------------------------------------------------------
// A machine setting: the shared machine dropdown. Changing it re-checks the plugin there.
// `key` names this picker's open state and focus handle; a second picker of the same
// setting (a list's scope) passes its own.
function machineField(view, t, plugin, def, id, value, key = `${plugin.id}-${def.key}-machine`) {
  return machinePicker(t, { id, selected: value, open: view.pluginOpen[key] === true, focus: view.pluginFocus[key],
    disabled: Boolean(view.pluginFixing),
    onOpen: (open, cx) => { view.pluginOpen[key] = open; cx.notify(); },
    onSelect: (machine, cx) => {
      view.pluginOpen[key] = false;
      if (machine !== value) { setPluginSetting(plugin, def.key, machine); for (const k of Object.keys(view.pluginFixError)) if (k.startsWith(`${plugin.id}:`)) delete view.pluginFixError[k];
        reloadPlugins(view, cx, plugin.id); }
      cx.notify();
    } });
}

// Native Popover keeps the checkbox list open for several independent selections.
function multiselectField(view, t, plugin, def, id, value) {
  const key = `${plugin.id}-${def.key}-multi`;
  const alive = () => !view.pluginClosed && pluginEnabled(plugin) && !view.pluginFixing;
  const summary = def.options.filter(([v]) => value.includes(v)).map(([,label]) => label).join(', ') || 'None';
  const trigger = control(t, h_flex()).id(id).w(200).px(10).gap(6).items_center().role('button')
    .accessibility_label(def.label).disabled(!alive()).cursor_pointer()
    .child(div().flex_1().min_w(0).truncate().child(summary))
    .child(chevron(t,true));
  if (!alive()) return trigger;
  const list = menuSurface(t, v_flex()).w(220).track_focus(view.pluginFocus[key])
    .children(def.options.map(([v,label]) => Checkbox.new(`${id}-${v}`).checked(value.includes(v)).w_full()
      .px(8).py(6).rounded(U.radius).flex().gap(8).items_center().cursor_pointer().hover(e => e.bg(t.hover))
      .accessibility_label(label).text_color(t.foreground)
      .on_change((checked,cx) => {
        if (!alive() || !view.pluginOpen[key] || !view.pluginOpen[`${plugin.id}-settings`] || typeof checked !== 'boolean') return;
        const selected = pluginSetting(plugin,def.key);
        setPluginSetting(plugin,def.key,def.options.filter(([option]) => option === v ? checked : selected.includes(option)).map(([option]) => option));
        cx.notify();
      })
      .child(div().size(14).flex_none().rounded(3).border_1().border_color(value.includes(v)?t.solid:t.input)
        .bg(value.includes(v)?t.solid:'#00000000').flex().items_center().justify_center()
        .when(value.includes(v),e => e.child(svg(I('check')).size(10).text_color(t.solid_foreground))))
      .child(div().child(label))));
  return dropdown(`${id}-popup`,trigger,list,{open:view.pluginOpen[key]===true,focus:view.pluginFocus[key],
    onOpen:(open,cx) => {if (!open || alive()) view.pluginOpen[key]=open;cx.notify();}});
}

// One choice from a list the plugin supplies when the page draws (saved accounts on the
// chosen machine, say). A stored value that is not offered any more, or nothing stored,
// shows the first option: that is what the plugin then uses.
function selectField(view, t, plugin, def, id, value) {
  const key = `${plugin.id}-${def.key}-select`;
  const alive = () => !view.pluginClosed && pluginEnabled(plugin) && !view.pluginFixing;
  const options = pluginOptions(plugin, def);
  const current = options.find(([v]) => v === value) ?? options[0] ?? null;
  const usable = () => alive() && options.length > 0;
  // Options arrive with the plugin's check. Until the first one has finished there is nothing
  // to say yet: the dropdown shows it is loading instead of claiming there is nothing to choose.
  const check = view.pluginChecks[plugin.id];
  const loading = !options.length && pluginEnabled(plugin) && (!check || Boolean(check.loading));
  // As wide as its longest choice needs (about 7.4px a character at this size, plus padding
  // and the chevron), within sensible limits; the list is never narrower than the field.
  const longest = Math.max(0, ...options.map(([, label]) => String(label).length), options.length ? 0 : loading ? 18 : String(def.empty ?? 'Nothing to choose').length);
  const width = Math.round(Math.min(360, Math.max(140, longest * 7.4 + 46)));
  const trigger = control(t, h_flex()).id(id).w(width).px(10).gap(6).items_center().role('button')
    .accessibility_label(def.label).disabled(!usable()).cursor_pointer()
    .child(div().flex_1().min_w(0).truncate().text_color(current ? t.foreground : t.muted).child(current ? current[1] : loading ? skeleton(t, `${id}-loading`, 120).accessibility_label(`Loading ${def.label}`) : (def.empty ?? 'Nothing to choose')))
    .child(chevron(t,true));
  if (!usable()) return trigger;
  const list = menuSurface(t, v_flex()).w(Math.max(width, 180)).track_focus(view.pluginFocus[key])
    .children(options.map(([v,label],index) => div().id(`${id}-option-${index}`).px(8).py(6).rounded(U.radius).cursor_pointer()
      .truncate().text_color(t.foreground).accessibility_label(label)
      .when(current?.[0] === v, e => e.bg(t.selected)).hover(e => e.bg(t.hover))
      .on_click((_e,cx) => {
        if (!alive() || !view.pluginOpen[key]) return;
        view.pluginOpen[key] = false;
        if (v !== pluginSetting(plugin,def.key)) setPluginSetting(plugin,def.key,v);
        cx.notify();
      })
      .child(label)));
  return dropdown(`${id}-popup`,trigger,list,{open:view.pluginOpen[key]===true,focus:view.pluginFocus[key],
    onOpen:(open,cx) => {if (!open || usable()) view.pluginOpen[key]=open;cx.notify();}});
}

// Settings a plugin edits some other way (a list's scope, Requirements) are `hidden` or
// `place`d there.
// A `live` setting is not saved by the registry: its value lives somewhere else (a file on
// the chosen machine, say). `live.state(cx)` says what the plugin's last check saw there,
// `{ shown, value }` or null before the first check, and the row exists only while `shown`.
const liveState = (view, plugin, def) => def.live.state(viewContext(view, plugin)) ?? null;
// A machine setting is never a field: the Settings header's machine picker sets it.
const shownSettings = (view, plugin) => (plugin.settings ?? []).filter(d => !d.hidden && d.type !== 'machine' && d.place !== 'requirements' && (!d.live || liveState(view, plugin, d)?.shown === true));

function settingField(view, t, plugin, def) {
  const value = pluginSetting(plugin, def.key), id = `st-plugin-${plugin.id}-${def.key}`;
  if (def.live && ['toggle', 'choice'].includes(def.type)) {
    const state = liveState(view, plugin, def), machine = view.settingsMachine ?? null;
    const current = () => !view.pluginClosed && pluginEnabled(plugin) && state?.available !== false && (view.settingsMachine ?? null) === machine;
    const apply = (next, cx) => {
      if (!current()) return;
      runFixes(view, cx, plugin, [{ id: `live-${def.key}`, fix: { requiresEnabled: true, run: context => def.live.set(context, next, state) } }]);
    };
    const refused = view.pluginFixError[`${plugin.id}:live-${def.key}`];
    const widget = def.type === 'toggle' ? view.toggle(t, id, state?.value === true, (_e, cx) => apply(!state?.value, cx))
      : choice(t, id, def.options, state?.value, apply, current() && !view.pluginFixing);
    return fieldRow(t, { label: def.label, about: refused ?? state?.detail ?? def.about,
      widget: h_flex().gap(8).items_center().child(widget)
        .when(Boolean(state?.statusLabel), el => el.child(badge(t, 'missing', state.statusLabel)))
        .when(state?.retry === true, el => el.child(actionButton(t, `${id}-retry`, 'Retry', (_e, cx) => apply(state.value, cx), {enabled:current()&&!view.pluginFixing}))) });
  }
  if (def.type === 'profiles') {
    // A row that opens the role's profile list, like a longtext row.
    return settingsRow(t, id, { tall: Boolean(def.about), label: def.about ? `${def.label}: ${def.about}` : def.label })
      .on_click((_e, cx) => openRolePage(view, cx, plugin, def))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(div().text_size(U.font).text_color(t.foreground).child(def.label))
        .when(Boolean(def.about), e => e.child(description(t, def.about))))
      .child(chevronSlot(t, 'right'));
  }
  if (def.type === 'longtext') {
    // A row that opens the setting's own page, like Look > Statusbar > Left sidebar;
    // its description sits under the label, as on every other setting row.
    return settingsRow(t, id, { tall: Boolean(def.about), label: def.about ? `${def.label}: ${def.about}` : def.label })
      .on_click((_e, cx) => openTextPage(view, cx, plugin, def))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(div().text_size(U.font).text_color(t.foreground).child(def.label))
        .when(Boolean(def.about), e => e.child(description(t, def.about))))
      // `toggle: '<setting key>'`: an on/off switch for what this text is used for. The switch
      // keeps its press and click, so it never opens the page.
      .when(Boolean(def.toggle), e => {
        const on = pluginSetting(plugin, def.toggle) === true;
        return e.child(div().id(`${id}-switch-slot`).flex_none()
          .on_mouse_down('left', (_e, cx) => cx.stop_propagation())
          .child(view.toggle(t, `${id}-switch`, on, (_e, cx) => { cx.stop_propagation(); setPluginSetting(plugin, def.toggle, !on); cx.notify(); })));
      })
      .child(chevronSlot(t, 'right'));
  }
  if (def.type === 'text') {
    // Long values (paths): the field gets the full width under its label.
    const field = view.pluginInputs[`${plugin.id}-${def.key}`];
    return v_flex().w_full().gap(6)
      .child(v_flex().w_full().gap(2)
        .child(div().text_size(U.font).text_color(t.foreground).child(def.label))
        .when(Boolean(def.about), el => el.child(description(t, def.about))))
      .child(control(t, h_flex()).id(id).w_full().px(U.gutter).border_color(field.focused ? t.input : t.border)
        .child(Input.new(field.state).flex_1().min_w(0).h_full()));
  }
  const widget = def.type === 'toggle'
    ? view.toggle(t, id, value, (_e, cx) => { setPluginSetting(plugin, def.key, !value); cx.notify(); })
    : def.type === 'machine' ? machineField(view, t, plugin, def, id, value)
    : def.type === 'multiselect' ? multiselectField(view, t, plugin, def, id, value)
    : def.type === 'select' ? selectField(view, t, plugin, def, id, value)
    : choice(t, id, def.options, value, (v, cx) => { setPluginSetting(plugin, def.key, v); cx.notify(); });
  return fieldRow(t, { label: def.label, about: def.about, widget });
}
function settingsBlock(view, t, plugin) {
  return disclosure(view, t, `${plugin.id}-settings`, 'Settings', {}, () => v_flex().w_full().gap(10)
    .children(shownSettings(view, plugin).map(def => settingField(view, t, plugin, def))));
}

// --- Plugin pages ----------------------------------------------------------------------
// A page of its own in Settings (Usage), declared as `{ id, title, about, machine, fields }`.
// Each field is `{ key, type: 'toggle' | 'choice', label, about, options?, get(scope), set(scope,
// value, cx) }`: the plugin owns where values live (per machine, say); `scope` is the
// machine chosen in the Settings header when `machine` is true. Drawn like Settings' own
// pages, from the same rows as plugin settings.
export function pluginPage(owner, t, page) {
  const scope = page.machine ? owner.settingsMachine ?? null : null;
  const act = (field, value) => (_e, cx) => {
    if ((page.machine ? owner.settingsMachine ?? null : null) !== scope || page.enabled?.() === false) return;
    field.set(scope, value, cx); cx.notify();
  };
  return v_flex().id(`st-${page.id}-page`)
    .child(owner.heading(t, page.title, page.about))
    .children(page.fields.map((field, index) => {
      const id = `st-${page.id}-${field.key}`, value = field.get(scope);
      const widget = field.type === 'toggle' ? owner.toggle(t, id, value, act(field, !value))
        : choice(t, id, field.options, value, (v, cx) => act(field, v)(null, cx));
      return owner.row(t, field.label, field.about, widget, index === page.fields.length - 1);
    }));
}

export function pluginConfirmation(view,t) {
  const pending=view.pluginConfirm,plugin=PLUGINS.find(p=>p.id===pending?.plugin);
  if(!plugin||!pluginEnabled(plugin))return null;
  const spec=pending.item.fix.confirm;
  return v_flex().id(`st-plugin-confirm-${plugin.id}`).w_full().flex_none().p(12).gap(8).rounded(U.radius).border_1().border_color(t.border).bg(t.surface)
    .child(div().font_semibold().text_size(U.font).child(spec.title))
    .child(description(t,spec.detail))
    .child(h_flex().justify_end().gap(8)
      .child(button(t,`st-plugin-confirm-${plugin.id}-cancel`,'Cancel',(_e,cx)=>{view.pluginConfirm=null;cx.notify();}).h(28))
      .child(button(t,`st-plugin-confirm-${plugin.id}-accept`,spec.label??pending.item.fix.label,(_e,cx)=>{
        if(view.pluginConfirm!==pending||!pluginEnabled(plugin))return;view.pluginConfirm=null;runFixes(view,cx,plugin,[pending.item],true);
      },{primary:true}).h(28)));
}

function card(view, t, plugin) {
  const on = pluginEnabled(plugin);
  return v_flex().id(`st-plugin-${plugin.id}`).w_full().p(14).gap(10).rounded(8)
    .border_1().border_color(t.border).bg(t.background)
    .child(h_flex().w_full().gap(12).items_center()
      .child(div().size(36).flex_none().rounded(8).bg(t.hover).flex().items_center().justify_center()
        .child(slot(svg(pluginIcon(plugin)).size(18).text_color(on ? t.foreground : t.muted), 18)))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(div().text_size(14).font_semibold().text_color(t.foreground).child(plugin.name))
        .child(div().id(`st-plugin-version-${plugin.id}`).text_size(12).text_color(t.dim).child(plugin.version)))
      .child(view.toggle(t, `st-plugin-${plugin.id}-enabled`, on, (_e, cx) => {
        view.pluginConfirm=null;
        clearPluginForms(view, plugin.id);
        if (view.pluginListOperation && view.pluginFixing?.startsWith(`${plugin.id}:`)) { view.pluginListOperation = null; view.pluginFixing = null; view.pluginSettling = {}; }
        for (const key of view.pluginRowChoices?.keys() ?? []) if (JSON.parse(key)[0] === plugin.id) view.pluginRowChoices.delete(key);
        if (view.pluginSessions) view.pluginSessions[plugin.id] = {};
        delete view.pluginChecks[plugin.id];
        setPluginEnabled(plugin, !on);
        if (!on) reloadPlugins(view, cx, plugin.id);
        cx.notify();
      }).accessibility_label(`${plugin.name} enabled`)))
    .child(h_flex().flex_wrap().items_center().gap_x(4).gap_y(0)
      .child(description(t, plugin.description))
      .children((plugin.descriptionLinks ?? []).filter(link=>/^https:\/\//.test(link.url)).map((link,index)=>
        description(t,link.label).id(`st-plugin-${plugin.id}-description-link-${index}`).text_color(t.accent).underline().cursor_pointer().role('link')
          .on_click((_e,cx)=>cx.open_url(link.url)))))
    .when(Boolean(plugin.prerequisites?.some(item=>!item.section)), el => el.child(requirements(view, t, plugin)))
    .when(on,el=>el.children(prerequisiteSections(view,t,plugin)))
    .when(on && !setupUnavailable(view,plugin) && shownSettings(view, plugin).length > 0, el => el.child(settingsBlock(view, t, plugin)));
}

// Cards are reordered the way Usage's are (reorder.js `card`): press a card and drag it.
// The order is the person's (orderedPlugins); one plugin's own page has nothing to reorder.
const pluginDrag = view => reorder(view.pluginReorder ??= {}, 'list');
const pluginIcon = plugin => plugin.icon.includes('/') ? plugin.icon : I(plugin.icon);
export function pluginsPage(view, t) {
  const target = PLUGINS.find(plugin => plugin.id === view.pluginTarget);
  const shown = target ? [target] : orderedPlugins(), keys = shown.map(plugin => plugin.id), drag = pluginDrag(view);
  if (drag.current && (target || !keys.includes(drag.current.id))) drag.reset();
  const dragged = !target && drag.view ? PLUGINS.find(plugin => plugin.id === drag.view.id) : null;
  const page = v_flex().id('st-plugins-page').relative().w_full().gap(12).pr(16)
    .child(view.heading(t, target ? `${target.name} settings` : 'Plugins', target
      ? 'Configure this plugin’s requirements and preferences.' : 'Optional integrations. Each does something only while it’s on.'))
    .children(shown.map(plugin => target ? card(view, t, plugin)
      : drag.card(card(view, t, plugin), plugin.id, keys, t, { id: 'st-plugin', scale: settings()?.zoom })))
    .when(Boolean(dragged), el => el.child(drag.preview('st-plugin-drag', t, { icon: svg(pluginIcon(dragged)).size(U.smallIcon).text_color(t.muted), label: dragged.name })));
  if (target) return page;
  return drag.surface(page, { release: (_id, cx) => { const next = drag.dropOrder(keys, cx); if (next) setPluginOrder(next); cx.notify(); } });
}
