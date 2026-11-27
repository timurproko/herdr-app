// The plugin UI kit: every control Settings › Plugins draws, in one place. Plugins never
// draw their own settings UI; they declare it (see docs/PLUGIN-UI.md) and the renderer
// (features/settings/plugins-ui.js) builds it from these parts, so every plugin looks and
// behaves the same and a new plugin needs no UI code at all.
import { div, svg } from 'gpui-kit';
import { h_flex, v_flex, HoverCard, Popup } from 'gpui-base';
import { hintTable } from './panel-kit.js';
import { settings } from './host.js';
import { U, button, control, spinner, itemHover, description, dropdown, menuSurface, menuRow, collapsible } from './ui.js';

// One geometry for every plugin: row buttons, status badges and the Add popups.
export const KIT = Object.freeze({
  action: 80,       // every row button (Check, Install, Add, Remove, Cancel)
  actionHeight: 24, // row buttons; popup footer buttons are `footerButton` tall
  badge: 72,        // every status badge, so the buttons beside them line up
  dropdown: 150,    // scope dropdowns (machine, account)
  picker: Object.freeze({ width: 320, height: 350, header: U.field + 2 * U.gutter, footerButton: 26 }),
});

// Informational, not a link: same inline accent placement, dashed underline.
// The same HoverCard/table as the sidebar Usage footer supports aligned columns.
export function descriptionHint(t, id, hint, focus) {
  const trigger = div().id(id).relative().track_focus(focus).tab_index(0)
    .text_size(U.meta).text_color(t.accent).whitespace_nowrap().accessibility_label(hint.label)
    .child(div().absolute().inset_0().border_b_1().border_dashed().border_color(t.accent))
    .child(hint.label);
  const body = () => hintTable(t, [hint.columns, ...hint.rows]);
  // HoverCard itself is hover-only. Popup supplies the identical passive body
  // for native keyboard focus without a click-to-open Popover or focus trap.
  if (focus?.is_focused?.()) return Popup.new(`${id}-focus-hint`, trigger).anchor('top_left').content(body());
  return HoverCard.new(`${id}-hint`).anchor('top_left').open_delay(400).close_delay(100)
    .trigger(trigger).content(body());
}

const STATUS = { ready: 'Ready', missing: 'Missing', recommended: 'Optional', error: 'Error' };
export function badge(t, status, label = STATUS[status] ?? status) {
  const color = status === 'ready' ? t.ansi2 : status === 'recommended' ? t.muted : t.blocked;
  return div().flex_none().w(KIT.badge).min_w(KIT.badge).max_w(KIT.badge).h(20).px(8).rounded(10).flex().items_center().justify_center().bg(t.hover)
    .text_size(11.5).font_medium().text_color(color).child(label);
}
// Row details read like labels ("jq-1.8.2", "Linked", "Not installed"): no final full
// stop, whoever wrote them (a plugin, or a tool's error output). An ellipsis stays.
export const statusText = text => typeof text === 'string' ? text.trimEnd().replace(/(?<!\.)\.$/, '') : text;
// The working bulb with an optional word ("Checking"), in the badge's column.
export function workingStatus(t, text = 'Checking') {
  return div().relative().w(KIT.badge).h(20).flex().items_center().text_color(t.working)
    .child(div().absolute().left(0).top((20 - U.statusSize) / 2).child(spinner(t.working)))
    .when(text !== null, el => el.child(div().flex_1().min_w(0).pl(U.statusSize + 4).whitespace_nowrap().text_size(11.5).child(text)));
}
// Loading inside a popup or a list: the bulb, then the word, at the start of a row.
export function loadingStatus(t, id, text = 'Loading') {
  return h_flex().id(id).flex_1().min_w(0).gap(6).items_center()
    .child(spinner(t.working)).child(div().text_size(U.meta).text_color(t.working).child(text));
}
// The pulsing bar a control shows while its value is still being read (as Core does).
export const skeleton = (t, id, width, height = 9) => div().id(id).w(width).h(height).flex_none().rounded(3).bg(t.hover)
  .loop('opacity', { from: 0.35, to: 0.75, period: 1400, easing: 'ease-in-out' });

