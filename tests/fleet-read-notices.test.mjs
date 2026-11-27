// Actual panel/aggregate renderer with synthetic verified context and gh results.
import assert from 'node:assert/strict';
import {legacyTargetResponses} from './support/github-read.mjs';
import {loadMod} from '../tools/plugin-harness.mjs';
import {assertTaskSections} from './support/git-section-invariant.mjs';
const element=()=>{const o={kids:[],attrs:{}};let p;return p=new Proxy(o,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;if(k==='when')return(yes,fn)=>yes?fn(p):p;if(k==='child')return c=>{o.kids.push(c);return p;};if(k==='children')return cs=>{o.kids.push(...cs);return p;};return(...args)=>{o.attrs[k]=args;return p;};}});};
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean);
const all=(n,p)=>[...(p(n)?[n]:[]),...(n?.kids??[]).flatMap(c=>all(c,p))];
const text=n=>typeof n==='string'?n:(n?.kids??[]).map(text).join(' ');
const errors=tree=>all(tree,n=>n?.attrs?.id?.[0]?.startsWith('task-error-'));
const DAY=86400000;let now=Date.UTC(2026,10,23,18),enabled=true,shown=true,socket;
const repo='example/crew',other='example/other',url=(n,r=repo)=>`https://github.com/${r}/pull/${n}`,key=(n,r=repo)=>`${r}#${n}`;
const context={scope:'verified-home',machine:null,links:[8,5,6,7].map(n=>({url:url(n),task:`task-${n}`,terminal:n===8?'live-worker':null,historical:n!==8}))};
const facts=new Map([8,5,6,7].map(n=>[key(n),{number:n,url:url(n),state:n===8?'OPEN':'MERGED',isDraft:n===8,title:`PR ${n}`,mergedAt:n===8?null:new Date(now-3600000).toISOString(),labels:[],statusCheckRollup:[]}]));
const jobs=[],calls=[],failures=new Map(),storage=new Map();
const cx={focus_handle:()=>({}),notify(){},stop_propagation(){},timer:{every(){},after(){}},spawn:fn=>jobs.push(Promise.resolve().then(()=>fn(cx)))};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const host={shared:()=>null,props:()=>null,theme:()=>({}),settings:()=>({zoom:1}),window:()=>({platform:'windows'}),layout:()=>({id:'panel',hidden:!shown,children:[{id:'panel-body',active:'changes'}]}),notify(){},run(){throw Error('No worker navigation authorized');},closeOverlay(){},openOverlay(){},nextCommand:()=>new Promise(()=>{}),exec:async(cmd,args)=>{assert.equal(cmd,'gh');const k=key(Number(args[2]),args[args.indexOf('--repo')+1]);calls.push(k);await Promise.resolve();const f=failures.get(k);if(f instanceof Error)throw f;if(f)return f;return {code:0,stdout:JSON.stringify(facts.get(k))};}};
host.exec=legacyTargetResponses(host.exec);
const {Main,gitReads}=await loadMod({host,modules:{'enrollment-picker.js':'src/plugins/git/mod/enrollment-picker.js','choice-menu.js':'src/ui/choice-menu.js','label-colors.js':'src/plugins/git/mod/label-colors.js','main.js':'src/plugins/git/mod/main.js','aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js','ui.js':'src/ui/ui.js','space-color-state.js':{currentSpaceColor:()=>null},
 'plugins.js':{sidebarPanelEnabled:()=>enabled,pluginPullContext:(_space,options)=>!enabled?null:context.stale&&!options?.presentation?null:context,pluginEvent(){}},'location.js':{location:()=>({space:'coordinator',cwd:'/not-git',on:null,terminal:'coordinator'})},
 'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},'gpui-base':{v_flex:element,h_flex:element,Popover:{new:id=>element().id(id)},Input:{}},'agent-links.js':{AgentLinks:class{}},'pin-swap.js':{PinSwap:class{cancel(){}},PIN_SWAP_MS:320},'panel-pin.js':{panelPin:element},'sidebar-title.js':{sidebarTitle:element},'settings-dialog.js':{openSettings(){}},'panel-state.js':{changePanel(){}},'panel-kit.js':{headerTool:element,contextMenu:element,panelMessage:(_t,id,o)=>element().id(id).child(o.text)},
 'webhooks.js':{GitWebhooks:class{sync(_cx,o){socket=o;}stop(){}retryNow(){}}},'notices.js':{GitNotices:class{sync(_cx,{repository}){return repository?'repository':null;}presentation(repositories){return {choices:repositories,key:JSON.stringify(repositories)};}stop(){}retryNow(){}}}},globals:{Date:class extends Date{static now(){return now;}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}},mod:'custom-changes',entry:'export {default as Main} from "./main.js";export {gitReads} from "./pulls.js";'});
