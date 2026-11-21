// Identical glyph geometry and text-metric context in tabs, pane headers and sidebar.
import { div, svg, image } from 'gpui-kit';
import { U } from './ui.js';
export function programIcon(program, color) {
  return div().size(U.icon).flex_none().flex().items_center().justify_center()
    .text_size(U.font).text_color(color)
    .when(Boolean(program?.icon), e => e.child(program.tint
      ? svg(program.icon).size(U.icon).flex_none().text_color(color)
      : image(program.icon).size(U.icon).flex_none()));
}