// Headers and rows share right-anchored columns: the action (80), then the status (72).
const statusSlot = content => div().flex_none().w(KIT.badge).min_w(KIT.badge).max_w(KIT.badge).flex().justify_center().child(content);
export function statusRail(content, actions, id = null) {
  return h_flex().when(Boolean(id), el => el.id(id)).flex_none().gap(10).items_center()
    .child(actions ?? div().w(KIT.action).flex_none())
    .child(statusSlot(content ?? div()));
}
// The one row button. `primary` for the action a row is waiting on.
export function actionButton(t, id, label, onClick, { enabled = true, primary = false } = {}) {
  return button(t, id, label, onClick, { enabled, primary })
    .w(KIT.action).min_w(KIT.action).max_w(KIT.action).h(KIT.actionHeight).min_h(KIT.actionHeight).max_h(KIT.actionHeight)
    .flex_none().px(6).whitespace_nowrap().text_size(12);
}
// The same look as actionButton for a popup's trigger (the popup handles the click).
export function actionTrigger(t, id, label, enabled) {
  return control(t).id(id).w(KIT.action).min_w(KIT.action).max_w(KIT.action).h(KIT.actionHeight).min_h(KIT.actionHeight).max_h(KIT.actionHeight)
    .px(6).flex_none().flex().items_center().justify_center().role('button').whitespace_nowrap().text_size(12).font_medium()
    .disabled(!enabled).when(!enabled, e => e.opacity(0.4)).when(enabled, e => e.cursor_pointer().hover(s => s.bg(t.hover))).child(label);
}
export const checkButton = (t, id, loading, onClick, enabled) => actionButton(t, id, 'Check', onClick, { enabled: enabled && !loading });

// A segmented choice (Used | Remaining).
export function choice(t, id, options, value, onPick, enabled = true) {
  return control(t, h_flex()).p(2).gap(2).children(options.map(([v, label]) =>
    div().id(`${id}-${v}`).px(12).h(U.field - 6).flex_none().flex().items_center().justify_center().rounded(4).disabled(!enabled)
      .bg(value === v ? t.selected : '#00000000').text_color(value === v ? t.foreground : t.muted)
      .when(enabled, e => e.cursor_pointer().hover(e => e.bg(itemHover(t, value === v))))
      .when(!enabled, e => e.opacity(0.4))
      .on_click((_e, cx) => { if (enabled) onPick(v, cx); }).child(label)));
}

// Lightweight view tabs, matching the existing panel tab treatment rather than
// the bordered field-choice control. Opt-in for picker categories only.
export function pickerTabs(t, id, options, value, onPick, enabled = true) {
  return h_flex().gap(2).items_center().children(options.map(([v, label]) =>
    div().id(`${id}-${v}`).h(U.control).px(8).flex_none().flex().items_center().justify_center().rounded(U.radius)
      .role('button').accessibility_label(label).text_size(U.meta).text_color(value === v ? t.foreground : t.muted)
      .when(value === v, e => e.font_semibold()).disabled(!enabled)
      .when(enabled, e => e.cursor_pointer().hover(e => e.bg(t.hover))).when(!enabled, e => e.opacity(0.4))
      .on_click((_e, cx) => { if (enabled) onPick(v, cx); }).child(label)));
}

