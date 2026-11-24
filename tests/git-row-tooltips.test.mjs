import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,element,find,nodes,words,t} from './support/git-row.mjs';
const h=await rowHarness(),{panel,facts}=h;
const source={number:17,title:'Short title',url:'https://github.com/owner/repo/pull/17',state:'OPEN',author:{login:'author'},createdAt:'2026-11-20T10:00:00Z',body:'- [x] one\n- [x] two',statusCheckRollup:[{name:'build',status:'COMPLETED',conclusion:'SUCCESS'}],labels:[{name:'bug',color:'ff0000'}],reviewDecision:'APPROVED'};
const now=Date.parse('2026-11-20T14:00:00Z');
const tip=node=>node?.attrs.tooltip?.[0];
const fixture=(overrides={},width=480,zoom=1,coordinator=false,ghost=false)=>{
  h.setZoom(zoom);panel.context=coordinator?'tasks:home':'ordinary';
  const pr=facts.pullRow({...source,...overrides},'owner',now);if(coordinator)pr.key='owner/repo#17';
  const {tree,geometry}=h.settle(()=>panel.pullRow(t,pr,ghost),width,zoom);
  return {pr,tree,geometry,get:kind=>find(tree,`${ghost?'swap-':''}pr-${kind}-${pr.key??17}`)};
};
let comparisons=0;
for(const coordinator of [false,true])for(const ghost of [false,true])for(const zoom of [0.75,1,1.25,1.3,1.5,2]) {
  const {tree,get}=fixture({},480,zoom,coordinator,ghost);
  for(const kind of ['title','number','author','tasks','checks','labels','review','byline','meta'])assert.equal(tip(get(kind)),undefined,`${kind}: complete visible value has no repeat-only tooltip`);
  const pill=get('labels').kids[0];assert.equal(tip(pill),undefined);assert.equal(tip(pill.kids[0]),undefined,'Complete pill text has no repeat-only tooltip');
  assert.ok(tip(get('time')).includes('opened 4 hours ago\n2026-11-20T10:00:00.000Z'),'Exact timestamp adds facts');
  const noDate=fixture({createdAt:null},480,zoom,coordinator,ghost);
  assert.equal(tip(noDate.get('time')),undefined,'Complete relative wording without exact date has no duplicate tooltip');
  const long=fixture({title:'A very long title '.repeat(30),author:{login:'a'.repeat(39)},labels:[{name:'A very long label '.repeat(30),color:'ff0000'}],body:Array.from({length:99},()=>'- [x] task').join('\n')},280,zoom,coordinator,ghost);
  assert.equal(tip(long.get('title')),long.pr.title,'Only actual overflow exposes the full title');
  assert.equal(tip(long.get('author')),long.pr.login);
  assert.equal(tip(long.get('tasks')),long.pr.tasks.label,'Compact fraction retains full task wording');
  assert.ok(tip(long.get('time')).includes('2026-11-20T10:00:00.000Z'));
  const labelHover=tip(long.get('labels'))??tip(long.get('meta'));
  assert.ok(labelHover?.includes(long.pr.labels[0].name),'Clipped labels recover complete names on a surviving target');
  const omitted=fixture({labels:Array.from({length:5},(_,i)=>({name:`label ${i}`,color:'ff0000'}))},480,zoom,true,ghost);
  assert.ok(tip(omitted.get('labels')).includes('label 4'),'Coordinator omissions are information even if three displayed pills fit');
  assert.ok(tip(omitted.get('meta')).includes('label 4'),'Omitted labels survive even total strip clipping');
  const checks=fixture({statusCheckRollup:[{name:'tests',status:'COMPLETED',conclusion:'FAILURE'},{name:'lint',status:'IN_PROGRESS'}]},480,zoom,coordinator,ghost);
  assert.equal(tip(checks.get('checks')),'0/2\nFailed: tests\nPending: lint');
  assert.equal(tip(checks.get('meta')),undefined,'Parent does not merely repeat complete values');
  assert.ok(nodes(tree).filter(n=>n.attrs.invisible).every(n=>nodes(n).every(p=>!tip(p))),'Hidden probes do not own hover tooltips');
  comparisons++;
}
// Screenshot-7ac98f07f5: the strip/row must not repeat an entirely visible
// "3 tasks done / 11/11 / Rework" summary, even when hovering beside the pill.
for(const coordinator of [false,true])for(const zoom of [1,1.3]) {
  const f=fixture({body:'- [x] one\n- [x] two\n- [x] three',reviewDecision:null,labels:[{name:'🤖 Rework',color:'840479'}],statusCheckRollup:Array.from({length:11},(_,i)=>({name:`CI ${i}`,status:'COMPLETED',conclusion:'SUCCESS'}))},390,zoom,coordinator);
  for(const kind of ['tasks','checks','labels','meta','byline'])assert.equal(tip(f.get(kind)),undefined,`Complete screenshot ${kind} has no combined/repeat-only hover`);
  assert.equal(tip(f.tree),undefined,'Whole-row tooltip cannot resurrect the summary');
  assert.equal(tip(f.get('labels').kids[0]),undefined);
}
// Details use the same newest-workflow and rerun filtering as counts, not stale failures.
const check=(name,id,conclusion,status='COMPLETED',startedAt='2026-11-20T10:00:00Z')=>({name,workflowName:'CI',conclusion,status,startedAt,detailsUrl:`https://github.com/owner/repo/actions/runs/${id}/job/1`});
assert.equal(facts.checks([check('removed',1,'FAILURE'),check('build',2,'SUCCESS')]).details,undefined);
assert.deepEqual(Array.from(facts.checks([check('build',2,'FAILURE'),check('build',2,null,'IN_PROGRESS','2026-11-20T11:00:00Z')]).details),['Pending: CI / build']);
const initial=facts.pullRow(source,'owner',now),updated=facts.refreshPullFacts(initial,{...source,headRefOid:'head',checks:facts.checks([check('tests',2,'FAILURE')])});
assert.equal(updated.createdAt,source.createdAt);assert.deepEqual(Array.from(updated.checks.details),['Failed: CI / tests']);
// Bounded, style/font/zoom-keyed, single-pending intrinsic probes. No recurring
// per-row probe once each distinct string is measured; late callbacks are inert.
h.setZoom(1);panel.context='ordinary';panel.pullTextWidths.clear();panel.pullTextRequests.clear();panel.pullTextBoxes.clear();
const build=()=>element().flex().children([panel.measuredText('pr-title-a','shared',{font:13,height:20,weight:'semibold'}).flex_1(),panel.measuredText('pr-title-b','shared',{font:13,height:20,weight:'semibold'}).flex_1()]);
const cold=h.render(build),probes=nodes(cold).filter(n=>n.attrs.id?.[0]?.includes('-intrinsic-measure-'));
assert.equal(probes.length,1,'Only one pending probe for the same string/style/zoom in a snapshot');
const old=probes[0].attrs.on_size_change[0];panel.context='changed';let notify=0;old({width:999},{notify(){notify++;}});assert.equal(notify,0);assert.equal(panel.pullTextWidths.size,0);
panel.context='ordinary';h.setZoom(1.3);old({width:999},{notify(){notify++;}});assert.equal(notify,0,'Prior zoom cannot poison the cache');
h.setZoom(1);const settled=h.settle(build,480);assert.equal(nodes(settled.tree).filter(n=>n.attrs.id?.[0]?.includes('-intrinsic-measure-')).length,0,'Warm rows add no intrinsic probe');
const style=h.render(()=>panel.measuredText('pr-title-style','shared',{font:13,height:20,weight:'normal'}));assert.equal(nodes(style).filter(n=>n.attrs.id?.[0]?.includes('-intrinsic-measure-')).length,1,'Different font weight is separately measured');
h.setFont('Segoe UI');const changedFont=h.render(build);
assert.equal(nodes(changedFont).filter(n=>n.attrs.id?.[0]?.includes('-intrinsic-measure-')).length,1,'Interface font changes need a fresh intrinsic width');
const priorFont=nodes(changedFont).find(n=>n.attrs.id?.[0]?.includes('-intrinsic-measure-')).attrs.on_size_change[0];h.setFont('Geist');priorFont({width:999},{notify(){notify++;}});assert.equal(notify,0,'Prior font callbacks cannot poison the cache');
for(let i=0;i<520;i++) {
  const tree=h.render(()=>panel.measuredText(`pr-title-cache-${i}`,`string ${i}`,{font:13,height:20})),g=rowGeometry(tree,480);
  for(const node of nodes(tree))if(node.attrs.id?.[0]?.includes('-intrinsic-measure-'))node.attrs.on_size_change[0](g.get(node),h.cx);
}
assert.ok(panel.pullTextWidths.size<=512&&panel.pullTextRequests.size<=512&&panel.pullTextBoxes.size<=512,'Caches and pending work are bounded');
// State semantics add facts; a closed/merged word already in the byline is quiet.
for(const state of ['OPEN','CLOSED','MERGED']) {
  const f=fixture({state,closedAt:source.createdAt,mergedAt:source.createdAt});
  const icon=f.get('state-slot').kids[0];assert.equal(Boolean(tip(icon)),state==='OPEN');
}
const conflict=fixture({mergeable:'CONFLICTING'});assert.equal(tip(conflict.get('state-slot').kids[0]),'Merge conflicts');
// Known names are descriptive only; ghost controls stay inert and missing names
// do not get a generic duplicate tooltip. No host/agent/GitHub read is introduced.
panel.agentLinks={related:()=>({key:'live',address:'t2',displayName:'Build worker'}),displayName:()=> 'Build worker'};
for(const coordinator of [false,true])for(const ghost of [false,true]) {
  panel.aggregate.target=()=>({terminal:'t2'});
  const f=fixture({},480,1.3,coordinator,ghost),button=f.get('agent');
  assert.equal(tip(button),'Open agent: Build worker');assert.equal(Boolean(button.attrs.on_click),!ghost);
}
console.log(`PASS ${comparisons} informative-only tooltip matrices, hidden/compact recovery, exact times/check names, ancestor suppression, every row path, bounded shared style/zoom cache, stale callbacks and robot/state semantics`);
