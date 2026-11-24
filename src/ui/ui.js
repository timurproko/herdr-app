// Shared visual contract. Copied into each private mod so imports stay sandbox-local.
// Logical pixels at zoom=1; the person's app zoom remains untouched.
import { div, svg } from "gpui-kit";
import { Popover, Input } from "gpui-base";
export const U = Object.freeze({
  row: 28, rowGap: 2, subrow: 26, section: 32, control: 28, insetControl: 24, insetRadius: 4, field: 32,
  icon: 16, smallIcon: 14, tinyIcon: 12, statusSize: 7,
  font: 13, meta: 12, radius: 6, dialogRadius: 8, gap: 8, gutter: 12, descriptionGap: 4,
});
// Working is a softly flashing bulb; finished uses the same-sized solid bulb.
// Native opacity animation avoids rotating/raster-resampling a tiny icon.
export function activity(color) {
  return div().size(U.statusSize).flex_none().rounded_full().bg(color)
    .loop("opacity", { from: 0.25, to: 1, period: 1100, easing: "ease-in-out" });
}
// Compatibility for private clones that still use the old helper name.
export const spinner = activity;
// Shared by Agents and Jump: idle is neutral gray-white, only Done is green.
export function statusBulb(t, status) {
  if (status === "working") return activity(t.working);
  return div().size(U.statusSize).flex_none().rounded_full()
    .bg(status === "done" ? t.done : status === "idle" ? t.dim : (t[status] ?? t.dim));
}
// Space avatars use the same stable hue and default (including ~) in every view.
const SPACE_MARK = { ansi6: "#22a99a", ansi3: "#e3814f", ansi4: "#5b8def", ansi5: "#8b7cf6", ansi2: "#3fae6a", ansi1: "#d9649a" };
export function spaceBadgeColor(t, space, colors = {}) {
  const color = colors[space.id] ?? "ansi6";
  return color.startsWith("#") ? color : (SPACE_MARK[color] ?? t[color]);
}
// The same soft, opaque hover fill for every icon, independent of its surface.
export function interactionFill(t) { return t.hover; }
// Inset tools tint their actual parent rather than painting a dark tile over selection.
export function subtleActionFill(t) {
  return /^#[0-9a-f]{6}$/i.test(t.foreground ?? "") ? `${t.foreground}0a` : "#ffffff0a";
}
// A visual minimum only: real results and errors are never delayed.
export const REFRESH_MIN_MS = 600;
export function refreshFeedbackActive(owner, id, scope) {
  return Boolean(owner.refreshFeedback?.has(id) && owner.refreshFeedback.get(id).scope === scope);
}
export function startRefreshFeedback(owner, id, scope, cx, restart = false) {
  if (!restart && refreshFeedbackActive(owner, id, scope)) return false;
  owner.refreshFeedback?.get(id)?.timer?.cancel?.();
  owner.refreshFeedback ??= new Map();
  const feedback = { scope };
  owner.refreshFeedback.set(id, feedback);
  feedback.timer = cx.timer.after(REFRESH_MIN_MS, cx => {
    if (owner.refreshFeedback?.get(id) !== feedback) return;
    owner.refreshFeedback.delete(id); cx.notify();
  });
  cx.notify();
  return true;
}
// Refresh actions share one busy treatment, including compact panel headers.
export function refreshButton(t, { id, icon, label = 'Refresh', busy = false, spinning = busy, enabled = true, onClick, owner, scope,
  size = U.control, iconSize = U.smallIcon, radius = U.radius, color = t.muted, hover = t.hover }) {
  const feedback = Boolean(owner && refreshFeedbackActive(owner, id, scope));
  const active = enabled && !busy && !feedback;
  return div().id(id).size(size).flex_none().flex().items_center().justify_center().rounded(radius).text_color(color)
    .role('button').accessibility_label(label).disabled(!active)
    .when(active, e => e.cursor_pointer().hover(s => s.bg(hover)))
    .when(!active, e => e.opacity(0.4))
    .on_mouse_down('left', (_e, cx) => cx.stop_propagation())
    .on_click((e, cx) => {
      cx.stop_propagation();
      if (!active || (owner && !startRefreshFeedback(owner, id, scope, cx))) return;
      onClick(e, cx);
    })
    .child(svg(icon).size(iconSize).when(Boolean((busy && spinning) || feedback), e => e.spin(900)));
}
// Pane and panel tools share exact anchors, glyph geometry and hover motion.
export function headerTools(element = div()) {
  return element.absolute().right(8).top(4).h(U.insetControl).flex().items_center().gap(4);
}
// A header title that opens a menu: the right panel's (Files / Git switcher) and a
// terminal pane's (its shell menu). `icon` is an asset path or a ready element (a
// program icon); `shrink` lets a long label truncate inside a narrow header.
export function panelTitle(t, { id, icon, label, labelId = null, labelColor = t.foreground, medium = true, shrink = false, menuLabel = 'Switch panel', iconFirst = true }, onOpen) {
  return div().id(id).h(U.control).px(8).gap(U.gap).flex().items_center().rounded(U.radius)
    .when(!shrink, el => el.flex_none()).when(shrink, el => el.min_w(0).flex_shrink(1))
    .when(Boolean(onOpen), el => el.role('button').accessibility_label(menuLabel)
      .cursor_pointer().hover(s => s.bg(t.hover))
      .on_mouse_down('left', (_e, cx) => cx.stop_propagation())
      .on_click((e, cx) => { cx.stop_propagation(); onOpen(e, cx); }))
    .when(iconFirst, el => el.child(typeof icon === 'string' ? slot(svg(icon).size(U.smallIcon).text_color(t.foreground)) : icon))
    .child(div().when(Boolean(labelId), e => e.id(labelId)).when(medium, e => e.font_medium()).when(shrink, e => e.min_w(0).truncate()).text_size(U.meta).text_color(labelColor).child(label))
    .when(Boolean(onOpen), el => el.child(svg('mods/custom-workspace-chrome/chevron-down.svg').size(U.tinyIcon).flex_none().text_color(t.dim)));
}
// The one small icon button (24px) for headers and rows: panel and pane tools, + and ×
// buttons, row tools. `enabled` false makes it inert (a tool hidden until its header is
// hovered); `available` false also dims it (an action that can't apply now).
// `large` is the top-level size (28px, a bar's own button rather than one inset in a row).
export function iconButton(t, { id, icon, label, enabled = true, available = true, onClick, iconSize = U.smallIcon, tooltip = null, color = t.dim, large = false }) {
  const live = enabled && available;
  return div().id(id).size(large ? U.control : U.insetControl).flex_none().flex().items_center().justify_center().rounded(large ? U.radius : U.insetRadius)
    .role('button').accessibility_label(label).disabled(!live).text_color(color)
    .when(Boolean(tooltip), el => el.tooltip(tooltip))
    .when(live, el => el.cursor_pointer().hover(s => s.bg(large ? interactionFill(t) : subtleActionFill(t)).text_color(t.foreground)))
    .when(!available, el => el.opacity(0.35))
    .on_mouse_down('left', (_e, cx) => cx.stop_propagation())
    .on_click((e, cx) => { cx?.stop_propagation(); if (live) onClick(e, cx); })
    .child(typeof icon === 'string' ? svg(icon).size(iconSize) : icon);
}
// The one popup-menu row: an icon (asset path or element), the label, optional hint or
// trailing element. `highlighted` is the keyboard's choice; the pointer hovers on its own.
// `pointer` false suspends the pointer's highlight while the keyboard is choosing.
// `dim` false keeps an inert row looking normal (a Start row waiting on its launch).
export function menuRow(t, { id, icon = null, label, hint = null, trailing = null, highlighted = false, enabled = true, dim = true, pointer = true, onClick, onHover = null, accessibility = label }) {
  return div().id(id).flex().h(U.row).flex_none().px(8).gap(U.gap).items_center().rounded(U.radius)
    .role('button').accessibility_label(accessibility)
    .when(!enabled && dim, el => el.disabled(true).opacity(0.4))
    .when(enabled, el => el.cursor_pointer().hover(s => pointer ? s.bg(t.hover) : s))
    .when(highlighted, el => el.bg(t.hover))
    .when(Boolean(onHover), el => el.on_hover((over, cx) => onHover(over, cx)))
    .on_click((e, cx) => { cx?.stop_propagation(); if (enabled) onClick(e, cx); })
    .when(icon !== null, el => el.child(slot(typeof icon === 'string' ? svg(icon).size(U.smallIcon).text_color(t.muted) : icon)))
    .child(div().flex_1().min_w(0).truncate().child(label))
    .when(Boolean(trailing), el => el.child(trailing))
    // A minimum width, right-aligned like every shortcut: one-digit hints (1, 2…) take the same
    // room, so whatever sits before them (a role pill) lines up from row to row, and every hint
    // (1, ctrl-shift-t) ends on the same edge.
    .when(Boolean(hint), el => el.child(div().flex_none().min_w(16).flex().justify_end().text_size(11).text_color(t.dim).child(hint)));
}
// A line between groups of menu rows.
export function menuSeparator(t, id) {
  return div().id(id).flex_none().py(4).px(4).child(div().h(1).w_full().bg(t.border));
}
// A small label pill ("Max", "Owner", "Needs you"); the first letter is capitalised.
// `compact` fits a meta line; `tone` (a color) tints it for a status ("Needs you").
export function tag(t, id, label, { compact = false, tone = null } = {}) {
  const text = String(label ?? '').trim();
  return div().id(id).flex_none().px(6).rounded(tone ? 5 : 4).bg(tone ? `${tone}26` : t.hover).text_color(tone ?? t.muted)
    .when(Boolean(tone), el => el.font_semibold())
    .when(compact || Boolean(tone), el => el.h(tone ? 18 : 16).flex().items_center().text_size(tone ? 10.5 : 10))
    .when(!compact && !tone, el => el.py(2).text_size(U.meta))
    .child(text.charAt(0).toUpperCase() + text.slice(1));
}
export function menuSurface(t, element = div()) {
  return element.p(4).pt(5).pb(3).rounded(8).border_1().border_color(t.border).bg(t.popover).shadow_md().text_size(U.font);
}
// Retain this keyed element across renders so native motion can interpolate targets.
export function reveal(element, visible) {
  return element.opacity(visible ? 1 : 0).transition("opacity", { duration: 140, easing: "ease-out" });
}
// One shell for every skin-owned dialog; bodies keep their own sizing/scroll policy.
export function dialogSurface(t, element = div(), { nativeFrame = false } = {}) {
  const surface = element.w_full().min_h(0).text_size(U.font).text_color(t.foreground);
  // App-owned palettes already have an outer border, radius, background and shadow.
  return nativeFrame ? surface : surface.rounded(U.dialogRadius).border_1().border_color(t.border).shadow_lg().bg(t.background);
}
export function dialogBody(element = div()) { return element.p(16); }
// Modal rails dock to the right; only content reserves a trailing gutter.
// parentInset compensates for an enclosing dialogBody without doubling the edge gap.
export const DIALOG_SCROLL = Object.freeze({ inset: 8, rightInset: 0, gutter: 8 });
export function dialogScrollFrame(element = div(), { parentInset = 0 } = {}) {
  return element.relative().min_h(0).ml(DIALOG_SCROLL.inset - parentInset)
    .mr(DIALOG_SCROLL.rightInset - parentInset).my(DIALOG_SCROLL.inset).overflow_hidden();
}
export function dialogScrollbar(element, { mode = 'scrolling' } = {}) {
  return element.mode(mode).absolute().inset_0();
}
export function dialogScrollArea(element = div(), options) {
  return dialogScrollFrame(element, options).overflow_y_scrollbar().mode('scrolling');
}
export function dialogScrollRow(element) { return element.mr(DIALOG_SCROLL.gutter); }
// Apply to an inner content stack, not the scrolling viewport: padding must not
// manufacture an overflow range for otherwise fitting pages.
export function dialogScrollBody(element = div()) {
  return element.pl(DIALOG_SCROLL.inset).pr(2 * DIALOG_SCROLL.gutter).py(DIALOG_SCROLL.inset);
}
export function description(t, text) {
  return div().text_size(U.meta).line_height("18px").text_color(t.muted).child(text);
}
export function sectionHeading(t, text, about) {
  const title = div().text_size(16).font_semibold().text_color(t.foreground).child(text);
  return about ? div().flex().flex_col().pt(4).pb(12).gap(U.descriptionGap).child(title).child(description(t, about))
    : title.pt(4).pb(12);
}
// Native Popover owns trigger presses, outside-click dismissal, Escape and focus.
// Do not nest it in Select: two open-state owners can fight each other.
export function dropdownPlacement(bounds, height, viewportHeight, zoom = 1) {
  const b = bounds ?? { y: viewportHeight * 0.8, height: U.field * zoom };
  const below = viewportHeight - b.y - b.height - 12 * zoom;
  const above = b.y - 12 * zoom;
  const up = below < height * zoom && above > below;
  return { above: up, triggerHeight: b.height / zoom, height: Math.max(72, Math.min(height, (up ? above : below) / zoom)) };
}
// `align: 'right'` lines the surface up with the trigger's right edge (a wide popup
// from a button at the end of a row), like the folder browser.
export function dropdown(id, trigger, content, { open, focus, onOpen, above = false, align = 'left' }) {
  // Native anchoring already selects the appropriate trigger edge.
  // Use the same 4px visual gap above and below; do not add its height again.
  const surface = div().flex().flex_col()
    .when(!above, e => e.pt(4)).child(content)
    .when(above, e => e.child(div().h(4).flex_none()));
  return Popover.new(id).open(open).overlay_closable(true).anchor(`${above ? "bottom" : "top"}_${align === 'right' ? 'right' : 'left'}`)
    .track_focus(focus).on_open_change(onOpen).trigger(trigger)
    .when(open, e => e.content(surface));
}
// A text dropdown drawn as a hover pill: its padding hangs out to the left (ml(-inset)) so the
// text keeps its column, the chevron flips while open, and the menu's left edge lines up
// with the pill rather than the text. Use this for every pill-style dropdown.
export const PILL = Object.freeze({ inset: 6, menuShift: 8 });
export function pillChevron(open, size = U.smallIcon) {
  return svg(`mods/custom-workspace-chrome/chevron-${open ? 'up' : 'down'}.svg`).size(size).flex_none();
}
// `hover`: a stronger fill where the pill sits on a card (t.hover is tuned for the chrome).
export function pillTrigger(t, id, { label, open, children = [], chevronSize = U.smallIcon, hover = t.hover }) {
  return div().id(id).flex().h(U.control).px(PILL.inset).ml(-PILL.inset).gap(6).items_center().rounded(U.radius)
    .text_color(t.muted).cursor_pointer().hover(e => e.bg(hover))
    .role('button').accessibility_label(label)
    .children(children).child(pillChevron(open, chevronSize));
}
// The popover anchors to the trigger's layout box, not its hanging padding: pull the menu back.
// Pass the result to dropdown(): dropdown(id, pillTrigger(...), pillMenu(menu), options).
export function pillMenu(menu) {
  return menu.ml(-PILL.menuShift);
}
export function hotkey(value) {
  return String(value ?? "").trim().split(/\s+/).map(stroke => {
    const parts = stroke.replace(/\+/g, "-").split("-");
    // Uppercase letters in native bindings imply Shift; make it explicit.
    if (!stroke.includes("+") && /^[A-Z]$/.test(parts.at(-1)) && !parts.some(p => p.toLowerCase() === "shift")) parts.splice(-1, 0, "shift");
    return parts.join("-").toLowerCase();
  }).join(" ");
}
export function field(t, element, focused = false) {
  return control(t, element).px(U.gutter).border_color(focused ? t.input : t.border);
}
// One search treatment for Jump, font menus and worktree filtering.
export function searchField(t, state, { id, focused = false, onClear } = {}) {
  const filled = Boolean(state.value());
  return field(t, div(), focused).when(Boolean(id), e => e.id(id)).pr(4).flex().items_center().gap(U.gap).cursor_text()
    .on_mouse_down("left", (_e, cx) => { cx.stop_propagation(); state.focus(); })
    .child(slot(svg("mods/custom-workspace-chrome/search.svg").size(U.icon).text_color(t.muted)))
    .child(Input.new(state).flex_1().min_w(0).h_full().text_size(U.font).text_color(t.foreground))
    // Keep the trailing rail even when empty, so clearing never moves the editor.
    .child(filled ? iconButton(t, { id: `${id ?? 'search'}-clear`, icon: 'mods/custom-pane/close.svg', label: 'Clear search', tooltip: 'Clear search', color: t.muted,
      onClick: (_e, cx) => { state.set_value(''); onClear?.(); state.focus(); cx.notify(); } }) : div().size(U.insetControl).flex_none());
}
export function searchHeader(t, state, { id, fieldId, focused = false, onClear } = {}) {
  return div().when(Boolean(id), e => e.id(id)).w_full().flex_none().p(U.gutter).border_b(1).border_color(t.border)
    .child(searchField(t, state, { id: fieldId, focused, onClear }));
}
// One empty-state component for lists, pickers and panels. Match Herdr's quiet
// confirmation copy: regular muted text, no final period, consistent icon/spacing.
// `loading` shows the refresh glyph turning. Its drawing fills more of its box than the
// search glyph, so it is drawn smaller to look the same size.
export const LOADING_ICON_SIZE = 20;
export function emptyState(t, { id, title = 'No results', icon = 'mods/custom-workspace-chrome/search.svg', loading = false } = {}) {
  return div().when(Boolean(id), e => e.id(id)).size_full().min_h(0).flex().flex_col().items_center().justify_center()
    .px(24).gap(U.gap).text_center()
    // The margin keeps the smaller loading glyph in the same 24px footprint.
    .child(svg(icon).size(loading ? LOADING_ICON_SIZE : 24).flex_none().text_color(t.dim).when(loading, e => e.m((24 - LOADING_ICON_SIZE) / 2).spin(1000)))
    .child(div().text_size(U.font).font_normal().text_color(t.muted).child(String(title).trimEnd().replace(/\.+$/, '')));
}
export function menuHeading(t, text, element = div()) {
  return element.text_size(11).text_color(t.dim).child(text);
}
export function groupHeading(t, text, element = div()) {
  return element.text_size(U.font).font_semibold().text_color(t.foreground).when(text != null, e => e.child(text));
}
export function textButton(t, id, label, icon, onClick, { color = t.working, enabled = true } = {}) {
  return div().id(id).h(U.field).px(8).flex_none().flex().gap(5).items_center().justify_center().rounded(U.radius)
    .role("button").accessibility_label(label).text_size(U.font).text_color(color).cursor_pointer().disabled(!enabled)
    .when(!enabled, e => e.opacity(0.4)).when(enabled, e => e.hover(s => s.bg(interactionFill(t))))
    .on_click((e, cx) => { cx.stop_propagation(); if (enabled) onClick(e, cx); })
    .when(Boolean(icon), e => e.child(svg(icon).size(U.smallIcon))).child(label);
}
export function button(t, id, label, onClick, { primary = false, danger = false, enabled = true } = {}) {
  return control(t).id(id).px(U.gutter).flex().items_center().justify_center().role("button").cursor_pointer().font_medium()
    .disabled(!enabled).when(!enabled, e => e.opacity(0.4))
    .when(primary && !danger, e => e.bg(t.solid).border_color(t.solid).text_color(t.solid_foreground))
    .when(danger, e => e.bg(t.ansi1).border_color(t.ansi1).text_color("#ffffff"))
    .when(enabled, e => e.hover(s => primary || danger ? s.opacity(0.88) : s.bg(t.hover)))
    // Stop the press as well as the click: a button inside a reorderable card must not arm the
    // card's drag, whose release would then be swallowed by this click (see reorder.js `card`).
    .on_mouse_down('left', (_e, cx) => cx.stop_propagation())
    .on_click((e, cx) => { cx.stop_propagation(); if (enabled) onClick(e, cx); }).child(label);
}
// Dialogs share a title rail and a close action at the window's top-right.
export function dialogHeader(t, title, close, tools) {
  return div().id("dialog-header").relative().w_full().h(48).flex_none().pl(16).pr(8).flex().items_center().gap(8).border_b(1).border_color(t.border)
    .child(div().id("dialog-title").flex_1().text_size(16).font_semibold().text_color(t.foreground).child(title))
    .when(Boolean(tools), e => e.child(tools))
    .child(div().id("dialog-close").size(U.control).flex_none().flex().items_center().justify_center().rounded(U.radius)
      .role("button").accessibility_label("Close").text_color(t.muted)
      .hover(e => e.bg(interactionFill(t)).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(close)
      .child(svg("mods/custom-pane/close.svg").size(U.smallIcon)));
}
// Shared geometry for inputs, dropdown triggers, buttons and steppers.
export function control(t, element = div()) {
  return element.h(U.field).flex_none().rounded(U.radius).border_1().border_color(t.border)
    .bg(t.surface).text_size(U.font).text_color(t.foreground);
}
// Selected hover stays visibly selected instead of reverting to ordinary hover.
// Blend semantic colors so this also follows theme-picker overrides.
export function itemHover(t, selected) {
  if (!selected) return t.hover;
  const rgb = color => /^#[0-9a-f]{6}$/i.test(color ?? "")
    ? [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)) : null;
  const bg = rgb(t.selected), fg = rgb(t.foreground);
  if (!bg || !fg) return t.selected;
  return "#" + bg.map((c, i) => Math.round(c * 0.94 + fg[i] * 0.06).toString(16).padStart(2, "0")).join("");
}
export function chevron(t, open) {
  return svg(`mods/custom-workspace-chrome/chevron-${open ? "down" : "right"}.svg`).size(U.smallIcon).flex_none().text_color(t.dim);
}
// Machine and repository sections share the same shell and trailing chevron.
// Callers own click/hover guards and persistence; compact machines retain their icon.
export function sidebarSectionHeader(t, { id, label, open, compact = false, children = [] }) {
  return div().id(id).h(U.control).flex_none().flex().pl(compact ? 0 : 8).pr(compact ? 0 : 4)
    .gap(U.gap).items_center().rounded(U.radius).text_size(U.meta).text_color(t.muted)
    .role('button').accessibility_label(`${open ? 'Collapse' : 'Expand'} ${label}`)
    .when(compact, el => el.w(U.control).self_center().justify_center())
    .children(children)
    .when(!compact, el => el.child(slot(chevron(t, open))));
}
// Mixes two #rrggbb theme colors (b's share = amount), so blends follow every theme.
export function blend(a, b, amount) {
  const rgb = c => /^#[0-9a-f]{6}/i.test(c ?? "") ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : null;
  const x = rgb(a), y = rgb(b);
  return x && y ? "#" + x.map((v, i) => Math.round(v * (1 - amount) + y[i] * amount).toString(16).padStart(2, "0")).join("") : a;
}
// Hover on a card: t.hover is tuned for the darker chrome and barely shows on a card, so
// add the status bar's step (t.hover − t.chrome) to whatever the row sits on instead.
export function raisedHover(t, base = t.surface) {
  const rgb = c => /^#[0-9a-f]{6}/i.test(c ?? "") ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : null;
  const on = rgb(base), hover = rgb(t.hover), chrome = rgb(t.chrome);
  if (!on || !hover || !chrome) return t.hover;
  return "#" + on.map((v, i) => Math.max(0, Math.min(255, v + hover[i] - chrome[i])).toString(16).padStart(2, "0")).join("");
}
// The panel an open collapsible draws behind its header and body: `tint` of the way from the
// card it sits on (`on`) toward the other base color (0.5 = halfway, 1 = all the way), so
// it reads on light and dark cards alike. A dark card needs more to stand out.
export const collapsiblePanel = (t, on = t.surface, tint = 0.5) => blend(on, on === t.background ? t.surface : t.background, tint);
export const COLLAPSE_MOTION = 180; // expand/collapse ms
// A collapsible section. Closed, it is one row: the title, then `trailing` (a count, a
// status, tools). Open, the header and its body share one panel that fades in behind both,
// so they read as one block. `chevron` places the arrow: "start" (right/down, before the
// title) or "end" (down/up, in a control-sized box after `trailing`).
// The block bleeds `inset` px past its parent on both sides, so the closed title lines up
// with the text around it; the header and body keep `inset` px inside the panel.
// `tint` sets how strongly the panel differs from `on`; `panel` gives an exact color instead.
// `bodyHeight` (the body's content height, when the caller knows it) lets the body slide
// open; without it the body simply appears. Ids: `${id}` block, `${id}-toggle` header,
// `${id}-panel`, `${id}-chevron`, `${id}-body`. A collapsed body without `bodyHeight` is
// not rendered.
// Rows people click to open or expand something (Look > Statusbar > Left sidebar, a plugin's
// page rows, every collapsible header: plugin sections, Usage's Resets) share one height,
// so they read as one control.
export const SETTINGS_ROW = U.field;
// The clickable row shell: hover fill bleeds 8px left; on the right it stops where a
// trailing chevron's visible glyph ends (Lucide's chevron leaves its right third blank).
// `tall`: the row has a description under its label and sizes to it instead.
export function settingsRow(t, id, { label, tall = false } = {}) {
  // The hover reaches 8px past the content on both sides, like a section header's; the
  // chevron (chevronSlot) ends at the content edge, under the section's own chevron.
  return div().id(id).flex().items_center().w_auto().self_stretch().ml(-8).mr(-8).flex_none()
    .px(8).when(tall, el => el.py(6)).when(!tall, el => el.h(SETTINGS_ROW)).gap(U.gap).rounded(U.radius)
    .cursor_pointer().hover(el => el.bg(t.hover)).role("button").accessibility_label(label);
}
// The chevron at the right edge of a row: a collapsible section's (up/down) and a row that opens
// a page (right) share it, so every one in a column sits on the same centre at the same size.
export function chevronSlot(t, direction, id = null) {
  return div().when(Boolean(id), el => el.id(id)).size(U.control).flex_none().flex().items_center().justify_center().text_color(t.muted)
    .child(svg(`mods/custom-workspace-chrome/chevron-${direction}.svg`).size(U.smallIcon));
}
export function collapsible(t, { id, title, open, onToggle, chevron: side = "start", trailing = null, label = null,
  height = SETTINGS_ROW, on = t.surface, tint = 0.5, panel: fill = null, inset = 8, bodyInset = inset, bodyPadY = 4, bodyGap = 2, bodyHeight: givenHeight = null, measured = null, zoom = 1 }, body) {
  const panel = fill ?? collapsiblePanel(t, on, tint);
  // A body slides open and shut when its height is known: given (Usage's Resets), or
  // `measured`, an object the caller keeps: the body is then laid out even while closed (in
  // the zero-height clip) and reports its height there, so the first open slides too.
  const measuring = givenHeight === null && measured && typeof measured === "object";
  const bodyHeight = givenHeight ?? (measuring ? measured[id] ?? 0 : null);
  const arrow = side === "end"
    ? chevronSlot(t, open ? "up" : "down", `${id}-chevron`)
    : svg(`mods/custom-workspace-chrome/chevron-${open ? "down" : "right"}.svg`).size(U.smallIcon).flex_none().text_color(t.muted);
  const header = div().id(`${id}-toggle`).flex().items_center().w_full().h(height).gap(side === "end" ? 8 : 6)
    .px(inset).rounded(U.radius).cursor_pointer()
    .hover(e => e.bg(raisedHover(t, open ? panel : on)))
    .role("button").accessibility_label(label ?? `${open ? "Collapse" : "Expand"} ${title}`)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click(onToggle)
    .when(side !== "end", el => el.child(arrow))
    .child(div().flex_1().min_w(0).truncate().text_size(U.font).text_color(t.foreground).child(title))
    .when(Boolean(trailing), el => el.child(trailing))
    .when(side === "end", el => el.child(arrow));
  const content = () => div().id(`${id}-body`).flex().flex_col().w_full().px(bodyInset).pt(bodyPadY).pb(bodyPadY).gap(bodyGap)
    .when(measuring, el => el.flex_none().on_size_change((size, cx) => {
      // Native measurements are window px; h()/padding are logical px. Feeding a
      // scaled height back into the clip leaves a zoom-sized tail in every section.
      const next = Math.max(0, Math.round((size?.height ?? 0) / zoom - 2 * bodyPadY));
      if (measured[id] !== next) { measured[id] = next; cx.notify(); }
    }))
    .child(body());
  // The panel stays declared while closed: a transition only runs from a value it has seen.
  return div().id(id).relative().flex().flex_col().mx(-inset)
    .child(div().id(`${id}-panel`).absolute().inset_0().rounded(U.radius).bg(panel)
      .opacity(open ? 1 : 0).transition("opacity", { duration: COLLAPSE_MOTION, easing: "ease-out" }))
    .child(header)
    // A known height slides: the clip has no padding (at height 0 nothing may show).
    .when(bodyHeight !== null, el => el.child(div().id(`${id}-clip`).overflow_hidden()
      .h(open ? bodyHeight + 2 * bodyPadY : 0).transition("height", { duration: COLLAPSE_MOTION, easing: "ease-out" })
      .child(content())))
    .when(bodyHeight === null && open, el => el.child(content()));
}
export function badge(label, fill, foreground = "#ffffff") {
  return div().size(U.icon).flex_none().rounded(4).bg(fill).flex().items_center().justify_center()
    .text_size(10).font_medium().text_color(foreground).child(label);
}
// A small text pill after a profile name (its launch role). Presentation only.
// `status`: the same shape as an agent row's "Needs you" pill (18px, semibold, tinted fill), in a
// neutral grey, for tags at a sidebar row's right edge.
export function rolePill(t, label, { status = false } = {}) {
  if (status) return div().flex_none().px(6).h(18).rounded(5).bg(`${t.muted}26`).text_size(10.5).font_semibold()
    .text_color(t.muted).flex().items_center().child(label);
  return div().flex_none().h(16).px(5).rounded(4).border_1().border_color(t.border).flex().items_center()
    .text_size(10).font_medium().text_color(t.muted).child(label);
}
// The role as an action on a menu row (start that profile in the role), drawn like Settings ›
// Plugins' row buttons (Check): bordered surface, 24px, 12px medium text. Its click is its
// own: the row's click (the plain launch) never fires with it.
export function rolePillButton(t, { id, label, tooltip = null, enabled = true, onClick }) {
  return control(t).id(id).h(24).min_h(24).max_h(24).px(10).flex().items_center().justify_center()
    .whitespace_nowrap().text_size(12).font_medium().child(label)
    .role('button').accessibility_label(tooltip ?? label)
    .when(Boolean(tooltip), el => el.tooltip(tooltip))
    .when(enabled, el => el.cursor_pointer().hover(s => s.bg(t.hover)))
    .when(!enabled, el => el.opacity(0.4))
    .on_mouse_down('left', (_e, cx) => cx.stop_propagation())
    .on_click((e, cx) => { cx?.stop_propagation(); if (enabled) onClick(e, cx); });
}
export const ROLE_LABELS = Object.freeze({ firstmate: 'Crew' });
// The pill that starts a profile in its role (+ menu, Start page).
export const ROLE_ACTIONS = Object.freeze({ firstmate: 'Start Crew' });
// Glyph and hit target are separate. Fixed slots preserve the text rail even
// for different program logos and while hover-only actions appear.
export function slot(child, size = U.icon) {
  return div().size(size).flex_none().flex().items_center().justify_center().child(child);
}
export function action(child, size = U.control) {
  return div().size(size).flex_none().flex().items_center().justify_center().child(child);
}
