// Actual packaged Spaces + shared Agents decorations. Synthetic native model only.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {captureSpaceBlock,planBlockDrop} from '../src/shared/workspace-links.js';
import {element,svg,find,nodes,t,rowGeometry} from './support/git-row.mjs';
let all=[],links=[],tags=[],moves=[],selects=[],take=null,echoMoves=false;
const store=new Map(),storage=new Map();
const drag={view:null,active:false,control:(e,o)=>{e.controlOptions=o;return e;},item:(e,id,o)=>{e.itemOptions=o;return e;},sourceLayer:e=>e,guard:fn=>(...args)=>{if(!drag.active)return fn(...args);},take:()=>take,preview:(_id,_t,data)=>data};
const {Main,branch,fold}=await loadMod({mod:'custom-spaces',host:{openOverlay(){},watchFolder(){throw Error('No IO');},spaces:()=>all,panes:()=>[],machines:()=>[{name:'pc2',layout:'ready'}],settings:()=>({zoom:1}),theme:()=>t,shared:k=>store.get(k),setShared:(k,v)=>store.set(k,v),props:()=>null,window:()=>({active:false}),layout:()=>({id:'sidebar',size:{px:268}}),run:(name,args)=>{if(name==='space.move'){moves.push(args);if(echoMoves){const [moved]=all.splice(all.findIndex(s=>s.id===args.id),1);all.splice(args.index-1,0,moved);}}else if(name==='space.select')selects.push(args);else assert.fail(name);}},globals:{localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}},modules:{'main.js':'src/features/spaces/main.js','space-title.js':'src/ui/space-title.js','workspace-links.js':'src/shared/workspace-links.js','space-rename.js':{beginSpaceRename(){},cancelSpaceRename(){},saveSpaceRename(){},syncSpaceRename(){}},'sidebar-scroll.js':{sidebarScroll(){}},'ui.js':'src/ui/ui.js','gpui-kit':{View:class{},div:element,svg},'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Input:{new:()=>element()},Popover:{},ScrollHandle:{new:()=>({})}},'reorder.js':{reorder:()=>drag},'plugins.js':{pluginMenuItems:()=>[],pluginWorkspaceLinks:()=>links,pluginSpaceTags:()=>tags,pluginEvent(){}},'directory.js':{displaySpace:s=>s,spaceDirectory:s=>({cwd:s.folder})},'space-color-state.js':{reconcileSpaceColors(){}},'tab-arrival.js':{startTabArrivals(){},tabArrivalMotion:(_v,e)=>e}},entry:'export {default as Main} from "./main.js";export {sidebarChildBranch as branch,sidebarParentFold as fold} from "./ui.js";'});
const view=new Main();view.shown=new Set();view.born={};view.git={};view.machines=[{name:'pc2',state:'connected'}];view.reconnecting={};view.folded=new Set();view.rebuilt=()=>false;
const cx={stop_propagation(){},notify(){}};
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,`${message}: ${a} != ${b}`);
const setSpaces=(machine=null)=>{all=['parent','other','child'].map((id,i)=>({id,name:id,machine,folder:'/fixture/'+id,active:i===0}));view.shown=new Set(all.map(s=>s.id));links=[{parent:'parent',child:'child',binding:'exact-home-owner'}];};
const record=id=>view.ordered().find(r=>r.w.id===id),row=id=>view.row(record(id),t),content=(r,id)=>find(r,`space-content-${id}`),badge=r=>nodes(r).find(n=>n.attrs.size?.[0]===16 && n.attrs.rounded?.[0]===4);
for(const machine of [null,'pc2']) {
 setSpaces(machine);tags=[{plugin:'crew',label:'Crew',tooltip:'Crew role'},{plugin:'other',label:'Other',tooltip:'Other role'}];
 assert.deepEqual([...view.ordered()].map(r=>r.w.id),['parent','child','other']);assert.deepEqual([...view.ordered()].map(r=>r.i),[0,2,1]);
 const p=row('parent'),c=row('child');
 assert.equal(find(p,'space-link-parent'),undefined);assert.equal(find(c,'space-link-child'),undefined);
 const crew=find(p,'space-tag-parent-crew-0'),parentContent=content(p,'parent');
 assert.ok(crew);assert.equal(crew.kids[0],'crew','Only Spaces lowercases the coordinator label');assert.equal(tags[0].label,'Crew','Shared provider label is not rewritten');assert.equal(crew.attrs.tooltip[0],'Crew role');assert.equal(find(p,'space-meta-parent').kids.at(-1),find(p,'space-fold-parent'),'Disclosure is after Crew at the far right');
 assert.equal(crew.attrs.text_size[0],12);assert.equal(crew.attrs.text_color[0],t.dim);assert.equal(crew.attrs.bg,undefined,'Crew is plain metadata, not a pill');
 assert.equal(nodes(c).some(n=>String(n.attrs.id?.[0]).includes('-crew-')),false);
 assert.ok(nodes(c).some(n=>String(n.attrs.id?.[0]).includes('-other-')),'Unrelated child tags remain');
 assert.equal(badge(c).kids[0],'3');assert.equal(badge(p).kids[0],'1');assert.equal(c.attrs.h[0],26);assert.equal(p.attrs.h[0],28);
 const cb=find(c,'space-branch-child'),reference=branch(t,'└');
 for(const k of ['border_l','border_b','border_color','rounded_bl'])assert.deepEqual(cb.attrs[k],reference.attrs[k]);
 for(const zoom of [.75,1,1.3,2]){const boxes=rowGeometry(c,268,zoom),b=boxes.get(badge(c));assert.equal(b.x,32*zoom,'Child badge aligns with coordinator name');assert.equal(b.width,16*zoom);assert.equal(boxes.get(cb).x,16*zoom,'Stem aligns with parent badge centre');}
 const button=find(p,'space-fold-parent');assert.equal(button.attrs.size[0],24);
 assert.equal(find(p,'space-count-parent').kids[0].kids[0],'1','Expanded count stays visible');assert.equal(fold(t,{id:'agents',open:false,count:3,onToggle(){}}).kids.at(-1),'3','Agents still shows collapsed counts');
 for(const zoom of [1,1.3]) {
  const tree=element().flex().flex_col().children(view.grouped(t,false)),boxes=rowGeometry(tree,268,zoom);
  const right=n=>{const b=boxes.get(n);return b.x+b.width;},center=n=>{const b=boxes.get(n);return b.x+b.width/2;};
  near(center(find(tree,'space-fold-parent')),center(find(tree,`machine-fold-${machine??'local'}`)),'Chevron centres');
  near(center(find(tree,'space-count-parent')),center(find(tree,`machine-add-${machine??'local'}`)),'Count and plus share the inner axis');
  const crewEdge=right(find(tree,'space-tag-parent-crew-0'));view.connectedFolds().add(view.parentKey(record('parent')));
  const folded=element().flex().flex_col().children(view.grouped(t,false)),foldedBoxes=rowGeometry(folded,268,zoom);
  const crewBox=foldedBoxes.get(find(folded,'space-tag-parent-crew-0'));near(crewBox.x+crewBox.width,crewEdge,'Crew does not move on disclosure');view.connectedFolds().clear();
  near(right(find(tree,'space-fold-parent')),268*zoom,'24px hover ends on the row edge (outer gutter is supplied by scroller)');
 }
 button.attrs.on_click[0]({},cx);const collapsedTree=element().children(view.grouped(t,false));assert.equal(find(collapsedTree,'space-count-parent').kids[0].kids[0],'1','Collapsed count is connected spaces, excluding coordinator');
 assert.deepEqual(Array.from(view.visibleRows(false),r=>r.w.id),['parent','other']);assert.deepEqual(Array.from(view.visibleRows(true),r=>r.w.id),['parent','child','other']);
 assert.equal(selects.length,0);assert.equal(moves.length,0,'Folding cannot select or reorder');
 const reloaded=new Main();assert.deepEqual([...reloaded.connectedFolds()],[...view.connectedFolds()]);
 // A real native selection transition reveals its hidden child, without retargeting it.
 view.connectedSelection='parent';all.forEach(s=>s.active=s.id==='child');view.syncConnectedSelection(cx);assert.equal(view.connectedFolds().size,0);assert.equal(selects.length,0);
 drag.active=true;find(row('parent'),'space-fold-parent').attrs.on_click[0]({},cx);assert.equal(view.connectedFolds().size,0,'Disclosure is inert during drag');drag.active=false;
 // Worktree/rename controls remain independent from connector and tag choice.
 store.set('spaces.show.worktree',false);assert.ok(find(row('child'),'space-branch-child'));store.delete('spaces.show.worktree');
 for(const color of ['ansi3','#123abc']){store.set('space.colors',{parent:color,child:'#ff0044'});assert.equal(badge(row('parent')).attrs.bg[0],badge(row('child')).attrs.bg[0]);
  for(const id of ['parent','child']){drag.view={id,meta:{sources:['parent','child'],binding:'exact-home-owner'}};const preview=view.dragPreview(t);assert.equal(preview.label,id);assert.equal(preview.icon.kids[0],id==='parent'?'1':'3');assert.equal(preview.icon.attrs.bg[0],badge(row(id)).attrs.bg[0]);assert.equal(preview.rows,undefined);}}
 drag.view=null;store.delete('space.colors');
 const before=tags;tags=[];for(const id of ['parent','child']){const compact=view.compact(record(id),t);assert.equal(compact.kids.length,1);assert.equal(compact.attrs.h[0],28);assert.equal(badge(compact).kids[0],id==='parent'?'1':'3');}tags=before;
 // Detached and invalid cross-machine candidates use independent native order.
 links=[{parent:'parent',child:'child',binding:'cross'}];all[2].machine=machine===null?'pc2':null;
 assert.deepEqual(Array.from(view.ordered(),r=>r.w.id),['parent','other','child']);assert.equal(record('child').linked,false);
 links=[];assert.ok(nodes(row('child')).some(n=>String(n.attrs.id?.[0]).includes('-crew-')&&n.kids[0]==='crew'),'Detached ordinary Crew tag rules return with sidebar-only casing');
}
// Every rename kind uses the same trailing column, even indented children.
for(const machine of [null,'pc2'])for(const zoom of [1,1.3])for(const id of ['parent','child','other']) {
 setSpaces(machine);tags=[{plugin:'crew',label:'Crew'}];
 const normal=row('parent'),normalBoxes=rowGeometry(normal,268,zoom),axis=normalBoxes.get(find(normal,'space-fold-parent'));
 view.rename={id,input:{},handle:{}};const editing=row(id),boxes=rowGeometry(editing,268,zoom);
 const cancel=boxes.get(find(editing,`space-rename-cancel-${id}`)),apply=boxes.get(find(editing,`space-rename-apply-${id}`)),field=boxes.get(find(editing,`space-rename-field-${id}`));
 near(cancel.x+cancel.width/2,axis.x+axis.width/2,'Cancel replaces the chevron axis');
 const grouped=element().flex().flex_col().children(view.grouped(t,false)),header=rowGeometry(grouped,268,zoom).get(find(grouped,`machine-add-${machine??'local'}`));
 near(apply.x+apply.width/2,header.x+header.width/2,'Rename approve shares plus/count axis');
 near(cancel.width,24*zoom,'Shared action width');near(cancel.x-apply.x-apply.width,2*zoom,'Native tab action gap');near(apply.x-field.x-field.width,4*zoom,'Native tab input gap');
 assert.equal(find(editing,`space-fold-${id}`),undefined);assert.equal(find(editing,`space-tag-${id}-crew-0`),undefined);view.rename=null;
}
// Ordinary worktree metadata and same-machine reorder are still native-order based.
setSpaces();links=[];tags=[{plugin:'crew',label:'Crew'}];const w=all[1];
let r=view.row({w,i:1,g:{name:'repo',linked:true,ahead:2,behind:1}},t);
assert.equal(content(r,w.id).attrs.pl,undefined);const marker=find(r,'space-worktree-other');assert.ok(marker);assert.ok(content(r,w.id).kids.indexOf(marker)<content(r,w.id).kids.length-1);
view.rename={id:'other'};view.renameField=()=>element().child('editing');r=view.row({w,i:1,g:{linked:true}},t);assert.equal(find(r,'space-worktree-other'),undefined);assert.equal(nodes(r).some(n=>String(n.attrs.id?.[0]).startsWith('space-tag-')),false);view.rename=null;
take={kind:'drop',id:'child',target:'other'};view.drop('other',cx);assert.deepEqual({...moves.pop()},{id:'child',index:2});
all[2].machine='pc2';take={kind:'drop',id:'child',target:'other'};view.drop('other',cx);assert.equal(moves.length,0);
// Relationship loss between the last rendered gesture and release must not
// fall through to independent movement. No intervening render/reset is needed.
for(const id of ['parent','child1']) {
 all=['parent','child1','gap','child2','other-parent','foreign'].map(id=>({id,machine:null}));
 links=['child1','child2'].map(child=>({parent:'parent',child,binding:'verified'}));
 const before=all.map(s=>s.id),selected=selects.length;view.blockCommit=null;moves=[];
 take={kind:'drop',id,target:'child2',meta:captureSpaceBlock(all,links,id)};
 links=[];view.drop('child2',cx);
 assert.equal(moves.length,0,'Retired parent/child capture never uses the independent fallback');assert.equal(selects.length,selected);assert.deepEqual(all.map(s=>s.id),before);
}
// A NEW independent gesture after detachment still uses ordinary native ordering.
take={kind:'drop',id:'child1',target:'child2',meta:captureSpaceBlock(all,links,'child1')};view.drop('child2',cx);assert.deepEqual({...moves.pop()},{id:'child1',index:4});
setSpaces();echoMoves=true;moves=[];view.blockCommit=null;
view.connectedFolds().add(view.parentKey(record('parent')));
take={kind:'drop',id:'parent',target:'other',meta:{sources:['parent','child'],binding:'exact-home-owner'}};
view.drop('other',cx);for(let i=0;i<5;i++)view.blockCommit?.observe();
assert.deepEqual(all.map(s=>s.id),['other','parent','child'],'Collapsed parent moves its hidden child as one acknowledged block');assert.equal(view.blockCommit.pending,null);
assert.deepEqual(Array.from(view.visibleRows(false),r=>r.w.id),['other','parent']);
for(const count of [1,2,3])for(const zoom of [1,1.3]) {
 all=[{id:'parent',name:'Coordinator',active:true},{id:'other',name:'Other'},...Array.from({length:count},(_,i)=>({id:`child${i}`,name:'worktree',named:false}))];
 links=all.slice(2).map((s,i)=>({parent:'parent',child:s.id,binding:'verified',name:`project${i}`}));view.connectedFolds().clear();view.shown=new Set(all.map(s=>s.id));
 const ordered=view.ordered();assert.deepEqual(Array.from(ordered,r=>r.i),[0,...Array.from({length:count},(_,i)=>i+2),1]);
 view.connectedFolds().add(view.parentKey(record('parent')));const collapsed=row('parent'),boxes=rowGeometry(collapsed,268,zoom);
 const right=n=>{const b=boxes.get(n);return b.x+b.width;};
 assert.equal(find(collapsed,'space-count-parent').kids[0].kids[0],String(count));
 near(right(find(collapsed,'space-count-parent'))-12*zoom,230*zoom,'Count is centred on plus/approve axis');
 near(right(find(collapsed,'space-tag-parent-crew-0')),197*zoom,'Collapsed Crew matches Agents machine-label rail');
 view.connectedFolds().clear();
 for(let i=0;i<count;i++) {
  const rec=record(`child${i}`),tree=row(rec.w.id),boxes=rowGeometry(tree,268,zoom),branch=find(tree,`space-branch-${rec.w.id}`);
  assert.equal(rec.w.name,`project${i}`);assert.equal(boxes.get(badge(tree)).x,32*zoom);assert.equal(boxes.get(branch).x,16*zoom);
  assert.equal(branch.attrs.rounded_bl[0],i===count-1?6:0);assert.equal(Boolean(find(tree,`space-stem-${rec.w.id}`)),i<count-1);
  view.connectedFolds().add(view.parentKey(record('parent')));assert.deepEqual(Array.from(view.visibleRows(false),r=>r.w.id),['parent','other']);
  view.connectedSelection='parent';all.forEach(s=>s.active=s.id===rec.w.id);view.syncConnectedSelection(cx);assert.equal(view.connectedFolds().size,0);
  assert.equal(view.compact(rec,t).kids.length,1);assert.equal(badge(view.compact(rec,t)).kids[0],String(i+3));
 }
 for(const id of ['parent',...all.slice(2).map(s=>s.id)]) {
  const original=[...all],key=view.parentKey(record('parent'));view.blockCommit=null;view.connectedFolds().clear();
  const target=id==='parent'?'other':id==='child0'?`child${count-1}`:'child0',meta=captureSpaceBlock(all,links,id),expected=planBlockDrop(all,links,id,target,meta)??all.map(s=>s.id);
  take={kind:'drop',id,target,meta};
  view.drop(target,cx);for(let n=0;n<10;n++)view.blockCommit?.observe();
  assert.deepEqual(all.map(s=>s.id),expected);assert.equal(view.parentKey(record('parent')),key,'Sibling order does not invalidate parent fold identity');all=original;
 }
}
// Legacy fold keys survive canonicalization, including old order-sensitive bindings.
{
 const binding=JSON.stringify([['child-b','verified'],['child-a','verified']]);
 storage.set('custom.spaces.parents.folded',JSON.stringify([JSON.stringify([null,['parent','child-b','child-a'],binding])]));
 const restored=new Main(),key=restored.parentKey({w:{machine:null},block:['parent','child-a','child-b'],binding:JSON.stringify([['child-a','verified'],['child-b','verified']])});
 assert.ok(restored.connectedFolds().has(key));
}
// Shared centres remain fixed with long names, multiple digits and narrow sidebars.
view.renameField=Main.prototype.renameField;
for(const machine of [null,'pc2'])for(const width of [160,180,220,268,360])for(const zoom of [1,1.3])for(const count of [1,12,123]) {
 setSpaces(machine);all=[all[0],all[1],...Array.from({length:count},(_,i)=>({id:`child${i}`,machine,name:'A long child space name',active:false}))];
 all[0].name='A very long coordinator name that must truncate';view.shown=new Set(all.map(s=>s.id));links=all.slice(2).map(s=>({parent:'parent',child:s.id,binding:'verified'}));tags=[{plugin:'crew',label:'Crew'}];view.connectedFolds().clear();view.rename=null;
 let anchor;
 for(const folded of [false,true]) {
  folded?view.connectedFolds().add(view.parentKey(record('parent'))):view.connectedFolds().clear();
  const tree=element().flex().flex_col().children(view.grouped(t,false)),boxes=rowGeometry(tree,width,zoom),box=id=>boxes.get(find(tree,id));
  const axis=id=>{const b=box(id);return b.x+b.width/2;},crew=box('space-tag-parent-crew-0');
  anchor??=crew.x;near(crew.x,anchor,'Crew never moves');
  assert.equal(find(tree,'space-count-parent').kids[0].kids[0],String(count));
  near(axis('space-count-parent'),axis(`machine-add-${machine??'local'}`),'Count/plus inner centres at every width');
  near(axis('space-fold-parent'),axis(`machine-fold-${machine??'local'}`),'Outer centres at every width');
  for(const id of ['parent','child0','other']) {
   view.rename={id,input:{},handle:{}};const editing=view.row(record(id),t),eb=rowGeometry(editing,width,zoom),apply=eb.get(find(editing,`space-rename-apply-${id}`)),cancel=eb.get(find(editing,`space-rename-cancel-${id}`)),field=eb.get(find(editing,`space-rename-field-${id}`));
   near(apply.x+apply.width/2,axis('space-count-parent'),'Approve shares inner centre');near(cancel.x+cancel.width/2,axis('space-fold-parent'),'Cancel shares outer centre');
   assert.ok(field.width>0);near(apply.x-field.x-field.width,4*zoom,'Narrow field has the shared gap, never overlap');view.rename=null;
  }
 }
 // Removing attachments models combined view off; removing children models an empty fleet.
 const attached=row('parent'),attachedBoxes=rowGeometry(attached,width,zoom),crewAnchor=attachedBoxes.get(find(attached,'space-tag-parent-crew-0'));
 const savedLinks=links,savedSpaces=all;
 for(const mode of ['combined-off','childless']) {
  links=[];all=mode==='childless'?savedSpaces.slice(0,2):savedSpaces;
  const detached=row('parent'),boxes=rowGeometry(detached,width,zoom),crew=boxes.get(find(detached,'space-tag-parent-crew-0'));
  const grouped=element().flex().flex_col().children(view.grouped(t,false)),gb=rowGeometry(grouped,width,zoom);
  const disclosure=find(grouped,`machine-fold-${machine??'local'}`),glyph=gb.get(disclosure.kids[0]);
  near(crew.x+crew.width,glyph.x+glyph.width,'Childless Crew ends on the machine chevron edge in '+mode);near(crew.width,crewAnchor.width,'Crew font/width survives '+mode);
  assert.equal(find(detached,'space-count-parent'),undefined,'No fabricated count');assert.equal(find(detached,'space-fold-parent'),undefined,'No fabricated disclosure');
  const meta=find(detached,'space-meta-parent');assert.equal(meta.kids.length,1,'Childless rows reserve no empty count/disclosure rails');
 }
 links=savedLinks;all=savedSpaces;
 tags=[];assert.equal(find(row('other'),'space-count-other'),undefined,'Nonparent without Crew has no count');assert.equal(find(row('parent'),'space-tag-parent-crew-0'),undefined,'No fabricated role label');
}
console.log('PASS actual Spaces folding/native identity plus fixed Crew and count/plus/approve/chevron/cancel columns at 160–360px, 100/130%, with childless right-edge labels, multi-digit counts and narrow rename');
