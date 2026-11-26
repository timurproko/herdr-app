import { shared, setShared, machines, checking } from '../api.js';
import { WORKER_SPACE_KEY, WORKER_SPACE_SETTING } from './worker-space-state.js';
import { absoluteHome, homeIdentity, supportedCapability, setterResult } from './worker-space-command.js';
const LIMIT=256, CADENCE=10000, COMMAND=18000;
const object=value=>value && typeof value==='object' && !Array.isArray(value) ? value : {};
const machineKey=machine=>JSON.stringify(machine??null);
const targetKey=(machine,home)=>JSON.stringify([machine??null,homeIdentity(home)]);
const validMachine=machine=>machine===null || typeof machine==='string' && machine.length>0 && machine.length<=128 && !/[\u0000-\u001f\u007f]/.test(machine);
const read=()=>{const b=shared(WORKER_SPACE_KEY);return b?.version===1 ? {...b,hosts:object(b.hosts),targets:object(b.targets)} : {version:1,epoch:0,hosts:{},targets:{}};};
const enabled=()=>shared('custom.plugins')?.crew?.enabled===true;
let initialized=false;
function save(change) {
  const b=change({...read(),hosts:{...read().hosts},targets:{...read().targets}});
  const desired=b.intent ? 'per-project':'combined', unresolved=new Map(), weight={failed:5,refused:4,unsupported:3,pending:2};
  const add=(machine,status,detail)=>{const key=machineKey(machine),prior=unresolved.get(key);if(!prior || weight[status]>weight[prior.kind])unresolved.set(key,{machine:machine??'This computer',kind:status,detail});};
  const hosts=Object.values(b.hosts).filter(h=>validMachine(h?.machine));
  for(const h of hosts) if(!h.connected)add(h.machine,'pending','Waiting for connection');
    else if(h.state!=='ready')add(h.machine,h.state??'pending',h.reason??'Checking Crew support');
  for(const t of Object.values(b.targets))if(validMachine(t?.machine)&&absoluteHome(t?.home)) {
    const h=b.hosts[machineKey(t.machine)];
    if(h?.connected && h.state==='ready' && (t.state!=='ready' || t.mode!==desired))add(t.machine,t.state==='ready'?'pending':t.state??'pending',t.reason??'Applying current choice');
  }
  if(b.overflow)add(null,'failed','More Crew homes than can be tracked');
  const names={pending:'Pending',unsupported:'Unsupported',refused:'Refused',failed:'Failed'};
  b.statuses=[...unresolved.values()].map(s=>({machine:s.machine,label:names[s.kind]??'Pending',status:s.kind==='pending'?'recommended':'error',detail:s.detail}));
  b.available=hosts.some(h=>h.state==='ready'&&h.connected) && !hosts.some(h=>h.connected&&h.state==='unsupported') && !b.overflow;
  if(!hosts.length)b.statuses=[{machine:'',label:'Checking',status:'recommended',detail:'Checking Crew support'}];
  setShared(WORKER_SPACE_KEY,b);return b;
}
export function observeWorkerHome(machine,home) {
  if(!validMachine(machine??null)||!absoluteHome(home))return;
  const key=targetKey(machine,home),b=read();if(b.targets[key])return;
  save(b=>{if(Object.keys(b.targets).length>=LIMIT)b.overflow=true;
    else b.targets[key]={machine:machine??null,home,state:'pending',at:0};return b;});
}
export function invalidateWorkerSpaces() {
  save(b=>{b.epoch=(b.epoch??0)+1;b.intent=shared('custom.plugins')?.crew?.settings?.[WORKER_SPACE_SETTING]===true;
    for(const [key,t]of Object.entries(b.targets))b.targets[key]={...t,state:'pending',at:0};return b;});
}
const parse=text=>{try{return JSON.parse(text);}catch{return null;}};
// Only the mounted recurring owner calls this. A distinct generic moment on the
// same Spaces lifecycle keeps configuration work independent of fleet attachment.
export function refreshWorkerSpaces({cx,setting},ask) {
  if(!cx || checking() || !enabled())return;
  return cx.spawn(async view=>{
    await Promise.resolve(); // native spawn may start inline, never mutate during render/init
    if(!enabled())return;
    if(!initialized) {
      initialized=true;
      save(b=>{b.intent=setting(WORKER_SPACE_SETTING)===true;
        for(const [key,h]of Object.entries(b.hosts))b.hosts[key]={...h,state:'pending',at:0,cached:null};
        for(const [key,t]of Object.entries(b.targets))b.targets[key]={...t,state:'pending',at:0};return b;});
    }
    const at=Date.now(),intent=setting(WORKER_SPACE_SETTING)===true;
    // A timed-out/retired setter may still be executing until its transport bound.
    if(read().lock?.until>at)return;
    let inventory;try{inventory=machines();}catch{return;}
    if(!Array.isArray(inventory))return;
    const live=[{name:null,layout:'ready'},...inventory.filter(h=>h?.name!=null&&validMachine(h.name))];
    save(b=>{b.intent=intent;const before={...b.hosts};
      for(const [key,h]of Object.entries(b.hosts))b.hosts[key]={...h,connected:false};
      for(const host of live) {
        const key=machineKey(host.name),prior=before[key];
        if(!prior && Object.keys(b.hosts).length>=LIMIT){b.overflow=true;continue;}
        const connected=host.name===null || host.layout==='ready' || host.state==='connected';
        b.hosts[key]={...prior,machine:host.name,connected,state:prior?.state??'pending',at:prior?.connected===false&&connected?0:prior?.at??0};
        if(prior?.connected===false&&connected)for(const [id,t]of Object.entries(b.targets))if(t.machine===host.name)b.targets[id]={...t,state:'pending',at:0};
      }
      return b;
    });
    const b=read(),mode=intent?'per-project':'combined';
    const targets=Object.entries(b.targets).filter(([,t])=>absoluteHome(t?.home)&&validMachine(t?.machine)&&b.hosts[machineKey(t.machine)]?.connected && b.hosts[machineKey(t.machine)]?.state==='ready' &&
      (t.mode!==mode && t.state==='ready' || (t.at??0)<=at));
    const host=Object.entries(b.hosts).filter(([,h])=>h.connected&&(h.at??0)<=at).sort((a,b)=>(a[1].at??0)-(b[1].at??0))[0];
    // Pending targets precede healthy reinspection; machine capability must first
    // have been witnessed in this runtime. New hosts get their own bounded turn.
    targets.sort((a,b)=>(a[1].at??0)-(b[1].at??0));
    const next=targets[0],target=next && (!host || next[1].state!=='ready' || next[1].mode!==mode || (next[1].at??0)<=(host[1].at??0)) ? next : null;
    if(!target&&!host)return;
    const token=`${at}-${Math.random()}`,epoch=b.epoch??0,machine=target?target[1].machine:host[1].machine;
    save(b=>({...b,lock:{token,until:at+COMMAND}}));
    const current=()=>enabled() && read().lock?.token===token && read().epoch===epoch && setting(WORKER_SPACE_SETTING)===intent;
    let uncertain=false;
    const request=async params=>{
      if(!current())throw Error('obsolete');
      save(b=>({...b,lock:{token,until:Date.now()+COMMAND}}));
      let result;try{result=await ask(machine,params);}catch{uncertain=true;throw Error('transport');}
      if(!current())throw Error('obsolete');
      if(result.timedOut){uncertain=true;throw Error('timeout');}
      if(result.missing)throw Error('unsupported-platform');
      return result;
    };
    const failTarget=(status,reason,code)=>save(b=>{
      const prior=b.targets[target[0]],failures=(prior.failures??0)+1;
      b.targets[target[0]]={...prior,state:status,reason,code,failures,at:Date.now()+(status==='refused'?60000:[2000,5000,10000][Math.min(failures-1,2)])};return b;});
    try {
      if(!target) {
        const [key,h]=host,result=await request({kind:'capability',cached:h.cached}),probe=parse(result.stdout);
        if(result.code!==0)throw Error('unsupported-platform');
        if(!probe || typeof probe.identity!=='string' || probe.identity.length>4096 || typeof probe.code!=='number' || typeof probe.stdout!=='string' || probe.stdout.length>8192)throw Error('capability-unavailable');
        if(probe.code!==0 || !supportedCapability(parse(probe.stdout))) {
          save(b=>{b.hosts[key]={...b.hosts[key],state:'unsupported',reason:'Crew support needed',cached:probe,at:Date.now()+60000};return b;});return;
        }
        const found=await request({kind:'discover'}),home=parse(found.stdout)?.home;
        if(found.code!==0 || !absoluteHome(home)) {
          save(b=>{b.hosts[key]={...b.hosts[key],state:Object.values(b.targets).some(t=>t.machine===machine)?'ready':'pending',reason:'No Crew home available',cached:probe,at:Date.now()+CADENCE};return b;});return;
        }
        observeWorkerHome(machine,home);
        if(h.cached?.identity!==probe.identity)save(b=>{for(const [id,t]of Object.entries(b.targets))if(t.machine===machine)b.targets[id]={...t,state:'pending',at:0};return b;});
        save(b=>{b.hosts[key]={...b.hosts[key],state:'ready',reason:null,cached:probe,at:Date.now()+CADENCE};return b;});
      } else {
        const [,t]=target,capability=await request({kind:'capability',cached:b.hosts[machineKey(machine)].cached}),probe=parse(capability.stdout);
        if(capability.code!==0 || !probe || typeof probe.identity!=='string' || typeof probe.stdout!=='string' || probe.code!==0 || !supportedCapability(parse(probe.stdout))) {
          save(b=>{b.hosts[machineKey(machine)]={...b.hosts[machineKey(machine)],state:'unsupported',reason:'Crew support needed',at:Date.now()+60000};return b;});return;
        }
        save(b=>{b.hosts[machineKey(machine)]={...b.hosts[machineKey(machine)],cached:probe};return b;});
        const readMode=async()=>{
          const result=await request({kind:'read',home:t.home});
          const match=result.code===0 && /^worker-space: (combined|per-project)$/.exec(result.stdout.trim());
          if(!match)throw Error('read-failed');return match[1];
        };
        let observed=await readMode();
        if(observed!==mode) {
          const result=await request({kind:'set',home:t.home,mode}),answer=setterResult(result,t.home,mode);
          if(answer.status!=='accepted'){failTarget(answer.status,answer.reason,answer.code);return;}
          observed=await readMode();
        }
        if(observed!==mode)throw Error('readback-mismatch');
        save(b=>{b.targets[target[0]]={...b.targets[target[0]],mode:observed,state:'ready',reason:null,failures:0,at:Date.now()+CADENCE};return b;});
      }
    } catch(error) {
      if(current()) {
        if(target)failTarget('failed',uncertain?'Waiting to recheck Crew':'Could not confirm Crew');
        else save(b=>{b.hosts[host[0]]={...b.hosts[host[0]],state:error.message==='unsupported-platform'?'unsupported':'pending',reason:error.message==='unsupported-platform'?'Execution unavailable':'Could not check Crew',at:Date.now()+CADENCE};return b;});
      }
    } finally {
      if(read().lock?.token===token && !uncertain)save(b=>({...b,lock:null}));
      view.notify();
    }
  });
}
