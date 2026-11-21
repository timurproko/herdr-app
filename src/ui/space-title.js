// Space names are content labels, not semibold dialog/group headings.
import { div } from 'gpui-kit';
import { U } from './ui.js';
export function spaceTitle(t,space,element=div()) {
  return element.text_size(U.font).font_normal().text_color(space.active?t.foreground:t.muted)
    .when(typeof space.directory==='string',e=>e.tooltip(space.directory));
}
