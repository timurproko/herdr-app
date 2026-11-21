// Auto-fix opt-in provisions background support; all transports remain synthetic.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const state={'custom.plugins':{git:{enabled:true,settings:{autoFixCI:false}}},'custom.git.webhook-state':{version:1,relay:'',members:{'owner/repo':true,'owner/other':false}}};
const calls=[],installed=new Set();let checking=false,peers=[{name:'pc2',layout:'ready'}];
const {r,m}=await loadMod({host:{shared:k=>state[k],setShared:(k,v)=>state[k]=v,checking:()=>checking,machines:()=>peers,appHome:()=>'/fixture',readTextFile:async()=>null,
 notify(){assert.fail('Synthetic setup should not fail');},
 exec:async(_cmd,args)=>{const input=JSON.parse(args[1]),key=input.on??'local';calls.push(input);if(input.action==='install')installed.add(key);return {code:0,stdout:JSON.stringify({ok:true,installed:installed.has(key),upToDate:true})};}},
 modules:{'space-color-state.js':{currentSpaceColor(){}}},entry:"export * as r from './plugins.js';export * as m from './plugins/git/monitor-actions.js';"});
const git=r.pluginById('git'),context=()=>({...r.pluginContext(git),enabled:()=>r.pluginEnabled(git)});
const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
r.setPluginSetting(git,'ciFixMessage','Inspect {runUrl} for {url}');await flush();assert.equal(calls.length,0,'No setup while opt-in is off');
r.setPluginSetting(git,'autoFixCI',true);await flush();
const installs=calls.filter(c=>c.action==='install');assert.equal(installs.length,2);assert.deepEqual(installs.map(c=>c.on),[null,'pc2']);
for(const call of installs){assert.equal(call.config.enabled,true);assert.deepEqual(call.config.repositories,['owner/repo']);assert.equal(call.history,'{"version":1,"entries":[]}');}
assert.deepEqual(Array.from(m.managedMonitors()),[null,'pc2']);
r.setPluginSetting(git,'ciFixStates',['error']);await flush();const updates=calls.filter(c=>c.action==='update');assert.equal(updates.length,2);assert.ok(updates.every(c=>c.config.states[0]==='error'));
r.setPluginSetting(git,'autoFixCI',false);await flush();assert.ok(calls.filter(c=>c.action==='update').slice(-2).every(c=>!c.config.enabled));
r.setPluginEnabled(git,false);await flush();assert.ok(calls.filter(c=>c.action==='update').slice(-2).every(c=>!c.config.enabled));r.setPluginEnabled(git,true);await flush();
checking=true;const before=calls.length;r.setPluginSetting(git,'autoFixCI',true);await flush();assert.equal(calls.length,before,'Eager checks cannot provision');checking=false;
const jobs=[],event={setting:r.pluginContext(git).setting,enabled:true,cx:{spawn:fn=>jobs.push(fn)}};
m.ensureMonitors(event);m.ensureMonitors(event);assert.equal(jobs.length,1,'Repeated renders coalesce setup');await jobs.shift()();const after=calls.length;m.ensureMonitors(event);assert.equal(jobs.length,0);assert.equal(calls.length,after);
peers.push({name:'pc3',layout:'ready'});m.ensureMonitors(event);assert.equal(jobs.length,1);await jobs.shift()();assert.equal(calls.filter(c=>c.action==='install'&&c.on==='pc3').length,1,'New SSH connections provision automatically');
state['custom.git.webhook-state'].members['owner/repo']=false;state['custom.git.webhook-state'].members['owner/other']=true;
m.ensureMonitors(event);assert.equal(jobs.length,1);await jobs.shift()();assert.ok(calls.filter(c=>c.action==='update').slice(-3).every(c=>JSON.stringify(c.config.repositories)==='["owner/other"]'),'Existing repository selection owns worker scope');
state['custom.git.webhook-state'].members['owner/other']=false;assert.deepEqual(Array.from(m.monitorConfig(context()).repositories),[],'Unchecking all repositories cannot fall back to old scopes');
peers.push({name:'pc4',layout:'ready'});m.ensureMonitors(event);assert.equal(jobs.length,1);
state['custom.plugins'].git.enabled=false;await jobs.shift()();assert.equal(calls.filter(c=>c.action==='install'&&c.on==='pc4').length,0,'Disabling Git cancels deferred setup even with an old event snapshot');
console.log('PASS: one-switch local/SSH provisioning, no background UI, automatic new-host setup, repository selection reuse, pause/config sync, eager-check guards and render coalescing (zero real processes)');
