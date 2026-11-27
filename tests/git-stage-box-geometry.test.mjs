import assert from 'node:assert/strict';
import {rowHarness,find,words,t} from './support/git-row.mjs';
const near=(a,b,m)=>assert.ok(Math.abs(a-b)<1e-5,`${m}: ${a} != ${b}`);
const h=await rowHarness(),{panel,facts}=h;let round=1;
const agent=()=>({key:'a',address:'t2',availability:'live',crew:{kind:'fix',round}});
panel.agentLinks.related=(pr,_repo,_terminal,role)=>pr.state==='closed'&&!role?null:agent();panel.aggregate.stagePresentation=()=>({agent:agent()});
const source={number:17,title:'A very long pull request title '.repeat(12),url:'https://github.com/owner/repo/pull/17',state:'OPEN',author:{login:'fixture'},createdAt:'2026-11-20T10:00:00Z'};
for(const zoom of [1,1.3])for(const coordinator of [false,true])for(const ghost of [false,true]) {
 h.setZoom(zoom);panel.context=coordinator?'tasks:home':JSON.stringify(['/repo',null]);
 const prefix=ghost?'swap-':'';let reference,edge,titleBox;
 const cases=[['Build',1],...Array.from({length:98},(_,i)=>['Build',i+2]),['Review',1],['Approved',1],['verdict',1]];
 for(const [name,n]of cases){
  round=n;
  const pr=facts.pullRow({...source,labels:name==='verdict'?[]:[{name,color:'840479'}],reviewDecision:name==='verdict'?'CHANGES_REQUESTED':null});
  if(name==='verdict')pr.state='closed';
  if(coordinator)Object.assign(pr,{key:'owner/repo#17',repo:'owner/repo'});
  const id=pr.key??pr.number;
  const {tree,geometry}=h.settle(()=>panel.pullRow(t,pr,ghost),700,zoom);
  const chip=find(tree,`${prefix}pr-${name==='verdict'?'review':'stage'}-${id}`),box=geometry.get(chip);
  assert.ok(chip);reference??=box.width;near(box.width,reference,'All fixed/two-digit captions share one width');near(box.height,18*zoom,'Shared height');
  assert.equal(chip.attrs.px[0],6);assert.ok(chip.attrs.justify_center&&chip.attrs.items_center);assert.equal(chip.attrs.tooltip,undefined);
  const line=geometry.visibleTextLines.find(l=>l.ancestors.includes(chip));near(line.x+line.naturalWidth/2,box.x+box.width/2,'Caption is centred in the actual interaction box');
  if(name!=='verdict'){edge??=box.x+box.width;near(box.x+box.width,edge,'Right rail unchanged across stages');}
  const title=geometry.get(find(tree,`${prefix}pr-title-${id}`));titleBox??=title;near(title.x,titleBox.x,'Title anchor');near(title.width,titleBox.width,'Long-title truncation reservation stays unchanged');
  near(geometry.get(tree).height,74*zoom,'No row-height change');
 }
 round=88888888888888;
 const pr=facts.pullRow({...source,labels:[{name:'Build',color:'840479'}]});if(coordinator)Object.assign(pr,{key:'owner/repo#17',repo:'owner/repo'});
 const long=h.settle(()=>panel.pullRow(t,pr,ghost),700,zoom),box=long.geometry.get(find(long.tree,`${prefix}pr-stage-${pr.key??17}`));
 assert.ok(box.width>reference,'A rare longer round grows only itself');near(box.x+box.width,edge,'Long round stays right anchored');near(panel.stageBoxWidth()*zoom,reference,'Long rounds do not widen the shared minimum');
}
console.log('PASS common native-measured stage/verdict minimum, 2–99 rounds, long-round local growth, centred hit boxes and title/row/right-rail geometry at 100/130%');
