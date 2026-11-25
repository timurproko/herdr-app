import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,find,nodes,t} from './support/git-row.mjs';
const h=await rowHarness(),{panel,facts}=h;
const source={number:17,title:'Short title',url:'https://github.com/owner/repo/pull/17',state:'OPEN',author:{login:'author'},createdAt:'2026-11-20T10:00:00Z',body:'- [x] one\n- [x] two',statusCheckRollup:[{name:'build',status:'COMPLETED',conclusion:'SUCCESS'}],labels:[{name:'bug',color:'ff0000'}],reviewDecision:'APPROVED'};
const now=Date.parse('2026-11-20T14:00:00Z'),tip=node=>node?.attrs.tooltip?.[0];
const fixture=(overrides={},width=480,zoom=1,coordinator=false,ghost=false)=>{
  h.setZoom(zoom);panel.context=coordinator?'tasks:home':'ordinary';
  const pr=facts.pullRow({...source,...overrides},'owner',now);if(coordinator)pr.key='owner/repo#17';
  const {tree,geometry}=h.settleChanged(()=>panel.pullRow(t,pr,ghost),width,zoom);
  return {pr,tree,geometry,get:kind=>find(tree,`${ghost?'swap-':''}pr-${kind}-${pr.key??17}`)};
};
let comparisons=0;
for(const coordinator of [false,true])for(const ghost of [false,true])for(const zoom of [0.75,1,1.25,1.3,1.5,2]) {
  const f=fixture({},480,zoom,coordinator,ghost),{tree,get}=f;
  assert.equal(tip(get('title')),f.pr.title,'Approved title fallback keeps the full title, without any title measurement');
  for(const kind of ['number','author','tasks','checks','labels','review','byline','meta'])assert.equal(tip(get(kind)),undefined,`${kind}: complete visible value has no repeat-only tooltip`);
  assert.equal(tip(get('labels').kids[0]),undefined,'Pills rely on the measured clipped/omitted group; no per-pill probe/tooltip');
  assert.ok(tip(get('time')).includes('opened 4 hours ago\n2026-11-20T10:00:00.000Z'));
  const noDate=fixture({createdAt:null},480,zoom,coordinator,ghost);assert.equal(tip(noDate.get('time')),undefined);
  const long=fixture({title:'A very long title '.repeat(30),author:{login:'a'.repeat(39)},labels:[{name:'A very long label '.repeat(30),color:'ff0000'}],body:Array.from({length:99},()=>'- [x] task').join('\n')},280,zoom,coordinator,ghost);
  assert.equal(tip(long.get('title')),long.pr.title);assert.equal(tip(long.get('author')),long.pr.login);
  assert.equal(tip(long.get('tasks')),long.pr.tasks.label);assert.ok(tip(long.get('time')).includes('2026-11-20T10:00:00.000Z'));
  assert.ok((tip(long.get('labels'))??tip(long.get('meta')))?.includes(long.pr.labels[0].name));
  const omitted=fixture({labels:Array.from({length:5},(_,i)=>({name:`label ${i}`,color:'ff0000'}))},480,zoom,true,ghost);
  assert.ok(tip(omitted.get('labels')).includes('label 4'));assert.ok(tip(omitted.get('meta')).includes('label 4'));
  const checks=fixture({statusCheckRollup:[{name:'tests',status:'COMPLETED',conclusion:'FAILURE'},{name:'lint',status:'IN_PROGRESS'}]},480,zoom,coordinator,ghost);
  assert.equal(tip(checks.get('checks')),'0/2\nFailed: tests\nPending: lint');assert.equal(tip(checks.get('meta')),undefined);
  assert.ok(nodes(tree).filter(n=>n.attrs.invisible).every(n=>nodes(n).every(p=>!tip(p))));comparisons++;
}
for(const coordinator of [false,true])for(const zoom of [1,1.3]) {
  const f=fixture({body:'- [x] one\n- [x] two\n- [x] three',reviewDecision:null,labels:[{name:'🤖 Rework',color:'840479'}],statusCheckRollup:Array.from({length:11},(_,i)=>({name:`CI ${i}`,status:'COMPLETED',conclusion:'SUCCESS'}))},390,zoom,coordinator);
  for(const kind of ['tasks','checks','labels','meta','byline'])assert.equal(tip(f.get(kind)),undefined,'Complete screenshot parts have no combined summary');
  assert.equal(tip(f.tree),undefined);assert.equal(tip(f.get('labels').kids[0]),undefined);
}
const check=(name,id,conclusion,status='COMPLETED',startedAt='2026-11-20T10:00:00Z')=>({name,workflowName:'CI',conclusion,status,startedAt,detailsUrl:`https://github.com/owner/repo/actions/runs/${id}/job/1`});
assert.equal(facts.checks([check('removed',1,'FAILURE'),check('build',2,'SUCCESS')]).details,undefined);
assert.deepEqual(Array.from(facts.checks([check('build',2,'FAILURE'),check('build',2,null,'IN_PROGRESS','2026-11-20T11:00:00Z')]).details),['Pending: CI / build']);
const updated=facts.refreshPullFacts(facts.pullRow(source,'owner',now),{...source,headRefOid:'head',checks:facts.checks([check('tests',2,'FAILURE')])});
assert.equal(updated.createdAt,source.createdAt);assert.deepEqual(Array.from(updated.checks.details),['Failed: CI / tests']);
// Four probes TOTAL, with first displayed rows first; callbacks amortize the
// remaining work without withholding rows, title text or full-title tooltips.
panel.context='ordinary';h.setZoom(1);h.setFont('Geist');panel.pullTextWidths.clear();panel.pullTextRequests.clear();
const rows=Array.from({length:100},(_,i)=>({...facts.pullRow(source,'owner',now),number:i+1,title:`Unmeasured long title ${i} `.repeat(20)}));
panel.pulls.open=rows;panel.view='open';panel.agentPull=null;
const build=()=>panel.renderPulls(t),cold=h.render(build),probes=nodes(cold).filter(n=>n.attrs.id?.[0]?.includes('-measure-'));
assert.equal(nodes(cold).filter(n=>/^pr-\d+$/.test(n.attrs.id?.[0]??'')).length,100);
assert.equal(probes.length,4);assert.ok(probes.every(n=>n.attrs.id[0].startsWith('pr-byline-1-')),'The first visible row gets the first measurements');
assert.ok(!nodes(cold).some(n=>/pr-(?:title|label).*measure/.test(n.attrs.id?.[0]??'')),'No title, per-pill or candidate-prefix probe exists');
const old=probes[0].attrs.on_size_change[0];panel.context='changed';let notifications=0;
old({width:999},{notify(){notifications++;}});assert.equal(notifications,0);assert.equal(panel.pullTextWidths.size,0);
panel.context='ordinary';h.setZoom(1.3);old({width:999},{notify(){notifications++;}});assert.equal(notifications,0);
h.setZoom(1);h.setFont('Other face');old({width:999},{notify(){notifications++;}});assert.equal(notifications,0);h.setFont('Geist');
let previous=0,settled;
for(let frame=0;frame<50;frame++) {
  const tree=h.render(build),geometry=rowGeometry(tree,390),pending=nodes(tree).filter(n=>n.attrs.id?.[0]?.includes('-measure-'));
  assert.ok(pending.length<=4);assert.equal(nodes(tree).filter(n=>/^pr-\d+$/.test(n.attrs.id?.[0]??'')).length,100);
  for(const node of pending)node.attrs.on_size_change[0](geometry.get(node),h.cx);
  assert.ok(panel.pullTextWidths.size>=previous);previous=panel.pullTextWidths.size;
  if(!pending.length){settled=tree;break;}
}
assert.ok(settled,'Background batches finish without a second timer or dropping rows');
assert.ok(!nodes(settled).some(n=>n.attrs.id?.[0]?.includes('-measure-')),'Warm snapshots have zero intrinsic probes');
for(let i=0;i<530;i++) {
  const pr={...facts.pullRow(source,'owner',now),number:i+1000};
  const tree=h.render(()=>panel.pullRow(t,pr)),geometry=rowGeometry(tree,390);
  for(const node of nodes(tree).filter(n=>n.attrs.id?.[0]?.includes('-measure-')))node.attrs.on_size_change[0](geometry.get(node),h.cx);
  assert.ok(panel.pullTextWidths.size<=512&&panel.pullTextRequests.size<=512,'Real callbacks enforce the cache/request bounds');
}
assert.ok(panel.pullTextWidths.size<=512&&panel.pullTextRequests.size<=512);
for(const state of ['OPEN','CLOSED','MERGED']) {
  const f=fixture({state,closedAt:source.createdAt,mergedAt:source.createdAt});assert.equal(Boolean(tip(f.get('state-slot').kids[0])),state==='OPEN');
}
assert.equal(tip(fixture({mergeable:'CONFLICTING'}).get('state-slot').kids[0]),'Merge conflicts');
panel.agentLinks={related:()=>({key:'live',address:'t2',displayName:'Build worker'}),displayName:()=> 'Build worker'};
for(const coordinator of [false,true])for(const ghost of [false,true]) {
  panel.aggregate.target=()=>({terminal:'t2'});const f=fixture({},480,1.3,coordinator,ghost),button=f.get('agent');
  assert.equal(tip(button),'Open agent: Build worker');assert.equal(Boolean(button.attrs.on_click),!ghost);
}
console.log(`PASS ${comparisons} informative lower-line matrices, approved native-title fallback, combined-summary suppression, four-probe background batches, stale context/font/zoom callbacks, 100 immediately mounted rows and unchanged state/agent authority`);
