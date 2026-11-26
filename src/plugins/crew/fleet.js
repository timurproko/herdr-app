// Crew owns identity and versioned task PR sourcing. Consumers use registry contributions only.
import { shared, setShared, spaces, panes, terminals, machines, checking, FLEET_DISPLAY_KEY, fleetDisplayChangeAllowed, updateFleetDisplay } from '../api.js';
import { fleetError, fleetGeneration, recordFleetFailure, resolveFleetFailure, fleetVerification, fleetRetry, deferFleetRetry, clearFleetRetry, clearFleetRetries } from './fleet-diagnostics.js';
export const FLEET_KEY = 'custom.fleet.links', DISPLAY_KEY = FLEET_DISPLAY_KEY;
const READS = 'custom.fleet.reads', TTL = 10000, EXPIRY = 30000, READ_LEASE = 45000, PROCESSING_LEASE = 2000;
const readerOwner=`${Date.now()}-${Math.random()}`, activeReads=new Map();
const sourceIdentity = status => JSON.stringify([status?.home,status?.owner,status?.tasks?.map(t=>[t.id,t.state,t.terminal,t.project])]);
// Only reads witnessed by this running mod can authorize actions. Persisted
// timestamps/tokens alone are display history, not cold-start verification.
const verifiedTokens = new Map(), pendingTokens = new Map();
const enabled = () => shared('custom.spaces.preferences')?.connectFleetToCoordinator === true && shared('custom.plugins')?.crew?.enabled === true;
const machineOf = address => address?.includes('/') ? address.split('/')[0] : null;
const qualify = (address, machine) => typeof address !== 'string' || !address || (address.includes('/') && machineOf(address) !== machine) ? null : machine && !address.includes('/') ? `${machine}/${address}` : address;
const model = () => ({groups:spaces(), all:panes(), list:terminals()});
// A role hint can route waiting feedback, never a pair or an action scope.
function coordinatorCandidate(machine, snapshot) {
  const candidates=snapshot.list.filter(t=>t.state==='live' && machineOf(t.address)===machine && t.labels?.['custom.crew.home']==='1')
    .flatMap(t=>{
      const members=snapshot.all.filter(p=>p.terminal===t.address && !p.mod);
      const groups=members.length===1 ? snapshot.groups.filter(s=>(s.machine??null)===machine && s.tabs?.some(tab=>tab.id===members[0].tab)) : [];
      return groups.length===1 ? [{parent:groups[0].id,owner:t.address,ownerTab:members[0].tab,ownerPane:members[0].pane??null}] : [];
    });
  return candidates.length===1 ? candidates[0] : null;
}
const readyLayout = (machine, hosts=machines()) => hosts.some(h=>(h.name??null)===machine && h.layout==='ready');
// A status reply can race native membership or crew finish's record update.
// Missing workers remain uncertain; a finished owner or conflicting join is not.
const incompleteMembership = (status, machine, snapshot) => status.owner.live &&
  [status.owner.terminal,...status.tasks.filter(t=>['working','reported'].includes(t.state)).map(t=>t.terminal)].some(address=>{
    const id=qualify(address,machine);if(!id)return false;
    const terminal=snapshot.list.find(t=>t.address===id);if(!terminal)return true;
    if(terminal.state!=='live')return id!==qualify(status.owner.terminal,machine);
    const members=snapshot.all.filter(p=>p.terminal===id && !p.mod);
    return !members.length || members.length===1 && !snapshot.groups.some(s=>(s.machine??null)===machine && s.tabs?.some(t=>t.id===members[0].tab));
  });
