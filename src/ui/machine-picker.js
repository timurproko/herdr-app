// Shared header machine selector; choosing context never selects a space/session.
import { div, svg } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { machines } from './host.js';
import { U, control, dropdown, menuSurface, menuRow } from './ui.js';
export function machinePicker(t,{id,selected,open,focus,onOpen,onSelect,disabled=false}) {
 const hosts=[...machines()];if(!hosts.some(m=>m.name===null))hosts.unshift({name:null,layout:'ready'});
 const bulb=m=>div().size(U.statusSize).flex_none().rounded_full().bg(m?.layout==='ready'?t.done:t.dim);
 const trigger=control(t,h_flex()).id(id).w(150).px(10).gap(6).items_center().disabled(disabled)
  .role('button').accessibility_label('Settings machine')
  .when(!disabled,e=>e.cursor_pointer()).when(disabled,e=>e.opacity(0.4).tooltip('Finish editing before switching machines.'))
  .child(bulb(hosts.find(m=>m.name===selected))).child(div().flex_1().min_w(0).truncate().child(selected??'This computer'))
  .child(svg('mods/custom-workspace-chrome/chevron-down.svg').size(U.smallIcon).text_color(t.muted));
 // A disabled trigger must not retain a focusable/clickable dropdown wrapper.
 if(disabled)return trigger;
 // The shared popup-menu row (ui.js): the machine's bulb, its name, a tick on the chosen one.
 const list=menuSurface(t,v_flex()).w(200).track_focus(focus).children(hosts.map(m=>menuRow(t,{id:`${id}-${m.name??'local'}`,icon:bulb(m),label:m.name??'This computer',
  enabled:!disabled,onClick:(_e,cx)=>onSelect(m.name,cx),trailing:m.name===selected?svg('mods/custom-workspace-chrome/check.svg').size(U.smallIcon).text_color(t.muted):null})));
 return dropdown(`${id}-popup`,trigger,list,{open:open&&!disabled,focus,onOpen:(next,cx)=>{if(!disabled||!next)onOpen(next,cx);}});
}
