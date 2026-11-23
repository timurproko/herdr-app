// Crew owns identity and recorded PR sourcing. Consumers use registry contributions only.
import { shared, setShared, spaces, panes, terminals, machines, checking } from '../api.js';
export const FLEET_KEY = 'custom.fleet.links', DISPLAY_KEY = 'custom.fleet.display';
const READS = 'custom.fleet.reads', TTL = 10000, EXPIRY = 30000;
// Only reads witnessed by this running mod can authorize actions. Persisted
// timestamps/tokens alone are display history, not cold-start verification.
const verifiedTokens = new Map(), pendingTokens = new Map();
const enabled = () => shared('custom.spaces.preferences')?.connectFleetToCoordinator === true && shared('custom.plugins')?.crew?.enabled === true;
const machineOf = address => address?.includes('/') ? address.split('/')[0] : null;
const qualify = (address, machine) => typeof address !== 'string' || !address || (address.includes('/') && machineOf(address) !== machine) ? null : machine && !address.includes('/') ? `${machine}/${address}` : address;
const model = () => ({groups:spaces(), all:panes(), list:terminals()});
// A valid status reply can race a partially published native snapshot. Missing
// live membership is uncertainty, unlike a finished terminal or conflicting join.
const incompleteMembership = (status, machine, snapshot) => status.owner.live &&
  [status.owner.terminal,...status.tasks.filter(t=>['working','reported'].includes(t.state)).map(t=>t.terminal)].some(address=>{
    const id=qualify(address,machine);if(!id)return false;
    const terminal=snapshot.list.find(t=>t.address===id);if(!terminal)return true;
    if(terminal.state!=='live')return false;
    const members=snapshot.all.filter(p=>p.terminal===id && !p.mod);
    return !members.length || members.length===1 && !snapshot.groups.some(s=>(s.machine??null)===machine && s.tabs?.some(t=>t.id===members[0].tab));
  });
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
  const identity=[machine,status.home,owner.terminal.address,owner.space,owner.tab,owner.pane];
  const binding=JSON.stringify([...identity,child]), pullScope=JSON.stringify(identity);
  // --all records belong to this verified status home, not to a former live
  // terminal. They contribute links only: never adoption identity or navigation.
  const history=status.tasks.filter(t=>t.state==='closed' && typeof t.id==='string' && t.id.length>0 && t.id.length<=128 && typeof t.pr==='string' && t.pr.length>0)
    .map(t=>({id:t.id,state:'closed',pr:t.pr,terminal:null,historical:true}));
  return {parent:owner.space,child,machine,binding,pullScope,home:status.home,owner:owner.terminal.address,
    ownerTab:owner.tab??null,ownerPane:owner.pane??null,adoption:[...tags][0]??null,tasks:[...workers,...history],incomplete:workers.some(t=>t.state==='working')};
}
const identityOf = bound => bound ? Object.fromEntries(['machine','parent','child','home','owner','ownerTab','ownerPane','adoption'].map(key=>[key,bound[key]])) : null;
const identityParts = identity => [identity.machine,identity.home,identity.owner,identity.parent,identity.ownerTab,identity.ownerPane];
const withScopes = identity => ({...identity,pullScope:JSON.stringify(identityParts(identity)),binding:JSON.stringify([...identityParts(identity),identity.child])});
const text = (value, max = 512) => typeof value==='string' && value.length>0 && value.length<=max && !/[\u0000-\u001f\u007f]/.test(value);
const inMachine = (snapshot, id, machine) => snapshot.groups.some(s=>s.id===id && (s.machine??null)===machine);
function displayRecord(value) {
  if(!value || typeof value!=='object' || Array.isArray(value) || !(value.machine===null || text(value.machine,128)) ||
    !text(value.parent) || !text(value.child) || value.parent===value.child || !text(value.home,2048) || !text(value.owner) ||
    !(value.ownerTab===null || text(value.ownerTab)) || !(value.ownerPane===null || text(value.ownerPane)) ||
    typeof value.adoption!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(value.adoption) ||
    value.child.split('/').at(-1)!==`fm-crew-${value.adoption}` || machineOf(value.owner)!==value.machine) return null;
  return withScopes(identityOf(value));
}
function savedDisplays() {
  const value=shared(DISPLAY_KEY);
  if(value?.version!==1 || !value.entries || typeof value.entries!=='object' || Array.isArray(value.entries) || Object.keys(value.entries).length>256) return [];
  const unique=new Map();
  for(const item of Object.values(value.entries)) {const record=displayRecord(item);if(record)unique.set(record.machine,record);}
  return [...unique.values()];
}
function publishDisplay(machine, bound, snapshot) {
  const raw=shared(DISPLAY_KEY);if(raw && raw.version!==1)return;
  const entries={};
  for(const record of savedDisplays()) if(record.machine!==machine)entries[JSON.stringify(record.machine)]=identityOf(record);
  const record=displayRecord(identityOf(bound));
  if(record)entries[JSON.stringify(machine)]=identityOf(record);
  const next={version:1,entries};
  if(JSON.stringify(raw)!==JSON.stringify(next))setShared(DISPLAY_KEY,next);
}
function pruneDisplays(snapshot, hosts) {
  const raw=shared(DISPLAY_KEY);if(raw?.version!==1)return;
  const entries={}, removed=[];
  for(const record of savedDisplays()) {
    // Do not erase another machine's persisted pair during initial layout load.
    const layout=hosts.find(h=>(h.name??null)===record.machine)?.layout;
    const ready=layout==='ready' || !record.machine && !layout && snapshot.groups.some(s=>!s.machine);
    if(!ready || [record.parent,record.child].every(id=>inMachine(snapshot,id,record.machine)))entries[JSON.stringify(record.machine)]=identityOf(record);
    else removed.push(record.machine??'local');
  }
  const next={version:1,entries};if(JSON.stringify(raw)!==JSON.stringify(next))setShared(DISPLAY_KEY,next);
  if(removed.length) {
    const cached=shared(FLEET_KEY), reads={...shared(READS)};
    const cachedEntries={...cached?.entries};
    for(const key of removed){delete cachedEntries[key];delete reads[key];verifiedTokens.delete(key);pendingTokens.delete(key);}
    if(cached?.version===1)setShared(FLEET_KEY,{version:1,entries:cachedEntries});
    setShared(READS,reads);
  }
}
const witnessed = (key, token) => Boolean(token && (verifiedTokens.get(key)===token || pendingTokens.get(key)===token));
// Pair dependencies only. Names, ordering, selection and unrelated topology are
// never binding invalidators, even when they happen on the same machine.
function signature(machine, snapshot, identity) {
  const locations = terminal => snapshot.all.filter(p=>p.terminal===terminal && !p.mod).map(p=>[
    snapshot.groups.filter(s=>(s.machine??null)===machine && s.tabs?.some(t=>t.id===p.tab)).map(s=>s.id).sort(),p.tab,p.pane]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if(!identity) return JSON.stringify(snapshot.list.filter(t=>machineOf(t.address)===machine && (t.labels?.['custom.crew.home']==='1' || t.labels?.['crew.task']))
    .map(t=>[t.address,t.state,t.labels?.['custom.crew.home'],t.labels?.['crew.home'],t.labels?.['herdr.space'],locations(t.address)]).sort((a,b)=>a[0].localeCompare(b[0])));
  const owner=snapshot.list.find(t=>t.address===identity.owner), child=snapshot.groups.find(s=>s.id===identity.child && (s.machine??null)===machine);
  const tabs=new Set(child?.tabs?.map(t=>t.id)??[]), fleet=new Set(snapshot.all.filter(p=>tabs.has(p.tab) && !p.mod).map(p=>p.terminal));
  const labels=[...new Set(snapshot.list.filter(t=>fleet.has(t.address) && (t.labels?.['crew.home'] || t.labels?.['crew.task']))
    .map(t=>JSON.stringify([t.state,t.labels?.['crew.home'],t.labels?.['herdr.space']])) )].sort();
  return JSON.stringify([machine,identity.home,identity.parent,inMachine(snapshot,identity.parent,machine),identity.child,
    Boolean(child),owner?.state,owner?.labels?.['custom.crew.home'],locations(identity.owner),labels]);
}
function locallyVerified(key, entry) {
  if(entry?.token && pendingTokens.get(key)===entry.token)verifiedTokens.set(key,entry.token);
  return Boolean(entry?.token && verifiedTokens.get(key)===entry.token);
}
export function fleetContexts({presentation = false} = {}) {
  if(!enabled()) return [];
  const state=shared(FLEET_KEY), now=Date.now(), snapshot=model(), hosts=machines();
  if(presentation) return savedDisplays().filter(record=>[record.parent,record.child].every(id=>inMachine(snapshot,id,record.machine)));
  if(state?.version!==1) return [];
  return Object.entries(state.entries??{}).flatMap(([key,entry])=> {
    const age=now-entry.at;
    if(!locallyVerified(key,entry) || !Number.isFinite(age) || age<0 || age>=EXPIRY) return [];
    const layout=hosts.find(m=>(m.name??null)===entry.machine)?.layout;
    if((layout && layout!=='ready') || (entry.machine && !layout) || signature(entry.machine,snapshot,entry.identity)!==entry.signature) return [];
    const bound=bindFleet(entry.status,entry.machine,snapshot);
    return bound && bound.binding===entry.binding ? [bound] : [];
  });
}
// Injected source is a seam: future discover-prs can be implemented here, not in consumers.
export function refreshFleets(cx, readStatus, force = false) {
  if(!enabled() || checking() || (shared(FLEET_KEY) && shared(FLEET_KEY).version!==1)) return;
  const snapshot=model(), hosts=machines();pruneDisplays(snapshot,hosts);
  const displays=savedDisplays();
  const relevant=new Set([...snapshot.list.filter(t=>t.state==='live' && (t.labels?.['custom.crew.home']==='1' || t.labels?.['crew.task'])).map(t=>machineOf(t.address)),...displays.map(d=>d.machine)]);
  for(const machine of relevant) {
    if(machine && !hosts.some(m=>m.name===machine && m.layout==='ready')) continue;
    const key=machine??'local', state=shared(FLEET_KEY), entry=state?.entries?.[key];
    const reference=entry?.identity??displays.find(d=>d.machine===machine), sig=signature(machine,snapshot,reference), now=Date.now();
    locallyVerified(key,entry);
    const pending=shared(READS)?.[key];
    if(pending?.until>now) {
      if(pending.token!==entry?.attemptToken)pendingTokens.set(key,pending.token);
      if(pending.token!==entry?.attemptToken || witnessed(key,pending.token))continue;
    }
    if(!force && witnessed(key,entry?.attemptToken) && (entry.attemptSignature??entry.signature)===sig && now-(entry.attemptAt??entry.at)<TTL) continue;
    const token=`${now}-${Math.random()}`, generation=shared('custom.fleet.generation');
    pendingTokens.set(key,token);
    setShared(READS,{...shared(READS),[key]:{token,until:now+20000}});
    cx.spawn(async view=> {
      const current=()=>enabled() && (!shared(FLEET_KEY) || shared(FLEET_KEY).version===1) && shared('custom.fleet.generation')===generation && shared(READS)?.[key]?.token===token && shared(READS)[key].until>Date.now();
      try {
        await Promise.resolve();if(!current()) return;
        const status=recordedSource(await readStatus(machine));
        if(!current()) return;
        const latest=shared(FLEET_KEY), snapshot=model(), prior=latest?.entries?.[key]?.status;
        const changedOwner=prior && (prior.home!==status.home || prior.owner.terminal!==status.owner.terminal);
        if(!changedOwner && incompleteMembership(status,machine,snapshot)) throw Error('Live membership is not yet available');
        const bound=bindFleet(status,machine,snapshot), identity=identityOf(bound), at=Date.now();
        const verifiedSignature=signature(machine,snapshot,identity);
        setShared(FLEET_KEY,{version:1,entries:{...(latest?.version===1?latest.entries:{}),[key]:{
          machine,at,attemptAt:at,token,attemptToken:token,signature:verifiedSignature,attemptSignature:verifiedSignature,status,binding:bound?.binding??null,identity}}});
        verifiedTokens.set(key,token);publishDisplay(machine,bound,snapshot);
      } catch {
        if(current()) {
          const latest=shared(FLEET_KEY);
          // Failed transport is not a negative relationship result. Back off
          // using attempt age without renewing successful verification age.
          setShared(FLEET_KEY,{version:1,entries:{...latest?.entries,[key]:{
            ...latest?.entries?.[key],machine,attemptAt:Date.now(),attemptToken:token,attemptSignature:signature(machine,model(),latest?.entries?.[key]?.identity??reference)}}});
        }
      } finally {
        if(shared(READS)?.[key]?.token===token) {const reads={...shared(READS)};delete reads[key];setShared(READS,reads);}
        view.notify();
      }
    });
  }
}
export function invalidateFleet() {
  setShared('custom.fleet.generation',(shared('custom.fleet.generation')??0)+1);
  setShared(FLEET_KEY,null);setShared(READS,{});setShared(DISPLAY_KEY,null);
  verifiedTokens.clear();pendingTokens.clear();
}
export function fleetPullContext(space, {presentation = false} = {}) {
  const context=fleetContexts().find(c=>c.parent===space);
  if(context)return {...context,kind:'tasks',scope:context.pullScope,stale:false,links:context.tasks.filter(t=>t.pr).map(t=>({url:t.pr,terminal:t.terminal,task:t.id,historical:t.historical===true}))};
  if(!presentation || !enabled())return null;
  let identity=fleetContexts({presentation:true}).find(c=>c.parent===space);
  // In the current runtime, finished-task rows may outlive the optional child.
  // No task/PR inventory is loaded from disk to manufacture action context.
  if(!identity) {
    const snapshot=model(), state=shared(FLEET_KEY);
    if(state?.version===1)for(const [key,entry] of Object.entries(state.entries??{}))
      if(locallyVerified(key,entry) && entry.identity?.child===null && entry.identity.parent===space && inMachine(snapshot,space,entry.machine))identity=withScopes(entry.identity);
  }
  return identity ? {...identity,kind:'tasks',scope:identity.pullScope,stale:true,links:[]} : null;
}
