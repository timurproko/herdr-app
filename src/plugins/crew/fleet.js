// Crew owns identity and recorded PR sourcing. Consumers use registry contributions only.
import { shared, setShared, spaces, panes, terminals, machines, checking } from '../api.js';
export const FLEET_KEY = 'custom.fleet.links';
const READS = 'custom.fleet.reads', TTL = 10000, EXPIRY = 30000;
const enabled = () => shared('custom.spaces.preferences')?.connectFleetToCoordinator === true && shared('custom.plugins')?.crew?.enabled === true;
const machineOf = address => address?.includes('/') ? address.split('/')[0] : null;
const qualify = (address, machine) => typeof address !== 'string' || !address || (address.includes('/') && machineOf(address) !== machine) ? null : machine && !address.includes('/') ? `${machine}/${address}` : address;
const model = () => ({groups:spaces(), all:panes(), list:terminals()});
export function recordedSource(stdout) {
  if(typeof stdout !== 'string' || stdout.length > 1048576) throw Error('Crew status is too large');
  const value = JSON.parse(stdout);
  if(typeof value?.home !== 'string' || !value.home || value.home.length > 2048 || !Array.isArray(value.tasks) || value.tasks.length > 4096) throw Error('Invalid Crew status');
  return {home:value.home,owner:{terminal:value.owner?.terminal,live:value.owner?.live === true},tasks:value.tasks.map(t=>({id:t.id,terminal:t.terminal,state:t.state,pr:typeof t.pr==='string'?t.pr:null}))};
}
export function bindFleet(status, machine, {groups, all, list}) {
  if(!status?.owner?.live || !Array.isArray(status.tasks)) return null;
  const membership = address => {
    const terminal = list.find(t=>t.address===qualify(address,machine) && t.state==='live');
    if(!terminal || machineOf(terminal.address)!==machine) return null;
    const found = all.filter(p=>p.terminal===terminal.address && !p.mod);
    if(found.length!==1) return null;
    const group = groups.filter(s=>(s.machine??null)===machine && s.tabs?.some(t=>t.id===found[0].tab));
    return group.length===1 ? {terminal,space:group[0].id,tab:found[0].tab,pane:found[0].pane} : null;
  };
  const owner = membership(status.owner.terminal);
  if(!owner) return null;
  const workers=[], fleets=new Set(), tags=new Set();
  for(const task of status.tasks) {
    if(task.state==='closed') continue;
    const member=membership(task.terminal);
    if(!member) continue;
    const labels=member.terminal.labels??{}, tag=labels['crew.home'];
    if(typeof task.id!=='string' || labels['crew.task']!==task.id || typeof tag!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(tag)) return null;
    const fleet=`fm-crew-${tag}`;
    if(member.space.split('/').at(-1)!==fleet || labels['herdr.space']!==fleet || member.space===owner.space) return null;
    fleets.add(member.space);tags.add(tag);
    if(['working','reported'].includes(task.state)) workers.push({id:task.id,terminal:member.terminal.address,space:member.space,tab:member.tab,pane:member.pane,state:task.state,pr:task.pr});
  }
  if(fleets.size>1 || tags.size>1) return null;
  const child=[...fleets][0]??null;
  const binding=JSON.stringify([machine,status.home,owner.terminal.address,owner.space,owner.tab,owner.pane,child]);
  return {parent:owner.space,child,machine,binding,home:status.home,owner:owner.terminal.address,tasks:workers,incomplete:workers.some(t=>t.state==='working')};
}
const signature = (machine,m=model()) => JSON.stringify([m.groups.filter(s=>(s.machine??null)===machine).map(s=>[s.id,s.tabs?.map(t=>t.id)]).sort((a,b)=>a[0].localeCompare(b[0])),m.all.filter(p=>machineOf(p.terminal)===machine).map(p=>[p.pane,p.tab,p.terminal]),m.list.filter(t=>machineOf(t.address)===machine && (t.labels?.['crew.task'] || t.labels?.['custom.crew.home'])).map(t=>[t.address,t.state,t.labels?.['crew.task'],t.labels?.['crew.home'],t.labels?.['herdr.space'],t.labels?.['custom.crew.home']])]);
export function fleetContexts() {
  if(!enabled()) return [];
  const state=shared(FLEET_KEY), now=Date.now();
  if(state?.version!==1) return [];
  return Object.values(state.entries??{}).flatMap(entry=> {
    if(now-entry.at>EXPIRY || signature(entry.machine)!==entry.signature) return [];
    const bound=bindFleet(entry.status,entry.machine,model());return bound?[bound]:[];
  });
}
// Injected source is a seam: future discover-prs can be implemented here, not in consumers.
export function refreshFleets(cx, readStatus, force = false) {
  if(!enabled() || checking()) return;
  const relevant=new Set(terminals().filter(t=>t.state==='live' && (t.labels?.['custom.crew.home']==='1' || t.labels?.['crew.task'])).map(t=>machineOf(t.address)));
  for(const machine of relevant) {
    if(machine && !machines().some(m=>m.name===machine && m.layout==='ready')) continue;
    const key=machine??'local', state=shared(FLEET_KEY), entry=state?.entries?.[key], sig=signature(machine), now=Date.now();
    const pending=shared(READS)?.[key];
    if(pending?.until>now || !force && entry?.signature===sig && now-entry.at<TTL) continue;
    const token=`${now}-${Math.random()}`, generation=shared('custom.fleet.generation');
    setShared(READS,{...shared(READS),[key]:{token,until:now+20000}});
    cx.spawn(async view=> {
      const current=()=>enabled() && shared('custom.fleet.generation')===generation && shared(READS)?.[key]?.token===token && signature(machine)===sig;
      try {
        await Promise.resolve();if(!current()) return;
        const status=recordedSource(await readStatus(machine));
        if(!current()) return;
        const latest=shared(FLEET_KEY);
        setShared(FLEET_KEY,{version:1,entries:{...(latest?.version===1?latest.entries:{}),[key]:{machine,at:Date.now(),signature:sig,status}}});
      } catch {
        if(current()) {const latest=shared(FLEET_KEY);setShared(FLEET_KEY,{version:1,entries:{...latest?.entries,[key]:{machine,at:Date.now(),signature:sig,status:null}}});}
      } finally {
        if(shared(READS)?.[key]?.token===token) {const reads={...shared(READS)};delete reads[key];setShared(READS,reads);}
        view.notify();
      }
    });
  }
}
export function invalidateFleet() {
  setShared('custom.fleet.generation',(shared('custom.fleet.generation')??0)+1);
  setShared(FLEET_KEY,null);setShared(READS,{});
}
export function fleetPullContext(space) {
  const context=fleetContexts().find(c=>c.parent===space);
  return context ? {...context,kind:'tasks',scope:context.binding,links:context.tasks.filter(t=>t.pr).map(t=>({url:t.pr,terminal:t.terminal,task:t.id}))} : null;
}
