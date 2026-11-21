// Custom + menu: selected-machine profiles; detection never starts an agent.
import { View, div, svg, image } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { U, slot, menuSurface, menuRow, hotkey, menuHeading, ROLE_LABELS, ROLE_ACTIONS, rolePillButton } from './ui.js';
import { theme, spaces, run, openOverlay, closeOverlay, props, keys, readTextFile } from './host.js';
import { launchSpaceProfile } from './profile-actions.js';
import { divider } from './modal-layout.js';
import { cachedProfiles, composeProfiles, loadProfiles, PROFILE_ROLES, plainProfile, launchList } from './profiles.js';
import { pluginGateReady } from './plugins.js';
import { spaceDirectory, warmSpaceStartFolder } from './directory.js';
import { ShellSwitch } from './shell-switch.js';
import { PanelSwitch } from './panel-switch.js';
function shortcut(name){return hotkey(keys().find(k=>k.section==='global'&&k.action===name)?.keys);}
export default class NewMenu extends View {
 init(_props,cx){
  if(props()?.switchPane){this.switcher=new ShellSwitch();this.switcher.init(props(),cx);return;}
  if(props()?.panelSwitch){this.switcher=new PanelSwitch();this.switcher.init(props(),cx);return;}
  const space=spaces().find(s=>s.active);this.space=space?.id;this.machine=space?.machine??null;
  // Where a launch from here starts: a worker copy's primary checkout is read while the menu is open.
  warmSpaceStartFolder(space,readTextFile).catch(()=>{});
  this.items=cachedProfiles(this.machine);this.loading=!this.items.length;
  if(this.loading)this.items=composeProfiles(this.machine,[]);
  const visible=launchList(this.items,this.roles());
  // Freeze the popup footprint and membership for this opening. Background
  // discoveries are visible on the next click, never by moving rows under it.
  // Fixed parts: 8 padding + 2 border, heading 30 (8+18+4), two 17px dividers, Edit profiles + 3 action rows,
  // and U.rowGap between every child; the profile list holds at least one row (its placeholder).
  const rows=visible.length+(visible.some(p=>p.key!=='terminal')?0:1),step=U.row+U.rowGap;
  this.menuHeight=this.loading?356:Math.min(512,10+30+2*17+4*U.row+6*U.rowGap+rows*step);
  this.handle=cx.focus_handle();this.handle.focus();
  if(!this.loading)return;
  // First installation only: retain a fixed viewport while the initial catalog loads.
  cx.spawn(async cx=>{try{this.items=await loadProfiles(this.machine);}catch{this.failed=true;}finally{this.loading=false;}cx.notify();});
 }
 // The roles (Crew) whose plugin is on: a profile in one gets that role's pill on its row.
 roles(){return PROFILE_ROLES.filter(role=>ROLE_LABELS[role]&&pluginGateReady(`profile.role.${role}`));}
 activeSpace(){return spaces().find(s=>s.active&&s.id===this.space&&(s.machine??null)===this.machine);}
 scopeValid(){return this.space?Boolean(this.activeSpace()):!spaces().some(s=>s.active);}
 launch(profile){
  if(this.scopeValid())launchSpaceProfile(profile,this.space,this.machine);
 }
 // The shared popup-menu row (ui.js), like every menu in the app.
 // The row under the mouse: only it shows its role pill (Start Crew).
 hover(id,over,cx){if(over)this.hoverRow=id;else if(this.hoverRow===id)this.hoverRow=null;cx?.notify();}
 row(id,icon,name,action,hint='',enabled=true,pill=null){const t=theme();return menuRow(t,{id,icon,label:name,hint:hint||null,trailing:this.hoverRow===id?pill:null,enabled,onHover:(over,cx)=>this.hover(id,over,cx),onClick:()=>{closeOverlay(props().overlay);action();}}).text_color(t.foreground);}
 render(){if(this.switcher)return this.switcher.render();const t=theme(),space=this.activeSpace(),roles=this.roles(),visible=launchList(this.items,roles),terminal=visible[0]?.key==='terminal'?visible[0]:null,profiles=visible.filter(p=>p!==terminal);
  // Number keys start the rows as themselves, in the order shown.
  const available=profiles.filter(p=>p.available===true);
  const glyph=p=>p.icon?(p.tint?svg(p.icon).size(U.icon).text_color(t.foreground):image(p.icon).size(U.icon)):svg('icons/shell.svg').size(U.icon);
  const hint=p=>p.key==='terminal'?(p.run?'':shortcut('tab.new')):p.available===true?(available.indexOf(p)<9?String(available.indexOf(p)+1):''):p.available===false?'not found':'not checked';
  // The row starts the profile as itself; its role pill (Crew) starts it in that role.
  const pill=p=>roles.includes(p.role)?rolePillButton(t,{id:`new-menu-${p.role}-${p.key}`,label:ROLE_ACTIONS[p.role]??ROLE_LABELS[p.role],
    enabled:this.scopeValid()&&p.available===true,onClick:()=>{closeOverlay(props().overlay);this.launch(p);}}):null;
  const profileRow=(id,p)=>this.row(id,glyph(p),p.name,()=>this.launch(plainProfile(p)),hint(p),this.scopeValid()&&p.available===true,pill(p));
  return menuSurface(t,v_flex()).id('new-menu').p(4).gap(U.rowGap).min_h(0).w_full().h(this.menuHeight).track_focus(this.handle)
    // A fast exit can skip a row's leave event: leaving the menu clears the hovered row's pill.
    .on_hover((over,cx)=>{if(!over&&this.hoverRow!=null){this.hoverRow=null;cx?.notify();}})
   .on_key_down((e,cx)=>{if(e.modifiers.control||e.modifiers.platform||e.modifiers.alt)return;const profile=/^[1-9]$/.test(e.key)?available[Number(e.key)-1]:null;if(!profile||!this.scopeValid())return;cx.stop_propagation();closeOverlay(props().overlay);this.launch(plainProfile(profile));})
   .when(Boolean(terminal),el=>el.child(this.row('terminal',glyph(terminal),terminal.name,()=>this.launch(terminal),terminal.run?'':shortcut('tab.new'),this.scopeValid()&&terminal.available===true)))
   .child(menuHeading(t,'Profiles').id('new-menu-agent-heading').h(30).flex_none().px(8).pt(8).pb(4))
   .child(v_flex().flex_1().min_h(0).gap(U.rowGap).overflow_y_scrollbar().children(profiles.map(p=>profileRow(p.key,p)))
    .when(!profiles.length,el=>el.child(div().px(9).py(6).text_color(t.dim).child(this.loading?'Checking profiles…':this.failed?'Could not load profiles':'No visible profiles. Use Edit profiles.'))))
   .child(divider(t,{compact:true,inset:4}))
   .child(this.row('edit-profiles',svg('mods/custom-settings/pencil.svg').size(U.smallIcon),'Edit profiles',()=>openOverlay({mod:'custom-settings',kind:'dialog',frame:'none',width:900,height:620,props:{section:'profiles',profilesMachine:this.machine}})))
   .child(divider(t,{compact:true,inset:4}))
   .child(this.row('space',svg('mods/custom-workspace-chrome/plus.svg').size(U.smallIcon),'New space',()=>{if(this.scopeValid())run('space.new',{machine:this.machine??''});},shortcut('space.new')))
   .child(this.row('worktree',svg('mods/custom-workspace-chrome/branch.svg').size(U.smallIcon),'New worktree…',()=>{if(this.activeSpace())openOverlay({mod:'custom-worktree',kind:'dialog',frame:'none',width:460,height:300,props:{space:this.space,folder:spaceDirectory(this.activeSpace()).cwd,action:'new'}});},'',Boolean(space)))
   .child(this.row('worktree-open',svg('mods/custom-workspace-chrome/branch.svg').size(U.smallIcon),'Open worktree…',()=>{if(this.activeSpace())openOverlay({mod:'custom-worktree',kind:'dialog',frame:'none',width:560,height:480,props:{space:this.space,folder:spaceDirectory(this.activeSpace()).cwd,action:'open'}});},'',Boolean(space)));
 }
}
