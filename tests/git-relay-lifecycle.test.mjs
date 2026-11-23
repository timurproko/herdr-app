import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { loadMod } from '../tools/plugin-harness.mjs';
import { notice } from '../src/plugins/git/relay-worker.js';
import { relayNotice, mainChanged } from '../src/plugins/git/relay-notice.js';
import * as runtime from '../src/plugins/git/relay-state.js';
import * as config from '../src/plugins/git/relay-config.js';
const repo = 'timurproko/herdr-app';
const push = { type:'github', event:'push', repository:repo, delivery:'push-1', ref:'refs/heads/main' };
assert.equal(mainChanged(push, repo), true);
assert.equal(mainChanged({ ...push, repository:repo.toUpperCase() }, repo), true);
for (const change of [ { ref:'refs/heads/Main' }, { ref:'refs/heads/feature' }, { ref:undefined }, { ref:{ bad:true } },
  { repository:'someone/else' }, { event:'check_run' }, { delivery:'bad delivery' } ]) assert.equal(mainChanged({ ...push, ...change }, repo), false);
const merged = { type:'github', event:'pull_request', repository:repo, delivery:'pr-1', action:'closed', merged:true, base:'main' };
assert.equal(mainChanged(merged, repo), true);
for (const change of [{ action:'opened' },{ merged:false },{ merged:'true' },{ base:'Main' },{ base:null }]) assert.equal(mainChanged({ ...merged, ...change }, repo), false);
assert.deepEqual(notice({ repository:{ full_name:repo }, ref:'refs/heads/main', secret:'no', after:'a'.repeat(40) },'push','push-1'), push);
assert.deepEqual(notice({ repository:{ full_name:repo }, action:'closed', pull_request:{ merged:true, base:{ ref:'main' }, body:'private' } },'pull_request','pr-1'), merged);
for (const ref of ['refs/heads/a\nb', 'x'.repeat(500), 'refs/heads/a..b', 4]) assert.equal(relayNotice({ ...push, ref }).ref, undefined);
assert.deepEqual(relayNotice({ ...push, ref:undefined }), { type:'github', repository:repo, event:'push', delivery:'push-1' }, 'legacy notices stay valid CI hints, not main hints');

let clock = 1000000, eager = false, relay = 'https://relay.test', keyText = JSON.stringify({ token:'a'.repeat(64), secret:'b'.repeat(64) });
const store = new Map(), sockets = [], tasks = [], timers = [];
let reads = 0, invalidations = 0;
const host = { shared:key=>store.get(key), setShared:(key,value)=>store.set(key,value), checking:()=>eager, appHome:()=>'/fixture' };
const api = await loadMod({ host, globals:{ URL }, modules:{ 'space-color-state.js':{ currentSpaceColor:()=>null } },
  entry:"export { RelayClient, watchUpdates, stopRelay, syncRelay, closeRelay } from './plugins/git/relay-client.js';" });
