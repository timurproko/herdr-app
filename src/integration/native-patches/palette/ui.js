import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, v_virtual_list, VirtualListScrollHandle, Scrollbar } from "gpui-base";
import { keys, shared } from "./host.js";
import { searchHeader, hotkey, menuHeading, dialogSurface, emptyState, dialogScrollFrame, dialogScrollbar, dialogScrollRow } from "./custom-ui.js";
import { isCustom, liveTheme, ensureNativeSelection } from "./custom-look.js";
import { paletteCommand } from "./custom-routing.js";
import { bottomFade } from "./custom-scroll-fade.js";
const SHOWN = 10, ROW_H = 32, HEAD_H = 26;
export function paletteItems(rows, searching) {
  const items = [];
  if (searching && rows.length) items.push({ id: 'head:results', head: `${rows.length} item${rows.length === 1 ? '' : 's'}`, gap: 0 });
  rows.forEach((r, i) => {
    if (!searching && (i === 0 || r.head !== rows[i - 1].head)) items.push({ id: `head:${r.head}`, head: r.head, gap: items.length ? 8 : 0 });
    items.push({ id: r.e.id, e: r.e, hits: r.hits, index: i });
  });
  return items;
}
export function paletteHeading(items, first = 0) {
  for (let i = Math.min(Math.max(0, first), items.length - 1); i >= 0; i--) if (items[i].head) return items[i].head;
  return null;
}


