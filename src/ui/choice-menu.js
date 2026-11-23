// Pure account-style choice presentation. Callers own loading, scope and selection.
import { div, svg } from 'gpui-kit';
import { U, PILL, menuSurface, menuRow, dropdown, pillTrigger, pillMenu } from './ui.js';

export function choiceDropdown(t, { id, popupId = `${id}-popup`, label, content, open, focus, onOpen,
  rows = [], index = 0, onKeyDown, messages = [], edge = false }) {
  const trigger = pillTrigger(t, id, { label, open, children: content, chevronSize: 12 })
    .when(edge, el => el.mr(-PILL.inset))
    // Native Popover opens on its wrapper's left mouse-down; let that press bubble.
    .on_mouse_down('right', (_e, cx) => cx.stop_propagation());
  const menu = menuSurface(t).min_w(180).max_w(360).max_h(280).flex().flex_col().overflow_y_scroll().track_focus(focus)
    .on_key_down(onKeyDown)
    .children(messages.map(message => div().px(8).py(6).text_color(t.muted).child(message)))
    .children(rows.map((row, at) => menuRow(t, { ...row, highlighted: at === index,
      trailing: div().size(U.smallIcon).flex_none()
        .when(Boolean(row.selected && row.selectedIcon), el => el.child(svg(row.selectedIcon).size(U.smallIcon))) })));
  return dropdown(popupId, trigger, pillMenu(menu), { above: true, open, focus, onOpen });
}
