// Spaces layout/order: dummy host data only; no real navigation or Core writes.
import * as links from '../src/shared/workspace-links.js';
import {realUi} from './support/panel-kit.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function element(){const n={attrs:{},kids:[]};let p;return p=new Proxy(n,{get:(o,k)=>k in o?o[k]:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?child=>{o.kids.push(child);return p;}:k==='children'?children=>{o.attrs.children=[children];o.kids.push(...children);return p;}:(...args)=>{o.attrs[k]=args;return p;}});}
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(child=>find(child,id)).find(Boolean);
const drag={view:null,item:e=>e,sourceLayer:e=>e,guard:fn=>fn};let hostSpaces=[];
const context={...links,pluginWorkspaceLinks:()=>[],View:class{},div:element,h_flex:element,v_flex:element,svg:path=>element().asset(path),slot:child=>element().size(16).child(child),badge:(number,color)=>element().color(color).child(number),spaceTitle:()=>element(),itemHover:()=> 'hover',spaceBadgeColor:()=> 'avatar-color',reorder:()=>drag,spaces:()=>hostSpaces,panes:()=>[],pluginSpaceTags:()=>[],rolePill:(_t,label)=>element().child(label),displaySpace:s=>s,spaceDirectory:s=>({cwd:s.folder}),shared:key=>key==='custom.plugins'?{git:{enabled:false}}:{},run(){assert.fail('Rendering must not navigate or move spaces');},U:{row:28,control:28,icon:16,gap:8,radius:6,smallIcon:14}};
const source=fs.readFileSync(new URL('../src/features/spaces/main.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default class Spaces','class Spaces').replace(/export /g,'')+'\nglobalThis.Spaces=Spaces;';vm.runInNewContext(source,context);
const view=new context.Spaces(),theme={muted:'muted',dim:'dim',selected:'selected',ansi2:'green',ansi1:'red'},w={id:'worktree',name:'session-name-dialog-editing',active:true};
for(const tree of ['└─',null]){
 const row=view.row({w,i:5,g:{name:'repo',linked:true,ahead:1,behind:2},tree},theme),content=find(row,'space-content-worktree');
 assert.equal(row.attrs.h[0],28);assert.equal(row.attrs.px[0],8);assert.equal(content.attrs.pl,undefined,'Worktrees have no extra indentation');assert.deepEqual(content.kids[0].kids,['6'],'Avatar is the first element, like an ordinary space');
 const marker=find(row,'space-worktree-worktree');assert.equal(content.kids.at(-1),marker,'Worktree marker is at the right, after title/metadata');assert.equal(marker.attrs.tooltip[0],'Git worktree');assert.equal(marker.kids[0].attrs.asset[0],'mods/custom-workspace-chrome/branch.svg');assert.equal(marker.kids[0].attrs.size[0],14);
}
const normal=view.row({w,i:5,g:{name:'repo',linked:false},tree:null},theme);assert.equal(find(normal,'space-worktree-worktree'),undefined);assert.equal(find(normal,'space-content-worktree').kids[0].kids[0],'6');
view.rename={id:w.id};view.renameField=()=>element().child('editing');const editing=view.row({w,i:5,g:{linked:true},tree:'└─'},theme);assert.equal(find(editing,'space-worktree-worktree'),undefined,'Rename retains its normal editing room');assert.equal(find(editing,'space-content-worktree').attrs.pl,undefined);
// Tags plugins add to a space (Crew) are pills at the row's right edge; the sidebar names no plugin.
{
 view.rename=null; // the case above leaves its rename open
 const asked=[];vm.runInContext('pluginSpaceTags=s=>{globalThis.__asked.push(s.id);return globalThis.__tags;}',context);context.__asked=asked;
 context.__tags=[{plugin:'crew',label:'Crew',tooltip:'Crew coordinator'}];
 // This element records `.children([...])` as its last call rather than as kids.
 const tagsOf=row=>find(row,'space-content-worktree').attrs.children?.[0]??[];
 const crewRow=view.row({w,i:5,g:{name:'repo',linked:true},tree:null},theme),[pill]=tagsOf(crewRow);
 assert.equal(pill?.attrs.id[0],'space-tag-worktree-crew-0','The plugin’s tag is on the row');assert.deepEqual(pill.kids,['Crew']);assert.equal(pill.attrs.tooltip[0],'Crew coordinator');
 const crewContent=find(crewRow,'space-content-worktree'),branch=find(crewRow,'space-worktree-worktree');
 assert.equal(crewContent.kids.at(-1),branch,'Worktree marker stays rightmost, after pills');assert.ok(crewContent.kids.indexOf(pill)<crewContent.kids.indexOf(branch));assert.equal(pill.attrs.mr,undefined,'No negative pill margin beside a marker');assert.ok(asked.includes('worktree'),'Asked for this space');
 view.rename={id:w.id};view.renameField=()=>element().child('editing');assert.equal(tagsOf(view.row({w,i:5,g:{linked:true},tree:null},theme)).length,0,'Not while renaming');view.rename=null;
 context.__tags=[];assert.equal(tagsOf(view.row({w,i:5,g:{name:'repo',linked:true},tree:null},theme)).length,0,'No tag, no pill');
}
// The header's ⋯ menu: Machine status and Worktree icon, both shown until switched off.
{
 view.rename=null;
 const store=new Map();vm.runInContext('shared=k=>globalThis.__store.has(k)?globalThis.__store.get(k):undefined;setShared=(k,v)=>globalThis.__store.set(k,v);',context);context.__store=store;
 Object.assign(context,{menuSurface:(_t,e)=>e,menuHeading:(_t,text)=>element().child(text),menuRow:(_t,o)=>element().id(o.id).child(o.label).child(o.trailing).on_click(o.onClick)});
 const marker=()=>find(view.row({w,i:5,g:{name:'repo',linked:true},tree:null},theme),'space-worktree-worktree');
 assert.ok(marker(),'Worktree icon shown by default');
 // This element records `.children([...])` as an attribute rather than as kids.
 const option=(menu,k)=>(menu.attrs.children?.[0]??[]).find(r=>r.attrs.id[0]===`spaces-option-${k}`);
 const menu=view.optionsMenu(theme),rows=['spaces.show.machineStatus','spaces.show.worktree'].map(k=>option(menu,k));
 assert.ok(rows.every(Boolean),'Both options are listed');assert.ok(rows.every(r=>r.kids[1]),'Both ticked');
 rows[1].attrs.on_click[0]({},{notify(){}});
 assert.equal(store.get('spaces.show.worktree'),false,'Unticking saves it');assert.equal(marker(),undefined,'Worktree icon hidden');
 assert.equal(option(view.optionsMenu(theme),'spaces.show.worktree').kids[1],null,'No tick once off');
 store.clear();assert.ok(marker());
}
// Git discovery and repeated rendering must never undo a user-chosen order.
const space=(id,machine='pc2')=>({id,name:id,machine,folder:`/fixture/${id}`}),key=s=>JSON.stringify([s.machine,s.folder]);
hostSpaces=[space('local',null),space('worktree-b'),space('other'),space('parent'),space('worktree-a')];
view.rename=null;view.shown=new Set(hostSpaces.map(s=>s.id));view.born={};view.git={};
const ids=()=>Array.from(view.ordered(),r=>r.w.id),saved=hostSpaces.map(s=>s.id);
assert.deepEqual(ids(),saved,'Unknown Git metadata preserves Core order');
for(const s of hostSpaces)view.git[key(s)]={repo:['parent','worktree-a','worktree-b'].includes(s.id)?'same-repo':s.id,linked:s.id.startsWith('worktree-')};
for(let i=0;i<20;i++)assert.deepEqual(ids(),saved,'Worktrees on either side of their parent are never automatically regrouped');
assert.deepEqual(Array.from(view.ordered(),r=>r.i),[0,1,2,3,4],'Drag indexes match Core order');assert.equal(view.ordered().find(r=>r.w.id==='worktree-a').tree,true,'Worktree decoration does not require nesting');
// Exercise the real drop handler against an isolated, in-memory Core echo.
const calls=[];context.run=(name,args)=>{calls.push([name,args]);assert.equal(name,'space.move');const from=hostSpaces.findIndex(s=>s.id===args.id),[s]=hostSpaces.splice(from,1);hostSpaces.splice(args.index-1,0,s);};
drag.take=()=>({kind:'drop',id:'worktree-a',target:'other'});view.drop('other',{});assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),['space.move',{id:'worktree-a',index:3}]);
const moved=['local','worktree-b','worktree-a','other','parent'];for(let i=0;i<20;i++)assert.deepEqual(ids(),moved,'An acknowledged worktree drag is not reverted on refresh');assert.equal(calls.length,1,'Only the explicit drop issues a move');
const reopened=new context.Spaces();reopened.shown=new Set(view.shown);reopened.born={};reopened.git=view.git;assert.deepEqual(Array.from(reopened.ordered(),r=>r.w.id),moved,'Reload retains Core order');assert.equal(calls.length,1);
drag.take=()=>({kind:'drop',id:'worktree-a',target:'local'});view.drop('local',{});assert.equal(calls.length,1,'Existing cross-machine drag protection stays intact');
// Pass the sidebar's already-loaded checkout state at the popup boundary.
const overlays=[];context.openOverlay=spec=>overlays.push(spec);
for (const machine of [null,'pc2']) {
 const s=space('menu-source',machine);
 for (const [metadata,expected] of [[{linked:false},'main'],[{linked:true},'linked'],[null,null],[undefined,'unknown']]) {
  view.git={[key(s)]:metadata};view.menu(s);
  const popup=overlays.at(-1);
  assert.equal(popup.props.target.checkout,expected);
  assert.equal(popup.props.target.folder,s.folder);assert.equal(popup.props.target.id,s.id);
  assert.equal(popup.mod,'custom-menu');
 }
 // Changing directories must not borrow an old folder's repository metadata.
 view.git={[key(s)]:{linked:true}};s.folder='/new/unknown';view.menu(s);
 assert.equal(overlays.at(-1).props.target.checkout,'unknown');
}
// A vector elbow hangs from the parent badge centre; only the child text is inset.
context.pluginWorkspaceLinks=()=>[{parent:'parent',child:'worktree-a',binding:'pair'}];
const projected=view.ordered(),parentAt=projected.findIndex(r=>r.w.id==='parent');
assert.equal(projected[parentAt+1].w.id,'worktree-a');assert.equal(projected[parentAt+1].linked,true);
const fleetRow=view.row(projected[parentAt+1],theme),fleetContent=find(fleetRow,'space-content-worktree-a');
const connector=fleetContent.kids[0],elbow=connector.kids[0];
assert.equal(fleetContent.attrs.pl,undefined,'No child padding moves the stem away from the parent badge');
assert.equal(connector.attrs.w[0],24);assert.equal(connector.attrs.h[0],28);
assert.equal(elbow.attrs.asset[0],'mods/custom-spaces/fleet-elbow.svg');assert.equal(elbow.attrs.size[0],24);
assert.equal(elbow.attrs.left[0],0);assert.equal(elbow.attrs.top[0],2);assert.equal(elbow.attrs.text_color[0],theme.muted);
assert.equal(fleetContent.kids[1].attrs.text_color[0],theme.muted,'Even an active child name stays muted');
const vector=fs.readFileSync(new URL('../src/shared/fleet-elbow.svg',import.meta.url),'utf8');
assert.match(vector,/fill="none"/);assert.match(vector,/stroke="currentColor"/);assert.match(vector,/stroke-width="1"/);
assert.match(vector,/stroke-linecap="round"/);assert.match(vector,/d="M8 2v10h12"/);
const outerInset=8,parentBadgeCentre=outerInset+16/2;
assert.equal(outerInset+elbow.attrs.left[0]+8,parentBadgeCentre,'Stem uses the coordinator badge centre');
assert.equal(elbow.attrs.top[0]+2+10,28/2,'Bend is vertically centred on the child name');
assert.equal(connector.attrs.w[0]+8-(16+8),8,'Only the child label gains an 8px inset');
const manifest=JSON.parse(fs.readFileSync(new URL('../customization.json',import.meta.url),'utf8'));
assert.equal(manifest.files['mods/custom-spaces/fleet-elbow.svg'],'src/shared/fleet-elbow.svg');
assert.equal(manifest.files['mods/custom-spaces/link.svg'],undefined);
drag.control=(e,options)=>{e.controlOptions=options;return e;};
const compact=view.compact(projected[parentAt+1],theme),rail=find(compact,'space-badge-worktree-a');
assert.equal(rail.attrs.w[0],16);assert.equal(rail.kids[0].attrs.asset[0],'mods/custom-spaces/fleet-elbow.svg');
assert.equal((28-rail.attrs.w[0])/2+8,28/2,'Rail stem aligns with the parent badge, not the wider SVG centre');
assert.equal(compact.attrs.w[0],28);assert.equal(compact.attrs.h[0],28);assert.equal(compact.controlOptions.tooltip,projected[parentAt+1].w.directory||projected[parentAt+1].w.name,'Rail keeps the existing name/directory tooltip');
assert.ok(compact.attrs.on_click);assert.equal(find(view.compact(projected[parentAt],theme),'space-badge-parent').kids[0],String(projected[parentAt].i+1));
const oldRun=context.run,selected=[];context.run=(name,args)=>selected.push([name,args]);
compact.attrs.on_click[0]();assert.deepEqual(JSON.parse(JSON.stringify(selected)),[['space.select',{id:'worktree-a'}]]);context.run=oldRun;
drag.view={id:'parent',meta:{sources:['parent','worktree-a']}};drag.preview=(_id,_t,data)=>data;
const preview=view.dragPreview(theme);assert.equal(preview.rows[1].icon.kids[0].attrs.asset[0],'mods/custom-spaces/fleet-elbow.svg');
assert.equal(preview.rows[1].label.attrs.text_color[0],theme.muted);assert.equal(preview.rows[0].label,'parent');drag.view=null;
context.pluginWorkspaceLinks=()=>[];assert.equal(view.ordered().find(r=>r.w.id==='worktree-a').linked,false);
// Compare actual machine header and row trailing slots, including tags and child inset.
view.machines=[{name:'pc2',state:'connected'}];view.reconnecting={};view.folded=new Set();view.rebuilt=()=>false;
const machineWrites=new Map();context.localStorage={setItem:(key,value)=>machineWrites.set(key,value)};
Object.assign(context,{machines:()=>[{name:'pc2',layout:'ready'}],iconButton:(_t,o)=>element().id(o.id).on_click(o.onClick),sidebarSectionHeader:realUi(element).sidebarSectionHeader});
for(const machine of [null,'pc2']) {
 const [header]=view.groupRows(machine,[],false,theme,()=>null,()=>false,()=>element());
 const chevronSlot=header.kids.at(-1),axis=header.attrs.pr[0]+chevronSlot.attrs.size[0]/2;
 assert.equal(axis,12,'Header chevron centre is 12px from the right edge');
 assert.ok(find(header,`machine-add-${machine??'local'}`),'Machine plus remains beside the shared chevron');
 assert.ok(find(header,`machine-status-${machine??'local'}`),'Machine status dot remains');
 header.attrs.on_click[0]({}, {notify(){}});assert.equal(view.folded.has(machine),true);assert.ok(JSON.parse(machineWrites.get('machines.folded')).includes(machine));
 view.folded.delete(machine);
 for(const linked of [false,true])for(const tags of [[],[{plugin:'crew',label:'Crew'}],[{plugin:'crew',label:'Crew'},{plugin:'other',label:'Other'}]]) {
  context.__tags=tags;
  const row=view.row({w:{...w,machine,name:'very-long-space-name-that-must-not-move-trailing-tools'},i:0,g:{linked:true},linked},theme);
  const content=find(row,'space-content-worktree'),marker=find(row,'space-worktree-worktree');
  assert.equal(content.kids.at(-1),marker);assert.equal(marker.attrs.size[0],16);
  assert.equal(row.attrs.px[0]+marker.attrs.mr[0]+marker.attrs.size[0]/2,axis,'Tagged and untagged worktrees align with the chevron');
  for(const pill of content.attrs.children[0]){assert.ok(content.kids.indexOf(pill)<content.kids.indexOf(marker));assert.equal(pill.attrs.mr,undefined);}
 }
}
context.__tags=[{plugin:'crew',label:'Crew'}];
const tagOnly=find(view.row({w,i:0,g:null},theme),'space-content-worktree');assert.equal(tagOnly.kids.at(-1).attrs.mr[0],-5,'Tag-only rows retain their old edge');
view.rename={id:w.id};assert.equal(find(view.row({w,i:0,g:{linked:true}},theme),'space-worktree-worktree'),undefined);view.rename=null;
console.log('PASS: first-frame local/remote checkout snapshots; aligned tagged/child worktrees, vector elbows, preserved user order and cross-machine drag guards (dummy Core only)');
