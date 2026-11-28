import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {fixture, fakeTransport, A, C, ITEM, credentials} from './testing.test.mjs';
const require = createRequire(import.meta.url);
const {execute} = require('./cli.cjs'), {run} = require('./operations.cjs');
const {Client} = require('./client.cjs'), {authority} = require('./policy.cjs');
const {Deadline} = require('./errors.cjs');
const {windowsSecurity} = require('./credentials.cjs');
const {outputFile} = require('./download.cjs');
const f = fixture();
const files = () => fs.readdirSync(f.root).filter(n=>n.startsWith('trello-attachment-'));
try {
  // Monotonic command budget is shared by initial authority and every request.
  let now = 0, checks = 0, dispatches = 0;
  const security = f.store.security;
  f.store.security = () => { checks++; now += 7; };
  const preflight = await execute(['cards','get',C,'--board',A], {store:f.store, commandTimeout:30, clock:()=>now, transport:async()=>{dispatches++;throw Error('must not dispatch');}});
  assert.equal(preflight.result.error.code,'LIMIT'); assert.equal(dispatches,0); assert.equal(checks,5);
  assert.equal(f.store.budget,undefined,'Invocation budget must not mutate caller store');
  f.store.security = security;
  now = 0;
  const fake = fakeTransport(()=>{now+=11;});
  const aggregate = await execute(['cards','get',C,'--board',A], {store:f.store,...fake,commandTimeout:30,clock:()=>now});
  assert.equal(aggregate.result.error.code,'LIMIT'); assert.equal(fake.calls.length,3);
  assert.equal(f.store.budget,undefined);

  // A request starts before blocking ACL preflight, not after it.
  now=0;
  const gate = authority(f.store), realCheck = gate.check;
  gate.check = budget => { now+=25; realCheck(budget); };
  const blocked = new Client(f.store,gate,{clock:()=>now,timeout:20,transport:async()=>{throw Error('must not dispatch');}});
  await assert.rejects(blocked.get(`/boards/${A}`),{code:'TRANSPORT'});
  await assert.rejects(blocked.request('PUT',`/cards/${C}`,{name:'not dispatched'}),{code:'TRANSPORT'});

  // Error status survives an unreadable body; successful reads/binaries fail
  // within the same deadline even when cancellation never resolves.
  for (const kind of ['headers','json','error','image']) {
    const start=performance.now(); let signal;
    const client = new Client(f.store,authority(f.store),{timeout:40,transport:async(_url,options)=>{
      signal=options.signal;
      if(kind==='headers')return new Promise(()=>{});
      const response=new Response(new ReadableStream({pull(){return new Promise(()=>{});},cancel(){return new Promise(()=>{});}}),{status:kind==='error'?400:200,headers:{'Content-Type':'image/png'}});
      return response;
    }});
    if(kind==='image') await assert.rejects(client.download(`https://trello.com/1/cards/${C}/attachments/${ITEM}/download/screen.png`,C,ITEM,async response=>{for await(const _ of response.body){}}),{code:'TRANSPORT'});
    else await assert.rejects(client.get(`/boards/${A}`),e=>kind==='error'?e.httpStatus===400:e.code==='TRANSPORT');
    assert.equal(signal.aborted,true); assert.ok(performance.now()-start<1000);
  }

  // Late headers after timeout cannot persist cooldown, consume data or publish.
  let release;
  const late = new Client(f.store,authority(f.store),{timeout:30,transport:()=>new Promise(resolve=>{release=resolve;})});
  await assert.rejects(late.get(`/boards/${A}`),{code:'TRANSPORT'});
  release(new Response('{}',{status:429}));
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(f.store.read('cooldown',true),null);

  // Actual child-process timeout is capped by the remaining command budget.
  // This invokes a disposable Node child, not PowerShell/credentials/Trello.
  let childTimeout;
  const clockStart=performance.now(), budget=new Deadline(180);
  assert.throws(()=>windowsSecurity('fake-private-path',false,false,{budget,env:{SystemRoot:'C:\\Windows'},execute(_exe,_args,options){
    childTimeout=options.timeout;
    cp.execFileSync(process.execPath,['-e','setInterval(()=>{},1000)'],options);
  }}),e=>['LIMIT','STORE_PERMISSION_CHECK'].includes(e.code));
  assert.ok(childTimeout>0&&childTimeout<=180); assert.ok(performance.now()-clockStart<2000);
  let t=0; const remaining=new Deadline(30,()=>t);
  windowsSecurity('fake',false,false,{budget:remaining,env:{SystemRoot:'C:\\Windows'},execute(_exe,_args,o){assert.equal(o.timeout,30);t+=19;}});
  assert.throws(()=>windowsSecurity('fake',false,false,{budget:remaining,env:{SystemRoot:'C:\\Windows'},execute(_exe,_args,o){assert.equal(o.timeout,11);t+=11;}}),{code:'LIMIT'});
  // Timely ACL failures remain fail-closed instead of being hidden as success.
  assert.throws(()=>windowsSecurity('fake',false,false,{budget:new Deadline(),env:{SystemRoot:'C:\\Windows'},execute(){throw {status:21};}}),{code:'STORE_PERMISSIONS'});

  const before=files().length;
  for(const when of [2,3,4]) {
    let n=0;const outputBudget=new Deadline();
    assert.throws(()=>outputFile(f.root,'expired.png',Buffer.from('fake'),()=>{if(++n===when)outputBudget.expire();outputBudget.check();},outputBudget),{code:'LIMIT'});
    assert.equal(files().length,before);
  }
  // A command which has already spent its budget cannot dispatch a new read.
  const expired=new Deadline();expired.expire();
  await assert.rejects(run(f.store,'boards.list',{}, {budget:expired,transport:async()=>{throw Error('must not dispatch');}}),{code:'LIMIT'});

  // Installed-style one-shot subprocess must exit after its JSON, even if an
  // aborted transport deliberately leaves a live handle. No live-fetch fallback.
  const preload=path.join(f.root,'deadline-preload.mjs');
  fs.writeFileSync(preload,`import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const errors=require(${JSON.stringify(require.resolve('./errors.cjs'))}),BaseDeadline=errors.Deadline;
errors.Deadline=class extends BaseDeadline{constructor(duration,clock,parent,code){super(Math.min(duration,120),clock,parent,code);}};
const c=require(${JSON.stringify(require.resolve('./credentials.cjs'))}),BaseStore=c.Store;
c.Store=class extends BaseStore{constructor(home){super(home,{security:()=>{}});}};
globalThis.fetch=async()=>{setInterval(()=>{},1000);return new Promise(()=>{});};`);
  const start=performance.now();
  const child=cp.spawnSync(process.execPath,['--import',pathToFileURL(preload).href,fileURLToPath(new URL('./cli.cjs',import.meta.url)),'boards','list'],{env:{...process.env,NODE_OPTIONS:'',HERDR_APP_HOME:f.home},encoding:'utf8',timeout:5000,windowsHide:true});
  assert.ok(!child.error);assert.equal(child.status,3);assert.equal(JSON.parse(child.stdout).error.code,'LIMIT');assert.ok(performance.now()-start<4000);
  for(const secret of Object.values(credentials))assert.ok(!child.stdout.includes(secret)&&!child.stderr.includes(secret));
} finally { f.cleanup(); }
console.log('PASS: whole-command/preflight budgets, bounded child ACL checks, stalled phases/cancellation, late-response refusal, output cleanup and CLI exit');
