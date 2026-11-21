// Shared parent-section navigation. Visible text and accessibility always derive
// from one parent name; callers supply navigation, never a separate button label.
import { div, svg } from 'gpui-kit';
import { h_flex, ScrollHandle } from 'gpui-base';
import { U } from './ui.js';
const PADDING = 8, ICON_GAP = 4;
export const SETTINGS_BACK_LABEL_INSET = PADDING + U.smallIcon + ICON_GAP;
export function settingsBackButton(owner, t, {id, parent, onBack}) {
  if (typeof parent !== 'string' || !parent.trim()) throw Error('Settings navigation requires a parent section name.');
  const destination = parent.trim();
  return h_flex().id(id).h(U.field).px(PADDING).gap(ICON_GAP)
    .flex_none().items_center().rounded(U.radius).text_size(U.font).text_color(t.muted)
    .cursor_pointer().role('button').accessibility_label(`Back to ${destination}`)
    .hover(el => el.bg(t.hover).text_color(t.foreground))
    .on_mouse_down('left', (_e, cx) => cx.stop_propagation())
    .on_click((_e, cx) => { onBack(cx); owner.handle?.focus(); cx.notify(); })
    .child(svg('mods/custom-workspace-chrome/chevron-left.svg').size(U.smallIcon).flex_none())
    .child(div().id(`${id}-label`).child(destination));
}

// Scroll position per navigation depth. A scroll area's own position lives only
// while it is drawn, so opening a subpage would drop the parent's and Back (the
// button or Escape) would land at the top. Each depth instead tracks a handle
// that outlives the frame: the parent keeps its offset while a subpage is open,
// and every newly opened subpage starts at the top.
// Call in init(); then attach .track_scroll(settingsPageScroll(owner, subpage)).
export function initSettingsPageScroll(owner) {
  owner.settingsPageScroll = { parent: ScrollHandle.new(), child: ScrollHandle.new(), open: null };
}
/** `subpage` is a stable key for the open subpage, or null on a parent page. */
export function settingsPageScroll(owner, subpage) {
  if (!owner.settingsPageScroll) initSettingsPageScroll(owner);
  const scroll = owner.settingsPageScroll, key = subpage || null;
  // The page's only direct child is its content stack: revealing it from below
  // scrolls to the top; a page that fits stays put.
  if (key && key !== scroll.open) scroll.child.scroll_to_item(0);
  scroll.open = key;
  return key ? scroll.child : scroll.parent;
}
