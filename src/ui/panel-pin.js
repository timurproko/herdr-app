import { svg } from 'gpui-kit';
import { Toggle } from 'gpui-base';
import { U, subtleActionFill, itemHover } from './ui.js';
import { panelTab, panelPinned, togglePanelPin } from './panel-state.js';

export function panelPin(t,{id,enabled}) {
  const tab = panelTab(), pinned = panelPinned(tab), active = Boolean(enabled && tab);
  return Toggle.new(id).pressed(pinned).size(U.insetControl).flex_none().flex().items_center().justify_center().rounded(U.insetRadius)
    .accessibility_label(pinned ? 'Unpin right sidebar for this tab' : 'Pin right sidebar for this tab')
    .disabled(!active).border_1().border_color(pinned ? t.input : '#00000000')
    .bg(pinned ? t.selected : '#00000000').text_color(pinned ? t.foreground : t.dim)
    .when(active, el => el.cursor_pointer().hover(s => s.bg(pinned ? itemHover(t,true) : subtleActionFill(t))))
    .on_mouse_down('left',(_e,cx)=>cx.stop_propagation())
    .on_change((on,cx)=>{cx.stop_propagation();if(active && on !== pinned)togglePanelPin(tab,on);})
    .child(svg('mods/custom-workspace-chrome/panel-pin.svg').size(U.smallIcon));
}