// One value from a list: an account, say. While `loading` it keeps its place with a
// placeholder inside, so whatever sits beside it never moves.
export function optionDropdown(t, { id, label = 'Choose', value = '', options = [], loading = false, disabled = false, open = false, focus, onOpen, onSelect, row = null }) {
  const known = options.find(([v]) => v.toLowerCase() === String(value ?? '').toLowerCase());
  const off = disabled || loading || !options.length;
  const trigger = control(t, h_flex()).id(id).w(KIT.dropdown).px(10).gap(6).items_center().role('button')
    .accessibility_label(label).disabled(off)
    .when(!off, e => e.cursor_pointer()).when(off && !loading, e => e.opacity(0.4))
    .child(div().flex_1().min_w(0).when(!row, el => el.truncate()).whitespace_nowrap().text_color(known && !row?.quiet ? t.foreground : t.muted)
      .child(loading ? skeleton(t, `${id}-loading`, 80).accessibility_label(`Loading ${label}`) : known?.[1] ?? (options.length ? 'Choose' : 'None')))
    .child(svg('mods/custom-workspace-chrome/chevron-down.svg').size(U.smallIcon).text_color(t.muted).when(Boolean(row?.quiet), el => el.opacity(0)));
  if (row) trigger.h(U.control).track_focus(row.trigger).tab_index(0)
    .when(row.quiet, e => e.bg('#00000000').border_color('#00000000').text_color(t.muted))
    .on_key_down((e, cx) => {
      if (!off && ['enter', 'space', ' ', 'down', 'up'].includes(e.key)) { cx.stop_propagation(); onOpen(true, cx, true); }
    });
  // Same trigger and focus target at rest; only its chrome changes.
  if (off) return trigger;
  const list = menuSurface(t, v_flex()).w(200).track_focus(focus)
    .when(Boolean(row), el => el.id(`${id}-options`).on_key_down((e, cx) => {
      if (e.key === 'down' || e.key === 'up') row.move(e.key === 'down' ? 1 : -1, cx);
      else if (e.key === 'enter' || e.key === 'space' || e.key === ' ') onSelect(options[row.index]?.[0], cx, true);
      else if (e.key === 'escape') onOpen(false, cx, true);
      else return;
      cx.stop_propagation(); cx.notify();
    }))
    .children(options.map(([v, text], index) => menuRow(t, { id: `${id}-${v}`, label: text, onClick: (_e, cx) => onSelect(v, cx),
      highlighted: Boolean(row && row.index === index),
      trailing: v === known?.[0] ? svg('mods/custom-workspace-chrome/check.svg').size(U.smallIcon).text_color(t.muted) : null })));
  return dropdown(`${id}-popup`, trigger, list, { open, focus, onOpen });
}

// A collapsible group (ui.js collapsible, chevron first): open, the header and its body
// share one panel, at full tint: the plugin card is already dark, so half a step barely
// shows. The header carries a summary (a badge or the working bulb) and its
// tools on the right, in the same column as the body's own actions.
export function disclosure(state, t, id, title, { summary = null, tools = null, open: fallback = false } = {}, body) {
  const open = state.pluginOpen[id] ?? fallback;
  // The chevron at the right edge, after the summary, like Usage's Resets: one look for every
  // collapsible block.
  // `measured`: the bodies slide open and shut like Usage's Resets (heights kept on the view).
  return collapsible(t, { id: `st-plugin-${id}`, title, open, on: t.background, tint: 1, bodyPadY: 8, bodyGap: 12, chevron: 'end',
    measured: state.pluginHeights ??= {}, zoom: settings().zoom ?? 1,
    onToggle: (_e, cx) => { state.pluginOpen[id] = !open; cx.notify(); },
    trailing: summary || tools ? statusRail(summary, tools, `st-plugin-${id}-status-rail`) : null }, body);
}

// A label (and its description) on the left, a control on the right.
export function fieldRow(t, { label, about, widget, id = null }) {
  return h_flex().when(Boolean(id), el => el.id(id)).w_full().gap(16).items_center()
    .child(v_flex().flex_1().min_w(0).gap(2)
      .child(div().text_size(U.font).text_color(t.foreground).child(label))
      .when(Boolean(about), el => el.child(description(t, about))))
    .child(div().flex_none().child(widget));
}
// Transient action inputs deliberately have no preference binding or blur/submit handler.
export function actionInput(t, { id, label, widget, enabled = true }) {
  return v_flex().w_full().gap(4)
    .child(div().text_size(U.meta).text_color(t.muted).child(label))
    .child(control(t, h_flex()).id(id).w_full().px(U.gutter).disabled(!enabled)
      .child(widget.flex_1().min_w(0).h_full().disabled(!enabled).accessibility_label(label)));
}

