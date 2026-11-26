// Actual packaged Spaces + shared Agents decorations. Synthetic native model only.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {element,svg,find,nodes,t,rowGeometry} from './support/git-row.mjs';
let all=[],links=[],tags=[],moves=[],selects=[],take=null,echoMoves=false;
const store=new Map(),storage=new Map();
const drag={view:null,active:false,control:(e,o)=>{e.controlOptions=o;return e;},item:(e,id,o)=>{e.itemOptions=o;return e;},sourceLayer:e=>e,guard:fn=>(...args)=>{if(!drag.active)return fn(...args);},take:()=>take,preview:(_id,_t,data)=>data};
const {Main,branch,fold}=await loadMod({mod:'custom-spaces',host:{openOverlay(){},watchFolder(){throw Error('No IO');},spaces:()=>all,panes:()=>[],machines:()=>[{name:'pc2',layout:'ready'}],settings:()=>({zoom:1}),theme:()=>t,shared:k=>store.get(k),setShared:(k,v)=>store.set(k,v),props:()=>null,window:()=>({active:false}),layout:()=>({id:'sidebar',size:{px:268}}),run:(name,args)=>{if(name==='space.move'){moves.push(args);if(echoMoves){const [moved]=all.splice(all.findIndex(s=>s.id===args.id),1);all.splice(args.index-1,0,moved);}}else if(name==='space.select')selects.push(args);else assert.fail(name);}},globals:{localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}},modules:{'main.js':'src/features/spaces/main.js','space-title.js':'src/ui/space-title.js','workspace-links.js':'src/shared/workspace-links.js','space-rename.js':{beginSpaceRename(){},cancelSpaceRename(){},saveSpaceRename(){},syncSpaceRename(){}},'sidebar-scroll.js':{sidebarScroll(){}},'ui.js':'src/ui/ui.js','gpui-kit':{View:class{},div:element,svg},'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Input:{},Popover:{},ScrollHandle:{new:()=>({})}},'reorder.js':{reorder:()=>drag},'plugins.js':{pluginWorkspaceLinks:()=>links,pluginSpaceTags:()=>tags,pluginEvent(){}},'directory.js':{displaySpace:s=>s,spaceDirectory:s=>({cwd:s.folder})},'space-color-state.js':{reconcileSpaceColors(){}},'tab-arrival.js':{startTabArrivals(){},tabArrivalMotion:(_v,e)=>e}},entry:'export {default as Main} from "./main.js";export {sidebarChildBranch as branch,sidebarParentFold as fold} from "./ui.js";'});
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
 assert.ok(crew);assert.equal(find(p,'space-meta-parent').kids.at(-1),find(p,'space-fold-parent'),'Disclosure is after Crew at the far right');
 assert.equal(crew.attrs.text_size[0],12);assert.equal(crew.attrs.text_color[0],t.dim);assert.equal(crew.attrs.bg,undefined,'Crew is plain metadata, not a pill');
 assert.equal(nodes(c).some(n=>String(n.attrs.id?.[0]).includes('-crew-')),false);
 assert.ok(nodes(c).some(n=>String(n.attrs.id?.[0]).includes('-other-')),'Unrelated child tags remain');
 assert.equal(badge(c).kids[0],'3');assert.equal(badge(p).kids[0],'1');assert.equal(c.attrs.h[0],26);assert.equal(p.attrs.h[0],28);
 const cb=find(c,'space-branch-child'),reference=branch(t,'└');
 for(const k of ['border_l','border_b','border_color','rounded_bl'])assert.deepEqual(cb.attrs[k],reference.attrs[k]);
 for(const zoom of [.75,1,1.3,2]){const boxes=rowGeometry(c,268,zoom),b=boxes.get(badge(c));assert.equal(b.x,32*zoom,'Child badge aligns with coordinator name');assert.equal(b.width,16*zoom);assert.equal(boxes.get(cb).x,16*zoom,'Stem aligns with parent badge centre');}
 const button=find(p,'space-fold-parent');assert.equal(button.attrs.size[0],24);
 assert.equal(find(p,'space-count-parent'),undefined);assert.equal(fold(t,{id:'agents',open:false,count:3,onToggle(){}}).kids.at(-1),'3','Agents still shows collapsed counts');
 for(const zoom of [1,1.3]) {
  const tree=element().flex().flex_col().children(view.grouped(t,false)),boxes=rowGeometry(tree,268,zoom);
  const right=n=>{const b=boxes.get(n);return b.x+b.width;},center=n=>{const b=boxes.get(n);return b.x+b.width/2;};
  near(center(find(tree,'space-fold-parent')),center(find(tree,`machine-fold-${machine??'local'}`)),'Chevron centres');
  near(right(find(tree,'space-tag-parent-crew-0')),right(find(tree,`machine-add-${machine??'local'}`)),'Crew and plus right edges');
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
 links=[];assert.ok(nodes(row('child')).some(n=>String(n.attrs.id?.[0]).includes('-crew-')),'Detached ordinary Crew tag rules return');
}
// Ordinary worktree metadata and same-machine reorder are still native-order based.
setSpaces();links=[];tags=[{plugin:'crew',label:'Crew'}];const w=all[1];
let r=view.row({w,i:1,g:{name:'repo',linked:true,ahead:2,behind:1}},t);
assert.equal(content(r,w.id).attrs.pl,undefined);const marker=find(r,'space-worktree-other');assert.ok(marker);assert.ok(content(r,w.id).kids.indexOf(marker)<content(r,w.id).kids.length-1);
view.rename={id:'other'};view.renameField=()=>element().child('editing');r=view.row({w,i:1,g:{linked:true}},t);assert.equal(find(r,'space-worktree-other'),undefined);assert.equal(nodes(r).some(n=>String(n.attrs.id?.[0]).startsWith('space-tag-')),false);view.rename=null;
take={kind:'drop',id:'child',target:'other'};view.drop('other',cx);assert.deepEqual({...moves.pop()},{id:'child',index:2});
all[2].machine='pc2';take={kind:'drop',id:'child',target:'other'};view.drop('other',cx);assert.equal(moves.length,0);
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
 near(right(find(collapsed,'space-count-parent')),235*zoom,'Count matches Agents numeric rail inside same row width');
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
  const original=[...all],block=record(id);view.blockCommit=null;view.connectedFolds().clear();
  take={kind:'drop',id,target:'other',meta:{sources:[...block.block],binding:block.binding}};
  view.drop('other',cx);for(let n=0;n<10;n++)view.blockCommit?.observe();
  assert.deepEqual(all.map(s=>s.id),['other','parent',...original.slice(2).map(s=>s.id)]);all=original;
 }
}
console.log('PASS actual Spaces one/two/three-child geometry, names, all-child folding, native numbering/selection/compact membership and any-member acknowledged block reorder');