export const active = isCustom;
export function reset() {
  if (!active()) return;
  this.visibleRange = null; this.pinnedHead = null; this.pendingHead = null;
  this.moreBelow = true; this.pendingMore = null; this.listScroll?.scroll_to_item(0);
}
export function init(cx) {
  if (!active()) return;
  ensureNativeSelection(cx); reset.call(this);
  this.listScroll = VirtualListScrollHandle.new(); this.inputFocused = true;
  this.input.on('focus', (_e,cx) => { this.inputFocused = true; ensureNativeSelection(cx); cx.notify(); });
  this.input.on('blur', (_e,cx) => { this.inputFocused = false; cx.notify(); });
  this.headingSync = cx.timer.every(32, cx => {
    if (!active() || this.pendingHead === null) return;
    const more = this.pendingMore ?? this.moreBelow;
    if (this.pendingHead === this.pinnedHead && more === this.moreBelow) return;
    this.pinnedHead = this.pendingHead; this.moreBelow = more; cx.notify();
  });
}
export function close() { this.headingSync?.cancel(); }
export function entries(native) {
  if (!active() || shared('custom.plugins')?.usage?.enabled === false) return native;
  const entry = { name: 'mod.open', args: { name: 'custom-usage' }, group: 'App', title: 'Usage', words: 'quota limits account credits remaining' };
  entry.id = `${entry.name}:${JSON.stringify(entry.args)}`;
  return native.some(e => e.id === entry.id) ? native : [...native,entry];
}
export function dispatch(entry, run, native) {
  const target = paletteCommand(entry,active());
  return target.name === entry.name && target.args === entry.args ? native() : run(target.name,target.args);
}
export const render = function({keyOf,keyParts}) {
    const t = liveTheme(), rows = this.rows(), bound = keys();
    this.at = Math.min(this.at, Math.max(0, rows.length - 1));
    const searching = Boolean(this.query.trim());
    const items = paletteItems(rows, searching);
    const sizes = items.map(r => r.head ? HEAD_H + r.gap : ROW_H);
    const total = sizes.reduce((sum, height) => sum + height, 0);
    const overflow = total - (this.listHeight ?? 343) > 1;
    const heading = searching ? items[0]?.head : this.pinnedHead ?? paletteHeading(items);
    const key = k => h_flex().gap(3).children(keyParts(hotkey(k)).map(p => div().px(5).rounded(4).border_1().border_color(t.border).bg(t.raised).text_size(11).text_color(t.dim).child(p)));
    return dialogSurface(t, v_flex(), { nativeFrame: true }).id("palette").track_focus(this.handle).relative().w_full().h(408).min_h(0).overflow_hidden()
      .on_key_down((e, cx) => {
        if (e.key === "escape") { cx.stop_propagation(); return this.close(); }
        if (!rows.length && ['down', 'up', 'pagedown', 'pageup'].includes(e.key)) { cx.stop_propagation(); return; }
        if (e.key === "down") this.at = Math.min(this.at + 1, rows.length - 1);
        else if (e.key === "up") this.at = Math.max(this.at - 1, 0);
        else if (e.key === "pagedown") this.at = Math.min(this.at + SHOWN, rows.length - 1);
        else if (e.key === "pageup") this.at = Math.max(this.at - SHOWN, 0);
        else return;
        const index = items.findIndex(r => r.e?.id === rows[this.at]?.e.id);
        if (index >= 0 && (!this.visibleRange || index <= this.visibleRange.start + 1 || index >= this.visibleRange.end - 1)) this.listScroll.scroll_to_item(index, "center");
        cx.stop_propagation(); cx.notify();
      })
      .child(searchHeader(t, this.input, { id: "palette-search-header", fieldId: "palette-search", focused: this.inputFocused,
        onClear: () => { this.query = ''; this.at = 0; this.visibleRange = null; this.pinnedHead = null; this.pendingHead = null; this.moreBelow = true; this.pendingMore = null; this.listScroll.scroll_to_item(0); } })
        .absolute().top(0).left(0).right(0).h(57).bg(t.popover))
      .child(dialogScrollFrame(div()).id("palette-list-frame").absolute().top(57).bottom(0).left(0).right(0).mb(0)
        .on_size_change((size, cx) => {
          if (size.height > 0 && Math.abs(size.height - (this.listHeight ?? -1)) > 0.5) {
            this.listHeight = size.height; cx.notify();
          }
        })
        .on_scroll_wheel((_e, cx) => cx.stop_propagation())
        .when(!items.length, el => el.child(emptyState(t, { id: 'palette-empty' })))
        .when(Boolean(items.length), el => el
          .child(v_virtual_list("palette-native-rows", items.length, sizes,
            i => items[i].id,
            range => {
              this.visibleRange = range;
              this.pendingHead = paletteHeading(items, range.start);
              this.pendingMore = range.end < items.length;
              return items.slice(range.start, range.end).map(r => {
                if (r.head) return dialogScrollRow(menuHeading(t, r.head, h_flex())).text_color(t.foreground).id(r.id).h(HEAD_H + r.gap).px(8).pt(r.gap).pb(4).items_end();
                const on = r.index === this.at, k = keyOf(r.e, bound);
                return dialogScrollRow(h_flex()).id(`pl-${r.index}`).h(ROW_H).px(8).gap(10).items_center().rounded(6).cursor_pointer().text_size(13)
                  .when(on, e => e.bg(t.selected)).hover(e => e.bg(t.hover))
                  .child(div().flex_1().min_w(0).child(this.title(t, r.e.title, r.hits, on)))
                  .when(searching, e => e.child(div().text_size(11.5).text_color(t.dim).child(r.e.group)))
                  .when(Boolean(k), e => e.child(key(k)));
              });
            }).size_full().track_scroll(this.listScroll)
            .on_item_click((id, cx) => { const entry = this.rows().find(r => r.e.id === id)?.e; if (entry) this.go(entry); }))
          // Opaque fixed heading over the scrolling rows.
          // Inline group headers still introduce upcoming sections below it.
          .child(menuHeading(t, heading, h_flex()).id('palette-pinned-heading').absolute().top(0).left(0).right(8).h(HEAD_H)
            .px(8).pb(4).items_end().bg(t.popover).text_color(t.foreground)
            .on_mouse_down('left', (_e, cx) => cx.stop_propagation())
            .on_click((_e, cx) => cx.stop_propagation()))
          .when(overflow && this.moreBelow, frame => frame.child(bottomFade(this, 'palette-list', t.popover, { left: 0, right: 8 })))
          // Paint/hit-test the native rail last: headings and fade must not cover it.
          .child(dialogScrollbar(Scrollbar.vertical("palette-native-rows").scroll_size(0, total).viewport_from_layout()))));
  };
