import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rowHarness,find,nodes,t} from './support/git-row.mjs';
import {measureTask,scrollTask,taskWindow,ordinaryContent} from './support/git-scroll.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../src/plugins/git/panel.json',import.meta.url)));
assert.equal(manifest.shared['sidebar-scroll.js'],'src/ui/sidebar-scroll.js');
assert.equal(manifest.shared['scroll-fade.js'],'src/ui/scroll-fade.js');
for(const name of ['sidebar-scroll.js','scroll-fade.js'])assert.equal(
 fs.readFileSync(new URL(`../dist/mods/custom-changes/${name}`,import.meta.url),'utf8'),
 fs.readFileSync(new URL(`../src/ui/${name}`,import.meta.url),'utf8'),'Git packages the canonical shared behavior byte-for-byte');
for(const coordinator of [false,true])for(const zoom of [0.75,1,1.3,2]) {
 const h=await rowHarness();h.setZoom(zoom);const {panel,cx}=h;
 const rows=Array.from({length:30},(_,i)=>Object.assign(h.facts.pullRow({number:i+1,title:`PR ${i+1}`,state:'OPEN',author:{login:'fixture'}},'owner'),coordinator?{key:`owner/repo#${i+1}`,repo:'owner/repo'}:{}));
 if(coordinator){
  panel.context='tasks:home';panel.aggregate={context:{scope:'home'},entries:new Map(rows.map(pr=>[pr.key,{pr,link:{repo:pr.repo}}])),currentContext:()=>({scope:'home'}),frameContext(){return this.currentContext();},repositories:()=>['owner/repo'],rows:()=>rows,readNotice:()=>null,counts:()=>({open:30,closed:0}),target:()=>null};
  panel.notices={sync(){return null;},presentation(){return null;}};panel.enrollmentPicker={render(){return null;}};panel.syncChecksFallback=()=>{};
 }else panel.pulls.open=rows;
 panel.shown=()=>true;
 const render=()=>h.render(()=>coordinator?panel.renderAggregate(cx,t):panel.renderPulls(t));
 let tree=render();
 const measure=(height=400,content=2400)=>{
  if(coordinator)measureTask(panel,tree,cx,height,390,zoom);
  else {find(tree,'pulls-scroll-frame').attrs.on_size_change[0]({width:390*zoom,height:height*zoom},cx);ordinaryContent(tree).attrs.on_size_change[0]({width:390*zoom,height:content*zoom},cx);}
 };
 const scroll=offset=>{
  if(coordinator)scrollTask(panel,tree,cx,offset,400,zoom);
  else {
   const event={position:{x:50,y:100},bounds:{x:0,y:0,width:390*zoom,height:400*zoom},delta:{y:0}};
   ordinaryContent(tree).attrs.on_mouse_move[0]({...event,bounds:{...event.bounds,y:-offset*zoom,height:2400*zoom}});
   find(tree,'pulls-scroll-frame').attrs.on_mouse_move[0](event,cx);
  }
  tree=render();
 };
 const id=coordinator?'task-pulls-list':'pulls-list';
 const fades=(above,below)=>{
  for(const [edge,wanted]of [['above',above],['below',below]]) {
   const fade=find(tree,`${id}-more-${edge}`);assert.equal(Boolean(fade),wanted,`${coordinator?'coordinator':'ordinary'} ${zoom} ${edge}`);
   if(fade){assert.equal(fade.attrs.h[0],40);assert.equal(fade.attrs.left[0],7);assert.equal(fade.attrs.right[0],7,'Panel border plus fade inset matches the Spaces outer gutter');assert.ok(nodes(fade).every(n=>!Object.keys(n.attrs).some(k=>k.startsWith('on_'))),'Passive decorations cannot intercept input');}
  }
 };
 measure();tree=render();fades(false,true);
 scroll(0.5/zoom);fades(false,true);scroll(200);fades(true,true);
 if(coordinator) {
  for(let i=0;i<5;i++){scroll(taskWindow(panel).max);measure();tree=render();}
  scroll(taskWindow(panel).max);measure();tree=render();
 }else scroll(2000);
 fades(true,false);
 scroll(0);fades(false,true);
 // Resize to fit after fully revealing, then restore a narrow viewport.
 measure(coordinator?taskWindow(panel).height+20:2500);tree=render();fades(false,false);
 measure();tree=render();fades(false,true);
 if(coordinator){panel.foldedRepositories.add('owner/repo');tree=render();measure();tree=render();fades(false,false);}
}
console.log('PASS shared passive 40px Git fades: both views, start/middle/end/fit, scrollbar motion, resize, folding and 75/100/130/200% zoom without reads or render effects');
