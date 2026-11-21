// Auto-fix opt-in owns background setup. No separate background UI or app monitoring loop.
import {exec,pluginFile,shared,setShared,readTextFile,appHome,checking,machines,notify} from '../api.js';
import {validRepository} from './ci-evidence.js';
import {parseHistory} from './ci-history.js';
const HOSTS='custom.git.monitor-hosts',queues=new Map(),observed=new Set();
export function managedMonitors(){const value=shared(HOSTS);return value?.version===1&&Array.isArray(value.hosts)?value.hosts.filter(on=>on===null||typeof on==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(on)):[];}
const active=cx=>cx.enabled?.()!==false&&shared('custom.plugins')?.git?.enabled!==false&&cx.setting('autoFixCI')===true;
export function monitorConfig(cx,enabled=active(cx)){
  const known=shared('custom.git.webhook-state'),relay=cx.setting('relay')??'';
  // Reuse the existing repository selection, never add a parallel background scope.
  const repositories=known?.version===1&&known.relay===relay&&known.members&&typeof known.members==='object'
    ?Object.entries(known.members).filter(([,v])=>v===true).map(([repo])=>repo.toLowerCase())
    :(cx.setting('ciMonitorRepositories')||cx.setting('repository')||'').split(/[\s,]+/).filter(Boolean).map(s=>s.toLowerCase());
  const unique=[...new Set(repositories)];
  if(unique.length>32||!unique.every(validRepository))throw Error('Invalid selected CI repositories.');
  return {enabled,states:cx.setting('ciFixStates'),template:cx.setting('ciFixMessage'),repositories:unique,
    ciEnabled:cx.setting('ciFixEnabled')!==false,conflictEnabled:cx.setting('conflictFixEnabled')===true,conflictTemplate:cx.setting('conflictFixMessage'),
    mergedEnabled:cx.setting('mergedEnabled')===true,mergedTemplate:cx.setting('mergedMessage')};
}
export async function controlMonitor(action,on,config,history){
  const result=await exec('node',[pluginFile('git','monitor-control.cjs'),JSON.stringify({action,on,config,history})],{timeout:150000});
  let reply;try{reply=JSON.parse(result.stdout);}catch{throw Error('Background CI setup did not acknowledge. Check the machine before retrying.');}
  if(!reply.ok||result.code!==0)throw Error(reply.error||'Background CI setup could not reach a machine.');return reply;
}
export function connectedMonitorHosts(){
  return [...new Set([null,...machines().filter(m=>typeof m.name==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(m.name)&&!m.temporary&&(m.layout==='ready'||m.state==='connected')).map(m=>m.name)])];
}
function enroll(on){
  const prior=shared(HOSTS);if(prior&&prior.version!==1)throw Error('Unknown monitor registration; preserving it.');
  const hosts=managedMonitors();if(!hosts.includes(on))setShared(HOSTS,{version:1,hosts:[...hosts,on]});
}
export async function syncMonitors(cx,{hosts=null}={}){
  if(checking())return [];
  const selected=hosts??[...new Set([...managedMonitors(),...(active(cx)?connectedMonitorHosts():[])])];
  const jobs=selected.map(on=>{
    const key=on??'',previous=queues.get(key)??Promise.resolve();
    const next=previous.catch(()=>{}).then(async()=>{
      const config=monitorConfig(cx);
      const status=await controlMonitor('status',on);
      if(!status.installed&&!config.enabled)return null;
      let result;
      if(config.enabled&&(!status.installed||status.upToDate===false)){
        const text=await readTextFile(`${appHome()}/.customizations/git-ci-fix-history.json`);
        // Re-evaluate after asynchronous work: turning off must cancel setup.
        const latest=monitorConfig(cx);if(!latest.enabled)return null;
        result=await controlMonitor('install',on,latest,JSON.stringify(parseHistory(text)));
      }else result=await controlMonitor('update',on,monitorConfig(cx));
      enroll(on);return result;
    });queues.set(key,next);return next;
  });return Promise.all(jobs);
}
// Mounted header already emits this lifecycle event on machine/repository changes.
// No timer, periodic status UI, stored job or render-time command is introduced.
export function ensureMonitors(context){
  if(checking()||!context.enabled||context.setting('autoFixCI')!==true){observed.clear();return;}
  const cx={setting:context.setting,enabled:()=>context.enabled},scope=JSON.stringify(monitorConfig(cx));
  const hosts=connectedMonitorHosts(),keys=hosts.map(on=>JSON.stringify([on,scope]));
  for(const key of observed)if(!keys.includes(key))observed.delete(key);
  const due=hosts.filter((_on,index)=>!observed.has(keys[index]));if(!due.length)return;
  for(const key of keys)observed.add(key);
  context.cx.spawn(async()=>{
    await Promise.resolve();
    if(!active(cx))return;
    try{await syncMonitors(cx,{hosts:due});}
    catch{notify({title:'CI auto-fix setup needs attention',body:'A machine could not install or update its Core-side monitor. Other installed machines keep their last settings. Reconnect it and toggle auto-fix off/on to retry.',level:'warning'});}
  });
}