const tick = async () => { for (let i=0;i<40;i++) await Promise.resolve(); };
const cx = { notify(){}, spawn(fn){ tasks.push(fn(cx)); }, timer:{ after(ms,fn){ timers.push({ at:clock+ms, fn }); } } };
async function advance(ms) {
  const end = clock + ms;
  for (;;) {
    timers.sort((a,b)=>a.at-b.at);
    if (!timers.length || timers[0].at > end) break;
    const timer = timers.shift(); clock = timer.at; timer.fn(cx); await tick();
  }
  clock = end; await tick();
}
const io = { ...host, now:()=>clock, random:()=>0.5,
  readTextFile:async()=>{ reads++; if(keyText===null)throw Error('missing'); return keyText; },
  connect:async url=>{
    assert.equal(sockets.filter(socket=>!socket.closed).length, 0, 'never a second socket for overlapping consumers/owners');
    const socket = { url, writes:[], write:async text=>socket.writes.push(text),
      read:()=>new Promise((resolve,reject)=>{ socket.resolve=resolve; socket.reject=reject; }),
      close:async()=>{ socket.closed=true; socket.reject?.(Error('closed')); } };
    sockets.push(socket); return socket;
  },
};
const owner = {}, options = { enabled:true, setting:()=>relay };
const watch = () => api.watchUpdates({ ...options, owner, cx, repository:repo, onInvalidate(){ invalidations++; } });
const client = new api.RelayClient(io), duplicate = new api.RelayClient(io);
client.sync(cx, options); duplicate.sync(cx, options); await tick();
assert.equal(sockets.length, 1); assert.equal(reads, 1); assert.equal(sockets[0].url,'wss://relay.test/events');
assert.equal(JSON.parse(sockets[0].writes[0]).token,'a'.repeat(64));
async function send(message) { sockets.at(-1).resolve(JSON.stringify(message)); await tick(); watch(); await tick(); }
await send({ type:'ready', protocol:1 }); assert.equal(invalidations,1,'connect catch-up even without repo enrollment');
await send({ ...push, repository:'someone/else', delivery:'unrelated-1' }); assert.equal(invalidations,1);
await send({ ...push, ref:'refs/heads/feature', delivery:'feature-1' }); assert.equal(invalidations,1);
await send({ ...push, ref:undefined, delivery:'legacy-1' }); assert.equal(invalidations,1);
await send(push); assert.equal(invalidations,2,'main push invalidates without a shown Git panel');
await send(push); assert.equal(invalidations,2,'delivery deduplicated');
await send(merged); assert.equal(invalidations,3);
assert.equal(JSON.stringify([...store.values()]).includes('a'.repeat(64)),false,'no auth keys in runtime state');
for(let i=0;i<140;i++) await send({ ...push, event:'check_run', repository:`other/repo${i}`, delivery:`other-${i}` });
assert.equal(invalidations,3,'bounded metadata eviction does not turn unrelated events into update hints');
assert.equal(Object.keys(store.get(runtime.RELAY_STATE).repositories).length,128);
assert.ok(store.get(runtime.RELAY_STATE).repositories[repo], 'retain update subscription revision across unrelated eviction');

// The panel consumes public revisions; it cannot own or retarget the transport.
const changes = [], context = vm.createContext({});
const modules = { './host.js':host, './plugins.js':{ pluginById:()=>({}), pluginSetting:()=>relay },
  './plugins/git/relay-config.js':config, './plugins/git/relay-state.js':runtime };
const panel = new vm.SourceTextModule(await fs.readFile(new URL('../src/plugins/git/mod/webhooks.js',import.meta.url),'utf8'),{context});
await panel.link(name=>new vm.SyntheticModule(Object.keys(modules[name]),function(){for(const[k,v]of Object.entries(modules[name]))this.setExport(k,v);},{context})); await panel.evaluate();
const consumer = new panel.namespace.GitWebhooks();
const consume = (enabled=true, repository=repo) => consumer.sync(cx,{ enabled, repository, scope:repository, onChange:()=>changes.push(repository) });
consume(); consume(); assert.equal(changes.length,1);
consume(true,'someone/else'); consume(false); await tick(); assert.equal(sockets.at(-1).closed,undefined,'hiding a panel leaves update transport active');
await send({ ...push, delivery:'hidden-main' }); assert.equal(invalidations,4);
consume(); assert.equal(changes.length,3,'showing catches up independent of selected repo');
const grouped=new panel.namespace.GitWebhooks();let groupChanges=0;
const groupSync=()=>grouped.sync(cx,{enabled:true,scope:'tasks',repositories:[repo,'someone/else'],onChange(){groupChanges++;}});
groupSync();await send({...push,event:'check_run',repository:'someone/else',delivery:'group-notice'});groupSync();
assert.equal(groupChanges,2,'merged task/fleet multi-repository panel consumes notices for every linked repo');
await send({...push,event:'check_run',repository:'unrelated/repo',delivery:'group-unrelated'});groupSync();assert.equal(groupChanges,2);
const before = sockets.length; client.sync(cx,options); duplicate.sync(cx,options); await tick(); assert.equal(sockets.length,before);

sockets.at(-1).reject(Error('offline')); await tick();
assert.equal(store.get(runtime.RELAY_STATE).status,'disconnected');
client.sync(cx,options); await tick(); assert.equal(sockets.length,before,'renders cannot bypass backoff');
await advance(1000); assert.equal(sockets.length,before+1);
await send({type:'ready',protocol:1}); assert.equal(invalidations,5,'reconnect catch-up');
store.set('custom.plugins',{ git:{ enabled:false } }); api.stopRelay();
await advance(1000); assert.equal(sockets.at(-1).closed,true,'disable revokes owner and closes transport');
const stoppedReads=reads; client.sync(cx,{...options,enabled:false}); await advance(5000); assert.equal(reads,stoppedReads);
store.set('custom.plugins',{git:{enabled:true}});
client.sync(cx,options); await tick(); await send({type:'ready',protocol:1});
client.stop(); await tick(); duplicate.sync(cx,options); await tick();
assert.equal(sockets.at(-1).closed,undefined,'replacement acquires after prior owner closes');
duplicate.stop(); await tick();

