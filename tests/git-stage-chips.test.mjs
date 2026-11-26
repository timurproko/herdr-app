import assert from 'node:assert/strict';
import {rowHarness,find,words,nodes,t} from './support/git-row.mjs';
const h=await rowHarness(),p=h.panel;
const agent={address:'worker',key:'worker',availability:'live',crew:{round:1,finding:'fix guard'},cwd:'/repo',on:null};
p.agentLinks={related:(_pr,_repo,_preferred,role)=>role?agent:null};
p.aggregate.stageTarget=()=>({terminal:'worker',task:'task',agent});
let count=0;
for(const width of [280,320,360,390,480])for(const zoom of [.75,1,1.25,1.3,1.5,2])for(const mode of ['ordinary','pinned','scrolling','coordinator','ghost'])for(const state of ['OPEN','CLOSED','MERGED']) {
 h.setZoom(zoom);p.view=state==='OPEN'?'open':'closed';let baseline;
 for(const [stage,caption]of [['Rework','Build 2'],['🤖 Under review','Review'],['Approved','Approved'],[null,null]]) {
  const pr=h.facts.pullRow({number:9,state,title:'A long title '.repeat(30),url:'https://github.com/owner/repo/pull/9',labels:stage?[{name:stage,color:'840479'}]:[],author:{login:'fixture'},statusCheckRollup:[]});
  if(mode==='coordinator')Object.assign(pr,{key:'owner/repo#9',repo:'owner/repo'});
  const prefix=mode==='ghost'?'swap-':'',id=pr.key??9;
  const build=()=>{
   if(['pinned','scrolling'].includes(mode)){p.pulls[p.view]=[pr];p.agentPull=mode==='pinned'?9:null;return p.renderPulls(t);}
   if(mode==='coordinator'){const slice=p.taskSections([{repo:'owner/repo',rows:[pr]}],'home');return p.repositorySection(t,slice.sections[0],'home',slice.window);}
   return p.pullRow(t,pr,mode==='ghost');
  };
  const {tree,geometry}=h.settle(build,width,zoom,['pinned','scrolling'].includes(mode)?600:undefined),row=find(tree,`${prefix}pr-${id}`),chip=find(row,`${prefix}pr-stage-${id}`);
  const title=geometry.get(find(row,`${prefix}pr-title-${id}`)),block=geometry.get(row);
  const snapshot=[title.x,title.width,title.height,block.height];baseline??=snapshot;assert.deepEqual(snapshot,baseline,'Managed stage changes no title/row geometry');
  assert.equal(find(row,`${prefix}pr-agent-slot-${id}`),undefined,'No title reservation without a live unlabelled robot');
  assert.equal(block.height,74*zoom);
  if(stage){
   assert.ok(chip);assert.equal(words(chip).join(''),caption);assert.equal(geometry.get(chip).height,18*zoom);
   assert.equal(chip.attrs.bg[0],t.raised);assert.equal(chip.attrs.px[0],6,'Plain stage has comfortable symmetric side padding');
   assert.equal(chip.attrs.tooltip,undefined,'Stage chips never show hover popups');
   assert.equal(chip.attrs.text_color[0],pr.stage==='approved'?t.ansi2:pr.stage==='review'?t.ansi5:t.ansi3);
   assert.equal(chip.attrs.border_1,undefined);assert.equal(chip.attrs.border_color,undefined);assert.equal(chip.attrs.rounded_full,undefined);assert.equal(chip.attrs.w,undefined);
   assert.equal(words(chip).join('').includes('🤖'),false);
   const box=geometry.get(chip);assert.ok(Math.abs(box.x+box.width-(block.x+block.width-3*zoom))<1e-6,'Bottom stage ends on the existing label anchor');
   assert.ok(box.y>=title.y+40*zoom,'Stage is on metadata, not title');
   assert.ok(Math.abs(title.x+title.width-(block.x+block.width-3*zoom))<1e-6,'Default and narrow titles use the full right content edge');
   assert.equal(chip.attrs.opacity,undefined);
   if(mode==='ghost'){assert.equal(chip.attrs.on_click,undefined);assert.equal(chip.attrs.tab_index,undefined);}
   else {assert.ok(chip.attrs.on_click);assert.equal(chip.attrs.tab_index[0],0);assert.ok(chip.attrs.hover);assert.ok(chip.attrs.focus);}
   for(const probe of nodes(row).filter(n=>String(n.attrs?.id?.[0]).includes('-probe'))){assert.equal(probe.attrs.on_click,undefined);assert.equal(probe.attrs.tab_index,undefined,'Intrinsic label probes are inert');}
  } else assert.equal(chip,undefined);
  count++;
 }
}
h.setAgent(true);p.agentLinks={related:()=>agent};
let pr=h.facts.pullRow({number:10,title:'Fallback',labels:[]});
let row=p.pullRow(t,pr);assert.equal(find(row,'pr-agent-slot-10').attrs.w[0],24);assert.ok(find(row,'pr-agent-10'));
p.context='tasks:home';pr={...pr,key:'owner/repo#10',repo:'owner/repo',stage:'build',labels:[...Array.from({length:5},(_,i)=>({name:'Other '+i,color:'#123456'})),{name:'🤖 Rework',color:'#9a6700'},{name:'Review',color:'#840479'}]};
row=p.pullRow(t,pr);assert.equal(find(row,'pr-agent-slot-owner/repo#10'),undefined);assert.equal(nodes(row).filter(n=>String(n.attrs?.id?.[0]).startsWith('pr-stage-')).length,1);
assert.equal(words(find(row,'pr-stage-owner/repo#10')).join(''),'Build 2','Stage survives bounded labels and conflicting managed aliases without duplication');
assert.equal(find(row,'pr-stage-owner/repo#10').attrs.tooltip,undefined);
assert.ok(nodes(row).every(node=>!(node.attrs?.tooltip?.[0]??'').match(/🤖 Rework|Open agent|back from review|^Review$/)),'Stage-only text never leaks through strip or metadata hover');
for(const width of [280,390])for(const zoom of [1,1.3]) {
 const {tree}=h.settle(()=>p.pullRow(t,pr),width,zoom);
 const hints=nodes(tree).map(node=>node.attrs?.tooltip?.[0]).filter(Boolean).join('\n');
 assert.ok(!/🤖 Rework|Open agent|back from review|^Review$/m.test(hints));
 assert.match(hints,/Other 4/,'Omitted unrelated label names retain informative hover');
}
// A missing GitHub stage must not hide a known build owner, even for a plan.
agent.crew.kind='ship';
for(const zoom of [1,1.3])for(const width of [280,390])for(const state of ['open','draft'])for(const coordinator of [false,true])for(const ghost of [false,true])for(const round of [null,1,2]) {
 h.setZoom(zoom);p.context=coordinator?'tasks:home':'ordinary';agent.crew.round=round;
 const raw=h.facts.pullRow({number:11,title:state==='draft'?'Planning only':'Initial implementation',state:'OPEN',isDraft:state==='draft',labels:[],url:'https://github.com/owner/repo/pull/11'});
 if(coordinator)Object.assign(raw,{key:'owner/repo#11',repo:'owner/repo'});
 const id=raw.key??raw.number,prefix=ghost?'swap-':'';
 const {tree,geometry}=h.settle(()=>p.pullRow(t,raw,ghost),width,zoom),chip=find(tree,`${prefix}pr-stage-${id}`);
 assert.ok(chip,'Live build owner without managed labels has a bottom stage');
 assert.equal(words(chip).join(''),round?`Build ${round+1}`:'Build');
 assert.equal(find(tree,`${prefix}pr-agent-slot-${id}`),undefined);
 assert.equal(geometry.get(find(tree,`${prefix}pr-${id}`)).height,74*zoom);
 assert.equal(chip.attrs.tooltip,undefined);assert.equal(raw.stage,null);assert.deepEqual(raw.labels,[],'Projection never mutates GitHub facts');
 if(ghost)assert.equal(chip.attrs.on_click,undefined);else assert.ok(chip.attrs.on_click);
 agent.availability='ended';assert.equal(find(p.pullRow(t,raw),`pr-stage-${id}`),undefined,'No inferred Build from an ended owner');agent.availability='live';
}
console.log(`PASS ${count} bottom-stage geometry cases: plain tight stage styling, dynamic build rounds, restored title width, unchanged 74px rows, keyboard/pointer/ghost/probe policy and bounded deduplication`);
