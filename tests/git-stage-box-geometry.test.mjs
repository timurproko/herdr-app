import assert from 'node:assert/strict';
import {rowHarness,find,words,t,rowGeometry}  from './support/git-row.mjs';
const near=(a,b,m)=>assert.ok(Math.abs(a-b)<1e-5,`${m}: ${a} != ${b}`);
const h=await rowHarness(),{panel,facts}=h;let round=1;
const agent=()=>({key:'a',address:'t2',availability:'live',crew:{kind:'fix',round}});
panel.agentLinks.related=(pr,_repo,_terminal,role)=>pr.state==='closed'&&!role?null:agent();panel.aggregate.stagePresentation=()=>({agent:agent()});
const source={number:17,title:'A very long pull request title '.repeat(12),url:'https://github.com/owner/repo/pull/17',state:'OPEN',author:{login:'fixture'},createdAt:'2026-11-20T10:00:00Z'};
for(const zoom of [1,1.3])for(const coordinator of [false,true])for(const ghost of [false,true]) {
 h.setZoom(zoom);panel.context=coordinator?'tasks:home':JSON.stringify(['/repo',null]);
 const probe=panel.stageBoxProbe();if(probe){const boxes=rowGeometry(probe,700,zoom),measure=find(probe,`pr-stage-box-measure-${zoom}`);measure.attrs.on_size_change[0](boxes.get(measure),h.cx);}
 const common=panel.stageBoxWidth();assert.ok(common>0);assert.equal(panel.stageBoxProbe(),null,'One bounded measurement per zoom, never per status');
 const prefix=ghost?'swap-':'';let edge,titleBox;const widths=new Map();
 const cases=[['Build',1],...Array.from({length:98},(_,i)=>['Build',i+2]),['Review',1],['Approved',1],['verdict',1]];
 for(const [name,n]of cases){
  round=n;
  const pr=facts.pullRow({...source,labels:name==='verdict'?[]:[{name,color:'840479'}],reviewDecision:name==='verdict'?'CHANGES_REQUESTED':null});
  if(name==='verdict')pr.state='closed';
  if(coordinator)Object.assign(pr,{key:'owner/repo#17',repo:'owner/repo'});
  const id=pr.key??pr.number;
  const {tree,geometry}=h.settle(()=>panel.pullRow(t,pr,ghost),700,zoom);
  const chip=find(tree,`${prefix}pr-${name==='verdict'?'review':'stage'}-${id}`),box=geometry.get(chip);
  assert.ok(chip);near(box.height,18*zoom,'Shared height');near(chip.attrs.min_w[0],common,'Every caption shares the measured minimum');
  assert.equal(chip.attrs.px[0],6);assert.ok(chip.attrs.text_center||chip.attrs.justify_center&&chip.attrs.items_center);assert.equal(chip.attrs.tooltip,undefined);
  const line=geometry.visibleTextLines.find(l=>l.ancestors.includes(chip));near(box.width,common*zoom,'Common width independent of status/round');assert.ok(box.width+0.01>=line.naturalWidth+12*zoom,'Full caption and normal padding fit');near(line.x+line.naturalWidth/2,box.x+box.width/2,'Caption is centred in the actual interaction box');widths.set(line.text,box.width);
  if(name!=='verdict'){edge??=box.x+box.width;near(box.x+box.width,edge,'Right rail unchanged across stages');}
  const title=geometry.get(find(tree,`${prefix}pr-title-${id}`));titleBox??=title;near(title.x,titleBox.x,'Title anchor');near(title.width,titleBox.width,'Long-title truncation reservation stays unchanged');
  near(geometry.get(tree).height,74*zoom,'No row-height change');
 }
 round=88888888888888;
 const pr=facts.pullRow({...source,labels:[{name:'Build',color:'840479'}]});if(coordinator)Object.assign(pr,{key:'owner/repo#17',repo:'owner/repo'});
 const long=h.settle(()=>panel.pullRow(t,pr,ghost),700,zoom),box=long.geometry.get(find(long.tree,`${prefix}pr-stage-${pr.key??17}`));
 near(box.width,widths.get('Build 99'),'Long rounds cannot change any button width');near(box.x+box.width,edge,'Long round stays right anchored');
 const line=long.geometry.visibleTextLines.find(l=>l.ancestors.includes(find(long.tree,`${prefix}pr-stage-${pr.key??17}`)));assert.ok(box.width>=line.naturalWidth+12*zoom,'Long rounds retain normal padding');
 for(const width of widths.values())near(width,common*zoom,'All stage and verdict boxes are equally wide');
 round=8888888888888888;const longest=facts.pullRow({...source,labels:[{name:'Build'}]});if(coordinator)Object.assign(longest,{key:'owner/repo#17',repo:'owner/repo'});
 const maximum=h.settle(()=>panel.pullRow(t,longest,ghost),700,zoom),maxBox=maximum.geometry.get(find(maximum.tree,`${prefix}pr-stage-${longest.key??17}`));
 const maxLine=maximum.geometry.visibleTextLines.find(l=>l.ancestors.includes(find(maximum.tree,`${prefix}pr-stage-${longest.key??17}`)));
 near(maxBox.width,maxLine.naturalWidth+12*zoom,'Longest supported caption has exactly normal padding, no extra allowance');
}
// Main's routine-refresh fix supplies settings once per frame. Stage sizing must
// share that snapshot rather than walking the native bridge for each row/probe.
let settingsReads=0;
const framed=await rowHarness({host:{settings:()=>{settingsReads++;return {zoom:1};}}}),p=framed.panel;
p.stageBoxWidths=new Map([[1.3,80]]);p.agentPresentation={settings:{zoom:1.3}};
const before=settingsReads;
for(let i=0;i<60;i++){assert.equal(p.stageBoxWidth(),80);assert.equal(p.stageBoxProbe(),null);}
p.agentPresentation={settings:{zoom:2}};
const pending=p.stageBoxProbe(),measure=find(pending,'pr-stage-box-measure-2');
assert.ok(measure);assert.equal(settingsReads,before,'Stage sizing reuses the frame zoom without native settings reads');
p.agentPresentation=null;measure.attrs.on_size_change[0]({width:200},framed.cx);
assert.equal(p.stageBoxWidths.has(2),false,'A post-layout callback rechecks live zoom and rejects a retired frame');
console.log('PASS stable tight common stage/verdict widths, frame-local zoom without per-row native reads, stale-probe rejection and unchanged title/row/right rail at 100/130%');
