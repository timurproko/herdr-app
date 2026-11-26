import assert from 'node:assert/strict';
import {rowHarness,find,words,t} from './support/git-row.mjs';
const h=await rowHarness(),p=h.panel;
const agent={address:'worker',key:'worker',availability:'live',crew:{round:1,finding:'fix guard'},cwd:'/repo',on:null};
p.agentLinks={related:(_pr,_repo,_preferred,role)=>role?agent:null};
p.aggregate.stageTarget=()=>({terminal:'worker',task:'task',agent});
let count=0;
for(const width of [280,320,360,390,480])for(const zoom of [.75,1,1.25,1.3,1.5,2])for(const mode of ['ordinary','pinned','scrolling','coordinator','ghost'])for(const state of ['OPEN','CLOSED','MERGED']) {
  h.setZoom(zoom);p.view=state==='OPEN'?'open':'closed';let baseline;
  for(const [stage,caption,color]of [['Build','Build 2','yellow'],['Review','Review','purple'],['Approved','Approved','green'],[null,null,null]]) {
    const pr=h.facts.pullRow({number:9,state,title:'A long title '.repeat(30),url:'https://github.com/owner/repo/pull/9',labels:stage?[{name:stage,color:'840479'}]:[],author:{login:'fixture'},statusCheckRollup:[]});
    if(mode==='coordinator')Object.assign(pr,{key:'owner/repo#9',repo:'owner/repo'});
    const prefix=mode==='ghost'?'swap-':'',id=pr.key??9;
    const build=()=>{
      if(['pinned','scrolling'].includes(mode)){p.pulls[p.view]=[pr];p.agentPull=mode==='pinned'?9:null;return p.renderPulls(t);}
      if(mode==='coordinator'){const slice=p.taskSections([{repo:'owner/repo',rows:[pr]}],'home');return p.repositorySection(t,slice.sections[0],'home',slice.window);}
      return p.pullRow(t,pr,mode==='ghost');
    };
    const {tree,geometry}=h.settle(build,width,zoom,['pinned','scrolling'].includes(mode)?600:undefined),row=find(tree,`${prefix}pr-${id}`),slot=find(row,`${prefix}pr-agent-slot-${id}`),chip=find(row,`${prefix}pr-stage-${id}`);
    const title=geometry.get(find(row,`${prefix}pr-title-${id}`)),reservation=geometry.get(slot),block=geometry.get(row);
    const snapshot=[title.x,title.width,title.height,reservation.x,reservation.width,reservation.height,block.height];baseline??=snapshot;assert.deepEqual(snapshot,baseline,'Stage/empty control changes no title/row geometry');
    assert.equal(reservation.width,80*zoom);assert.equal(block.height,74*zoom);
    assert.ok(Math.abs(block.x+block.width-reservation.x-reservation.width-3*zoom)<1e-6,'Stage ends at the existing highlight-relative trailing edge');
    if(stage){assert.ok(chip);assert.equal(words(chip).join(''),caption);assert.equal(chip.attrs.text_color[0],color);assert.equal(geometry.get(chip).height,20*zoom);assert.equal(chip.attrs.opacity,undefined);
      const text=geometry.visibleTextLines.find(line=>line.ancestors.includes(chip));assert.ok(text.naturalWidth<=geometry.get(chip).width-12*zoom,'Stage captions fit without extra probes or a new line');
      if(mode==='ghost'||stage==='Approved')assert.equal(chip.attrs.on_click,undefined);
    } else {assert.equal(chip,undefined);assert.equal(slot.kids.length,0);}
    count++;
  }
}
console.log(`PASS ${count} stage/empty geometry matrices: themed caption, trailing edge, title bounds, 74px block, pinned/list/coordinator/ghost and Open/Closed at 280–480px / 75–200% (synthetic, not native pixels)`);
