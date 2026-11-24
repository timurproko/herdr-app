// Spaces layout/order: dummy host data only; no real navigation or Core writes.
import * as links from '../src/shared/workspace-links.js';
import {realUi} from './support/panel-kit.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function element(){const n={attrs:{},kids:[]};let p;return p=new Proxy(n,{get:(o,k)=>k in o?o[k]:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?child=>{o.kids.push(child);return p;}:k==='children'?children=>{o.attrs.children=[children];o.kids.push(...children);return p;}:(...args)=>{o.attrs[k]=args;return p;}});}
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(child=>find(child,id)).find(Boolean);
const drag={view:null,item:(e,_id,options)=>{e.itemOptions=options;return e;},sourceLayer:e=>e,guard:fn=>fn};let hostSpaces=[];
const context={...links,pluginWorkspaceLinks:()=>[],View:class{},div:element,h_flex:element,v_flex:element,svg:path=>element().asset(path),slot:child=>element().size(16).child(child),badge:realUi(element).badge,itemHover:realUi(element).itemHover,spaceBadgeColor:realUi(element).spaceBadgeColor,reorder:()=>drag,spaces:()=>hostSpaces,panes:()=>[],pluginSpaceTags:()=>[],rolePill:realUi(element).rolePill,displaySpace:s=>s,spaceDirectory:s=>({cwd:s.folder}),shared:key=>key==='custom.plugins'?{git:{enabled:false}}:{},run(){assert.fail('Rendering must not navigate or move spaces');},U:{font:12,row:28,control:28,icon:16,gap:8,radius:6,smallIcon:14}};
const source=fs.readFileSync(new URL('../src/features/spaces/main.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default class Spaces','class Spaces').replace(/export /g,'')+'\nglobalThis.Spaces=Spaces;';vm.runInNewContext(source,context);
vm.runInContext(fs.readFileSync(new URL('../src/ui/space-title.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function'),context);
const view=new context.Spaces(),theme={foreground:'foreground',hover:'hover',muted:'muted',dim:'dim',selected:'selected',ansi2:'green',ansi1:'red'},w={id:'worktree',name:'session-name-dialog-editing',active:true};
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
 assert.equal(crewContent.kids.at(-1),pill,'Plugin tags stay rightmost, after the marker');assert.ok(crewContent.kids.indexOf(branch)<crewContent.kids.indexOf(pill));assert.equal(pill.attrs.mr[0],-5,'Tagged worktrees use the tag-only edge');assert.equal(branch.attrs.mr,undefined,'No negative marker margin before tags');assert.equal(asked.filter(id=>id==='worktree').length,1,'Read tags once for this row');
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
// Attached rows keep their own numbers; only the coordinator has a trailing chain.
context.pluginWorkspaceLinks=()=>[{parent:'parent',child:'worktree-a',binding:'pair'}];
const projected=view.ordered(),parentAt=projected.findIndex(r=>r.w.id==='parent');
assert.equal(projected[parentAt+1].w.id,'worktree-a');assert.equal(projected[parentAt+1].linked,true);
const ordinaryTags=context.pluginSpaceTags,tagReads=[];
context.pluginSpaceTags=space=>{
 tagReads.push(space.id);
 return ['parent','worktree-a'].includes(space.id)?[{plugin:'crew',label:'Crew',tooltip:space.id==='parent'?'Crew coordinator':'Crew worker'}]:[];
};
const fleetRow=view.row(projected[parentAt+1],theme),fleetContent=find(fleetRow,'space-content-worktree-a');
const fleetBadge=fleetContent.kids[0];
const parentRow=view.row(projected[parentAt],theme),parentContent=find(parentRow,'space-content-parent');
const ordinaryRow=view.row(projected.find(r=>r.w.id==='other'),theme),ordinaryContent=find(ordinaryRow,'space-content-other');
for(const [row,content] of [[parentRow,parentContent],[ordinaryRow,ordinaryContent],[fleetRow,fleetContent]]) {
 assert.equal(row.attrs.h[0],28);assert.equal(row.attrs.px[0],8);
 assert.equal(content.attrs.pl,undefined);assert.equal(content.attrs.items_center.length,0);
 assert.equal(content.kids[0].attrs.size[0],16,'Attached and ordinary numbered badges have the same square box');
 assert.ok(content.kids[0].attrs.flex_none,'Badge slots cannot shrink');
 assert.equal(content.attrs.gap[0],8);
 assert.equal(row.attrs.px[0]+content.kids[0].attrs.size[0]+content.attrs.gap[0],32,'Every space name starts at the same left edge');
 assert.equal((row.attrs.h[0]-content.kids[0].attrs.size[0])/2,6,'Every badge box is vertically centered with the same inset');
}
assert.equal(fleetBadge.attrs.bg[0],parentContent.kids[0].attrs.bg[0],'Fleet shell uses the coordinator badge fill');
assert.equal(fleetBadge.attrs.rounded[0],4);assert.equal(fleetBadge.attrs.text_color[0],'#ffffff');
assert.equal(fleetBadge.kids[0],String(projected[parentAt+1].i+1),'Fleet retains its own list number');
assert.equal(find(fleetRow,'space-link-worktree-a'),undefined);
const chain=find(parentRow,'space-link-parent');
assert.equal(chain.attrs.size[0],16);assert.equal(chain.attrs.bg,undefined);
assert.equal(chain.kids[0].attrs.asset[0],'mods/custom-spaces/link.svg');assert.equal(chain.kids[0].attrs.size[0],14);
assert.equal(chain.kids[0].attrs.text_color[0],theme.muted);assert.equal(chain.attrs.absolute,undefined);
assert.equal(parentContent.kids.at(-2),chain,'Chain immediately precedes Crew');
for(const active of [false,true]) {
 const record=projected[parentAt+1],name={...record.w,active,directory:'/fixture/full-name'};
 const fleet=view.row({...record,w:name},theme),ordinary=view.row({w:{...name,id:'ordinary'},i:0},theme);
 const title=find(fleet,'space-content-worktree-a').kids[1],other=find(ordinary,'space-content-ordinary').kids[1];
 assert.deepEqual(title.attrs,other.attrs,'Real shared title styles match ordinary selected/inactive text');
 assert.equal(title.attrs.text_color[0],active?theme.foreground:theme.muted);assert.ok(title.attrs.font_normal);
 assert.equal(title.attrs.tooltip[0],name.directory);assert.deepEqual(fleet.attrs.bg,ordinary.attrs.bg);
 assert.deepEqual(fleet.itemOptions.hover(element()).attrs,ordinary.itemOptions.hover(element()).attrs,'Hover follows ordinary selection treatment');
}
assert.equal(parentContent.kids[1].attrs.text_color[0],theme.muted,'Inactive coordinator uses ordinary shared title styling');
for(const machine of [null,'pc2']) {
 const pills=[];
 for(const [record,tooltip] of [[projected[parentAt],'Crew coordinator'],[projected[parentAt+1],'Crew worker']]) {
  const row=view.row({...record,w:{...record.w,machine},g:{linked:true}},theme);
  const content=find(row,`space-content-${record.w.id}`),pill=find(row,`space-tag-${record.w.id}-crew-0`),marker=find(row,`space-worktree-${record.w.id}`);
  assert.deepEqual(pill.kids,['Crew']);assert.equal(pill.attrs.tooltip[0],tooltip);
  const link=find(row,`space-link-${record.w.id}`);
  assert.equal(content.kids.indexOf(marker)+1,link?content.kids.indexOf(link):content.kids.indexOf(pill),'Counts/worktree then chain then Crew');
  if(link) {assert.equal(link.attrs.size[0],marker.attrs.size[0]);assert.equal(link.kids[0].attrs.size[0],marker.kids[0].attrs.size[0]);assert.equal(link.kids[0].attrs.text_color[0],marker.kids[0].attrs.text_color[0]);}
  assert.equal(content.kids.at(-1),pill);
  assert.equal(row.attrs.px[0]+pill.attrs.mr[0],3,'Both Crew pills share the existing tag-only right edge');
  assert.equal(marker.attrs.mr,undefined,'Tagged marker keeps the full gap before its pill');
  assert.equal(pill.attrs.h[0],18);assert.equal(pill.attrs.rounded[0],5);assert.equal(pill.attrs.bg[0],`${theme.muted}26`);
  const {id,tooltip:tip,...style}=pill.attrs;pills.push(JSON.parse(JSON.stringify(style)));
 }
 assert.deepEqual(pills[1],pills[0],'The real shared rolePill styling matches on both attached rows');
}
// Full coordinator metadata matrix: count/worktree/chain/tag order and hidden states.
for(const machine of [null,'pc2'])for(const worktree of [false,true])for(const counts of [false,true]) {
 const record={...projected[parentAt],w:{...projected[parentAt].w,machine}};
 const originalTags=context.pluginSpaceTags;
 context.pluginSpaceTags=()=>[{plugin:'crew',label:'Crew',tooltip:'Coordinator'},{plugin:'other',label:'Other',tooltip:'Unrelated'},{plugin:'last',label:'Last'}];
 const row=view.row({...record,g:{linked:worktree,ahead:counts?2:0,behind:counts?1:0},tree:null},theme);
 const content=find(row,'space-content-parent'),link=find(row,'space-link-parent'),crew=find(row,'space-tag-parent-crew-0');
 assert.equal(content.kids.at(-1),crew);assert.equal(content.kids.at(-2),link);
 assert.equal(crew.attrs.mr[0],-5);assert.equal(crew.attrs.tooltip[0],'Coordinator');
 assert.equal(find(row,'space-tag-parent-other-1').attrs.tooltip[0],'Unrelated');
 assert.ok(content.kids.indexOf(find(row,'space-tag-parent-other-1'))<content.kids.indexOf(find(row,'space-tag-parent-last-2')),'Other tags retain relative order');
 const marker=find(row,'space-worktree-parent');assert.equal(Boolean(marker),worktree);
 assert.ok(content.kids.indexOf(content.kids[2])<content.kids.indexOf(link));
 if(marker)assert.ok(content.kids.indexOf(marker)<content.kids.indexOf(link));
 context.__store.set('spaces.show.worktree',false);
 const hidden=view.row({...record,g:{linked:true}},theme);
 assert.equal(find(hidden,'space-worktree-parent'),undefined);assert.ok(find(hidden,'space-link-parent'),'Worktree visibility does not hide relationship');
 context.__store.delete('spaces.show.worktree');
 view.rename={id:'parent'};
 const editing=view.row({...record,g:{linked:true}},theme);
 assert.equal(find(editing,'space-link-parent'),undefined);assert.equal(find(editing,'space-worktree-parent'),undefined);assert.equal(find(editing,'space-tag-parent-crew-0'),undefined);
 view.rename=null;
 assert.equal(find(view.row({...record,block:['parent']},theme),'space-link-parent'),undefined,'Detached coordinator has no chain');
 context.pluginSpaceTags=originalTags;
}
const vector=fs.readFileSync(new URL('../src/shared/link.svg',import.meta.url),'utf8');
assert.match(vector,/fill="none"/);assert.match(vector,/stroke="currentColor"/);assert.match(vector,/stroke-width="1.5"/);
assert.match(vector,/stroke-linecap="round"/);assert.match(vector,/stroke-linejoin="round"/);assert.match(vector,/d="M10 13a4/);
const manifest=JSON.parse(fs.readFileSync(new URL('../customization.json',import.meta.url),'utf8'));
assert.equal(manifest.files['mods/custom-spaces/link.svg'],'src/shared/link.svg');
assert.equal(manifest.files['mods/custom-spaces/fleet-elbow.svg'],undefined);
assert.equal(fs.existsSync(new URL('../src/shared/fleet-elbow.svg',import.meta.url)),false);
assert.doesNotMatch(source,/fleet-elbow|fleetConnector/);
drag.control=(e,options)=>{e.controlOptions=options;return e;};
const beforeRailReads=tagReads.length;
const compact=view.compact(projected[parentAt+1],theme),rail=find(compact,'space-badge-worktree-a');
const parentRail=view.compact(projected[parentAt],theme),parentRailBadge=find(parentRail,'space-badge-parent');
assert.equal(tagReads.length,beforeRailReads,'Compact rail does not query plugin tags');
for(const row of [compact,parentRail])assert.equal(row.kids.length,1,'Compact rail remains badge-only, without Crew pills');
context.pluginSpaceTags=ordinaryTags;
assert.equal(rail.attrs.size[0],parentRailBadge.attrs.size[0]);assert.equal(rail.attrs.size[0],16);
assert.equal(rail.attrs.bg[0],parentRailBadge.attrs.bg[0]);assert.equal(rail.attrs.rounded[0],4);
assert.equal(rail.kids[0],String(projected[parentAt+1].i+1),'Rail uses the fleet number, never a chain');
for(const active of [false,true]) {
 const record=projected[parentAt+1],fleet=view.compact({...record,w:{...record.w,active}},theme),ordinary=view.compact({w:{...record.w,id:'ordinary',active},i:0},theme);
 assert.deepEqual(fleet.attrs.bg,ordinary.attrs.bg);
 assert.deepEqual(fleet.controlOptions.hover(element()).attrs,ordinary.controlOptions.hover(element()).attrs,'Compact hover matches ordinary rows');
 assert.equal(fleet.kids.length,1);assert.equal(fleet.kids[0].attrs.text_color[0],'#ffffff');
}
assert.equal(compact.attrs.items_center.length,0);assert.equal(compact.attrs.justify_center.length,0);
assert.equal((28-rail.attrs.size[0])/2,(28-parentRailBadge.attrs.size[0])/2,'Rail icons and numbers have identical centering');
assert.equal(compact.attrs.w[0],28);assert.equal(compact.attrs.h[0],28);assert.equal(compact.controlOptions.tooltip,projected[parentAt+1].w.directory||projected[parentAt+1].w.name,'Rail keeps the existing name/directory tooltip');
assert.ok(compact.attrs.on_click);assert.equal(find(view.compact(projected[parentAt],theme),'space-badge-parent').kids[0],String(projected[parentAt].i+1));
const oldRun=context.run,selected=[];context.run=(name,args)=>selected.push([name,args]);
compact.attrs.on_click[0]();assert.deepEqual(JSON.parse(JSON.stringify(selected)),[['space.select',{id:'worktree-a'}]]);context.run=oldRun;
// Real colour resolution: the child never inherits its own colour while attached.
const savedSpaces=hostSpaces;
for(const machine of [null,'pc2']) {
 hostSpaces=savedSpaces.map(s=>({...s,machine}));
 const records=view.ordered(),parent=records.find(r=>r.w.id==='parent'),fleet=records.find(r=>r.w.id==='worktree-a');
 const colors={'worktree-a':'#ff0044'};context.__store.set('space.colors',colors);
 for(const [color,expected] of [[undefined,'#22a99a'],['ansi3','#e3814f'],['#123abc','#123abc'],['ansi5','#8b7cf6']]) {
  if(color===undefined)delete colors.parent;else colors.parent=color;
  const before=JSON.stringify(colors);
  for(const active of [false,true])for(const record of [parent,fleet]) {
   const r={...record,w:{...record.w,active}},expanded=view.row(r,theme),compact=view.compact(r,theme);
   const shell=find(expanded,`space-content-${r.w.id}`).kids[0],rail=find(compact,`space-badge-${r.w.id}`);
   for(const b of [shell,rail]) {
    assert.equal(b.attrs.bg[0],expected,'Coordinator recolouring updates both badges in both modes');
    assert.equal(b.attrs.size[0],16);assert.equal(b.attrs.rounded[0],4);assert.equal(b.attrs.text_color[0],'#ffffff');
    assert.equal(b.kids[0],String(record.i+1),'Both badges retain their own numbers in every colour');
   }
  }
  assert.equal(JSON.stringify(colors),before,'Rendering never copies colours into saved space preferences');
 }
 // Attachment off (or its parent absent) restores the child's own numbered badge.
 for(const r of [{...fleet,linked:false},{...fleet,block:['missing-parent',fleet.w.id]}]) {
  const b=view.spaceBadge(r,theme);assert.equal(b.kids[0],String(fleet.i+1));assert.equal(b.attrs.bg[0],'#ff0044');
 }
 const crossMachine=view.spaceBadge({...fleet,w:{...fleet.w,machine:machine===null?'pc2':null}},theme);
 assert.equal(crossMachine.kids[0],String(fleet.i+1),'No colour borrowed from a cross-machine parent');
 context.__store.delete('space.colors');
}
hostSpaces=savedSpaces;
// Both origins retain their own name/number, with the row/rail's shared pair colour.
let previewCalls=0;drag.preview=(_id,_t,data)=>{previewCalls++;return data;};
for(const color of ['ansi3','#123abc'])for(const id of ['parent','worktree-a'])for(const phase of [undefined,'arm','return','fade']) {
 context.__store.set('space.colors',{parent:color,'worktree-a':'#ff0044'});
 const record=view.ordered().find(r=>r.w.id===id),rowBadge=find(view.row(record,theme),`space-content-${id}`).kids[0];
 const railBadge=find(view.compact(record,theme),`space-badge-${id}`);
 drag.view={id,phase,meta:{sources:['parent','worktree-a'],binding:'pair'}};
 const captured=JSON.stringify(drag.view),before=previewCalls,preview=view.dragPreview(theme);
 assert.equal(previewCalls,before+1,'Exactly one preview call per rendered chip');
 assert.equal(preview.label,id);assert.equal(preview.icon.kids[0],String(hostSpaces.findIndex(s=>s.id===id)+1),'Grabbed member retains its own list number');
 assert.deepEqual(preview.icon.kids,rowBadge.kids);assert.deepEqual(preview.icon.attrs,rowBadge.attrs);
 assert.equal(preview.icon.attrs.bg[0],railBadge.attrs.bg[0],'Coordinator recolouring stays in sync across row/rail/chip');
 assert.equal(Object.hasOwn(preview,'rows'),false,'No stacked-row preview data');
 assert.equal(typeof preview.icon.kids[0],'string','Neither chip contains a chain glyph');
 assert.equal(JSON.stringify(drag.view),captured,'Preview normalization never rewrites the pressed ID or paired sources');
}
context.__store.delete('space.colors');context.pluginWorkspaceLinks=()=>[];
for(const id of ['other','worktree-a']) {
 drag.view={id,meta:{sources:[id]}};
 const preview=view.dragPreview(theme);
 assert.equal(preview.label,id);assert.equal(preview.icon.kids[0],String(hostSpaces.findIndex(s=>s.id===id)+1),'Unlinked previews keep their own badge and name');
 assert.equal(Object.hasOwn(preview,'rows'),false);
}
drag.view={id:'missing'};assert.equal(view.dragPreview(theme),null);
drag.view={id:'worktree-a',meta:{sources:['missing-parent','worktree-a']}};assert.equal(view.dragPreview(theme),null,'A missing coordinator cannot produce a mismatched chip');
drag.view=null;assert.equal(view.dragPreview(theme),null);
context.pluginWorkspaceLinks=()=>[];assert.equal(view.ordered().find(r=>r.w.id==='worktree-a').linked,false);
context.__store.set('space.colors',{parent:'#123abc','worktree-a':'#ff0044'});
const detached=view.ordered().find(r=>r.w.id==='worktree-a');
assert.equal(find(view.row(detached,theme),'space-content-worktree-a').kids[0].attrs.bg[0],'#ff0044');
assert.equal(find(view.compact(detached,theme),'space-badge-worktree-a').attrs.bg[0],'#ff0044','Actual detached projection restores the fleet colour in both modes');
drag.view={id:'worktree-a',meta:{sources:['worktree-a']}};
const detachedChip=view.dragPreview(theme);
assert.equal(detachedChip.label,detached.w.name);assert.equal(detachedChip.icon.kids[0],String(detached.i+1));
assert.equal(detachedChip.icon.attrs.bg[0],'#ff0044','Attachment-off chip retains the fleet independent saved colour');
drag.view=null;context.__store.delete('space.colors');
// Compare actual machine header and row trailing slots, including tags and the left-aligned fleet name.
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
  assert.equal(marker.attrs.size[0],16);
  if(!tags.length) {
   assert.equal(content.kids.at(-1),marker);
   assert.equal(row.attrs.px[0]+marker.attrs.mr[0]+marker.attrs.size[0]/2,axis,'Untagged worktrees still align with the chevron');
  } else {
   const pills=content.attrs.children[0];assert.equal(content.kids.at(-1),pills.at(-1));
   assert.equal(row.attrs.px[0]+pills.at(-1).attrs.mr[0],3,'Last tag uses the tag-only edge for ordinary and attached worktrees');
   assert.equal(marker.attrs.mr,undefined);
   for(const [k,pill] of pills.entries()) {
    assert.ok(content.kids.indexOf(marker)<content.kids.indexOf(pill));
    assert.equal(pill.attrs.mr?.[0],k===pills.length-1?-5:undefined);
   }
  }
 }
}
// Reproduce the screenshot: tag-only coordinator, counts + marker + tag on fleet.
for(const machine of [null,'pc2'])for(const active of [false,true]) {
 context.__tags=[{plugin:'crew',label:'Crew'}];
 const parent=view.row({w:{id:'parent',name:'coordinator',machine},i:0},theme);
 const fleet=view.row({w:{id:'worktree-a',name:'long-fleet-name-that-truncates',machine,active},i:1,linked:true,g:{linked:true,ahead:2,behind:1}},theme);
 const content=find(fleet,'space-content-worktree-a'),tail=content.kids[2],marker=find(fleet,'space-worktree-worktree-a');
 assert.deepEqual(tail.kids.map(n=>n.kids[0]),['↑2','↓1'],'Counts stay together before the marker');
 assert.equal(content.kids.indexOf(tail)+1,content.kids.indexOf(marker));
 assert.equal(content.kids.at(-1).attrs.id[0],'space-tag-worktree-a-crew-0');
 const parentContent=find(parent,'space-content-parent');
 assert.equal(parent.attrs.px[0]+parentContent.kids.at(-1).attrs.mr[0],fleet.attrs.px[0]+content.kids.at(-1).attrs.mr[0],'Screenshot Crew pills have exactly the same right inset');
 context.__store.set('spaces.show.worktree',false);
 const hidden=view.row({w:{id:'worktree-a',name:'fleet',machine},i:1,linked:true,g:{linked:true,ahead:2}},theme);
 assert.equal(find(hidden,'space-worktree-worktree-a'),undefined);
 assert.equal(find(hidden,'space-content-worktree-a').kids.at(-1).attrs.mr[0],-5,'Hiding a marker cannot move the tag');
 context.__store.clear();
}
context.__tags=[{plugin:'crew',label:'Crew'}];
const tagOnly=find(view.row({w,i:0,g:null},theme),'space-content-worktree');assert.equal(tagOnly.kids.at(-1).attrs.mr[0],-5,'Tag-only rows retain their old edge');
view.rename={id:w.id};assert.equal(find(view.row({w,i:0,g:{linked:true}},theme),'space-worktree-worktree'),undefined);view.rename=null;
// A visually retained pair cannot fall through to an independent one-space move.
context.pluginWorkspaceLinks=options=>options?.presentation?[{parent:'parent',child:'worktree-a',binding:'cached'}]:[];
const retained=view.ordered().find(r=>r.w.id==='worktree-a');assert.equal(retained.linked,true);
context.__store.set('space.colors',{parent:'#aabbcc','worktree-a':'#ff0044'});
assert.equal(view.spaceBadge(retained,theme).attrs.bg[0],'#aabbcc','Retained display identity supplies colour without requiring fresh action authority');context.__store.delete('space.colors');
const guardedCalls=[];context.run=(...args)=>guardedCalls.push(args);
drag.take=()=>({kind:'drop',id:'worktree-a',target:'other',meta:{sources:['worktree-a']}});view.drop('other',{});
drag.take=()=>({kind:'drop',id:'other',target:'parent',meta:{sources:['other']}});view.drop('parent',{});
assert.equal(guardedCalls.length,0,'Neither grabbing nor targeting a retained unverified pair authorizes a move');
drag.take=()=>({kind:'click',id:'worktree-a'});view.drop('worktree-a',{});assert.equal(guardedCalls[0][0],'space.select','Ordinary click selection remains available');
console.log('PASS: first-frame local/remote checkout snapshots; aligned tagged/child worktrees, own numbered badges, muted coordinator chain and ordinary selected fleet names, single grabbed-row drag chip, retained-pair action guards, preserved user order and cross-machine drag guards (dummy Core only)');