// A section's top row: what it is scoped to (Machine, Account), its dropdown, then the
// section's action in the same column as Check above and each row's Remove below.
export function scopeRow(t, { id, label, dropdown: picker, action, separator = true }) {
  return h_flex().id(`${id}-where`).w_full().gap(8).items_center()
    .when(separator, e => e.pb(10).border_b_1().border_color(t.border))
    .child(div().flex_1().min_w(0).text_size(U.font).text_color(t.foreground).child(label))
    .when(Boolean(picker), el => el.child(div().flex_none().child(picker)))
    // Inside a section the action ends at the right edge: no reserved status column.
    .child(div().id(`${id}-where-rail`).flex_none().w(KIT.action).when(Boolean(action), el => el.child(action)));
}
// One added item: a single line that highlights on hover like the section headers, with
// Remove shown only then. Remove keeps its place while hidden, so nothing moves.
// No w_full: stretched, the negative margins widen the row for the hover fill while
// Remove stays in the Check/Add column.
export function removableRow(state, t, rid, label, onRemove, enabled, resting = null, rowChoice = null) {
  const shown = state.pluginRowHover === rid || Boolean(rowChoice?.revealed);
  return h_flex().id(rid).h(U.control).mx(-8).px(8).gap(10).items_center().rounded(U.radius)
    .when(shown, el => el.bg(t.hover))
    .on_hover((hovered, cx) => {
      if (hovered) state.pluginRowHover = rid; else if (state.pluginRowHover === rid) state.pluginRowHover = null;
      cx.notify();
    })
    .child(div().flex_1().min_w(0).pr(8).truncate().text_size(U.font).text_color(t.foreground).tooltip(label).child(label))
    .when(Boolean(rowChoice), el => el.child(div().id(`${rid}-choice-slot`).flex_none().w(KIT.dropdown).child(rowChoice.widget)))
    // Remove ends at the right edge, under the Add button above it.
    .child(div().id(`${rid}-rail`).flex_none().w(KIT.action).flex().justify_end().child(rowChoice
      ? actionButton(t, rid.replace(/-row-(\d+)$/, '-remove-$1'), 'Remove', onRemove, { enabled })
        .track_focus(rowChoice.remove).tab_index(0).opacity(shown ? 1 : 0)
        .on_key_down((e, cx) => { if (enabled && ['enter', 'space', ' '].includes(e.key)) { cx.stop_propagation(); onRemove(e, cx); } })
      : shown ? actionButton(t, rid.replace(/-row-(\d+)$/, '-remove-$1'), 'Remove', onRemove, { enabled })
      : resting ?? div().id(`${rid}-remove-slot`).h(KIT.actionHeight).w(KIT.action)));
}

// The Add popups' frame: a 56px header (a search field or where you are), the list, and a
// footer with Loading or the count on the left and Cancel and the action on the right.
export function pickerHeader(t, id, ...children) {
  return h_flex().id(id).w_full().flex_none().h(KIT.picker.header).px(U.gutter).gap(8).items_center().border_b(1).border_color(t.border).children(children);
}
export const pickerListHeight = (height = KIT.picker.height) => height - KIT.picker.header - 1 - (KIT.picker.footerButton + 2 * U.gutter + 1) - 2;
export function pickerFooter(t, id, { loading = false, count = '', onCancel, confirm, onConfirm, enabled }) {
  const footerButton = (bid, label, click, options) => button(t, bid, label, click, options).h(KIT.picker.footerButton).w(KIT.action).flex_none().text_size(12);
  return h_flex().w_full().flex_none().p(U.gutter).gap(8).items_center().justify_end().border_t(1).border_color(t.border)
    .when(loading, el => el.child(loadingStatus(t, `${id}-loading`)))
    .when(!loading && Boolean(count), el => el.child(div().id(`${id}-count`).flex_1().min_w(0).truncate().text_size(U.meta).text_color(t.muted).child(count)))
    .child(footerButton(`${id}-cancel`, 'Cancel', (_e, cx) => onCancel(cx)))
    .child(footerButton(`${id}-choose`, confirm, (_e, cx) => onConfirm(cx), { primary: true, enabled }));
}
// What a picker that adds and removes says about the pending change.
export const changeCount = (adds, removes) => [adds ? `${adds} selected` : '', removes ? `${removes} to remove` : ''].filter(Boolean).join(' · ');
export const changeLabel = (adds, removes) => adds && removes ? 'Apply' : removes ? 'Remove' : 'Add';
