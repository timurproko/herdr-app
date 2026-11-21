// Synthetic Settings/GPUI events only: no live profiles, preferences or sessions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withKitUi} from './support/panel-kit.mjs';

function element(kind='div') {
 const node={kind,kids:[],style:{},events:{}};let el;
 return el=new Proxy(node,{get(o,k){
  if(k in o)return o[k];if(k==='then')return undefined;
  if(k==='when')return(yes,fn)=>yes?fn(el):el;
  if(k==='child')return child=>{if(child!=null)o.kids.push(child);return el;};
  if(k==='children')return children=>{o.kids.push(...children);return el;};
  if(String(k).startsWith('on_'))return(...args)=>{o.events[k]=args.at(-1);return el;};
  return(...args)=>{o.style[k]=args;return el;};
 }});
}
const nodes=(tree,out=[])=>{if(tree&&typeof tree==='object'){out.push(tree);for(const child of tree.kids??[])nodes(child,out);}return out;};
const byId=(tree,id)=>nodes(tree).find(n=>n.style.id?.[0]===id);
const text=tree=>nodes(tree).flatMap(n=>n.kids.filter(k=>typeof k==='string')).join('\n');
const context=vm.createContext({}),cache=new Map();
const profiles=Array.from({length:24},(_,i)=>({key:`custom-${i}`,name:`Profile ${i}`,command:'a1',configuredArgs:[],custom:true,available:true,show:true}));
let writes=0,reorders=0;
const model={cachedProfiles:()=>profiles,composeProfiles:()=>profiles,applyProfileVisibility:(_m,items)=>items,
 loadProfiles:async()=>profiles,updateProfile:()=>writes++,addProfile:()=>writes++,removeProfile:()=>writes++,moveProfile:()=>writes++,
 validateProfile:(name,command,args)=>({name,command,args:JSON.parse(args)}),profileConfig:()=>({order:[]}),
 reorderProfiles:(_m,items)=>{reorders++;return items;}};
const input=()=>({v:'',set_value(v){this.v=v;},value(){return this.v;},focus(){},on(){}});
const ui={U:{},slot:x=>x,control:(_t,x)=>x,description:(_t,s)=>element().child(s),subtleActionFill:()=>'',startRefreshFeedback(){},rolePill:()=>element(),ROLE_LABELS:{},
 dialogScrollFrame:x=>x,dialogScrollBody:x=>x,dialogScrollbar:x=>x};
withKitUi(ui,element);
const deps={
 'gpui-kit':{div:element,svg:()=>element('svg'),image:()=>element('image')},
 'gpui-base':{h_flex:()=>element('row'),v_flex:()=>element('column'),Input:{new:()=>element('input')},InputState:{new:input},Popup:{new:()=>element('popup')},Scrollbar:{vertical:id=>element('scrollbar').target(id)},ScrollHandle:{new:()=>({scroll_to_item(){}})}},
 './host.js':{settings:()=>({zoom:1})},'./ui.js':ui,'./profiles.js':model,'./terminals-ui.js':{showTerminals(){}},
 './modal-layout.js':{M:{bodyInset:16},sectionAction:x=>x,sectionRow:(_t,x)=>x,sectionStack:x=>x},
 './plugins.js':{pluginById:()=>null,pluginIsEnabled:()=>false,pluginSetting(){}}};
const synthetic=values=>new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context});
async function load(file){
 if(cache.has(file))return cache.get(file);
 const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../src/features/settings/'+file,import.meta.url),'utf8'),{context});cache.set(file,mod);
 await mod.link(name=>name==='./profile-drag.js'?load('profile-drag.js'):synthetic(deps[name]));await mod.evaluate();return mod;
}
const api=(await load('profiles-ui.js')).namespace,drag=(await load('profile-drag.js')).namespace;
const cx={notify(){},stop_propagation(){},spawn(){},timer:{after(){}}};
const owner={section:'look',settingsMachine:null,handle:{focus(){}},heading:(_t,title,about)=>element().child(title).child(about),
 button:(_t,id,label,action)=>element().id(id).child(label).on_click((e,cx)=>{cx.stop_propagation();action(e,cx);}),toggle:()=>element()};
