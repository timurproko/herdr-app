import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHmac,createHash} from 'node:crypto';
import {loadMod} from '../tools/plugin-harness.mjs';
import * as config from '../src/plugins/git/relay-config.js';
import setup from '../src/plugins/git/setup.cjs';
import {WebhookHub,validSignature,notice} from '../tools/git-webhook-relay/worker.mjs';
const declaration=await loadMod({host:{},modules:{'space-color-state.js':{currentSpaceColor:()=>null}},entry:"export {default as git} from './plugins/git/plugin.js';"});
assert.equal(declaration.git.prerequisites.find(p=>p.id==='credentials').fix.label,'Create');
assert.equal(declaration.git.prerequisites.find(p=>p.id==='relay').fix.label,'Configure');
assert.equal(declaration.git.prerequisites.find(p=>p.id==='relay').fix.primary,true);
assert.equal(declaration.git.prerequisites.find(p=>p.id==='relay').fix.manual,true,'Primary styling must not include Configure in Install all');
const token='a'.repeat(64),secret='b'.repeat(64),keys={token,secret};
for(const url of ['http://relay.test','https://u:p@relay.test','https://relay.test/path','https://relay.test/?secret=abc','wss://relay.test'])assert.equal(config.relayURL(url),null);
assert.equal(config.relayURL('https://relay.test/'),'https://relay.test');assert.equal(config.credentials('{bad'),null);
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'git-webhooks-'));
try {
  const file=path.join(tmp,'keys.json');
  assert.equal((await setup.run('credentials',file)).status,'missing');
  assert.equal((await setup.run('create',file)).status,'ready');
  assert.ok(config.credentials(await fs.readFile(file,'utf8')));await assert.rejects(setup.run('create',file),/EEXIST/);
  await fs.writeFile(file,JSON.stringify(keys));
  const requests=[],calls=[];
  const io={fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({protocol:1,secretHash:createHash('sha256').update(secret).digest('hex')})};},
    gh:async(args,input)=>{calls.push({args,input});return input ? '{}' : '[[]]';}};
  const legacy=await setup.run('relay',file,'https://relay.test','',io);assert.equal(legacy.status,'ready');assert.equal(legacy.noticeVersion,1);
  const modern=await setup.run('relay',file,'https://relay.test','',{...io,fetch:async()=>({ok:true,json:async()=>({protocol:1,noticeVersion:2,secretHash:createHash('sha256').update(secret).digest('hex')})})});assert.equal(modern.noticeVersion,2);
  assert.equal(requests[0].options.headers.Authorization,`Bearer ${token}`);
  assert.equal((await setup.run('repository',file,'https://relay.test','owner/repo',io)).status,'missing');
  assert.equal((await setup.run('connect',file,'https://relay.test','owner/repo',io)).status,'ready');
  assert.equal(calls.at(-1).input.config.secret,secret);assert.deepEqual(calls.at(-1).input.events,config.EVENTS);assert.ok(calls.at(-1).args.includes('--input'));
  assert.ok(!calls.at(-1).args.join(' ').includes(secret),'Secret travels through gh stdin, not argv');
  const ready={id:7,active:true,events:config.EVENTS,config:{url:'https://relay.test/github',content_type:'json',insecure_ssl:'0'}};
  assert.equal((await setup.run('repository',file,'https://relay.test','owner/repo',{...io,gh:async()=>JSON.stringify([[ready]])})).status,'ready');
  await assert.rejects(setup.run('relay',file,'https://relay.test','',{fetch:async()=>({ok:true,json:async()=>({protocol:1,secretHash:'WRONG'})})}),/secret/);
} finally {await fs.rm(tmp,{recursive:true,force:true});}
const body=JSON.stringify({repository:{full_name:'owner/repo'},private:'must not reach clients'});
const signed=text=>'sha256='+createHmac('sha256',secret).update(text).digest('hex');
assert.equal(await validSignature(new TextEncoder().encode(body),signed(body),secret),true);
assert.equal(await validSignature(new TextEncoder().encode(body+' '),signed(body),secret),false);
assert.equal(await validSignature(new TextEncoder().encode(body),'sha256=invalid',secret),false);
assert.equal(notice(JSON.parse(body),'issues','id'),null);
assert.equal(notice(null,'push','id'),null);
assert.deepEqual(notice(JSON.parse(body),'check_run','delivery-1'),{type:'github',repository:'owner/repo',event:'check_run',delivery:'delivery-1'});
const sent=[],socket={attachment:{authenticated:true,tokenHash:createHash('sha256').update(token).digest('hex')},deserializeAttachment(){return this.attachment;},serializeAttachment(v){this.attachment=v;},send:text=>sent.push(JSON.parse(text)),close(code){this.closed=code;}};
const hub=new WebhookHub({getWebSockets:()=>[socket]}, {CLIENT_TOKEN:token,GITHUB_SECRET:secret});
const request=(signature=signed(body),event='check_run')=>new Request('https://relay.test/github',{method:'POST',headers:{'X-Hub-Signature-256':signature,'X-GitHub-Event':event,'X-GitHub-Delivery':'delivery-1'},body});
assert.equal((await hub.fetch(request('sha256='+'0'.repeat(64)))).status,401);assert.equal(sent.length,0);
assert.equal((await hub.fetch(request())).status,200);assert.equal(sent.length,1);assert.equal(sent[0].private,undefined);
await hub.fetch(request());assert.equal(sent.length,1,'Duplicate deliveries do not fan out');
for(const action of ['labeled','unlabeled']) {
  const payload=JSON.stringify({repository:{full_name:'owner/repo'},action,label:{name:'🤖 Under review',color:'840479'}});
  assert.equal((await hub.fetch(new Request('https://relay.test/github',{method:'POST',headers:{'X-Hub-Signature-256':signed(payload),'X-GitHub-Event':'pull_request','X-GitHub-Delivery':`delivery-${action}`},body:payload}))).status,200);
  assert.deepEqual(sent.at(-1),{type:'github',repository:'owner/repo',event:'pull_request',delivery:`delivery-${action}`,action});
}
assert.equal((await hub.fetch(new Request('https://relay.test/configuration'))).status,401);
assert.equal((await hub.fetch(new Request('https://relay.test/configuration',{headers:{Authorization:`Bearer ${token}`}}))).status,200);
socket.attachment={authenticated:false};await hub.webSocketMessage(socket,JSON.stringify({type:'authenticate',token:'WRONG'}));assert.equal(socket.closed,1008);
await hub.webSocketMessage(socket,JSON.stringify({type:'authenticate',token}));assert.equal(socket.attachment.authenticated,true);assert.equal(sent.at(-1).type,'ready');
// Shared chrome transport and independent subscribers, including label events.
// The panel is now a revision consumer, not a second socket owner.
await import('./git-relay-lifecycle.test.mjs');
console.log('PASS: private relay HMAC/authentication, payload minimization, duplicate delivery, safe Settings setup, credential isolation and native subscription lifecycle');
