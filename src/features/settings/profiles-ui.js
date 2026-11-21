import { div, svg, image } from 'gpui-kit';
import { h_flex, v_flex, Input, InputState, Popup, Scrollbar } from 'gpui-base';
import { settings } from './host.js';
import { U, slot, control, description, subtleActionFill, iconButton, startRefreshFeedback, dialogScrollFrame, dialogScrollBody, dialogScrollbar } from './ui.js';
import { cancelProfileDrag, startProfileDrag, overProfileDrag, finishProfileDrag } from './profile-drag.js';
import { applyProfileVisibility, cachedProfiles, composeProfiles, loadProfiles, updateProfile, addProfile, removeProfile, moveProfile, validateProfile } from './profiles.js';
import { showTerminals } from './terminals-ui.js';
import { M, sectionAction, sectionRow, sectionStack } from './modal-layout.js';
// Roles (crew coordinator) are not edited here: the plugin that owns a role keeps its list
// of profiles (Settings › Plugins › Crew › Profiles). Editing a profile keeps its role.
export function initProfiles(owner,cx) {
 owner.profileMachine=owner.settingsMachine??null;
 owner.profileItems=cachedProfiles(owner.profileMachine);if(!owner.profileItems.length)owner.profileItems=composeProfiles(owner.profileMachine,[]);
 owner.profileDrag=null;owner.profileDrop=null;owner.profileDragPoint=null;
 owner.profileLoading=false;owner.profileSerial=0;owner.profileEdit=null;owner.profileDelete=null;owner.profileError=null;
 owner.profileName=InputState.new({placeholder:'Profile name'});owner.profileCommand=InputState.new({placeholder:'Executable name or full path'});owner.profileArgs=InputState.new({placeholder:'["--flag", "value"]'});
 for(const input of [owner.profileName,owner.profileCommand,owner.profileArgs]){input.on('change',(_e,cx)=>{owner.profileError=null;cx.notify();});input.on('submit',(_e,cx)=>saveEdit(owner,cx));}
 if(owner.section==='profiles')reloadProfiles(owner,cx);
}
export function reloadProfiles(owner,cx) {
 startRefreshFeedback(owner,'st-profile-refresh',JSON.stringify(['profiles',owner.profileMachine]),cx,true);
 cancelProfileDrag(owner);
 const machine=owner.profileMachine,serial=++owner.profileSerial;owner.profileLoading=true;owner.profileError=null;
 cx.spawn(async cx=>{try{const items=await loadProfiles(machine);if(serial===owner.profileSerial&&owner.profileMachine===machine){owner.profileItems=applyProfileVisibility(machine,items);}}catch{if(serial===owner.profileSerial)owner.profileError='Could not check profiles on this machine. Saved profiles are unchanged.';}finally{if(serial===owner.profileSerial){owner.profileLoading=false;cx.notify();}}});
}
export function cancelProfileEdit(owner,cx){owner.profileEdit=null;owner.profileError=null;owner.handle.focus();cx.notify();}
function edit(owner,profile,cx){if(profile?.key==='terminal'){showTerminals(owner,cx);return;}cancelProfileDrag(owner);owner.profileDelete=null;owner.profileEdit=profile??{key:null,custom:true};owner.profileError=null;owner.profileName.set_value(profile?.name??'');owner.profileCommand.set_value(profile?.command??'');owner.profileArgs.set_value(JSON.stringify(profile?.configuredArgs??[]));owner.profileName.focus();cx.notify();}
function saveEdit(owner,cx){if(!owner.profileEdit)return;try{const value=validateProfile(owner.profileName.value(),owner.profileCommand.value(),owner.profileArgs.value(),owner.profileEdit.key);if(owner.profileEdit.key)updateProfile(owner.profileMachine,owner.profileEdit.key,value);else addProfile(owner.profileMachine,value);owner.profileEdit=null;owner.handle.focus();reloadProfiles(owner,cx);}catch(e){owner.profileError=e.message;}cx.notify();}
// The shared icon button (ui.js); a reorder arrow waits while the list reloads, and pressing
// one also ends a row drag.
function tool(owner,t,id,icon,label,action,enabled=true){const busy=owner.profileLoading&&icon.startsWith('arrow');return iconButton(t,{id,icon:`mods/custom-settings/${icon}.svg`,label,tooltip:label,available:enabled&&!busy,color:t.muted,onClick:(_e,cx)=>{if(!(owner.profileLoading&&icon.startsWith('arrow')))action(cx);}}).on_mouse_down('left',(_e,cx)=>cancelProfileDrag(owner,cx));}
function field(owner,t,id,label,state){return v_flex().gap(4).child(div().text_size(U.font).text_color(t.foreground).child(label)).child(control(t,h_flex()).id(id).px(U.gutter).child(Input.new(state).flex_1().min_w(0).h_full()));}
function dragPreview(owner,t,p){
 const icon=p.icon?(p.tint?svg(p.icon).size(U.icon).text_color(t.foreground):image(p.icon).size(U.icon)):svg('icons/shell.svg').size(U.icon);
 return Popup.new('st-profile-drag-preview',div().size(1)).absolute().left(owner.profileDragPoint?.x??8).top(owner.profileDragPoint?.y??36).anchor('top_left')
  .content(h_flex().h(U.control).px(8).gap(6).items_center().rounded(U.radius).border_1().border_color(t.border).bg(t.popover).shadow_md().text_size(U.font).text_color(t.foreground)
    .child(slot(icon)).child(div().max_w(200).truncate().child(p.name)));
}
export function profileEditorActions(owner,t){
 return h_flex().id('st-profile-editor-actions').w_full().gap(8).items_center().justify_end()
  .when(Boolean(owner.profileError),el=>el.child(description(t,owner.profileError).flex_1().min_w(0).text_color(t.blocked)))
  .child(owner.button(t,'st-profile-cancel','Cancel',(_e,cx)=>cancelProfileEdit(owner,cx)).w(76))
  .child(owner.button(t,'st-profile-save','Save',(_e,cx)=>saveEdit(owner,cx)).w(76));
}
// Keep the list's native scroll container and content mounted while the editor
// covers it. Replacing long list content with a short form clamps its offset.
export function profilesSurface(owner,t,cx) {
 const scroll=(id,content)=>dialogScrollFrame(div()).id(`${id}-frame`).absolute().inset_0()
  .child(div().id(id).size_full().overflow_y_scroll()
   .child(dialogScrollBody(div()).pl(M.bodyInset).py(12).child(content)))
  .child(dialogScrollbar(Scrollbar.vertical(id),{mode:'always'}));
 return div().id('st-profiles-surface').relative().flex_1().min_h(0).h_full()
  .child(div().id('st-profiles-list-layer').absolute().inset_0()
   .when(Boolean(owner.profileEdit),el=>el.invisible())
   .child(scroll('st-body',profilesPage(owner,t,cx,true))))
  .when(Boolean(owner.profileEdit),el=>el.child(div().id('st-profiles-editor-layer').absolute().inset_0()
   .bg(t.background).child(scroll('st-profile-editor-body',profilesPage(owner,t,cx)))));
}
export function profilesPage(owner,t,cx,listOnly=false) {
 const dragged=owner.profileDrag?.active?owner.profileItems.find(p=>p.key===owner.profileDrag.key):null;
 if(owner.profileEdit&&!listOnly)return v_flex().id('st-profile-editor').gap(12)
  .child(owner.heading(t,owner.profileEdit.key?'Edit profile':'Add profile','Changes affect new tabs only. Existing sessions are untouched.'))
  .child(field(owner,t,'st-profile-name','Name',owner.profileName))
  .child(field(owner,t,'st-profile-command','Command',owner.profileCommand))
  .when(owner.profileEdit.key==='terminal',el=>el.child(description(t,'Leave Command empty to use this machine’s default terminal shell.')))
  .child(field(owner,t,'st-profile-args','Arguments (JSON array)',owner.profileArgs))
  .child(description(t,'Use an argument array, such as ["--login", "-i"]. No shell expansion or prompt substitution.'));
 return sectionStack(v_flex()).id('st-profiles')
  .child(owner.heading(t,'Profiles','Choose which agent profiles appear in + and how they launch on this machine.'))
  .when(Boolean(owner.profileError),el=>el.child(description(t,owner.profileError).text_color(t.blocked)))
  .child(sectionAction(h_flex()).id('st-profile-actions')
    .gap(8)
    .child(owner.button(t,'st-profile-add','Add a profile',(_e,cx)=>edit(owner,null,cx)))
    // A plugin's role page (Crew: "Add a crew profile"), opened with Back to Profiles.
    .children((owner.roleLinks?.()??[]).map(link=>owner.button(t,`st-profile-add-${link.plugin.id}-${link.def.key}`,link.def.addLabel,(_e,cx)=>owner.openRoleLink(link,cx)))))
  .child(v_flex().id('st-profile-list').relative().border_t(1).border_color(t.border)
    .on_mouse_move((e,cx)=>{if(!owner.profileDrag?.active||!e.local_position)return;owner.profileDragPoint={x:e.local_position.x/settings().zoom+10,y:e.local_position.y/settings().zoom+14};cx.notify();})
    .on_mouse_up('left',(_e,cx)=>finishProfileDrag(owner,cx))
    .on_hover((hovered,cx)=>{if(!hovered&&owner.profileDrag)cancelProfileDrag(owner,cx);})
    .on_mouse_down_out((_e,cx)=>{if(owner.profileDrag)cancelProfileDrag(owner,cx);})
    .children(owner.profileItems.map((p,i)=>{const removing=owner.profileDelete===p.key;return sectionRow(t,h_flex()).id(`st-profile-${p.key}`).relative().when(!owner.profileLoading&&!owner.profileDelete,el=>el.cursor_grab()).when(owner.profileDrag?.active,el=>el.cursor_grabbing()).gap(8).items_center()
    .on_mouse_down('left',(e,cx)=>startProfileDrag(owner,p,e,cx))
    .on_mouse_move((e,cx)=>overProfileDrag(owner,i,e,cx))
    .on_mouse_up('left',(e,cx)=>{cx.stop_propagation();overProfileDrag(owner,i,e,cx);finishProfileDrag(owner,cx);})
    .when(owner.profileDrag?.active&&owner.profileDrag.key===p.key,el=>el.opacity(0.45))
    .when(owner.profileDrag?.active&&(owner.profileDrop===i||(i===owner.profileItems.length-1&&owner.profileDrop===owner.profileItems.length)),el=>el.child(div().id('st-profile-drop-indicator').absolute().left(0).right(0).h(2).bg(t.accent).when(owner.profileDrop===i,e=>e.top(0)).when(owner.profileDrop!==i,e=>e.bottom(0))))
    .child(div().id(`st-profile-grip-${p.key}`).size(U.insetControl).flex_none().flex().items_center().justify_center().text_color(t.dim).tooltip('Drag to reorder').child(svg('mods/custom-settings/grip.svg').size(U.smallIcon)))
    .child(p.icon?(p.tint?svg(p.icon).size(U.icon).text_color(t.foreground):image(p.icon).size(U.icon)):svg('icons/shell.svg').size(U.icon).text_color(t.foreground))
    .child(v_flex().flex_1().min_w(0).gap(4).child(h_flex().gap(6).items_center().min_w(0).child(div().min_w(0).truncate().text_size(U.font).text_color(t.foreground).child(p.name))).child(div().text_size(U.meta).text_color(removing?t.foreground:t.dim).truncate().child(removing?'Remove this profile?':`${p.available===true?'Available':p.available===false?'Not found':'Not checked'} · ${p.command||'Default shell'}`)))
    // While a removal is pending, the row's tools give way to its own Cancel/Remove.
    .when(removing,el=>el.child(h_flex().id('st-profile-delete-actions').gap(8).flex_none()
      .on_mouse_down('left',(_e,cx)=>{cx.stop_propagation();cancelProfileDrag(owner,cx);})
      .on_mouse_up('left',(_e,cx)=>{cx.stop_propagation();cancelProfileDrag(owner,cx);})
      .child(owner.button(t,'st-profile-delete-cancel','Cancel',(_e,cx)=>{cancelProfileDrag(owner);owner.profileDelete=null;cx.notify();}).w(76))
      .child(owner.button(t,'st-profile-delete-confirm','Remove',(_e,cx)=>{if(!owner.profileDelete)return;removeProfile(owner.profileMachine,owner.profileDelete);owner.profileDelete=null;reloadProfiles(owner,cx);cx.notify();}).w(76))))
    .when(!removing,el=>el
    .child(tool(owner,t,`st-profile-up-${p.key}`,'arrow-up','Move up',cx=>{moveProfile(owner.profileMachine,p.key,-1,owner.profileItems);reloadProfiles(owner,cx);cx.notify();},i>0))
    .child(tool(owner,t,`st-profile-down-${p.key}`,'arrow-down','Move down',cx=>{moveProfile(owner.profileMachine,p.key,1,owner.profileItems);reloadProfiles(owner,cx);cx.notify();},i<owner.profileItems.length-1))
    .child(p.key==='terminal'
      ?tool(owner,t,'st-profile-settings-terminal','settings','Terminal settings',cx=>showTerminals(owner,cx))
      :tool(owner,t,`st-profile-edit-${p.key}`,'pencil','Edit profile',cx=>edit(owner,p,cx)))
    .when(p.custom,el=>el.child(tool(owner,t,`st-profile-delete-${p.key}`,'close','Remove profile',cx=>{owner.profileDelete=p.key;cx.notify();})))
    .child(h_flex().tooltip(p.show?'Hide from + menu':'Show in + menu').on_mouse_down('left',(_e,cx)=>{cx.stop_propagation();cancelProfileDrag(owner,cx);}).child(owner.toggle(t,`st-profile-show-${p.key}`,p.show,(_e,cx)=>{const show=!(owner.profileItems.find(item=>item.key===p.key)?.show??true);updateProfile(owner.profileMachine,p.key,{show});owner.profileItems=owner.profileItems.map(item=>item.key===p.key?{...item,show}:item);cx.notify();}))));}))
    .when(Boolean(dragged),el=>el.child(dragPreview(owner,t,dragged))));
}
