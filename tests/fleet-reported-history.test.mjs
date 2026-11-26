// Sanitized shape of real Crew fleet/full status: reported is not necessarily live.
// Production provider -> registry -> aggregate; no Core, network or user state.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {legacyTargetResponses} from './support/github-read.mjs';
const plain=value=>JSON.parse(JSON.stringify(value));
const url=n=>`https://github.com/fixture/repo/pull/${n}`;
for(const machine of [null,'pc2'])for(const full of [false,true]) {
 const q=id=>machine?`${machine}/${id}`:id;
 const known=n=>({status:'known',url:url(n),source:'recorded',reason:null});
 const tasks=[
  {id:'active',state:'working',terminal:'t2',pr:url(1),prDiscovery:known(1)},
  {id:'reported-live',state:'reported',terminal:'t3',pr:url(2),prDiscovery:known(2)},
  {id:'reported-ended',state:'reported',terminal:'t4',pr:url(3),prDiscovery:known(3)},
  {id:'reported-removed',state:'reported',terminal:'t5',pr:url(4),prDiscovery:known(4)},
  {id:'reported-review',state:'reported',terminal:'t6',pr:null,prDiscovery:{status:'unavailable',url:null,source:null,reason:'not-requested'}},
  {id:'closed',state:'closed',terminal:null,pr:url(5),prDiscovery:known(5)},
 ];
 const status={home:'C:/fixture/.crew',owner:{terminal:'t1',live:true,...(full?{mine:false}:{})},prDiscovery:{version:1},tasks:tasks.map(t=>({...t,...(full?{project:'fixture',workflow:null}:{})})),...(full?{copiesToReturn:[]}:{view:'fleet'})};
 const state={'custom.plugins':{crew:{enabled:true},git:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
 const groups=[{id:q('coordinator'),machine,tabs:[{id:q('c')}]},{id:q('fm-crew-home'),machine,tabs:[{id:q('a')},{id:q('b')}]}];
 const all=[{terminal:q('t1'),tab:q('c'),pane:q('cp')},{terminal:q('t2'),tab:q('a'),pane:q('ap')},{terminal:q('t3'),tab:q('b'),pane:q('bp')}];
 const worker=(n,task,state='live')=>({address:q(`t${n}`),state,labels:{'crew.task':task,'crew.home':'home','herdr.space':'fm-crew-home','crew.space.version':'1','crew.space.mode':'combined','crew.space.project':'fixture'}});
 const list=[{address:q('t1'),state:'live',labels:{'custom.crew.home':'1'}},worker(2,'active'),worker(3,'reported-live'),worker(4,'reported-ended','finished')];
 const jobs=[],reads=[],focus=[];
 const cx={spawn(fn){jobs.push(Promise.resolve().then(()=>fn(cx)));},notify(){},timer:{after(_ms,fn){jobs.push(Promise.resolve().then(fn));}}};
 const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
 const host={shared:k=>state[k],setShared:(k,v)=>state[k]=plain(v),spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:machine,layout:'ready'}],checking:()=>false,run:(...args)=>focus.push(args),exec:legacyTargetResponses(async(command,args)=>{
  assert.equal(command,'gh');assert.equal(args[0],'pr');const number=Number(args[2]);reads.push(number);
  return {code:0,stdout:JSON.stringify({number,state:number===5?'MERGED':'OPEN',mergedAt:number===5?new Date().toISOString():null,title:`Fixture ${number}`,url:url(number),labels:[{name:['','🤖 Rework','Build','🤖 Under review','Review','🤖 Approved'][number],color:'840479'}]})};
 })};
 const {f,r,AggregatePulls}=await loadMod({host,mod:'custom-changes',modules:{
  'space-color-state.js':'src/shared/space-color-state.js',
  'plugins/crew/fleet.js':process.env.FLEET_SOURCE??'src/plugins/crew/fleet.js',
  'aggregate.js':process.env.AGGREGATE_SOURCE??'src/plugins/git/mod/aggregate.js',
  ...(process.env.PRESENTATIONS_SOURCE?{'presentations.js':process.env.PRESENTATIONS_SOURCE}:{}),
  'pulls.js':'src/plugins/git/mod/pulls.js','location.js':{location:()=>({space:q('coordinator'),terminal:q('t1'),on:machine})},
 },entry:'export * as f from "./plugins/crew/fleet.js";export * as r from "./plugins.js";export {AggregatePulls} from "./aggregate.js";'});
 const refresh=async()=>{f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();};
 await refresh();
 let context=r.pluginPullContext(q('coordinator'));
 assert.ok(context,`${machine??'local'} ${full?'full':'fleet'}: reported ended/removed tasks must not block healthy coordinator status`);
 assert.equal(context.stale,false);assert.equal(context.links.length,5);
 assert.deepEqual(Array.from(context.links.filter(l=>l.historical),l=>l.task).sort(),['closed','reported-ended','reported-removed']);
 for(const task of ['reported-ended','reported-removed'])assert.equal(context.links.find(l=>l.task===task).terminal,null,'Read-only reported history grants no worker identity');
 assert.equal(r.pluginWorkspaceLinks().length,1,'Live workers still attest the attached child');
 const aggregate=new AggregatePulls({shown:()=>true});aggregate.sync(cx);await drain();
 assert.equal(aggregate.waiting,false);assert.equal(aggregate.hasPresentation,true);assert.equal(aggregate.counts().open,4);assert.equal(aggregate.counts().closed,1);
 assert.deepEqual([...reads].sort(),[1,2,3,4,5]);
 for(const n of [3,4,5])assert.equal(aggregate.target({key:`fixture/repo#${n}`}),null,'No focus target for reported/closed history');
 assert.deepEqual(Array.from(aggregate.rows('open'),p=>p.stage).sort(),['build','build','review','review']);
 // A Core-first exit of a still-working task remains uncertain, not history.
 list[1].state='finished';await refresh();assert.equal(r.pluginPullContext(q('coordinator')),null,'Working/finished disagreement still blocks fresh reads');
 list[1].state='live';await refresh();assert.ok(r.pluginPullContext(q('coordinator')));
 // A live reported terminal with missing native layout is still a transient gap.
 const member=all.pop();await refresh();assert.equal(r.pluginPullContext(q('coordinator')),null,'Live reported membership must still be exact');all.push(member);await refresh();
 // Once the reported live worker ends, its PR remains admitted without actions.
 list[2].state='finished';all.pop();await refresh();context=r.pluginPullContext(q('coordinator'));assert.ok(context);assert.equal(context.links.find(l=>l.task==='reported-live').historical,true);
 // All workers may end; a fresh owner/status alone attests only read-only PRs.
 status.tasks[0].state='reported';list[1].state='finished';all.splice(1);groups[1].tabs=[];
 await refresh();context=r.pluginPullContext(q('coordinator'));assert.ok(context);assert.equal(context.links.length,5);assert.ok(context.links.every(l=>l.historical&&l.terminal===null));
 assert.equal(context.child,null);assert.equal(focus.length,0);
 status.owner.live=false;await refresh();assert.equal(r.pluginPullContext(q('coordinator')),null,'Completed owner loss is not waived');
}
console.log('PASS real-shape fleet/full reported ended/removed tasks: local/remote cold publication, managed stages, read-only history and strict working/owner/native guards');
