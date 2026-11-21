import { div, svg } from 'gpui-kit';
import { h_flex, v_flex, InputState, Input, Popup } from 'gpui-base';
import { settings } from './host.js';
import { U, slot, control, description, subtleActionFill, iconButton, startRefreshFeedback, emptyState } from './ui.js';
import { sectionRow, sectionStack } from './modal-layout.js';
import { cancelProfileDrag } from './profile-drag.js';
import { cancelTerminalDrag, terminalDragValid, startTerminalDrag, overTerminalDrag, finishTerminalDrag } from './terminal-drag.js';
import { cachedTerminalShells, composeTerminals, selectedTerminal, updateTerminal, moveTerminal, validateTerminal } from './profiles.js';
import { initTerminalShells, reloadTerminalShells, terminalShellRow } from './terminal-shell-ui.js';

export function initTerminals(owner,cx){
  initTerminalShells(owner,cx);
  owner.profileShells=cachedTerminalShells(owner.profileMachine);
  owner.terminalEdit=null;owner.terminalError=null;owner.terminalDraft={};cancelTerminalDrag(owner);
  owner.terminalName=InputState.new({placeholder:'Terminal name'});
  owner.terminalCommand=InputState.new({placeholder:'Executable name or full path'});
  owner.terminalArgs=InputState.new({placeholder:'[]'});
  for(const input of [owner.terminalName,owner.terminalCommand,owner.terminalArgs]){
    input.on('change',(_e,cx)=>{owner.terminalError=null;cx.notify();});
    input.on('submit',(_e,cx)=>saveTerminal(owner,cx));
  }
  if(owner.section==='terminals')reloadTerminals(owner,cx);
}
export function reloadTerminals(owner,cx,force=false){
  startRefreshFeedback(owner,'st-terminal-refresh',JSON.stringify(['terminals',owner.profileMachine]),cx,true);
  cancelTerminalDrag(owner);owner.terminalError=null;owner.profileError=null;
  reloadTerminalShells(owner,cx,++owner.profileSerial,force);
}
export function showTerminals(owner,cx){
  cancelProfileDrag(owner);owner.section='terminals';owner.profileShellOpen=false;owner.settingsHostOpen=false;
  owner.handle.focus();reloadTerminals(owner,cx);cx.notify();
}
export function cancelTerminalEdit(owner,cx){
  owner.terminalEdit=null;owner.terminalError=null;owner.handle.focus();cx.notify();
}
function editTerminal(owner,p,cx){
  cancelTerminalDrag(owner);owner.settingsHostOpen=false;owner.terminalEdit=p;owner.terminalEditMachine=owner.profileMachine;owner.terminalError=null;
  owner.terminalDraft={...p.options};owner.terminalName.set_value(p.name);
  owner.terminalCommand.set_value(p.command);owner.terminalArgs.set_value(JSON.stringify(p.extraArgs));
  owner.terminalName.focus();cx.notify();
}
function saveTerminal(owner,cx){
  if(!owner.terminalEdit)return;
  if(owner.terminalEditMachine!==owner.profileMachine){owner.terminalError='The selected machine changed. Reopen this terminal.';cx.notify();return;}
  try{
    const patch=validateTerminal(owner.terminalEdit,owner.terminalName.value(),owner.terminalCommand.value(),owner.terminalArgs.value(),owner.terminalDraft);
    updateTerminal(owner.profileMachine,owner.terminalEdit.key,patch);
    owner.terminalEdit=null;owner.terminalError=null;owner.handle.focus();
  }catch(e){owner.terminalError=e.message;}
  cx.notify();
}
function field(t,id,label,input){
  return v_flex().gap(4).child(div().text_size(U.font).text_color(t.foreground).child(label))
    .child(control(t,h_flex()).id(id).px(U.gutter).child(Input.new(input).flex_1().min_w(0).h_full()));
}
// The shared icon button (ui.js); pressing one also ends a row drag.
function tool(owner,t,id,icon,label,action,enabled=true){
  return iconButton(t,{id,icon:`mods/custom-settings/${icon}.svg`,label,tooltip:label,available:enabled,color:t.muted,onClick:(_e,cx)=>action(cx)})
    .on_mouse_down('left',(_e,cx)=>cancelTerminalDrag(owner,cx));
}
function startupRows(owner,t,p){
  const labels=p.kind==='powershell'?
    [['noLogo','Hide startup banner','Open at the prompt without the PowerShell version and copyright message.'],['loadProfile','Load machine profile','Load aliases, the custom prompt and live folder reporting from this machine’s profile.']]:p.kind==='bash'?
    [['login','Login shell','Read login startup files before opening the prompt.'],['interactive','Interactive shell','Enable the interactive prompt, history and keyboard behavior.'],['loadProfile','Load machine configuration','Load aliases, the custom prompt and live folder reporting from this machine’s Bash files.']]:p.kind==='cmd'?
    [['autorun','Run startup commands','Use the Command Prompt AutoRun commands configured on this machine.']]:[];
  return labels.map(([key,title,about],i)=>owner.row(t,title,about,
    owner.toggle(t,`st-terminal-option-${key}`,owner.terminalDraft[key],(_e,cx)=>{owner.terminalDraft[key]=!owner.terminalDraft[key];cx.notify();}),i===labels.length-1));
}
function dragPreview(owner,t,terminal){
  return Popup.new('st-terminal-drag-preview',div().size(1)).absolute()
    .left(owner.terminalDragPoint?.x??8).top(owner.terminalDragPoint?.y??36).anchor('top_left')
    .content(h_flex().h(U.control).px(8).gap(6).items_center().rounded(U.radius).border_1().border_color(t.border)
      .bg(t.popover).shadow_md().text_size(U.font).text_color(t.foreground)
      .child(slot(svg('mods/custom-settings/terminal.svg').size(U.icon)))
      .child(div().max_w(200).truncate().child(terminal.name)));
}
export function terminalEditorActions(owner,t){
  return h_flex().id('st-terminal-editor-actions').w_full().gap(8).items_center().justify_end()
    .when(Boolean(owner.terminalError),el=>el.child(description(t,owner.terminalError).flex_1().min_w(0).text_color(t.blocked)))
    .child(owner.button(t,'st-terminal-cancel','Cancel',(_e,cx)=>cancelTerminalEdit(owner,cx)).w(76))
    .child(owner.button(t,'st-terminal-save','Save',(_e,cx)=>saveTerminal(owner,cx)).w(76));
}
export function terminalsPage(owner,t){
  if(owner.terminalDrag&&!terminalDragValid(owner))cancelTerminalDrag(owner);
  const items=composeTerminals(owner.profileMachine,owner.profileShells),chosen=selectedTerminal(owner.profileMachine,items);
  const dragged=owner.terminalDrag?.active?items.find(p=>p.key===owner.terminalDrag.key):null;
  if(owner.terminalEdit){const p=owner.terminalEdit;
    return v_flex().id('st-terminal-editor').gap(12)
      .child(owner.heading(t,'Edit terminal','These settings apply the next time you open or switch to this terminal.'))
      .child(field(t,'st-terminal-name','Name',owner.terminalName))
      .child(field(t,'st-terminal-command','Command',owner.terminalCommand))
      .child(field(t,'st-terminal-args','Additional arguments (JSON array)',owner.terminalArgs))
      .child(description(t,'Extra arguments are passed directly. Use the startup switches below for built-in options.'))
      .child(sectionStack(v_flex()).children(startupRows(owner,t,p)));
  }
  return sectionStack(v_flex()).id('st-terminals')
    .child(owner.heading(t,'Terminals','Choose which shells appear in the switcher, arrange them, and choose the shell for new tabs.'))
    .child(terminalShellRow(owner,t,reloadTerminals))
    .when(Boolean(owner.terminalError||owner.profileError),el=>el.child(description(t,owner.terminalError||owner.profileError).text_color(t.blocked)))
    .child(v_flex().id('st-terminal-list').relative()
      .on_mouse_move((e,cx)=>{if(!owner.terminalDrag?.active||!e.local_position)return;const zoom=settings().zoom||1;owner.terminalDragPoint={x:e.local_position.x/zoom+10,y:e.local_position.y/zoom+14};cx.notify();})
      .on_mouse_up('left',(_e,cx)=>finishTerminalDrag(owner,cx))
      .on_hover((hovered,cx)=>{if(!hovered&&owner.terminalDrag)cancelTerminalDrag(owner,cx);})
      .on_mouse_down_out((_e,cx)=>{if(owner.terminalDrag)cancelTerminalDrag(owner,cx);})
      .children(items.map((p,i)=>sectionRow(t,h_flex())
        .id(`st-terminal-${p.key}`).relative().cursor_grab().gap(8).items_center()
        .when(owner.terminalDrag?.active,el=>el.cursor_grabbing())
        .on_mouse_down('left',(e,cx)=>startTerminalDrag(owner,p,e,cx))
        .on_mouse_move((e,cx)=>overTerminalDrag(owner,i,e,cx))
        .on_mouse_up('left',(e,cx)=>{cx.stop_propagation();overTerminalDrag(owner,i,e,cx);finishTerminalDrag(owner,cx);})
        .when(owner.terminalDrag?.active&&owner.terminalDrag.key===p.key,el=>el.opacity(0.45))
        .when(owner.terminalDrag?.active&&(owner.terminalDrop===i||(i===items.length-1&&owner.terminalDrop===items.length)),el=>el.child(div().id('st-terminal-drop-indicator').absolute().left(0).right(0).h(2).bg(t.accent).when(owner.terminalDrop===i,e=>e.top(0)).when(owner.terminalDrop!==i,e=>e.bottom(0))))
        .child(div().id(`st-terminal-grip-${p.key}`).size(U.insetControl).flex_none().flex().items_center().justify_center().text_color(t.dim).tooltip('Drag to reorder').child(svg('mods/custom-settings/grip.svg').size(U.smallIcon)))
        .child(svg('mods/custom-settings/terminal.svg').size(U.icon).text_color(t.foreground))
        .child(v_flex().flex_1().min_w(0).gap(4)
          .child(h_flex().gap(8).items_center().child(div().text_size(U.font).text_color(t.foreground).child(p.name))
            .when(chosen?.key===p.key,el=>el.child(div().text_size(U.meta).text_color(t.accent).child('Default'))))
          .child(div().text_size(U.meta).text_color(t.dim).truncate().child(p.customCommand?'Custom launch command':p.command)))
        .child(tool(owner,t,`st-terminal-up-${p.key}`,'arrow-up','Move up',cx=>{moveTerminal(owner.profileMachine,p.key,-1,items);cx.notify();},i>0))
        .child(tool(owner,t,`st-terminal-down-${p.key}`,'arrow-down','Move down',cx=>{moveTerminal(owner.profileMachine,p.key,1,items);cx.notify();},i<items.length-1))
        .child(tool(owner,t,`st-terminal-edit-${p.key}`,'pencil','Edit terminal',cx=>editTerminal(owner,p,cx)))
        .child(h_flex().tooltip(p.show?'Hide from shell switcher':'Show in shell switcher')
          .on_mouse_down('left',(_e,cx)=>{cx.stop_propagation();cancelTerminalDrag(owner,cx);})
          .child(owner.toggle(t,`st-terminal-show-${p.key}`,p.show,(_e,cx)=>{updateTerminal(owner.profileMachine,p.key,{show:!p.show});cx.notify();})))))
      .when(Boolean(dragged),el=>el.child(dragPreview(owner,t,dragged))))
    .when(!items.length,el=>el.child(owner.profileShellLoading?description(t,'Checking this machine’s terminals…'):emptyState(t,{id:'terminals-empty',title:'No installed terminals',icon:'mods/custom-workspace-chrome/terminal.svg'}).h(112).flex_none()));
}