api.initProfiles(owner,cx);
const render=()=>api.profilesSurface(owner,{},cx),target=profiles.at(-1);
let view=render();
// Model retained native scroll state by stable ancestry/ID and content extent.
// A shorter editor must never replace the list's content or clamp its offset.
const pathTo=(tree,target,path=[])=>{if(tree===target)return path;for(const child of tree.kids??[]){if(child&&typeof child==='object'){const found=pathTo(child,target,[...path,tree]);if(found)return found;}}return null;};
const scrollPath=tree=>[...pathTo(tree,byId(tree,'st-body')),byId(tree,'st-body')].map(n=>n.style.id?.[0]??n.kind).join('/');
const originalPath=scrollPath(view),originalKeys=nodes(byId(view,'st-body')).map(n=>n.style.id?.[0]).filter(id=>/^st-profile-custom-/.test(id));
let offset=-900;
function layout(tree){const rows=nodes(byId(tree,'st-body')).filter(n=>/^st-profile-custom-/.test(n.style.id?.[0]??''));offset=Math.max(200-rows.length*64,Math.min(0,offset));}
layout(view);
byId(view,`st-profile-edit-${target.key}`).events.on_click({},cx);view=render();layout(view);
assert.equal(scrollPath(view),originalPath,'List scroll identity and ancestry stay mounted behind the editor');
assert.equal(offset,-900,'The short editor cannot clamp the list offset');
assert.deepEqual(nodes(byId(view,'st-body')).map(n=>n.style.id?.[0]).filter(id=>/^st-profile-custom-/.test(id)),originalKeys);
assert.ok(byId(view,'st-profiles-list-layer').style.invisible,'The retained list is hidden while editing');
assert.ok(byId(view,'st-profile-editor-body'),'Editor gets an independent scroll area');
assert.ok(byId(view,'st-profile-editor'));
assert.ok(!nodes(byId(view,'st-body')).includes(byId(view,'st-profile-editor')),'Editor never replaces list content');
api.profileEditorActions(owner,{}).kids.find(n=>n.style.id?.[0]==='st-profile-cancel').events.on_click({},cx);
view=render();layout(view);assert.equal(offset,-900);assert.equal(scrollPath(view),originalPath);
assert.equal(byId(view,'st-profiles-list-layer').style.invisible,undefined);assert.equal(byId(view,'st-profile-editor'),undefined);assert.equal(writes,0,'Cancel does not save');
// Escape uses the same cancellation entry point as the footer button.
byId(view,`st-profile-edit-${target.key}`).events.on_click({},cx);api.cancelProfileEdit(owner,cx);view=render();layout(view);assert.equal(offset,-900);

byId(view,`st-profile-delete-${target.key}`).events.on_click({},cx);view=render();
assert.match(text(byId(view,`st-profile-${target.key}`)),/Remove this profile\?/);
assert.doesNotMatch(text(view),/Existing tabs keep running/);
assert.equal(byId(view,`st-profile-${target.key}`).style.cursor_grab,undefined,'Confirmation is not a drag handle');
drag.startProfileDrag(owner,target,{position:{x:0,y:0}},cx);assert.equal(owner.profileDrag,null,'The drag controller rejects confirmation-mode row events');
// Bubble the full button gesture exactly as native mouse-down/up/click would.
function bubble(tree,id,type,event={}){
 const target=byId(tree,id),path=[...pathTo(tree,target),target].reverse();let stopped=false;
 const eventCx={...cx,stop_propagation(){stopped=true;}};
 for(const node of path){node.events[type]?.(event,eventCx);if(stopped)break;}
 return stopped;
}
for(const id of ['st-profile-delete-cancel','st-profile-delete-confirm']){
 owner.profileDrag={active:true,key:target.key};owner.profileDrop=20;
 assert.ok(bubble(view,id,'on_mouse_down',{position:{x:50,y:50}}));assert.equal(owner.profileDrag,null,'Confirmation button presses cancel a previously armed drag');
 assert.ok(bubble(view,id,'on_mouse_up',{position:{x:50,y:50}}));assert.equal(reorders,0);
}
assert.ok(bubble(view,'st-profile-delete-cancel','on_click'));assert.equal(owner.profileDelete,null);
view=render();
bubble(view,`st-profile-${target.key}`,'on_mouse_move',{position:{x:200,y:200},local_position:{y:50},bounds:{height:64}});
assert.equal(owner.profileDrag,null);assert.equal(byId(render(),'st-profile-drag-preview'),undefined,'Cancel followed by pointer movement cannot spawn a drag preview');
assert.equal(reorders,0);assert.equal(writes,0,'Deletion Cancel neither removes nor reorders profiles');
// Ordinary drag remains available after cancellation.
drag.startProfileDrag(owner,target,{position:{x:0,y:0}},cx);
drag.overProfileDrag(owner,1,{position:{x:0,y:40},local_position:{y:40},bounds:{height:64}},cx);
assert.equal(owner.profileDrag.active,true);drag.finishProfileDrag(owner,cx);assert.equal(reorders,1);assert.equal(owner.profileDrag,null);
const settings=fs.readFileSync(new URL('../src/features/settings/main.js',import.meta.url),'utf8');
assert.match(settings,/this\.section==='profiles'\?profilesSurface\(this,t,cx\)/,'Real Settings mounts the persistent Profiles surface');
console.log('PASS: concise profile deletion, persistent list scroll across edit/Cancel/Escape, independent editor viewport, gesture propagation and no drag after deletion Cancel; normal drag preserved');