const canonicalPull = url => {
  if(!text(url,2048)) return false;
  const match=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/([1-9]\d*)$/.exec(url);
  return Boolean(match && ![match[1],match[2]].some(part=>part==='.' || part==='..') && Number.isSafeInteger(Number(match[3])));
};
function discoveryResult(value) {
  if(!value || typeof value!=='object' || Array.isArray(value) || !(
    value.status==='known' && canonicalPull(value.url) && ['recorded','github'].includes(value.source) && value.reason===null ||
    value.status==='none' && value.url===null && value.source===null && value.reason===null ||
    value.status==='unavailable' && value.url===null && value.source===null && text(value.reason,128) && /^[a-z][a-z0-9-]*$/.test(value.reason)
  )) throw Error('Invalid Crew PR discovery');
  return {status:value.status,url:value.url,source:value.source,reason:value.reason};
}
export function recordedSource(stdout) {
  if(typeof stdout !== 'string' || stdout.length > 1048576) throw Error('Crew status is too large');
  const value = JSON.parse(stdout);
  const object = item => item!==null && typeof item==='object' && !Array.isArray(item);
  // A malformed identity is a failed read, not evidence that ownership ended.
  // Crew explicitly emits owner:null for release and terminal:null for tasks
  // without a live worker; missing fields must not be coerced into either case.
  if(!object(value) || !text(value.home,2048) ||
    !(value.owner===null || object(value.owner) && text(value.owner.terminal) && typeof value.owner.live==='boolean') ||
    !Array.isArray(value.tasks) || value.tasks.length>4096 || value.tasks.some(t=>!object(t) || !text(t.id,128) ||
      !['preparing','working','reported','stopped','failed','closed'].includes(t.state) ||
      !(text(t.terminal) || t.terminal===null && !['working','reported'].includes(t.state)))) throw Error('Invalid Crew status');
  // Missing/unknown versions are recorded-only, never confirmed none. A v1
  // result must be complete: malformed discovery is a failed read, not absence.
  const supported=object(value.prDiscovery) && value.prDiscovery.version===1;
  const tasks=value.tasks.map(t=> {
    const discovery=supported?discoveryResult(t.prDiscovery):null;
    return {id:t.id,terminal:t.terminal,state:t.state,...(typeof t.project==='string'?{project:t.project}:{}),pr:discovery?discovery.url:typeof t.pr==='string'?t.pr:null,
      ...(discovery?{discovery}: {})};
  });
  return {home:value.home,owner:value.owner===null?{terminal:null,live:false}:{terminal:value.owner.terminal,live:value.owner.live},tasks,
    ...(supported?{discovery:{version:1}}:{})};
}
// Placement labels are trusted only after exact live task/native membership.
const projectName = name => text(name,40) && /^(?:[a-z0-9]|\.[a-z0-9])[a-z0-9.-]*$/.test(name) && !name.includes('..') && !name.endsWith('.');
function placement(labels, task, tag) {
  const base=`fm-crew-${tag}`, version=labels['crew.space.version'], mode=labels['crew.space.mode'];
  if(version===undefined && mode===undefined && labels['crew.space.project']===undefined && labels['crew.space.name']===undefined)
    return {child:base,adoption:tag,mode:'combined',project:null,name:null};
  if(version!=='1' || !['combined','per-project'].includes(mode))return null;
  const project=labels['crew.space.project'],name=labels['crew.space.name'];
  if(!text(project,128) || !(project===task.project || task.project==='crew:self' && project==='crew'))return null;
  if(mode==='combined')return name===undefined ? {child:base,adoption:tag,mode,project:null,name:null}:null;
  if(project==='crew:self')return name==='crew'?{child:`${base}-self`,adoption:tag,mode,project,name}:null;
  return projectName(project) && name===project ? {child:`${base}-project-${project}`,adoption:tag,mode,project,name}:null;
}
export const fleetChildren = value => value?.children ?? (value?.child ? [{child:value.child,adoption:value.adoption,mode:'combined',project:null,name:null}] : []);
export const fleetLinks = context => fleetChildren(context).map(child=>({...context,...child,binding:context.binding}));
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
  const workers=[], fleets=new Map(), tags=new Set();
  for(const task of status.tasks) {
    if(task.state==='closed') continue;
    const member=membership(task.terminal);
    if(!member) continue;
    const labels=member.terminal.labels??{}, tag=labels['crew.home'];
    if(typeof task.id!=='string' || labels['crew.task']!==task.id || typeof tag!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(tag)) return null;
    const child=placement(labels,task,tag);
    if(!child || member.space.split('/').at(-1)!==child.child || labels['herdr.space']!==child.child || member.space===owner.space) return null;
    const record={...child,child:member.space},prior=fleets.get(member.space);
    if(prior && JSON.stringify(prior)!==JSON.stringify(record))return null;
    fleets.set(member.space,record);tags.add(tag);
    if(['working','reported'].includes(task.state)) workers.push({id:task.id,terminal:member.terminal.address,space:member.space,tab:member.tab,pane:member.pane,state:task.state,pr:task.pr,
      ...(task.discovery?{discovery:task.discovery}:{})});
  }
  if(tags.size>1) return null;
  const children=[...fleets.values()].sort((a,b)=>a.child.localeCompare(b.child)),child=children[0]?.child??null;
  const extra=children.length>1 || children.some(c=>c.mode!=='combined') ? {children}:{};
  const identity=[machine,status.home,owner.terminal.address,owner.space,owner.tab,owner.pane];
  const binding=JSON.stringify([...identity,extra.children??child]), pullScope=JSON.stringify(identity);
  // --all records belong to this verified status home, not to a former live
  // terminal. They contribute links only: never adoption identity or navigation.
  const history=status.tasks.filter(t=>t.state==='closed' && typeof t.id==='string' && t.id.length>0 && t.id.length<=128 && (typeof t.pr==='string' && t.pr.length>0 || t.discovery))
    .map(t=>({id:t.id,state:'closed',pr:t.pr,terminal:null,historical:true,...(t.discovery?{discovery:t.discovery}:{})}));
  const tasks=[...workers,...history];
  return {parent:owner.space,child,...extra,machine,binding,pullScope,home:status.home,owner:owner.terminal.address,
    ownerTab:owner.tab??null,ownerPane:owner.pane??null,adoption:[...tags][0]??null,tasks,
    ...(status.discovery?.version===1?{discovery:{version:1,tasks:tasks.map(t=>({task:t.id,historical:t.historical===true,...t.discovery}))}}:{}),
    incomplete:status.discovery?.version===1?tasks.some(t=>t.discovery?.status==='unavailable'):workers.some(t=>t.state==='working')};
}
const identityOf = bound => bound ? Object.fromEntries(['machine','parent','child','home','owner','ownerTab','ownerPane','adoption',...(bound.children?['children']:[])].map(key=>[key,bound[key]])) : null;
const identityParts = identity => [identity.machine,identity.home,identity.owner,identity.parent,identity.ownerTab,identity.ownerPane];
const taskMembership = bound => JSON.stringify((bound?.tasks??[]).filter(t=>!t.historical).map(t=>[t.id,t.terminal,t.space,t.tab,t.pane]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
const withScopes = identity => ({...identity,pullScope:JSON.stringify(identityParts(identity)),binding:JSON.stringify([...identityParts(identity),identity.children??identity.child])});
const text = (value, max = 512) => typeof value==='string' && value.length>0 && value.length<=max && !/[\u0000-\u001f\u007f]/.test(value);
const inMachine = (snapshot, id, machine) => snapshot.groups.some(s=>s.id===id && (s.machine??null)===machine);
function displayRecord(value) {
  if(!value || typeof value!=='object' || Array.isArray(value) || !(value.machine===null || text(value.machine,128)) ||
    !text(value.parent) || !text(value.child) || value.parent===value.child || !text(value.home,2048) || !text(value.owner) ||
    !(value.ownerTab===null || text(value.ownerTab)) || !(value.ownerPane===null || text(value.ownerPane)) ||
    typeof value.adoption!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(value.adoption) ||
    machineOf(value.owner)!==value.machine) return null;
  const children=fleetChildren(value);
  if(!Array.isArray(children) || !children.length || children.length>4096 || new Set(children.map(c=>c?.child)).size!==children.length || children[0]?.child!==value.child || children.some(c=>{
    if(!c || !text(c.child) || c.child===value.parent || c.adoption!==value.adoption)return true;
    const labels={'crew.space.version':'1','crew.space.mode':c.mode,'crew.space.project':c.project??'legacy',...(c.name!==null?{'crew.space.name':c.name}:{})};
    const expected=placement(labels,{project:c.project??'legacy'},c.adoption);
    return !expected || c.child.split('/').at(-1)!==expected.child || machineOf(c.child)!==value.machine;
  }))return null;
  return withScopes(identityOf(value));
}
function savedDisplays() {
  const value=shared(DISPLAY_KEY);
  if(value?.version!==1 || !value.entries || typeof value.entries!=='object' || Array.isArray(value.entries) || Object.keys(value.entries).length>256) return [];
  const unique=new Map();
  for(const [key,item] of Object.entries(value.entries)) {const record=displayRecord(item);if(record && key===JSON.stringify(record.machine))unique.set(record.machine,record);}
  return [...unique.values()];
}
function nextDisplay(machine, bound, snapshot) {
  if(!bound)return null;
  const prior=savedDisplays().find(d=>d.machine===machine),children=new Map(fleetChildren(bound).map(c=>[c.child,c]));
  if(prior && prior.home===bound.home && prior.owner===bound.owner && prior.parent===bound.parent)for(const child of fleetChildren(prior)) {
    if(children.has(child.child) || !inMachine(snapshot,child.child,machine))continue;
    const tabs=new Set(snapshot.groups.find(s=>s.id===child.child)?.tabs?.map(t=>t.id)??[]);
    const members=new Set(snapshot.all.filter(p=>tabs.has(p.tab) && !p.mod).map(p=>p.terminal));
    const conflict=snapshot.list.some(t=>members.has(t.address) && t.state==='live' && (t.labels?.['crew.task'] || t.labels?.['crew.home']) &&
      (t.labels?.['crew.home']!==child.adoption || t.labels?.['herdr.space']!==child.child.split('/').at(-1) ||
       child.mode==='per-project' && (t.labels?.['crew.space.version']!=='1' || t.labels?.['crew.space.mode']!=='per-project' || t.labels?.['crew.space.project']!==child.project || t.labels?.['crew.space.name']!==child.name)));
    if(!conflict)children.set(child.child,child);
  }
  const records=[...children.values()].sort((a,b)=>a.child.localeCompare(b.child));
  if(!records.length)return null;
  const extra=records.length>1 || records[0].mode!=='combined'?{children:records}:{};
  return displayRecord({...identityOf(bound),children:undefined,...extra,child:records[0].child,adoption:records[0].adoption});
}
function publishDisplay(machine, bound, evidence) {
  const record=displayRecord(identityOf(bound));
  updateFleetDisplay(machine,record?identityOf(record):null,evidence);
}
function pruneDisplays(snapshot, hosts) {
  const removed=[];
  for(const record of savedDisplays()) {
    const parentPresent=inMachine(snapshot,record.parent,record.machine),children=fleetChildren(record).filter(c=>inMachine(snapshot,c.child,record.machine));
    const missing=!parentPresent || children.length!==fleetChildren(record).length;
    if(!missing || !readyLayout(record.machine,hosts))continue;
    // Prune only absent identities; this does not witness status or renew actions.
    const kept=parentPresent && children.length ? withScopes({...identityOf(record),child:children[0].child,...(record.children?{children}:{})}):null;
    if(updateFleetDisplay(record.machine,kept,{ready:true,missing:true,verified:kept!==null}) && !parentPresent)removed.push(record.machine??'local');
  }
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
  const owner=snapshot.list.find(t=>t.address===identity.owner),children=fleetChildren(identity);
  const facts=children.map(c=>{
    const child=snapshot.groups.find(s=>s.id===c.child && (s.machine??null)===machine),tabs=new Set(child?.tabs?.map(t=>t.id)??[]);
    const fleet=new Set(snapshot.all.filter(p=>tabs.has(p.tab) && !p.mod).map(p=>p.terminal));
    const labels=[...new Set(snapshot.list.filter(t=>fleet.has(t.address) && (t.labels?.['crew.home'] || t.labels?.['crew.task']))
      .map(t=>JSON.stringify([t.state,t.labels?.['crew.home'],t.labels?.['herdr.space'],t.labels?.['crew.space.version'],t.labels?.['crew.space.mode'],t.labels?.['crew.space.project'],t.labels?.['crew.space.name']])) )].sort();
    return [c.child,Boolean(child),labels];
  });
  return JSON.stringify([machine,identity.home,identity.parent,inMachine(snapshot,identity.parent,machine),owner?.state,owner?.labels?.['custom.crew.home'],locations(identity.owner),facts]);
}
function locallyVerified(key, entry) {
  if(entry?.token && pendingTokens.get(key)===entry.token)verifiedTokens.set(key,entry.token);
  return Boolean(entry?.token && verifiedTokens.get(key)===entry.token);
}
export function fleetWitnessMachines(space) {
  if(!enabled())return [];
  const snapshot=model(),hosts=machines(),displays=savedDisplays(),group=space===undefined?null:snapshot.groups.find(s=>s.id===space);
  return Object.entries(shared(FLEET_KEY)?.entries??{}).flatMap(([key,entry])=> {
    const token=entry?.attemptToken??entry?.token,machine=entry?.machine??null;
    const candidate=coordinatorCandidate(machine,snapshot),display=displays.find(d=>d.machine===machine);
    const applicable=space===undefined ? candidate || display
      : group && (group.machine??null)===machine && (candidate?.parent===space || [display?.parent,...fleetChildren(display).map(c=>c.child)].includes(space));
    return applicable && readyLayout(machine,hosts) && token && !witnessed(key,token)?[key]:[];
  });
}
export function fleetContexts({presentation = false} = {}) {
  if(!enabled()) return [];
  const state=shared(FLEET_KEY), now=Date.now(), snapshot=model(), hosts=machines();
  // Non-owner copies witness a live verification, never a completed persisted
  // token. Native shared changes redraw them before and after publication.
  for(const [key,read] of Object.entries(shared(READS)??{}))
    if(read.until>now && read.generation===fleetGeneration() && read.kind!=='discovery' && read.token!==state?.entries?.[key]?.attemptToken)pendingTokens.set(key,read.token);
  if(presentation) return savedDisplays().flatMap(record=>{
    if(!inMachine(snapshot,record.parent,record.machine))return [];
    const children=fleetChildren(record).filter(c=>inMachine(snapshot,c.child,record.machine));
    return children.length?[withScopes({...identityOf(record),child:children[0].child,...(record.children?{children}:{})})]:[];
  });
  if(state?.version!==1) return [];
  return Object.entries(state.entries??{}).flatMap(([key,entry])=> {
    const age=now-entry.at;
    if(!locallyVerified(key,entry) || !Number.isFinite(age) || age<0 || age>=EXPIRY) return [];
    if(!readyLayout(entry.machine,hosts) || signature(entry.machine,snapshot,entry.identity)!==entry.signature) return [];
    const bound=bindFleet(entry.status,entry.machine,snapshot);
    return bound && bound.binding===entry.binding ? [{...bound,taskMembershipVerified:taskMembership(bound)===entry.members}] : [];
  });
}
// Colour edits need the verified displayed relationship, not live worker membership.
// The exact retained pair is attested by a successful read witnessed in this mod;
// persisted display (or a fresh owner with a different retained child) is not proof.
export function fleetColorAllowed(pair) {
  if(!pair) return false;
  const snapshot=model(), shown=savedDisplays();
  return fleetContexts().some(context=> {
    const entry=shared(FLEET_KEY)?.entries?.[context.machine??'local'];
    const verified=displayRecord(entry?.displayIdentity);
    const displayed=shown.find(record=>record.machine===context.machine);
    return Boolean(verified && displayed && verified.parent===pair.parent && fleetChildren(verified).some(c=>c.child===pair.child) && verified.binding===pair.binding
      && context.pullScope===verified.pullScope
      && JSON.stringify(identityOf(displayed))===JSON.stringify(identityOf(verified))
      && signature(context.machine,snapshot,verified)===entry.displaySignature);
  });
}
// The injected bounded status reader owns capability fallback, never consumers.
export function refreshFleets(cx, readStatus, force = false, readDiscovery = null) {
  if(checking())return;
  // Ready native absence is conclusive even while attachment/Crew is off.
  // This cleanup is layout-only: it must precede every verification/IO gate.
  const snapshot=model(), hosts=machines();pruneDisplays(snapshot,hosts);
  if(!enabled()) {clearFleetRetries();return;}
  if(shared(FLEET_KEY) && shared(FLEET_KEY).version!==1)return;
  const deferred=[];
  const displays=savedDisplays();
  const relevant=new Set([...snapshot.list.filter(t=>t.state==='live' && (t.labels?.['custom.crew.home']==='1' || t.labels?.['crew.task'])).map(t=>machineOf(t.address)),...displays.map(d=>d.machine)]);
  clearFleetRetries(new Set([...relevant].map(machine=>machine??'local')));
  for(const machine of relevant) {
    if(machine && !hosts.some(m=>m.name===machine && m.layout==='ready')) continue;
    const key=machine??'local', state=shared(FLEET_KEY), entry=state?.entries?.[key];
    const forced=force===true || Array.isArray(force) && force.includes(key);
    const reference=displays.find(d=>d.machine===machine)??entry?.identity, sig=signature(machine,snapshot,reference), now=Date.now();
    locallyVerified(key,entry);
    let pending=shared(READS)?.[key];
    const running=activeReads.get(key);
    let alive=false;
    try {alive=Boolean(running && running.token===pending?.token && (!running.task?.is_done || !running.task.is_done()));}catch {}
    if(pending?.owner===readerOwner && pending.phase==='transport' && alive && pending.transportUntil>now && pending.until-now<1750) {
      // Only the lifecycle owning the actual native task renews transport.
      // Task cancellation/watchdog completion cannot leave a 45-second lock.
      pending={...pending,until:Math.min(pending.transportUntil,now+PROCESSING_LEASE)};
      setShared(READS,{...shared(READS),[key]:pending});
    }
    // Pre-liveness leases from a retired build do not block a new runtime for
    // their whole command allowance. They are never witnessed verification.
    if(pending && !pending.owner)pending={...pending,until:Math.min(pending.until,(pending.transportUntil??pending.until)-READ_LEASE+PROCESSING_LEASE)};
    if(pending?.until>now) {
      if(pending.token!==entry?.attemptToken)pendingTokens.set(key,pending.token);
      if(pending.token!==entry?.attemptToken || witnessed(key,pending.token)) {
        if(forced && pending.kind==='discovery')deferred.push(key);
        continue;
      }
    }
    // Abandoned ownership/processing bypasses attempt and backoff gates.
    // Healthy native tasks renew liveness; cancelled predecessors cannot publish.
    const abandoned=Boolean(pending && pending.until<=now);
    const sameAttempt=(entry?.attemptSignature??entry?.signature)===sig, retry=sameAttempt?fleetRetry(machine):null;
    if(!forced && !abandoned && retry && now<retry.nextAt)continue;
    const cached=!forced && !abandoned && !retry && witnessed(key,entry?.attemptToken) && sameAttempt && now-(entry.attemptAt??entry.at)<TTL;
    const discovery=Boolean(cached && readDiscovery && shared('custom.plugins')?.git?.enabled!==false && entry?.binding && now-entry.at<EXPIRY && now-(entry.discoveryAttemptAt??-Infinity)>=TTL);
    if(cached && !discovery)continue;
    if(pending && pending.until<=now)recordFleetFailure(machine,'expired-read',pending.generation??fleetGeneration(),{discard:true,subject:pending.subject??coordinatorCandidate(machine,snapshot)});
    const token=`${now}-${Math.random()}`, generation=fleetGeneration(), subject=coordinatorCandidate(machine,snapshot);
    pendingTokens.set(key,token);
    setShared(READS,{...shared(READS),[key]:{token,owner:readerOwner,until:now+PROCESSING_LEASE,transportUntil:now+READ_LEASE,phase:'transport',kind:discovery?'discovery':'verification',generation,subject}});
    const runningRead={token,task:null};activeReads.set(key,runningRead);
    runningRead.task=cx.spawn(async view=> {
      const obsolete=()=>fleetGeneration()!==generation ? 'obsolete-generation' : !enabled() ? 'disabled' :
        shared(READS)?.[key]?.token!==token ? 'replaced-read' : shared(READS)[key].until<=Date.now() ? 'expired-read' :
        signature(machine,model(),reference)!==sig ? 'obsolete-identity' :
        shared(FLEET_KEY) && shared(FLEET_KEY).version!==1 ? 'replaced-read' : null;
      const current=()=>!obsolete();
      let expiredRead=false;
      const discard=reason=>{
        if(reason==='expired-read')expiredRead=true;
        recordFleetFailure(machine,reason,generation,{discard:true,subject});
      };
      try {
        await Promise.resolve();if(!current()) {discard(obsolete());return;}
        const progress=phase=>{
          if(!current() || !['transport','processing'].includes(phase))return;
          const reads=shared(READS), pending=reads[key];
          setShared(READS,{...reads,[key]:{...pending,phase,
            until:Math.min(pending.transportUntil,Date.now()+PROCESSING_LEASE)}});
        };
        const output=await (discovery?readDiscovery:readStatus)(machine,{current,progress,yieldTurn:()=>new Promise(resolve=>view.timer.after(0,resolve))});
        if(!current()) {discard(obsolete());return;}
        let status;
        try {status=recordedSource(output);} catch {throw fleetError('invalid-status');}
        const latest=shared(FLEET_KEY), previous=latest?.entries?.[key], snapshot=model(), prior=previous?.status;
        if(discovery) {
          // Enrichment cannot renew verification or change a pair. Changed
          // membership is handed back to the higher-priority verifier.
          const same=previous?.token===entry.token && sourceIdentity(status)===sourceIdentity(previous.verificationStatus??prior);
          setShared(FLEET_KEY,{...latest,entries:{...latest.entries,[key]:{...previous,
            ...(same?{status}: {attemptAt:0}),discoveryAttemptAt:Date.now()}}});
          return;
        }
        const verificationStatus=status;
        if(prior && JSON.stringify(status)===JSON.stringify(previous.verificationStatus))status=prior;
        const evidence={ready:readyLayout(machine),verified:true};
        if(!fleetDisplayChangeAllowed(evidence))throw fleetError('layout-unready');
        const changedOwner=prior && (prior.home!==status.home || prior.owner.terminal!==status.owner.terminal);
        if(!changedOwner && incompleteMembership(status,machine,snapshot)) throw fleetError('membership-incomplete');
        const bound=bindFleet(status,machine,snapshot), identity=identityOf(bound), at=Date.now();
        const display=nextDisplay(machine,bound,snapshot), verifiedSignature=signature(machine,snapshot,identity);
        setShared(FLEET_KEY,{version:1,entries:{...(latest?.version===1?latest.entries:{}),[key]:{
          machine,at,attemptAt:at,token,attemptToken:token,signature:verifiedSignature,attemptSignature:signature(machine,snapshot,display??identity),status,verificationStatus,discoveryAttemptAt:forced?undefined:previous?.discoveryAttemptAt,binding:bound?.binding??null,identity,members:taskMembership(bound),
          displayIdentity:identityOf(display),displaySignature:signature(machine,snapshot,display)}}});
        verifiedTokens.set(key,token);publishDisplay(machine,display,evidence);
        if(bound && (bound.child || display))resolveFleetFailure(machine);
        else {
          recordFleetFailure(machine,!status.owner.live ? 'no-owner' : !bound ? 'identity-mismatch' : 'no-fleet',generation,{subject});
          clearFleetRetry(machine);
        }
      } catch(error) {
        if(current()) {
          recordFleetFailure(machine,error?.reason??'transport-error',generation,{subject,code:error?.code,timeout:error?.timeout});
          const latest=shared(FLEET_KEY);
          if(discovery) {
            setShared(FLEET_KEY,{...latest,entries:{...latest.entries,[key]:{...latest.entries[key],discoveryAttemptAt:Date.now()}}});
            return;
          }
          deferFleetRetry(machine,!sameAttempt);
          // Failed transport is not a negative relationship result. Back off
          // using attempt age without renewing successful verification age.
          setShared(FLEET_KEY,{version:1,entries:{...latest?.entries,[key]:{
            ...latest?.entries?.[key],machine,attemptAt:Date.now(),attemptToken:token,attemptSignature:signature(machine,model(),savedDisplays().find(d=>d.machine===machine)??latest?.entries?.[key]?.identity??reference)}}});
        } else discard(obsolete());
      } finally {
        // A late continuation must leave its expired lease as a recovery marker
        // even if it resumes before the lifecycle, inside a prior success TTL.
        if(shared(READS)?.[key]?.token===token && !expiredRead) {const reads={...shared(READS)};delete reads[key];setShared(READS,reads);}
        if(activeReads.get(key)?.token===token)activeReads.delete(key);
        view.notify();
      }
    });
  }
  return deferred;
}
export function invalidateFleet() {
  clearFleetRetries();
  setShared('custom.fleet.generation',(shared('custom.fleet.generation')??0)+1);
  setShared(FLEET_KEY,null);setShared(READS,{}); // Hide, never forget the last verified pair.
  verifiedTokens.clear();pendingTokens.clear();activeReads.clear();
}
export function fleetPullContext(space, options = {}) {
  const context=pullContext(space,options);
  return context ? {...context,presentationGeneration:fleetGeneration()} : null;
}
function pullContext(space, {presentation = false} = {}) {
  const context=fleetContexts().find(c=>c.parent===space && c.taskMembershipVerified);
  if(context) {
    const display=fleetContexts({presentation:true}).find(d=>d.parent===space && d.pullScope===context.pullScope);
    if(!context.child && !display && !context.tasks.some(t=>canonicalPull(t.pr)))return null;
    return {...context,kind:'tasks',scope:context.pullScope,stale:false,links:context.tasks.filter(t=>t.pr).map(t=>({url:t.pr,terminal:t.terminal,task:t.id,historical:t.historical===true}))};
  }
  if(!presentation || !enabled())return null;
  let identity=fleetContexts({presentation:true}).find(c=>c.parent===space);
  // In this runtime, retain the same live owner/home independently of the child.
  // No task/PR inventory is loaded from disk to manufacture action context.
  if(!identity) {
    const snapshot=model(), state=shared(FLEET_KEY);
    if(state?.version===1)for(const [key,entry] of Object.entries(state.entries??{}))
      if(locallyVerified(key,entry) && entry.identity?.parent===space) {
        const retained=withScopes(entry.identity), owner=bindFleet({...entry.status,tasks:[]},entry.machine,snapshot);
        if(owner?.pullScope===retained.pullScope)identity=retained;
      }
  }
  if(identity) {
    const snapshot=model(),candidate=coordinatorCandidate(identity.machine,snapshot),owner=bindFleet({home:identity.home,owner:{terminal:identity.owner,live:true},tasks:[]},identity.machine,snapshot);
    const sameCandidate=!candidate || ['parent','owner','ownerTab','ownerPane'].every(k=>candidate[k]===identity[k]);
    if(sameCandidate && owner?.pullScope===identity.pullScope)return {...identity,kind:'tasks',scope:identity.pullScope,stale:true,links:[],verification:fleetVerification(identity.machine,identity)};
    // Remembered rows can precede live owner facts. Keep an EMPTY Loading scope,
    // not ordinary folder Git or the former owner's retained PR inventory.
    return {...identity,kind:'tasks',scope:JSON.stringify(['remembered-wait',identity.machine,identity.parent,fleetGeneration(),candidate?.owner??null]),stale:true,links:[],verification:candidate?fleetVerification(identity.machine,candidate):null};
  }
  const snapshot=model(), group=snapshot.groups.find(s=>s.id===space);
  if(!group)return null;
  const machine=group.machine??null,candidate=coordinatorCandidate(machine,snapshot);
  if(candidate?.parent!==space)return null;
  const state=shared(FLEET_KEY),key=machine??'local',entry=state?.version===1?state.entries?.[key]:null;
  // Only a witnessed completed negative for these CURRENT dependencies can
  // suppress Loading. A prior owner's negative (or a diagnostic alone) cannot.
  const negative=entry?.status && entry.binding===null && locallyVerified(key,entry) && entry.signature===signature(machine,snapshot,null);
  if(negative)return null;
  const fact=fleetVerification(machine,candidate);
  const verification=fact && !['no-owner','identity-mismatch','no-fleet'].includes(fact.reason)?fact:null;
  return {...candidate,machine,kind:'tasks',scope:JSON.stringify(['fleet-waiting',machine,candidate.parent,candidate.owner,candidate.ownerTab,candidate.ownerPane]),stale:true,links:[],verification};
}
