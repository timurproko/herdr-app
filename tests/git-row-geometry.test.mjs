import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,element,find,nodes,words,t} from './support/git-row.mjs';
// Independent host-semantics oracles: numbers multiply the effective font,
// including after inheritance; px strings stay absolute. Numeric size is pixels.
for(const zoom of [0.75,1,1.25,1.5,2])for(const [line,font,expected] of [[20,13,260],[18,11,198],[1.5,11,16.5],['20px',13,20],['18px',11,18]]) {
  const tree=element().text_size(17).line_height(line).child(element().text_size(font).size(24).child('sample'));
  const geometry=rowGeometry(tree,100,zoom),text=geometry.textLines[0];
  assert.equal(text.lineHeight,expected*zoom);assert.equal(text.fontSize,font*zoom);
  assert.equal(geometry.get(tree.kids[0]).width,24*zoom,'Numeric size remains pixels, not a font multiplier');
}
function assertChecksFit(geometry,row) {
  const check=nodes(row).find(n=>/^(?:swap-)?pr-checks-/.test(n.attrs?.id?.[0]??''));
  if(!check)return;
  const line=geometry.textLines.find(l=>l.ancestors.includes(check));
  assert.ok(line && /^\d+\/\d+$/.test(line.text),'A count must keep all digits');
  for(const ancestor of line.ancestors) {
    assert.equal(ancestor.attrs?.truncate,undefined,'Checks must never use an ellipsis');
    const box=geometry.get(ancestor);
    assert.ok(line.x>=box.x-1e-6 && line.x+line.naturalWidth<=box.x+box.width+1e-6,`Full count ${line.text} must fit ${ancestor.attrs?.id?.[0]??'ancestor'}`);
  }
}
function assertTextFits(geometry,row) {
  const lines=geometry.textLines.filter(line=>line.ancestors.includes(row));
  assert.ok(lines.length,'Loaded rows must contain measured text, not just empty boxes');
  for(const line of lines) {
    const cell=[...line.ancestors].reverse().find(node=>/^(?:swap-)?pr-(?:title-line|byline|meta)-/.test(node.attrs?.id?.[0]??''));
    assert.ok(cell,`Missing containing line cell for ${line.text}`);
    assert.ok(line.lineHeight<=geometry.get(cell).height+1e-6,`${cell.attrs.id[0]} text line height ${line.lineHeight} exceeds cell ${geometry.get(cell).height}: ${line.text}`);
  }
}
const h=await rowHarness(),{panel,facts,U}=h;
panel.foldedRepositories=new Set();
const source={number:17,title:'A deliberately very long PR title that must truncate at exactly the same boundary',url:'https://github.com/owner/repo/pull/17',author:{login:'long-author-name'},createdAt:'2026-11-20T10:00:00Z',state:'OPEN'};
const labels=[{name:'🤖 Review',color:'840479'},{name:'🚀 Very long label '.repeat(12),color:'ffffff'}];
const cases=[
  ['empty',{}],['tasks untouched',{body:'- [ ] one\n- [ ] two'}],['tasks partial',{body:'- [x] one\n- [ ] two'}],['tasks done',{body:'- [x] one\n- [x] two'}],
  ['large tasks',{body:Array.from({length:100},(_,i)=>`- [${i<99?'x':' '}] task`).join('\n')}],
  ...['SUCCESS','FAILURE','PENDING'].map(state=>[`checks ${state}`,{statusCheckRollup:[{name:'CI',status:state==='PENDING'?'IN_PROGRESS':'COMPLETED',conclusion:state==='PENDING'?null:state}]}]),
  ...[1,10,11,99].flatMap(total=>['SUCCESS','FAILURE','PENDING'].map(state=>[`count ${state} ${total}`,{statusCheckRollup:Array.from({length:total},(_,i)=>({name:`check ${i}`,status:state==='PENDING'&&i>=3?'IN_PROGRESS':'COMPLETED',conclusion:state==='FAILURE'&&i===0?'FAILURE':'SUCCESS'}))}])),
  ['many checks',{statusCheckRollup:Array.from({length:101},(_,i)=>({name:`check ${i}`,status:'COMPLETED',conclusion:'SUCCESS'}))}],
  ['one label',{labels:labels.slice(0,1)}],['long labels',{labels}],['approved',{reviewDecision:'APPROVED'}],['changes requested',{reviewDecision:'CHANGES_REQUESTED'}],
  ['missing author',{author:null}],['conflict',{mergeable:'CONFLICTING'}],
  ...Array.from({length:16},(_,mask)=>[`optional mask ${mask}`,{body:mask&1?'- [x] done':'',statusCheckRollup:mask&2?[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}]:[],labels:mask&4?labels:[],reviewDecision:mask&8?'APPROVED':''}]),
];
const anchors=['state-slot','title-line','title','agent-slot','byline','number','author','time','meta','slot-tasks','slot-checks','slot-labels','slot-review'];
const plain=box=>Object.fromEntries(Object.entries(box).map(([k,v])=>[k,Number(v.toFixed(6))]));
let comparisons=0;
for(const mode of ['ordinary','pinned','scrolling','coordinator','ghost'])for(const state of ['OPEN','CLOSED','MERGED'])for(const width of [280,320,360,480])for(const zoom of [0.75,1,1.25,1.5,2]){
  h.setZoom(zoom);panel.view=state==='OPEN'?'open':'closed';
  const build=(overrides,agent)=>{
    h.setAgent(agent);
    const pr=facts.pullRow({...source,state,...overrides},'owner');if(mode==='coordinator')Object.assign(pr,{key:'owner/repo#17',repo:'owner/repo'});
    const next={...pr,number:18,key:pr.key?'owner/repo#18':undefined};
    const prefix=mode==='ghost'?'swap-':'',id=pr.key??pr.number;
    const tree=h.render(()=>{
      if(mode==='pinned'||mode==='scrolling'){
        panel.pulls[panel.view]=[pr,next];panel.agentPull=mode==='pinned'?17:null;return panel.renderPulls(t);
      }
      if(mode==='coordinator')return panel.repositorySection(t,{repo:'owner/repo',rows:[pr,next]},'home');
      return element().flex().flex_col().gap(U.rowGap).children([panel.pullRow(t,pr,mode==='ghost'),panel.pullRow(t,next,mode==='ghost')]);
    });
    const geometry=rowGeometry(tree,width,zoom,mode==='pinned'||mode==='scrolling'?600:undefined),row=find(tree,`${prefix}pr-${id}`),box=geometry.get(row);
    assertTextFits(geometry,row);assertChecksFit(geometry,row);
    for(const line of geometry.textLines.filter(l=>l.ancestors.includes(row)))assert.notEqual(line.text.trim(),'…');
    const task=find(row,`${prefix}pr-tasks-${id}`);
    if(task)assert.match(words(task).join(''),/^\d+\/\d+$/,'Tasks are whole compact fractions');
    for(const line of geometry.textLines.filter(l=>task && l.ancestors.includes(task)))for(const ancestor of line.ancestors) {
      const box=geometry.get(ancestor);assert.ok(line.x+line.naturalWidth<=box.x+box.width+1e-6,'Compact task fraction fits whole');
    }
    const time=find(row,`${prefix}pr-time-${id}`);
    if(words(time).join(''))assert.match(words(time).join(''),/^\d+(?:s|m|h|d|mo|y) ago$/);
    const snapshot=Object.fromEntries(anchors.map(kind=>{
      const node=find(row,`${prefix}pr-${kind}-${id}`);assert.ok(node,kind);return [kind,plain(geometry.get(node))];
    }));
    snapshot.row=plain(box);snapshot.next=plain(geometry.get(find(tree,`${prefix}pr-${pr.key?'owner/repo#18':18}`)));
    assert.equal(box.height,74*zoom);assert.equal(snapshot['title-line'].height,20*zoom);assert.equal(snapshot.byline.height,18*zoom);assert.equal(snapshot.meta.height,18*zoom);
    assert.equal(snapshot.title.x,Number(((box.x/zoom)+32)*zoom).toFixed(6)*1);
    assert.equal(snapshot.title.width,Number(((box.width/zoom)-68)*zoom).toFixed(6)*1,'Fixed title width includes the empty robot reservation');
    assert.equal(snapshot['agent-slot'].width,24*zoom);
    const button=find(row,`${prefix}pr-agent-${id}`),slot=find(row,`${prefix}pr-agent-slot-${id}`);
    assert.equal(Boolean(button),agent);
    if(!agent){assert.equal(slot.kids.length,0);assert.equal(slot.attrs.on_click,undefined);assert.equal(slot.attrs.role,undefined);}
    if(button){assert.equal(geometry.get(button).height,24*zoom);assert.equal(Boolean(button.attrs.on_click),mode!=='ghost');}
    for(const kind of ['tasks','checks','labels','review']){
      const slot=find(row,`${prefix}pr-slot-${kind}-${id}`),group=find(row,`${prefix}pr-${kind}-${id}`);
      if(!group)assert.equal(words(slot).join(''),'','No visible missing-data placeholder');
      if(group)assert.ok(group.attrs.tooltip?.[0],'Clipped content keeps its full value');
    }
    const meta=find(row,`${prefix}pr-meta-${id}`);
    assert.ok(nodes(meta).every(n=>!n.attrs.truncate),'No metadata cell can paint a lone ellipsis');
    const present=meta.kids.filter(n=>n.attrs.id).filter(n=>n.kids.length).length;
    assert.equal(meta.kids.filter(n=>!n.attrs.id&&!n.attrs.invisible).length,Math.max(0,present-1));
    if(pr.checks){const icon=geometry.get(find(row,`${prefix}pr-check-icon-${id}`));assert.equal(icon.width,12*zoom);assert.equal(icon.height,12*zoom);}
    assert.ok(nodes(row).every(n=>n.attrs.flex_wrap===undefined));
    return snapshot;
  };
  const baseline=build({},false);
  for(const [name,overrides] of cases)for(const agent of [false,true,false]){
    assert.deepEqual(build(overrides,agent),baseline,`${mode}/${state} width=${width} zoom=${zoom} ${name} agent=${agent}`);comparisons++;
  }
}
// The optional count badge must not move the neighboring Closed tab when data
// arrives. Unknown values reserve geometry without inventing a zero count.
for(const width of [280,320,360,480])for(const zoom of [0.75,1,1.25,1.5,2]){
  let baseline;
  for(const count of [null,0,1,99999]){
    const tree=h.render(()=>element().flex().gap(2).children([
      panel.segment(t,'open','Open',count,true,()=>{}),panel.segment(t,'closed','Closed',count,false,()=>{}),
    ]));
    const boxes=rowGeometry(tree,width,zoom),snapshot=['open','closed','open-count-slot','closed-count-slot'].map(id=>plain(boxes.get(find(tree,id))));
    baseline??=snapshot;assert.deepEqual(snapshot,baseline,`count=${count} width=${width} zoom=${zoom}`);
    if(count===null)assert.equal(words(find(tree,'open-count-slot')).join(''),'');
  }
}
// Reintroducing each reviewed numeric line-height bug must fail even though
// fixed row/cell dimensions still match. Exercise loaded ordinary/coordinator
// text and both live/ghost presentation at every tested zoom.
for(const coordinator of [false,true])for(const ghost of [false,true])for(const zoom of [0.75,1,1.25,1.5,2])for(const [kind,value] of [['title-line',20],['byline',18],['meta',18]]) {
  const pr=facts.pullRow({...source,body:'- [x] done',labels,reviewDecision:'APPROVED',statusCheckRollup:[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}]},'owner');
  if(coordinator)Object.assign(pr,{key:'owner/repo#17',repo:'owner/repo'});
  const row=panel.pullRow(t,pr,ghost),cell=find(row,`${ghost?'swap-':''}pr-${kind}-${pr.key??17}`);
  assertTextFits(rowGeometry(row,360,zoom),row);
  cell.line_height(value);
  assert.throws(()=>assertTextFits(rowGeometry(row,360,zoom),row),/text line height .* exceeds cell/,`${kind} numeric multiplier must expose clipped text, coordinator=${coordinator} ghost=${ghost} zoom=${zoom}`);
}
// Mutation sensitivity: the solver sees the original disappearing-robot defect,
// and a content-sized metadata cell would move its neighbors.
h.setAgent(false);const pr=facts.pullRow(source,'owner');const row=panel.pullRow(t,pr),before=rowGeometry(row,360).get(find(row,'pr-title-17'));
const titleLine=find(row,'pr-title-line-17');titleLine.kids.pop();
assert.notEqual(rowGeometry(row,360).get(find(row,'pr-title-17')).width,before.width,'Removing the empty robot slot must fail the title-boundary oracle');
const packed=panel.pullRow(t,pr),slot=find(packed,'pr-slot-tasks-17'),checks=find(packed,'pr-slot-checks-17');
const x=rowGeometry(packed,360).get(checks).x;delete slot.attrs.w;delete slot.attrs.flex_basis;delete slot.attrs.flex_grow;slot.child('Content sized task label');
assert.notEqual(rowGeometry(packed,360).get(checks).x,x,'Content-sized metadata must fail the anchor oracle');
// The former tiny allocation must fail despite unchanged outer heights.
const counted=panel.pullRow(t,facts.pullRow({...source,statusCheckRollup:Array.from({length:99},(_,i)=>({name:`CI ${i}`,status:'COMPLETED',conclusion:'SUCCESS'}))},'owner'));
assertChecksFit(rowGeometry(counted,280),counted);
find(counted,'pr-slot-checks-17').w(18);
assert.throws(()=>assertChecksFit(rowGeometry(counted,280),counted),/Full count .* must fit/);
console.log(`PASS ${comparisons} resolved-box comparisons: actual ordinary/pin/list/coordinator/ghost rows, optional agent/tasks/checks/labels/review/author/conflict, four widths, five zooms, inert blank cells, font-relative numeric versus absolute px line heights, text containment and 60 clipping mutations (synthetic, not GPUI pixels)`);