const panel=new Main(),build=panel.render.bind(panel);panel.render=(...args)=>{const tree=build(...args);assertTaskSections(tree,panel);return tree;};panel.init({},cx);await drain();let tree=panel.render(cx);await drain();tree=panel.render(cx);
const render=tab=>{panel.setView(tab,cx);return panel.render(cx);};
const checkRows=(tree,ns,r=repo)=>{for(const n of ns)assert.ok(find(tree,`pr-${key(n,r)}`));};
const checkCounts=()=>{assert.equal(panel.aggregate.counts().open,1);assert.equal(panel.aggregate.counts().closed,3);};
checkCounts();checkRows(tree,[8]);for(const n of [5,6,7])assert.equal(find(tree,`pr-${key(n)}`),undefined);assert.ok(find(tree,`pr-agent-${key(8)}`));assert.equal(errors(tree).length,0);
tree=render('closed');checkRows(tree,[5,6,7]);for(const n of [5,6,7])assert.equal(find(tree,`pr-agent-${key(n)}`),undefined);assert.equal(errors(tree).length,0);
assert.ok(find(tree,'git-enrollment-footer'),'Unenrolled repository still reads PR history normally, with one fixed footer');
const refresh=async()=>{
 // These tests inject an explicit change/failed replacement, not a generic hint.
 gitReads(host.exec).facts.clear();for(const e of panel.aggregate.entries.values())e.pr && (e.dirty=true);
 panel.aggregate.refresh(cx);await drain();
};
for(const failure of [new Error('failed to spawn gh: EAGAIN'),{code:3221225794,stderr:''},{code:-1073741502,stderr:''},{code:1,stderr:''},{code:0,timed_out:true,stderr:''},{code:1,stderr:'GraphQL: Could not resolve to a Repository with the name example/crew'},{code:1,stderr:'Could not resolve host: api.github.com'}]){
 for(const n of [5,6,7])failures.set(key(n),failure);await refresh();checkCounts();
 tree=render('open');checkRows(tree,[8]);assert.equal(errors(tree).length,0,'No finished Closed read errors in Open');
 tree=render('closed');checkRows(tree,[5,6,7]);assert.equal(errors(tree).length,1,'Exactly one notice, not three PR errors');assert.ok(find(tree,`task-error-${repo}`));
 if(failure.stderr?.includes('resolve host'))assert.match(text(errors(tree)[0]),/GitHub is unreachable/);
 else{assert.doesNotMatch(text(errors(tree)[0]),/unreachable/);assert.match(text(errors(tree)[0]),failure.stderr?.includes('Repository')?/not found/:/refresh to retry/);}
}
// Distinct failures yield one truthful summary; partial recovery keeps the rest.
failures.set(key(5),{code:3221225794,stderr:''});failures.set(key(6),{code:1,stderr:'GraphQL: Could not resolve to a Repository with the name example/crew'});failures.set(key(7),{code:1,stderr:'Could not resolve host: api.github.com'});await refresh();
tree=render('closed');assert.equal(errors(tree).length,1);for(const part of ['local command','example/crew #6 not found','GitHub connection'])assert.ok(text(errors(tree)[0]).includes(part));
failures.delete(key(5));await refresh();tree=render('closed');assert.equal(errors(tree).length,1);assert.doesNotMatch(text(errors(tree)[0]),/local command/);
failures.clear();await refresh();assert.equal(errors(render('closed')).length,0);
// Unknown historical state is a Closed history-load notice, not an Open error.
gitReads(host.exec).facts.clear();panel.aggregate.stop();for(const n of [5,6,7])failures.set(key(n),{code:3221225794,stderr:''});tree=panel.render(cx);await drain();
assert.equal(errors(render('open')).length,0);tree=render('closed');assert.equal(errors(tree).length,1);assert.match(text(errors(tree)[0]),/Task PR history/);// A cold read failure leaves totals unknown, not an exact loaded subset.
assert.deepEqual({...panel.aggregate.counts()},{open:null,closed:null});assert.equal(panel.aggregate.countsLoading,true);
assert.equal(panel.aggregate.rows('open').length,1);assert.equal(panel.aggregate.rows('closed').length,0);
for(const tab of ['open','closed']) {
 assert.equal(find(tree,`git-view-${tab}-count`),undefined);
 assert.equal(find(tree,`git-view-${tab}`).attrs.accessibility_label[0],tab==='open'?'Open':'Closed');
}
assert.ok(find(tree,`task-repo-${repo}`),'A genuine notice alone keeps its section');assert.equal(find(tree,'git-task-empty'),undefined,'Notice-only is not empty');
// Cold historical failures belong only to Closed, without phantom Open headers.
const live=context.links.shift();gitReads(host.exec).facts.clear();panel.aggregate.stop();tree=render('open');await drain();tree=render('open');
assert.equal(find(tree,`task-repo-${repo}`),undefined);assert.equal(text(find(tree,'git-task-empty')),'No open pull requests');
tree=render('closed');assert.ok(find(tree,`task-error-${repo}`));assert.equal(find(tree,'git-task-empty'),undefined);
context.links.unshift(live);failures.clear();await refresh();panel.render(cx);await drain();checkCounts();
// Separate repository: same PR number, independent Open failure; healthy rows
// and all other repository facts survive while notices remain repository scoped.
context.links.push({url:url(5,other),task:'other',terminal:'other-worker',historical:false});facts.set(key(5,other),{number:5,url:url(5,other),state:'OPEN'});panel.render(cx);await drain();failures.set(key(5,other),new Error('execution timed out'));
for(const n of [5,6,7])failures.set(key(n),{code:1,stderr:'GraphQL: Could not resolve to a Repository with the name example/crew'});await refresh();
tree=render('open');assert.equal(errors(tree).length,1);assert.ok(find(tree,`task-error-${other}`));checkRows(tree,[8]);checkRows(tree,[5],other);
tree=render('closed');assert.equal(errors(tree).length,1);assert.ok(find(tree,`task-error-${repo}`));checkRows(tree,[5,6,7]);assert.equal(find(tree,`task-repo-${other}`),undefined,'Open rows and their failures do not keep a Closed section');
const beforeFold=calls.length;find(tree,`task-repo-header-${repo}`).attrs.on_click[0]({},cx);tree=panel.render(cx);assert.equal(errors(tree).length,0);assert.ok(find(tree,'git-enrollment-footer'),'Folding hides the read notice, not enrollment');assert.equal(calls.length,beforeFold);assert.equal(panel.aggregate.counts().closed,3);
find(tree,`task-repo-header-${repo}`).attrs.on_click[0]({},cx);tree=panel.render(cx);assert.equal(errors(tree).length,1);
// Expiration removes old historical rows AND their failures/empty headers.
const beforeAge=calls.length;now+=DAY;tree=panel.render(cx);assert.equal(panel.aggregate.counts().closed,0);assert.equal(find(tree,`task-repo-${repo}`),undefined,'Live Open rows cannot keep an empty Closed header');assert.equal(find(tree,`task-repo-${other}`),undefined);assert.equal(text(find(tree,'git-task-empty')),'No closed pull requests');assert.equal(find(tree,`task-error-${repo}`),undefined);assert.equal(calls.length,beforeAge);
tree=render('open');assert.ok(find(tree,`task-repo-${repo}`),'Eligible live Open row retains its own tab section');
context.links=context.links.filter(l=>l.url!==url(8));tree=panel.render(cx);assert.equal(find(tree,`task-repo-${repo}`),undefined,'Expired-only repository has no stale error header');
// Existing refresh path, not a new timer/retry storm; hidden/stale/disabled
// callbacks cannot start follow-ups or alter retained last-good rows.
const beforeQuiet=calls.length;for(let i=0;i<4;i++)panel.render(cx);await drain();assert.equal(calls.length,beforeQuiet);
context.stale=true;panel.render(cx);panel.aggregate.refresh(cx);await drain();assert.equal(calls.length,beforeQuiet);assert.equal(socket.enabled,false);
context.stale=false;shown=false;panel.render(cx);panel.aggregate.refresh(cx);await drain();assert.equal(calls.length,beforeQuiet);
enabled=false;panel.aggregate.refresh(cx);await drain();assert.equal(calls.length,beforeQuiet);
// Authoritative PR absence is different from uncertain repository resolution:
// silent in both tabs, for live sources too, with no empty sections or enrollment.
enabled=true;shown=true;context.stale=false;now-=DAY;context.links=[8,5,6,7].map(n=>({url:url(n),task:`task-${n}`,terminal:n===8?'live-worker':null,historical:n!==8}));
failures.clear();await refresh();panel.render(cx);await drain();
for(const n of [5,6])failures.set(key(n),{code:1,stderr:`GraphQL: Could not resolve to a PullRequest with the number of ${n}.`});
await refresh();tree=render('closed');assert.equal(errors(tree).length,0);checkRows(tree,[7]);for(const n of [5,6])assert.equal(find(tree,`pr-${key(n)}`),undefined);assert.equal(panel.aggregate.counts().closed,1);
// Drop the last found history row and the live row. No neutral hint/tooltip or
// synthetic row replaces them, and no repository enrollment card is left over.
for(const n of [7,8])failures.set(key(n),{code:1,stderr:'HTTP 404: Not Found'});await refresh();
for(const tab of ['open','closed']){tree=render(tab);assert.equal(errors(tree).length,0);assert.equal(find(tree,`task-repo-${repo}`),undefined);assert.equal(find(tree,'git-enrollment-footer'),undefined);assert.equal(text(find(tree,'git-task-empty')),`No ${tab} pull requests`);assert.doesNotMatch(text(tree),/not found|Task PR history|check the recorded/);}
const missingReads=calls.length;for(let i=0;i<3;i++){await refresh();panel.render(cx);}assert.equal(calls.length,missingReads,'No repeated missing history or live reads during the cooldown');
panel.aggregate.stop();panel.render(cx);await drain();assert.equal(calls.length,missingReads,'Stop/recreation retains missing results for the module session');
console.log('PASS rendered real read notices and silent missing live/history PRs, mixed rows, no empty sections, cache reuse and guarded lifecycle');
