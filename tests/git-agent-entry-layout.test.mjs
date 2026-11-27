// Render-history proof: cached rows cannot paint before their pin association.
import assert from 'node:assert/strict';
import {rowHarness,find,rowGeometry,t} from './support/git-row.mjs';
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const measurements=[];
for(const zoom of [1,1.3]) {
 const reads=[],h=await rowHarness({host:{hc:()=>new Promise(resolve=>reads.push(resolve))}}),p=h.panel;
 h.setZoom(zoom);p.shown=()=>true;p.sectionEntry=true;
 p.agentLinks={pullNumber:terminal=>({first:94,second:95}[terminal]??null),related:()=>null};
 p.pulls.open=[94,95].map(number=>h.facts.pullRow({number,title:'Entry '+number,state:'OPEN'}));
 const history=[];
 const paint=()=>{const tree=h.render(()=>p.renderPulls(t)),g=rowGeometry(tree,390,zoom,600),pin=find(tree,'active-pull');
  const layout=find(tree,'git-association-pending')?'loading':pin?'pin-'+(find(pin,'pr-94')?94:95):'list';
  const rows=[94,95].map(n=>{const node=find(tree,'pr-'+n);return node?[n,g.get(node).y]:null;}).filter(Boolean);
  history.push({layout,rows});return tree;
 };
 // Known labels win synchronously even when a cached page arrives before root.
 for(const terminal of ['first','second','first']) {
  Object.assign(h.place,{terminal,app:'codex'});p.root=null;p.loading=true;p.entryVerify=true;p.entryRootReady=false;
  const start=history.length;p.syncAgent(h.cx);paint();
  p.root='/repo';p.loading=false;p.entryRootReady=true;p.syncAgent(h.cx);for(let i=0;i<4;i++)paint();
  const target=history.slice(start);assert.equal(new Set(target.map(x=>x.layout)).size,1);assert.equal(target[0].layout,terminal==='second'?'pin-95':'pin-94');
  assert.ok(target.every(x=>JSON.stringify(x.rows)===JSON.stringify(target[0].rows)),'No post-first-paint row shift');
  measurements.push({zoom,terminal,frames:target});
 }
 // Reverse switch cannot use an unverified destination branch as no-PR proof.
 Object.assign(h.place,{terminal:'no-pr',app:'bash'});p.root=null;p.loading=true;p.entryRootReady=false;p.syncAgent(h.cx);paint();assert.equal(history.at(-1).layout,'loading');
 p.root='/repo';p.loading=false;p.entryRootReady=true;p.branch=null;p.syncAgent(h.cx);const start=history.length;for(let i=0;i<4;i++)paint();
 assert.equal(new Set(history.slice(start).map(x=>x.layout)).size,1);assert.equal(history.at(-1).layout,'list');
 assert.ok(history.slice(start).every(x=>JSON.stringify(x.rows)===JSON.stringify(history[start].rows)));measurements.push({zoom,terminal:'no-pr',frames:history.slice(start)});
 // Genuinely unknown footer: no unpinned target frame while the read is held.
 Object.assign(h.place,{terminal:'footer',app:'claude-code'});p.syncAgent(h.cx);await tick();for(let i=0;i<3;i++)paint();assert.equal(history.at(-1).layout,'loading');
 assert.ok(find(p.renderPulls(t),'git-agent-loading'));reads.shift()({code:0,stdout:JSON.stringify({how:'screen',complete:true,text:'Fable 5.2 · 166.0k/200.0k 83%\n⏵⏵ auto mode on (shift+tab to cycle) · PR #95'})});await tick();
 const resolved=history.length;for(let i=0;i<4;i++)paint();assert.equal(history.at(-1).layout,'pin-95');assert.ok(history.slice(resolved).every(x=>JSON.stringify(x.rows)===JSON.stringify(history[resolved].rows)));
 // A late footer reply cannot repin the next target.
 Object.assign(h.place,{terminal:'obsolete',app:'claude-code'});p.syncAgent(h.cx);await tick();const late=reads.shift();Object.assign(h.place,{terminal:'first',app:'codex'});p.syncAgent(h.cx);paint();late({code:0,stdout:JSON.stringify({text:'PR #95'})});await tick();paint();assert.equal(history.at(-1).layout,'pin-94');
}
if(process.env.GIT_ENTRY_MEASUREMENTS){const fs=await import('node:fs');fs.writeFileSync(process.env.GIT_ENTRY_MEASUREMENTS,JSON.stringify({scope:'deterministic real-renderer layout, not native paint latency',measurements},null,2));}
console.log('PASS exactly one target-content layout and stable row y across known, unknown, reverse and different-pin switches at 100/130%');
