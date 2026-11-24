import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,element,find,nodes,t} from './support/git-row.mjs';
const h=await rowHarness(),{panel,facts}=h;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function assertSuffix(geometry,label,height) {
  const box=geometry.get(label),suffix=find(label,`${label.attrs.id[0]}-ellipsis`);assert.ok(suffix,'An overflowing string has a separately styled ellipsis');
  const rendered=geometry.visibleTextLines.filter(line=>line.ancestors.includes(label)).map(line=>line.text).join('');
  assert.ok(rendered.endsWith('…')&&!rendered.endsWith('...'),'Rendered text ends with exactly U+2026, not ASCII periods or an underscore');
  assert.equal(suffix.kids.join(''),'…');assert.equal(suffix.attrs.font_family[0],'Segoe UI');assert.ok(suffix.attrs.font_normal,'The suffix cannot inherit the flat Geist semibold face');
  assert.equal(label.attrs.truncate,undefined,'Do not append the native Geist truncation glyph as well');
  const glyph=geometry.get(suffix);
  assert.ok(glyph.x>=box.x-1e-6&&glyph.x+glyph.width<=box.x+box.width+1e-6,'Suffix fits horizontally');
  assert.ok(glyph.y>=box.y-1e-6&&glyph.y+glyph.height<=box.y+box.height+1e-6,'Complete glyph/line box fits vertically');
  near(glyph.height,height);near(box.height,height);
  const prefix=geometry.visibleTextLines.filter(line=>line.ancestors.includes(label)&&!line.ancestors.includes(suffix));
  for(const line of prefix) {
    const cell=line.ancestors.at(-1),bounds=geometry.get(cell);
    assert.ok(line.naturalWidth<=bounds.width+0.01,'Measured prefix fits its reserved run, without a partially clipped final glyph');
  }
  return suffix;
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
  const {tree,geometry}=h.settle(build,width,zoom,600),row=find(tree,`${ghost?'swap-':''}pr-${id}`),title=find(row,`${ghost?'swap-':''}pr-title-${id}`);
  assertSuffix(geometry,title,20*zoom);near(geometry.get(row).height,74*zoom);assert.equal(title.attrs.tooltip[0],pr.title);
  assert.equal(title.attrs.font_semibold.length,0,'Title content retains its original weight');comparisons++;
}
// Actual coordinator and ordinary repository-name callers use the same suffix,
// retaining their original 18px lower text line and fixed header outer geometry.
for(const zoom of [1,1.3])for(const width of [280,390])for(const folded of [false,true]) {
  h.setZoom(zoom);panel.context='tasks:home';const repo='owner/'+('a-very-long-repository-name-'.repeat(15));
  panel.foldedRepositories=new Set(folded?[repo]:[]);panel.aggregate.context={scope:'home'};
  const section=h.settle(()=>panel.repositorySection(t,{repo,rows:[]},'home'),width,zoom);
  const label=find(section.tree,`task-repo-name-home-${repo}`);assertSuffix(section.geometry,label,18*zoom);
  near(section.geometry.get(find(section.tree,`task-repo-header-${repo}`)).height,28*zoom);
  panel.context='ordinary';const ordinary=h.settle(()=>panel.measuredText('git-repo-name',repo,{font:12,height:18,truncate:true}),width,zoom);
  assertSuffix(ordinary.geometry,ordinary.tree,18*zoom);
}
// Fitting text stays byte-for-byte unchanged with no suffix or repeat-only tip.
for(const zoom of [1,1.3]) {
  h.setZoom(zoom);const short=h.settle(()=>panel.measuredText('pr-title-short','Short title',{font:13,height:20,weight:'semibold',truncate:true}),390,zoom);
  assert.equal(short.tree.kids.join(''),'Short title');assert.equal(short.tree.attrs.tooltip,undefined);
}
// Surrogate pairs, combining accents, variation selectors, skin modifiers and
// ZWJ emoji remain together at prefix boundaries; width choice is measured.
for(const text of ['🚀 '.repeat(80),'e\u0301'.repeat(80),'👩🏽‍💻 '.repeat(80)]) {
  const sample=h.settle(()=>panel.measuredText('pr-title-unicode',text,{font:13,height:20,weight:'semibold',truncate:true}),180);
  assertSuffix(sample.geometry,sample.tree,20);
  const fit=panel.pullTextBoxes.get('pr-title-unicode').fit;
  assert.ok(fit.parts.every(part=>!part.startsWith('\u200d')&&!/^[\udc00-\udfff\u0301\ufe0f]/u.test(part)));
}
// Mutations: wrong suffix and baseline-only containment cannot pass the oracle.
h.setZoom(1);const sample=h.settle(()=>panel.measuredText('pr-title-mutation',source.title,{font:13,height:20,weight:'semibold',truncate:true}),280),suffix=assertSuffix(sample.geometry,sample.tree,20);
suffix.kids[0]='...';assert.throws(()=>assertSuffix(rowGeometry(sample.tree,280),sample.tree,20),/U\+2026/);suffix.kids[0]='…';
suffix.relative().top(19);assert.throws(()=>assertSuffix(rowGeometry(sample.tree,280),sample.tree,20),/fits vertically/);
console.log(`PASS ${comparisons} measured Unicode ellipsis comparisons, complete suffix containment, original title weight, 18/20/74px geometry, all row/header paths, Unicode clusters and wrong-glyph/clipping mutations (synthetic; native font evidence documented separately)`);
