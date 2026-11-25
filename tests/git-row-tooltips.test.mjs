import assert from 'node:assert/strict';
import {rowHarness,find,nodes,t} from './support/git-row.mjs';
const h=await rowHarness(),{panel,facts}=h;
const source={number:17,title:'Short title',url:'https://github.com/owner/repo/pull/17',state:'OPEN',author:{login:'author'},createdAt:'2026-11-20T10:00:00Z',body:'- [x] one\n- [x] two',statusCheckRollup:[{name:'build',status:'COMPLETED',conclusion:'SUCCESS'}],labels:[{name:'bug',color:'ff0000'}],reviewDecision:'APPROVED'};
const now=Date.parse('2026-11-20T14:00:00Z'),tip=node=>node?.attrs.tooltip?.[0];
const fixture=(overrides={},width=480,zoom=1,coordinator=false,ghost=false)=>{
  h.setZoom(zoom);panel.context=coordinator?'tasks:home':'ordinary';
  const pr=facts.pullRow({...source,...overrides},'owner',now);if(coordinator)pr.key='owner/repo#17';
  const {tree,geometry}=h.settle(()=>panel.pullRow(t,pr,ghost),width,zoom);
  return {pr,tree,geometry,get:kind=>find(tree,`${ghost?'swap-':''}pr-${kind}-${pr.key??17}`)};
};
let comparisons=0;
for(const coordinator of [false,true])for(const ghost of [false,true])for(const zoom of [0.75,1,1.25,1.3,1.5,2]) {
  const f=fixture({},480,zoom,coordinator,ghost),{tree,get}=f;
  assert.equal(tip(get('title')),f.pr.title,'Native titles retain full-title hover unchanged');
  for(const kind of ['number','author','tasks','checks','labels','review','byline','meta'])assert.equal(tip(get(kind)),undefined,`${kind}: complete visible value has no repeat-only tooltip`);
  assert.equal(tip(get('labels').kids[0]),undefined,'Pills use an informative clipped/omitted group hover');
  assert.ok(tip(get('time')).includes('opened 4 hours ago\n2026-11-20T10:00:00.000Z'));
  assert.equal(tip(fixture({createdAt:null},480,zoom,coordinator,ghost).get('time')),undefined);
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
// Main already computes full/compact/clipped choices. The tooltip layer only
// reads those choices; no scheduler, typography cache or measurement is added.
for(const coordinator of [false,true])for(const ghost of [false,true])for(const zoom of [1,1.3]) {
  panel.context=coordinator?'tasks:edit':'ordinary';h.setZoom(zoom);
  let pr={...facts.pullRow({...source,title:'Short'},'owner',now),...(coordinator?{key:'owner/repo#17',repo:'owner/repo'}:{})};
  const prefix=ghost?'swap-':'',id=pr.key??17,build=()=>panel.pullRow(t,pr,ghost);
  const before=h.settleChanged(build,200,zoom),box=before.geometry.get(find(before.tree,`${prefix}pr-title-${id}`));
  const available=panel.pullLineSizes.get(`${prefix}pr-meta-${id}`).available;
  pr={...pr,title:'Changed long title '.repeat(120)};
  const after=h.settleChanged(build,200,zoom),title=find(after.tree,`${prefix}pr-title-${id}`);
  assert.deepEqual(after.geometry.get(title),box);assert.ok(title.attrs.truncate&&title.attrs.font_semibold);
  assert.equal(title.attrs.font_family,undefined);assert.equal(title.attrs.on_size_change,undefined);
  assert.equal(title.kids[0],pr.title);assert.equal(tip(title),pr.title);
  assert.equal(panel.pullLineSizes.get(`${prefix}pr-meta-${id}`).available,available);
  assert.ok(!nodes(after.tree).some(n=>/pr-title.*(?:probe|measure|prefix|ellipsis)/.test(n.attrs.id?.[0]??'')));
}
for(const state of ['OPEN','CLOSED','MERGED']) {
  const f=fixture({state,closedAt:source.createdAt,mergedAt:source.createdAt});assert.equal(Boolean(tip(f.get('state-slot').kids[0])),state==='OPEN');
}
assert.equal(tip(fixture({mergeable:'CONFLICTING'}).get('state-slot').kids[0]),'Merge conflicts');
panel.agentLinks={related:()=>({key:'live',address:'t2',displayName:'Build worker'}),displayName:()=> 'Build worker'};
for(const coordinator of [false,true])for(const ghost of [false,true]) {
  panel.aggregate.target=()=>({terminal:'t2'});const f=fixture({},480,1.3,coordinator,ghost),button=f.get('agent');
  assert.equal(tip(button),'Open agent: Build worker');assert.equal(Boolean(button.attrs.on_click),!ghost);
}
// Cached tooltip facts invalidate with mutable fixtures, without caching native nodes.
const pr={...facts.pullRow(source,'owner',now)},build=()=>panel.pullRow(t,pr);
h.setZoom(1);panel.context='ordinary';h.settle(build,480);
pr.createdAt='2026-11-19T10:00:00Z';pr.checks={...pr.checks,details:['Failed: changed job']};
const refreshed=h.settle(build,480).tree;
assert.ok(tip(find(refreshed,'pr-time-17')).includes(pr.createdAt.replace('Z','.000Z')));
assert.ok(tip(find(refreshed,'pr-checks-17')).includes('changed job'));
console.log(`PASS ${comparisons} informative lower-line matrices using main's fit choices, unchanged native titles/same-ID edits, combined-summary suppression, omitted labels, timestamp/check-fact invalidation and unchanged state/agent authority`);
