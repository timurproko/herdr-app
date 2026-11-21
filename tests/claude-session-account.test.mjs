import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {realUi} from './support/panel-kit.mjs';
const require=createRequire(import.meta.url),project=path.resolve(import.meta.dirname,'..');
const {action}=require('../src/services/claude/session-account.cjs');
const home=await fs.mkdtemp(path.join(os.tmpdir(),'custom-claude-switch-'));
const one={email:'one@example.test',account:'one',organization:'org-one'},two={email:'two@example.test',account:'two',organization:'org-two'};
const session='instance-test-123456',now=Date.now();
let labels={'custom.claude.at':String(now),'custom.claude.control':'1','custom.claude.session':session,'custom.claude.email':one.email,'custom.claude.account':one.account,'custom.claude.organization':one.organization,'custom.claude.state':'ok'};
const calls=[],options={home,now:()=>now,run:async args=>{calls.push(args);return {state:'live',labels};}};
const request={action:'list',terminal:'t42',session,scope:'isolated',current:one};
try {
  const dir=path.join(home,'.claude/account-switcher/accounts');await fs.mkdir(dir,{recursive:true});
  for(const item of [one,two])await fs.writeFile(path.join(dir,item.email+'.json'),JSON.stringify({email:item.email,oauthAccount:{accountUuid:item.account,organizationUuid:item.organization},credentials:{claudeAiOauth:{accessToken:'secret-access',refreshToken:'secret-refresh'}},history:['secret-history']}));
  await fs.writeFile(path.join(dir,'partial.json'),'{');
  const result=await action(request,options);assert.deepEqual(result.accounts,[one,two]);assert.doesNotMatch(JSON.stringify(result),/secret-|credentials|history/);
  await action({...request,action:'switch',id:'request-test-123456',target:two},options);
  const written=calls.at(-1);assert.deepEqual(written.slice(0,2),['label','t42']);
  const message=JSON.parse(written[2].slice('custom.claude.request='.length));assert.deepEqual(message.current,one);assert.deepEqual(message.target,two);assert.equal(message.session,session);assert.equal(message.at,now);
  assert.doesNotMatch(JSON.stringify(calls),/secret-|credentials|history|send|keys/);
  for(const change of [{session:'other-instance-12345'},{terminal:'pc2/t42'},{current:two},{action:'switch',id:'request-test-123456',target:{...two,organization:'wrong-org'}}])await assert.rejects(action({...request,...change},options));
  for(const change of [{'custom.claude.at':String(now-90001)},{'custom.claude.control':''},{'custom.claude.state':'switching'},{'custom.claude.at':String(now+5001)}]) {
    const original=labels;labels={...labels,...change};await assert.rejects(action(request,options));labels=original;
  }
  const before=labels;labels={...labels,'custom.claude.control':''};
  const sharedRequest={...request,scope:'shared'},changes=[],sharedOptions={...options,switchShared:async message=>changes.push(message)};
  assert.equal((await action(sharedRequest,sharedOptions)).accounts.length,2,'Shared sessions list saved accounts too');
  await assert.rejects(action({...sharedRequest,action:'switch',id:'request-test-123456',target:two},sharedOptions),/Confirm/);
  assert.equal(changes.length,0);
  assert.deepEqual(await action({...sharedRequest,action:'switch',id:'request-test-123456',target:two,confirmShared:true},sharedOptions),{applied:'shared',nextRequest:true});
  assert.deepEqual(changes,[{current:one,target:two,confirmShared:true}]);
  labels=before;
} finally {await fs.rm(home,{recursive:true,force:true});}
// Render and exercise the real UI controller, with fake host calls only.
let terminals=[{address:'pc2/t42',program:{key:'claude'},labels:{...labels}}],pending=[],notices=[],tasks=[];
function element(){const o={kids:[],style:{}};let p;p=new Proxy(o,{get:(o,k)=>k in o?o[k]:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?v=>{o.kids.push(v);return p;}:k==='children'?v=>{o.kids.push(...v);return p;}:k==='on_mouse_down'?(button,fn)=>{(o.mouseDown??={})[button]=fn;return p;}:k==='hover'?()=>p:(...v)=>{o.style[k]=v;return p;}});return p;}
const native={terminals:()=>terminals,focused:()=>null,shared:()=>null,setShared:()=>{throw Error('Switching must not change Usage preferences');},appHome:()=>'/custom',readTextFile:async()=> '// fixture worker',notify:value=>notices.push(value),exec:(command,args,options)=>new Promise((resolve,reject)=>pending.push({command,args,options,resolve,reject}))};
const context=vm.createContext({}),modules=new Map();
const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context});
async function load(name) {
  if(modules.has(name))return modules.get(name);
  const source=await fs.readFile(path.join(project,'src',name),'utf8'),m=new vm.SourceTextModule(source,{context,identifier:name});modules.set(name,m);
  await m.link((s)=>s==='./host.js'?synthetic(native):s==='gpui-kit'?synthetic({div:element,svg:element}):s==='./ui.js'?synthetic({menuRow:realUi(element).menuRow,PILL:realUi(element).PILL,pillTrigger:realUi(element).pillTrigger,pillMenu:realUi(element).pillMenu,U:{control:24,smallIcon:14,row:28,radius:4},slot:v=>v,menuSurface:element,dropdown:(id,trigger,menu,options)=>{const e=element().child(trigger).child(menu);e.options=options;return e;}}):s==='./claude-context.js'?load('shared/claude-context.js'):Promise.reject(Error(s)));
  return m;
}
const m=await load('features/workspace-status/claude-account.js');await m.evaluate();
const {ClaudeAccount,sessionAccount}=m.namespace,view=new ClaudeAccount(),cx={focus_handle:()=>({}),notify:()=>{},stop_propagation:()=>{},spawn:fn=>{const task=fn(cx);tasks.push(task);return task;}};
view.init(cx);const target={terminal:'pc2/t42',on:'pc2'},t={};
assert.equal(sessionAccount(target).email,one.email);
function pressTrigger(tree){
  let stopped=false;
  tree.kids[0].mouseDown?.left?.({}, {...cx,stop_propagation:()=>{stopped=true;}});
  assert.equal(stopped,false,'Trigger left mouse-down must reach the native Popover wrapper');
  if(!stopped)tree.options.onOpen(true,cx);
}
let tree=view.render(target,t,cx);pressTrigger(tree);await new Promise(resolve=>setImmediate(resolve));
assert.equal(view.opened,false,'Cold open waits for identities instead of showing a loading frame');
assert.equal(view.awaitingRows,true);
assert.equal(pending[0].options.on,'pc2');assert.equal(pending[0].command,'node');assert.equal(JSON.parse(pending[0].args.at(-1)).terminal,'t42','Remote worker uses a local terminal ID');
pending.shift().resolve({code:0,stdout:JSON.stringify({accounts:[one,two]})});await tasks.at(-1);
assert.equal(view.rows.length,2);assert.equal(view.opened,true,'The menu opens with its items ready');
view.choose(target,two,cx);await new Promise(resolve=>setImmediate(resolve));
const write=pending.shift(),payload=JSON.parse(write.args.at(-1));assert.equal(payload.action,'switch');assert.equal(payload.session,session);assert.deepEqual({...payload.target},two);
// Switching UI focus never redirects the captured operation to another terminal.
view.render({terminal:'t99',on:null},t,cx);write.resolve({code:0,stdout:'{"queued":true}'});await tasks.at(-1);
assert.equal(view.pending.opening.address,'pc2/t42');
labels=terminals[0].labels;labels['custom.claude.reply']=JSON.stringify({id:payload.id,state:'accepted'});labels['custom.claude.state']='switching';
view.tick(cx);assert.ok(view.pending,'Queued/accepted is not a verified switch');
Object.assign(labels,{'custom.claude.email':two.email,'custom.claude.account':two.account,'custom.claude.organization':two.organization,'custom.claude.state':'ok'});
view.tick(cx);assert.equal(view.pending,null);assert.equal(notices.length,0);
view.open(target,sessionAccount(target),cx);
assert.equal(view.opened,true,'Reopening uses cached items immediately');assert.equal(view.awaitingRows,false);
await new Promise(resolve=>setImmediate(resolve));pending.shift().resolve({code:0,stdout:JSON.stringify({accounts:[one,two]})});await tasks.at(-1);
view.choose(target,one,cx);await new Promise(resolve=>setImmediate(resolve));const reject=pending.shift();reject.resolve({code:0,stdout:'{"queued":true}'});await tasks.at(-1);
labels['custom.claude.reply']=JSON.stringify({id:view.pending.id,state:'rejected'});view.tick(cx);assert.equal(view.pending,null);assert.equal(notices.length,1);
view.open(target,sessionAccount(target),cx);await new Promise(resolve=>setImmediate(resolve));pending.shift().resolve({code:0,stdout:JSON.stringify({accounts:[one,two]})});await tasks.at(-1);
labels['custom.claude.session']='replacement-instance-12345';view.choose(target,one,cx);await new Promise(resolve=>setImmediate(resolve));
// The worker also validates instance changes; the UI should avoid even sending one.
assert.equal(pending.length,0,'A stale menu cannot address a replacement session');
labels['custom.claude.control']='';
const sharedMenu=view.render(target,t,cx),trigger=sharedMenu.kids[0];
assert.equal(trigger.style.tooltip,undefined,'Shared Claude accounts have no hover tooltip');
assert.ok(trigger.style.accessibility_label[0].includes(two.email),'Account identity remains accessible');
assert.ok(trigger.kids.some(k=>k?.style?.size?.[0]===12),'Shared account trigger has a dropdown chevron');
pressTrigger(sharedMenu);await new Promise(resolve=>setImmediate(resolve));
assert.equal(JSON.parse(pending[0].args.at(-1)).scope,'shared');
pending.shift().resolve({code:0,stdout:JSON.stringify({accounts:[one,two]})});await tasks.at(-1);
const strings=n=>typeof n==='string'?[n]:(n?.kids??[]).flatMap(strings);
const visible=strings(view.render(target,t,cx));
assert.ok(visible.includes(one.email)&&visible.includes(two.email));
assert.ok(!visible.some(s=>/Loading|Switch shared Claude account/.test(s)),'Only account choices, no loading or confirmation surface');
view.choose(target,one,cx);await new Promise(resolve=>setImmediate(resolve));
assert.equal(pending.length,1,'A single account selection switches without a confirmation step');
assert.equal(view.opened,false,'Choosing an account immediately dismisses the dropdown');
const sharedWrite=pending.shift(),sharedPayload=JSON.parse(sharedWrite.args.at(-1));assert.equal(sharedPayload.scope,'shared');assert.equal(sharedPayload.confirmShared,true);
assert.equal(sharedWrite.options.timeout,120000);
sharedWrite.resolve({code:0,stdout:'{"applied":"shared","nextRequest":true}'});await tasks.at(-1);
Object.assign(labels,{'custom.claude.email':one.email,'custom.claude.account':one.account,'custom.claude.organization':one.organization,'custom.claude.state':'file'});
view.tick(cx);assert.equal(view.pending,null,'Shared login selection is reported separately from API verification');
assert.equal(notices.length,1,'Successful selection adds no toast or modal');
terminals[0].program.key='a1';assert.equal(sessionAccount(target),null);assert.equal(view.render(target,t,cx),null);
console.log('PASS: safe saved-account identities, explicit label-only switch, organization/session/freshness guards, remote targeting, verified completion, rejection and stale menus');
