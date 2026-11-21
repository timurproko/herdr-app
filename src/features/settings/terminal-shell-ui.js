import { div, svg } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { U, control, dropdown, menuSurface } from './ui.js';
import { profileConfig, cachedTerminalShells, warmTerminalShells, selectTerminalShell, composeTerminals, selectedTerminal, loadTerminalShells } from './profiles.js';

export function initTerminalShells(owner,cx) {
  owner.profileShells=[];owner.profileShellMachine=owner.profileMachine;owner.profileShellOpen=false;owner.profileShellLoading=false;
  owner.profileShellFocus=cx.focus_handle();
}
export function reloadTerminalShells(owner,cx,serial,force=false) {
  const machine=owner.profileMachine,cached=cachedTerminalShells(machine);
  if(machine!==owner.profileShellMachine||cached.length)owner.profileShells=cached;
  owner.profileShellMachine=machine;owner.profileShellLoading=force||owner.profileShells.length===0;
  cx.spawn(async cx=>{
    const list=await (force?loadTerminalShells(machine):warmTerminalShells(machine));
    if(serial!==owner.profileSerial||machine!==owner.profileMachine)return;
    owner.profileShells=list;owner.profileShellLoading=false;cx.notify();
  });
}
export function terminalShellRow(owner,t,reload) {
  const machine=owner.profileMachine,override=profileConfig(machine).overrides.terminal??{};
  const installed=composeTerminals(machine,owner.profileShells);
  const chosen=selectedTerminal(machine,installed);
  const label=override.command?(chosen?.name??'Custom command'):'Default';
  const options=[{key:null,name:'Default',source:'Use this machine’s configured default shell'},...installed];
  const trigger=control(t,h_flex()).id('st-terminal-shell').w(200).px(U.gutter).gap(8).items_center().cursor_pointer()
    .child(div().flex_1().min_w(0).truncate().child(label))
    .child(svg('mods/custom-workspace-chrome/chevron-down.svg').size(U.smallIcon));
  const menu=menuSurface(t,v_flex()).id('st-terminal-shell-options').w(300).max_h(320).overflow_y_scrollbar()
    .children(options.map((p,i)=>h_flex().id(`st-terminal-shell-${i}`).h(44).flex_none().px(8).gap(8).items_center().cursor_pointer().hover(e=>e.bg(t.hover))
      .on_click((_e,cx)=>{
        if(machine!==owner.profileMachine)return;
        try{selectTerminalShell(machine,p.key===null?null:p);owner.profileShellOpen=false;reload(owner,cx);}catch{owner.profileError='Could not save this shell choice.';}
        cx.notify();
      })
      .child(v_flex().flex_1().min_w(0).child(div().truncate().child(p.name)).child(div().text_size(11).text_color(t.dim).truncate().child(p.source)))
      .when(p.key===(chosen?.key??(!override.command?null:undefined)),e=>e.child(svg('mods/custom-settings/check.svg').size(U.smallIcon)))))
    .when(owner.profileShellLoading,e=>e.child(div().px(8).py(6).text_size(U.meta).text_color(t.dim).child('Checking available shells…')));
  const picker=dropdown('st-terminal-shell-popup',trigger,menu,{open:owner.profileShellOpen,focus:owner.profileShellFocus,onOpen:(open,cx)=>{owner.profileShellOpen=open;cx.notify();}});
  return owner.row(t,'Default terminal','',picker);
}
