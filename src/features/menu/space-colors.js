// Client presentation only; automatic is a palette option, not another menu row.
import { div, svg } from 'gpui-kit';
import { h_flex } from 'gpui-base';
import { U, spaceBadgeColor } from './ui.js';
import { SPACE_COLORS, COLOR_COUNT, currentSpaceColor, selectedColorIndex, colorAt, setSpaceColor } from './space-color-state.js';
export { SPACE_COLORS, COLOR_COUNT, currentSpaceColor, selectedColorIndex, colorAt, setSpaceColor };
export function spaceColorPicker(owner, t, id) {
  const selected = selectedColorIndex(id);
  // 8 * 22 + 7 * 1 + 2 * 3 = 189px, inside the 200px menu's 190px inner width.
  return h_flex().id('space-color-picker').h(U.row).px(3).gap(1).items_center()
    .children(SPACE_COLORS.map((c, i) => div().id(`space-color-${i}`).size(22).flex_none().rounded_full()
      .flex().items_center().justify_center().cursor_pointer().role('button')
      .accessibility_label(`${c.name} icon color${selected === i ? ', selected' : ''}`).tooltip(c.name)
      .border_1().border_color(selected === i ? t.foreground : '#00000000')
      .when(owner.colorAt === i, e => e.bg(t.hover)).hover(e => e.bg(t.hover))
      .on_hover((on, cx) => { if (on) { owner.at = -1;owner.colorAt = -1;cx.notify(); } })
      .on_mouse_down('left', (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation();owner.chooseColor(c.value, cx); })
      .child(c.value === null ? svg('mods/custom-menu/automatic.svg').size(16).text_color(selected === i ? t.foreground : t.muted)
        : div().size(16).rounded_full().bg(spaceBadgeColor(t, { id }, { [id]: c.value })))));
}