// Missing and edited credential files block until explicit configuration revision.
for(const text of [null,'invalid']) {
  keyText=text; store.set(runtime.RELAY_RETRY,(store.get(runtime.RELAY_RETRY)||0)+1);
  client.sync(cx,options); await tick(); const count=reads;
  for(let i=0;i<10;i++)client.sync(cx,options);
  await advance(20000); assert.equal(reads,count,'missing/invalid setup does not retry-loop');
  client.stop(); await tick();
}
keyText=JSON.stringify({token:'a'.repeat(64),secret:'b'.repeat(64)});
store.set(runtime.RELAY_RETRY,100); client.sync(cx,options); await tick();
// Revocation while a read is pending cannot publish even a valid main event.
const sequence=store.get(runtime.RELAY_STATE).sequence;
api.stopRelay(); sockets.at(-1).resolve(JSON.stringify({...push,delivery:'stale'})); await tick();
assert.equal(store.get(runtime.RELAY_STATE).sequence,sequence); assert.equal(sockets.at(-1).closed,true);
client.stop(); duplicate.stop(); await tick();
// Close before queued lifecycle startup, during key reads and during connect.
const queuedOwner={},queued=[];const queuedCx={...cx,spawn:fn=>queued.push(fn)};
const beforeQueued=sockets.length;
api.syncRelay({...options,owner:queuedOwner,cx:queuedCx});api.closeRelay({owner:queuedOwner});
await queued.shift()(queuedCx);assert.equal(sockets.length,beforeQueued);assert.equal(queuedOwner.gitRelay,undefined);
let resolveKeys;const pendingOwner={};
pendingOwner.gitRelay=new api.RelayClient({...io,isClosed:()=>pendingOwner.gitRelayClosed,readTextFile:()=>new Promise(resolve=>{resolveKeys=resolve;})});
pendingOwner.gitRelay.sync(cx,options);await tick();api.closeRelay({owner:pendingOwner});resolveKeys(keyText);await tick();
assert.equal(sockets.length,beforeQueued,'closed owner cannot connect after credential resolution');
let resolveConnect;const connectingOwner={};
connectingOwner.gitRelay=new api.RelayClient({...io,isClosed:()=>connectingOwner.gitRelayClosed,connect:async url=>{const socket=await io.connect(url);await new Promise(resolve=>{resolveConnect=resolve;});return socket;}});
connectingOwner.gitRelay.sync(cx,options);await tick();api.closeRelay({owner:connectingOwner});resolveConnect();await tick();
assert.equal(sockets.at(-1).closed,true,'late connect closes on resolution after owner teardown');
const badAuth=new api.RelayClient(io);badAuth.sync(cx,options);await tick();
const readyBefore=store.get(runtime.RELAY_STATE).ready;
sockets.at(-1).resolve(JSON.stringify({type:'ready',protocol:99}));await tick();
assert.equal(sockets.at(-1).closed,true);assert.equal(store.get(runtime.RELAY_STATE).ready,readyBefore,'failed authentication cannot publish readiness');
badAuth.stop();await tick();
store.set(runtime.RELAY_STATE,{...store.get(runtime.RELAY_STATE),owner:'lost-owner',until:clock-1});
const takeover=new api.RelayClient(io),beforeTakeover=sockets.length;
takeover.sync(cx,options);await tick();assert.equal(sockets.length,beforeTakeover,'expired-owner handoff waits for old heartbeat cleanup');
await advance(2000);assert.equal(sockets.length,beforeTakeover+1);takeover.stop();await tick();
relay=''; client.sync(cx,options); await tick(); const socketCount=sockets.length;
relay='https://relay.test'; eager=true; client.sync(cx,options); await tick(); assert.equal(sockets.length,socketCount,'eager checks never connect');
await Promise.all(tasks);
console.log('PASS: exact main filters, minimal metadata, one leased chrome socket, independent hidden/other-repo subscriptions, disable/setup, reconnect, bounded revisions and stale-owner guards (fixtures)');
