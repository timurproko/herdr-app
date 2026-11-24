// Global prerequisites and per-repository enrollment must not follow WSS/agent state.
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {loadMod} from '../tools/plugin-harness.mjs';
const rates=await loadMod({host:{},modules:{'pulls.js':'src/plugins/git/mod/pulls.js'},entry:'export * from "./pulls.js";'});
import {relayURL,repositoryName,credentialPath} from '../src/plugins/git/relay-config.js';
async function harness(){let relay='',account='',snapshot=null;const pending=[],tasks=[];
 const cx={notify(){},spawn:fn=>tasks.push(fn(cx))},context=vm.createContext({});
 const modules={'./pulls.js':{...rates},'./host.js':{checking:()=>false,exec:(_cmd,args)=>new Promise(resolve=>pending.push({args,resolve}))},'./plugins.js':{pluginById:()=>({}),pluginSetting:(_p,key)=>key==='relay'?relay:account},'./plugins/api.js':{appHome:()=>'/fixture',pluginFile:()=>'/fixture/setup.cjs'},'./plugins/git/relay-config.js':{relayURL,repositoryName,credentialPath},'./plugins/git/notice-state.js':{noticeState:()=>snapshot}};
 const m=new vm.SourceTextModule(fs.readFileSync(new URL('../src/plugins/git/mod/notices.js',import.meta.url),'utf8'),{context});await m.link(name=>new vm.SyntheticModule(Object.keys(modules[name]),function(){for(const[k,v]of Object.entries(modules[name]))this.setExport(k,v);},{context}));await m.evaluate();const n=new m.namespace.GitNotices();
 const sync=(repository=null,pending=false,enabled=true)=>n.sync(cx,{enabled,repository,pending});
 const reply=async value=>{await Promise.resolve();const item=pending.shift();assert.ok(item,'Expected a readiness/enrollment check');item.resolve({code:0,stdout:JSON.stringify(value)});for(let i=0;i<10;i++)await Promise.resolve();return item;};
 return {n,sync,pending,reply,setRelay:v=>relay=v,setAccount:v=>account=v,setState:v=>snapshot=v};
}
{
 const h=await harness();for(const repo of [null,'owner/one',null,'owner/two'])assert.equal(h.sync(repo,true),'setup','Missing setup is global, including non-Git agents');assert.equal(h.pending.length,0,'A missing URL needs no network checks');
 h.setRelay('https://relay.example');h.setState({version:1,relay:'https://relay.example',revision:1,members:{'owner/one':false,'owner/two':true}});
 assert.equal(h.sync('owner/one'),'setup');await Promise.resolve();assert.equal(h.pending.length,1);assert.equal((await h.reply({setup:'ready'})).args[1],'notice');assert.equal(h.sync('owner/one'),'repository');
 for(let i=0;i<5;i++){assert.equal(h.sync('owner/one'),'repository');}assert.equal(h.pending.length,0,'Same-repository agent switches do not recheck or blink');
 assert.equal(h.sync(null,true),null,'Hide the old repo banner immediately while another folder resolves');
 assert.equal(h.sync('owner/one'),'repository','A resolved unconfigured repository uses its cached result immediately');
 assert.equal(h.sync('owner/two'),null);assert.equal(h.sync(null,true),null);assert.equal(h.sync(null,false),null,'Configured non-repository agents have no notice');
 assert.equal(h.sync('owner/three'),null);await Promise.resolve();assert.equal(h.pending.length,1);await h.reply({status:'missing'});assert.equal(h.sync('owner/three'),'repository');
 assert.equal(h.sync('owner/two'),null);assert.equal(h.sync('owner/three'),'repository');assert.equal(h.pending.length,0,'Enrollment results are cached by repository, not agent');
 h.setState({version:1,relay:'https://relay.example',revision:2,members:{'owner/three':true}});assert.equal(h.sync('owner/three'),null,'An enable in Settings updates the notice immediately');await h.reply({setup:'unknown'});assert.equal(h.sync('owner/three'),null,'Temporary connectivity does not pretend setup is missing');
 h.n.retryNow();h.sync('owner/three');await h.reply({setup:'ready'});h.sync('owner/three');await h.reply({status:'error'});assert.equal(h.sync('owner/three'),null,'Unknown permissions/errors do not falsely advertise unenrollment');
 assert.equal(h.sync(null,false,false),null);assert.equal(h.pending.length,0,'Hidden/disabled panels start no checks');
}
{
 const h=await harness();h.setRelay('https://relay.example');assert.equal(h.sync(),null,'Unknown startup is quiet, never a transient Configure banner');await h.reply({setup:'missing'});assert.equal(h.sync(),'setup');assert.equal(h.sync('owner/repo'),'setup');assert.equal(h.pending.length,0);
 h.setRelay('https://different.example');h.sync('owner/repo');await Promise.resolve();h.setRelay('https://newest.example');h.sync(null,true);
 // Resolve old and new requests together without waiting for another pending read.
 h.pending.shift().resolve({stdout:JSON.stringify({setup:'ready'})});await h.reply({setup:'missing'});assert.equal(h.sync(),'setup','Obsolete configuration replies cannot clear a missing-setup notice');
}
{
 const h=await harness();h.setRelay('https://relay.example');h.setAccount('first-user');h.sync('owner/repo');assert.equal((await h.reply({setup:'ready'})).args.at(-1),'first-user');h.sync('owner/repo');await Promise.resolve();h.setAccount('second-user');h.sync('owner/repo');await h.reply({status:'missing'});assert.equal((await h.reply({setup:'ready'})).args.at(-1),'second-user');h.sync('owner/repo');await h.reply({status:'ready'});assert.equal(h.sync('owner/repo'),null,'Old account replies cannot publish enrollment into the new account scope');
}
{
 const h=await harness();h.setRelay('https://relay.example');h.setState({version:1,relay:'https://relay.example',revision:1,members:{'owner/missing':false,'owner/ready':true}});
 h.sync('owner/missing');await h.reply({setup:'ready'});assert.equal(h.sync('owner/missing'),'repository');
 assert.equal(h.sync(null,true),null,'A repository switch immediately closes the previous notice');
 assert.equal(h.sync('owner/ready'),null,'A configured destination never inherits the previous notice');
 assert.equal(h.sync('owner/missing'),'repository');
 assert.equal(h.sync('owner/new'),null,'An unresolved enrollment does not inherit another repo’s notice');
 assert.equal(h.sync('owner/new'),null);await Promise.resolve();assert.equal(h.pending.length,1,'Pending membership checks remain single-flight');
 await h.reply({status:'ready'});assert.equal(h.sync('owner/new'),null);
 assert.equal(h.sync('owner/missing'),'repository');assert.equal(h.sync('owner/unknown'),null);
 await h.reply({status:'missing'});assert.equal(h.sync('owner/unknown'),'repository','Show enrollment only after the destination is confirmed unconfigured');
 assert.equal(h.sync('owner/late'),null);assert.equal(h.sync(null,true),null);
 await h.reply({status:'missing'});assert.equal(h.sync('owner/ready'),null,'A late reply for the previous repo cannot restore its notice');
 assert.equal(h.sync('owner/late'),'repository','The late result remains cached for its own repository');
 assert.equal(h.sync(null,false),null,'Non-repository folders clear enrollment notices too');
}
{
 const h=await harness();h.setRelay('https://relay.example');h.setState({version:1,relay:'https://relay.example',revision:1,members:{'owner/a':false,'owner/b':false,'owner/c':true}});
 h.sync('owner/a');await h.reply({setup:'ready'});h.sync('owner/a');
 const before=h.pending.length,p=h.n.presentation(['Owner/B','owner/a','owner/b','owner/c','owner/unknown']);
 assert.deepEqual([...p.choices],['owner/b','owner/a']);assert.equal(h.pending.length,before,'Pure picker snapshot adds no membership check');
 h.setState({version:1,relay:'https://relay.example',revision:2,members:{'owner/a':true}});assert.equal(h.n.presentation(['owner/a']),null,'Settings revision invalidates before sync/render');
 h.sync('owner/a');await h.reply({setup:'ready'});assert.equal(h.n.presentation(['owner/a']).choices.length,0);
 h.n.retryNow();assert.equal(h.n.presentation(['owner/a']),null,'Refresh invalidates a captured menu synchronously');
 h.sync('owner/a',false,false);assert.equal(h.n.presentation(['owner/a']),null,'Stopped controller has no eligible presentation');
}
console.log('PASS: stable global setup, immediate repo-switch dismissal, quiet pending enrollment, cached repo results, Settings updates and stale/disabled guards');
