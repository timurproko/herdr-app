import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,find,nodes,t} from './support/git-row.mjs';
const h=await rowHarness(),{panel,facts}=h;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function assertNativeTitle(geometry,label,height,full) {
  assert.equal(label.attrs.font_family[0],'Segoe UI','Native U+2026 uses the face proven to paint distinct dots');
  assert.ok(label.attrs.truncate,'Native truncation owns U+2026; no prefix search or custom ASCII suffix');
  assert.equal(label.kids[0],full,'Complete string goes to native shaping unchanged');
  assert.equal(label.attrs.tooltip[0],full,'Approved always-full-title fallback needs no fit callback');
  assert.equal(label.attrs.on_size_change,undefined,'Title edits cannot lose an available-width measurement: there is none');
  const box=geometry.get(label);near(box.height,height);
  for(const line of geometry.visibleTextLines.filter(line=>line.ancestors.includes(label)))assert.ok(line.lineHeight<=box.height+1e-6,'Native glyph line box remains contained');
  assert.ok(!nodes(label).some(node=>/measure|prefix|ellipsis/.test(node.attrs.id?.[0]?.slice(label.attrs.id[0].length)??'')),'No title/prefix/suffix probe');
}
const source={number:17,title:'feature(status): add bounded fleet overview and readable headers '.repeat(5),state:'OPEN',author:{login:'author'},createdAt:'2026-11-20T10:00:00Z',body:'- [x] done',statusCheckRollup:[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}]};
let comparisons=0;
for(const mode of ['ordinary','pinned','scrolling','coordinator','ghost','coordinator-ghost'])for(const state of ['OPEN','CLOSED','MERGED'])for(const width of [280,320,360,390,480])for(const zoom of [0.75,1,1.25,1.3,1.5,2]) {
  h.setZoom(zoom);panel.view=state==='OPEN'?'open':'closed';panel.context=mode.startsWith('coordinator')?'tasks:home':'ordinary';
  const pr=facts.pullRow({...source,state},'owner');if(mode.startsWith('coordinator'))Object.assign(pr,{key:'owner/repo#17',repo:'owner/repo'});
  const ghost=mode.endsWith('ghost'),id=pr.key??17;
  const build=()=>{
    if(mode==='pinned'||mode==='scrolling') {panel.pulls[panel.view]=[pr];panel.agentPull=mode==='pinned'?17:null;return panel.renderPulls(t);}
    if(mode==='coordinator')return panel.repositorySection(t,{repo:'owner/repo',rows:[pr]},'home');
    return panel.pullRow(t,pr,ghost);
  };
  const {tree,geometry}=h.settleChanged(build,width,zoom,600),row=find(tree,`${ghost?'swap-':''}pr-${id}`),title=find(row,`${ghost?'swap-':''}pr-title-${id}`);
  assertNativeTitle(geometry,title,20*zoom,pr.title);near(geometry.get(row).height,74*zoom);assert.ok(title.attrs.font_semibold);comparisons++;
}
// Review finding: a changed title/style on the SAME native ID and SAME 200px
// width receives no size callback. Native shaping + unconditional title hover
// must still update; lower-line available geometry must also survive by ID.
for(const coordinator of [false,true])for(const ghost of [false,true]) {
  panel.context=coordinator?'tasks:edit':'ordinary';h.setZoom(1);
  let pr={...facts.pullRow({...source,title:'Short'},'owner'),...(coordinator?{key:'owner/repo#17',repo:'owner/repo'}:{})};
  const build=()=>panel.pullRow(t,pr,ghost),prefix=ghost?'swap-':'',id=pr.key??17;
  const before=h.settleChanged(build,200),oldTitle=before.geometry.get(find(before.tree,`${prefix}pr-title-${id}`));
  const available=panel.pullLineSizes.get(`${prefix}pr-meta-${id}`).available;
  pr={...pr,title:'Changed long title '.repeat(120)};
  const after=h.settleChanged(build,200),title=find(after.tree,`${prefix}pr-title-${id}`);
  assert.deepEqual(after.geometry.get(title),oldTitle,'Allocated native box is unchanged');assertNativeTitle(after.geometry,title,20,pr.title);
  assert.equal(panel.pullLineSizes.get(`${prefix}pr-meta-${id}`).available,available,'Lower-line geometry survives changed facts');
  h.setFont('A different interface face');const restyled=h.settleChanged(build,200);assertNativeTitle(restyled.geometry,find(restyled.tree,`${prefix}pr-title-${id}`),20,pr.title);h.setFont('Geist');
  const physical=panel.pullLineSizes.get(`${prefix}pr-meta-${id}`).availablePhysical;
  h.setZoom(1.3);h.render(build);assert.equal(panel.pullLineSizes.get(`${prefix}pr-meta-${id}`).available,physical/1.3,'Zoom invalidation re-normalizes preserved physical width without any size callback');
  h.setZoom(1);
}
for(const zoom of [1,1.3])for(const width of [280,390])for(const folded of [false,true]) {
  h.setZoom(zoom);panel.context='tasks:home';const repo='owner/'+('very-long-repository-name-'.repeat(12));
  panel.foldedRepositories=new Set(folded?[repo]:[]);panel.aggregate.context={scope:'home'};
  const section=h.settleChanged(()=>panel.repositorySection(t,{repo,rows:[]},'home'),width,zoom),label=find(section.tree,`task-repo-name-home-${repo}`);
  assert.equal(label.attrs.tooltip[0],repo);assert.equal(label.attrs.font_family[0],'Segoe UI');assert.ok(label.kids[0].attrs.truncate);
  near(section.geometry.get(label).height,18*zoom);near(section.geometry.get(find(section.tree,`task-repo-header-${repo}`)).height,28*zoom);
  panel.context='ordinary';const ordinary=h.settleChanged(()=>panel.pullTitle('git-repo-name',repo,12,18),width,zoom);assertNativeTitle(ordinary.geometry,ordinary.tree,18*zoom,repo);
}
// Header intrinsic-key changes also retain allocated geometry by native ID.
panel.context='tasks:geometry';panel.aggregate.context={scope:'geometry'};h.setZoom(1);
const repo='owner/'+('long-repository-'.repeat(30)),headerId=`task-repo-name-geometry-${repo}`;
h.settleChanged(()=>panel.repositoryNameLabel(repo,'geometry'),240);
const saved=panel.repositoryNameSizes.get(headerId),physical=saved.available;
h.setZoom(1.3);let header=h.render(()=>panel.repositoryNameLabel(repo,'geometry')),g=rowGeometry(header,240/1.3,1.3);
for(const node of nodes(header).filter(n=>n.attrs.id?.[0]?.includes('-intrinsic-measure-')))node.attrs.on_size_change[0](g.get(node),h.cx);
header=h.render(()=>panel.repositoryNameLabel(repo,'geometry'));
assert.equal(panel.repositoryNameSizes.get(headerId),saved);assert.equal(saved.available,physical);assert.equal(header.attrs.tooltip[0],repo,'Header fit completes without another allocated-size callback');
h.setZoom(1);const sample=h.settleChanged(()=>panel.pullTitle('pr-title-mutation','Long '.repeat(100)).font_semibold(),200);
sample.tree.font_family('Geist');assert.throws(()=>assertNativeTitle(rowGeometry(sample.tree,200),sample.tree,20,'Long '.repeat(100)),/face proven/);
sample.tree.font_family('Segoe UI').h(1);assert.throws(()=>assertNativeTitle(rowGeometry(sample.tree,200),sample.tree,1,'Long '.repeat(100)),/contained/);
console.log(`PASS ${comparisons} native Segoe UI truncation/fixed geometry cases, all row/header paths, same-ID changed-title/style with changed-size-only callbacks, no title measurement, full-title fallback and font/containment mutations (native pixels checked separately)`);
