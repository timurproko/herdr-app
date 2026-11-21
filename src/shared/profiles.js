// Per-machine launch profiles. Never edits programs.json or running terminals.
import { shared, setShared, knownAgents, exec, readTextFile, appHome } from './host.js';
export const profileKey=machine=>`custom.profiles:${JSON.stringify(machine??null)}`;
const safeKey=key=>typeof key==='string'&&key.length>0&&key.length<=100&&!/[\0\r\n]/.test(key)&&!['__proto__','constructor','prototype'].includes(key);
const string=(v,max=4096)=>typeof v==='string'&&v.length<=max&&!/[\0\r\n]/.test(v)?v.trim():'';
const args=value=>Array.isArray(value)&&value.length<=128&&value.every(x=>typeof x==='string'&&!x.includes('\0'))&&JSON.stringify(value).length<=16384?value:[];
// Launch roles are profile metadata bound to the stable profile key, never to a name or
// executable. 'firstmate' marks a coordinator profile; the launch path must prepare that
// role through a required plugin gate or refuse (no ordinary-agent fallback).
export const PROFILE_ROLES=Object.freeze(['firstmate']);
export function profileRole(key,...sources){if(key==='terminal')return null;for(const s of sources)if(s&&typeof s==='object'&&s.firstmate===true)return 'firstmate';return null;}
// A role is a list of ordinary profiles, kept by the plugin that owns the role (Settings ›
// Plugins). A profile in it stays an ordinary profile: the menus list it under Profiles,
// launched plainly, and again under the role's own heading, launched with the role.
// The role list ignores the + menu visibility switch: being in the list is the choice.
// A role's list has its own order (Settings › Plugins › its page), kept apart from the + menu's
// Profiles order: `order` is roleOrder(machine, role); profiles not in it follow in their usual order.
export const roleProfiles=(items,role,order=[])=>{const listed=items.filter(p=>p.key!=='terminal'&&p.role===role),rank=p=>{const at=order.indexOf(p.key);return at<0?order.length+listed.indexOf(p):at;};return[...listed].sort((a,b)=>rank(a)-rank(b));};
export const plainProfile=p=>p.role?{...p,role:null}:p;
// What a launch list shows (+ menu, Start page): the profiles shown in +, and any in a role whose
// plugin is on (`roles`), since that role's pill on the row is how it is started.
export const launchList=(items,roles=[])=>items.filter(p=>p.show||(p.key!=='terminal'&&roles.includes(p.role)));
export function setProfileRole(machine,key,role,on){if(!PROFILE_ROLES.includes(role)||key==='terminal'||!safeKey(key))throw Error('Invalid profile role');updateProfile(machine,key,{[role]:on===true});}
export function roleOrder(machine,role){const order=profileConfig(machine).roleOrder?.[role];return Array.isArray(order)?order.filter(safeKey):[];}
export function setRoleOrder(machine,role,keys){if(!PROFILE_ROLES.includes(role)||!Array.isArray(keys))throw Error('Invalid profile role');save(machine,c=>{c.roleOrder={...(c.roleOrder&&typeof c.roleOrder==='object'&&!Array.isArray(c.roleOrder)?c.roleOrder:{}),[role]:[...new Set(keys.filter(safeKey))].slice(0,200)};});}
// Before role lists, a role meant a second copy of a profile made only to carry it ("a1"
// plus "a1 · Crew"). A copy whose command and arguments equal another profile's is folded
// into that profile: the role moves to it and the copy goes. A copy with no such twin stays,
// as an ordinary profile in the role's list. Returns true when the saved config changed.
export function mergeRoleCopies(machine,items){
 const c=profileConfig(machine),same=(a,b)=>executableKey(a.command)===executableKey(b.command)&&JSON.stringify(a.configuredArgs??[])===JSON.stringify(b.configuredArgs??[]);
 const copies=items.filter(p=>p.custom&&p.role&&c.custom.find(e=>e.key===p.key)?.[p.role]===true);
 const moves=copies.map(copy=>({copy,twin:items.find(p=>p!==copy&&p.key!=='terminal'&&!copies.includes(p)&&same(p,copy))})).filter(m=>m.twin);
 if(!moves.length)return false;
 save(machine,next=>{for(const{copy,twin}of moves){
  next.overrides[twin.key]={...(next.overrides[twin.key]??{}),[copy.role]:true};
  next.custom=next.custom.filter(e=>e.key!==copy.key);delete next.overrides[copy.key];next.order=next.order.filter(k=>k!==copy.key);
 }});
 return true;
}
export function profileConfig(machine){const value=shared(profileKey(machine));return value&&typeof value==='object'&&!Array.isArray(value)?{...value,overrides:value.overrides&&typeof value.overrides==='object'&&!Array.isArray(value.overrides)?value.overrides:{},custom:Array.isArray(value.custom)?value.custom:[],order:Array.isArray(value.order)?value.order.filter(safeKey):[]}:{version:1,overrides:{},custom:[],order:[]};}
function save(machine,change){const current=profileConfig(machine);if(current.version&&current.version!==1)throw Error('Unsupported profile version');const next=JSON.parse(JSON.stringify(current));next.version=1;change(next);setShared(profileKey(machine),next);}
export function updateProfile(machine,key,patch){if(!safeKey(key))throw Error('Invalid profile');save(machine,c=>{c.overrides??={};c.overrides[key]={...(c.overrides[key]??{}),...patch};});}
export function addProfile(machine,profile){const key=`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;save(machine,c=>{c.custom??=[];if(c.custom.length>=50)throw Error('Profile limit reached');c.custom.push({key,...profile});});return key;}
export function removeProfile(machine,key){save(machine,c=>{c.custom=(c.custom??[]).filter(p=>p.key!==key);if(c.overrides)delete c.overrides[key];c.order=(c.order??[]).filter(k=>k!==key);});}
export function moveProfile(machine,key,direction,items){const order=items.map(p=>p.key),at=order.indexOf(key),to=at+direction;if(at<0||to<0||to>=order.length)return;[order[at],order[to]]=[order[to],order[at]];save(machine,c=>{c.order=order;});}
// Shared by drag/drop and the arrow controls; only private menu order changes.
export function reorderProfiles(machine,items,key,slot){const keys=items.map(p=>p.key),from=keys.indexOf(key);if(from<0||slot==null||!Number.isFinite(slot))return items;const at=Math.max(0,Math.min(keys.length,Math.trunc(slot))),to=at>from?at-1:at;if(to===from)return items;const next=[...items];next.splice(to,0,next.splice(from,1)[0]);save(machine,c=>{c.order=next.map(p=>p.key);});return next;}
export function applyProfileVisibility(machine,items){const overrides=profileConfig(machine).overrides;return items.map(p=>{const o=Object.prototype.hasOwnProperty.call(overrides,p.key)?overrides[p.key]:null;return{...p,show:typeof o?.show==='boolean'?o.show:p.available===true};});}
export function parseProfileArguments(value){let result;try{result=JSON.parse(value||'[]');}catch{throw Error('Arguments must be a JSON array, for example ["--flag", "value"].');}if(!Array.isArray(result)||result.length>128||!result.every(x=>typeof x==='string'&&!x.includes('\0'))||JSON.stringify(result).length>16384)throw Error('Use a JSON array of strings (up to 128 arguments).');return result;}
export function validateProfile(name,command,argumentsText,key,role={}){const label=string(name,120),executable=string(command);if(!label)throw Error('Enter a profile name.');if(!executable&&key!=='terminal')throw Error('Enter an executable name or path.');if(/^["']|["']$/.test(executable))throw Error('Enter the executable path without surrounding quotes.');if(/[\\/]/.test(executable)&&!/^(?:[a-zA-Z]:[\\/]|\\\\|\/)/.test(executable))throw Error('Use a full executable path or a bare command name.');const argv=parseProfileArguments(argumentsText);if(!executable&&argv.length)throw Error('Set an executable to use arguments.');const value={name:label,command:executable,args:argv};
 // The role is saved only when the editor offered it (a boolean); the Terminal row has none.
 if(typeof role?.firstmate==='boolean'&&key!=='terminal'&&key!=='shell')value.firstmate=role.firstmate;
 return value;}
// Terminal presentation/launch preferences are separate from agent profiles.
export const terminalKey=machine=>`custom.terminals:${JSON.stringify(machine??null)}`;
export function terminalConfig(machine){
 const value=shared(terminalKey(machine));
 return value&&typeof value==='object'&&!Array.isArray(value)?{...value,overrides:value.overrides&&typeof value.overrides==='object'&&!Array.isArray(value.overrides)?value.overrides:{},order:Array.isArray(value.order)?value.order.filter(safeKey):[]}:{version:1,overrides:{},order:[]};
}
export function updateTerminal(machine,key,patch){
 if(!safeKey(key))throw Error('Invalid terminal');const c=terminalConfig(machine);if(c.version!==1)throw Error('Unsupported terminal settings version');
 const next=JSON.parse(JSON.stringify(c));next.overrides[key]={...(next.overrides[key]??{}),...patch};setShared(terminalKey(machine),next);
}
export function moveTerminal(machine,key,direction,items){
 const at=items.findIndex(p=>p.key===key),to=at+direction;if(at<0||to<0||to>=items.length)return items;
 return reorderTerminals(machine,items,key,to>at?to+1:to);
}
export function reorderTerminals(machine,items,key,slot){
 const from=items.findIndex(p=>p.key===key);if(from<0||slot==null||!Number.isFinite(slot))return items;
 const at=Math.max(0,Math.min(items.length,Math.trunc(slot))),to=at>from?at-1:at;if(to===from)return items;
 const next=[...items];next.splice(to,0,next.splice(from,1)[0]);const c=terminalConfig(machine);
 if(c.version!==1)throw Error('Unsupported terminal settings version');
 setShared(terminalKey(machine),{...c,order:next.map(p=>p.key)});return next;
}
const executableKey=value=>String(value??'').replace(/\\/g,'/').toLowerCase();
const shellKind=p=>p.key==='installed:bash'?'bash':p.key==='installed:cmd'?'cmd':/^installed:(powershell|pwsh)$/.test(p.key)?'powershell':/^(?:powershell|pwsh)(?:\.exe)?$/i.test(p.run?.[0]?.split(/[\\/]/).pop()??'')?'powershell':'custom';
function terminalArgBoundary(kind,arg){
 const lower=arg.toLowerCase();
 return kind==='powershell'?['-command','-c','-file','-f','-encodedcommand','-enc','-ec','-e','-commandwithargs'].includes(lower)
  :kind==='bash'?arg==='--'||/^-[a-zA-Z]*c[a-zA-Z]*$/.test(arg):kind==='cmd'?['/c','/k'].includes(lower):false;
}
function splitTerminalArgs(kind,argv){
 const options=kind==='powershell'?{noLogo:false,loadProfile:true}:kind==='bash'?{login:false,interactive:false,loadProfile:true}:kind==='cmd'?{autorun:true}:{};
 const extra=[];let command=false;
 for(const arg of argv){const lower=kind==='bash'?arg:arg.toLowerCase();
  if(command||terminalArgBoundary(kind,arg)){command=true;extra.push(arg);continue;}
  if(kind==='powershell'&&lower==='-nologo')options.noLogo=true;
  else if(kind==='powershell'&&lower==='-noprofile')options.loadProfile=false;
  else if(kind==='bash'&&(lower==='--login'||lower==='-l'))options.login=true;
  else if(kind==='bash'&&lower==='-i')options.interactive=true;
  else if(kind==='bash'&&(lower==='-li'||lower==='-il')){options.login=true;options.interactive=true;}
  else if(kind==='bash'&&(lower==='--noprofile'||lower==='--norc'))options.loadProfile=false;
  else if(kind==='cmd'&&lower==='/d')options.autorun=false;
  else extra.push(arg);
 }
 return{options,extra};
}
function terminalArgv(kind,options,extra){
 const managed=kind==='powershell'?[...(options.noLogo?['-NoLogo']:[]),...(!options.loadProfile?['-NoProfile']:[])]:kind==='bash'?[...(options.login?['--login']:[]),...(!options.loadProfile?['--noprofile','--norc']:[]),...(options.interactive?['-i']:[])]:kind==='cmd'&&!options.autorun?['/d']:[];
 return[...managed,...extra];
}
export function composeTerminals(machine,native=cachedTerminalShells(machine)){
 const c=terminalConfig(machine),legacy=profileConfig(machine).overrides.terminal??{};
 const base=native.filter(p=>p.source==='Installed shell'&&safeKey(p.key)&&Array.isArray(p.run)&&p.run.length).map(p=>({...p,installed:true}));
 // Preserve a pre-existing custom Terminal launcher without creating duplicate
 // installed choices. It remains editable here rather than in agent Profiles.
 if(legacy.command&&!base.some(p=>p.key===legacy.shell_profile&&[p.run[0],c.overrides[p.key]?.command].some(command=>executableKey(command)===executableKey(legacy.command)))&&!base.some(p=>JSON.stringify(p.run)===JSON.stringify([legacy.command,...args(legacy.args)])))
  base.push({key:'configured:terminal',name:'Custom terminal',run:[legacy.command,...args(legacy.args)],source:'Configured shell',installed:false});
 const items=base.map((p,index)=>{
  const o=Object.prototype.hasOwnProperty.call(c.overrides,p.key)?c.overrides[p.key]??{}:{},kind=shellKind(p);
  const inherited=legacy.shell_profile===p.key&&executableKey(legacy.command)===executableKey(p.run[0])&&args(legacy.args).length?args(legacy.args):p.run.slice(1);
  const parsed=splitTerminalArgs(kind,inherited),options={...parsed.options};
  for(const key of Object.keys(options))if(typeof o[key]==='boolean')options[key]=o[key];
  const command=Object.prototype.hasOwnProperty.call(o,'command')?string(o.command):p.run[0],extra=Object.prototype.hasOwnProperty.call(o,'args')?args(o.args):parsed.extra;
  const customCommand=executableKey(command)!==executableKey(p.run[0]);
  const launchEdited=['command','args',...Object.keys(options)].some(key=>Object.prototype.hasOwnProperty.call(o,key));
  const argv=launchEdited?terminalArgv(kind,options,extra):inherited;
  return{...p,kind,options,command,detectedCommand:p.run[0],extraArgs:extra,run:command?[command,...argv]:null,name:string(o.name,120)||p.name,show:o.show!==false,available:command?(p.installed&&!customCommand?true:null):false,customCommand,index};
 });
 return items.sort((a,b)=>(c.order.includes(a.key)?c.order.indexOf(a.key):c.order.length+a.index)-(c.order.includes(b.key)?c.order.indexOf(b.key):c.order.length+b.index));
}
export function selectedTerminal(machine,items=composeTerminals(machine)){
 const o=profileConfig(machine).overrides.terminal??{};if(!o.command)return null;
 return items.find(p=>p.key===o.shell_profile&&[p.detectedCommand,p.command].some(command=>executableKey(command)===executableKey(o.command)))??items.find(p=>JSON.stringify(p.run)===JSON.stringify([o.command,...args(o.args)]))??items.find(p=>p.key==='configured:terminal')??null;
}
export function validateTerminal(profile,name,command,argumentsText,options){
 const value=validateProfile(name,command,argumentsText,'shell');
 const reserved=profile.kind==='powershell'?['-nologo','-noprofile']:profile.kind==='bash'?['--login','-l','-i','-li','-il','--noprofile','--norc']:profile.kind==='cmd'?['/d']:[];
 for(const arg of value.args){if(terminalArgBoundary(profile.kind,arg))break;if(reserved.includes(profile.kind==='bash'?arg:arg.toLowerCase()))throw Error('Use the startup switches below for built-in flags; keep only extra arguments here.');}
 const flags=Object.fromEntries(Object.keys(profile.options).map(key=>[key,Boolean(options[key])]));
 // Renaming an inherited launcher must not rewrite/reorder explicit legacy argv.
 if(value.command===profile.command&&JSON.stringify(value.args)===JSON.stringify(profile.extraArgs)&&Object.keys(flags).every(key=>flags[key]===profile.options[key]))return{name:value.name};
 return{...value,...flags};
}
// 'claude', 'C:\\...\\claude.exe', '/usr/bin/claude' -> 'claude'
const exeName=cmd=>String(cmd??'').trim().split(/[\\/]/).pop().replace(/\.(exe|cmd|bat|ps1)$/i,'').toLowerCase();
export function composeProfiles(machine,native){
 // A custom profile running a known agent's command shows that agent's icon.
 const icons=new Map();for(const p of native)if(p&&p.key!=='terminal'&&typeof p.icon==='string'&&p.icon){const name=exeName(p.run?.[0]);if(name&&!icons.has(name))icons.set(name,{icon:p.icon,tint:p.tint});}
 const c=profileConfig(machine),base=[{key:'terminal',name:'Terminal',icon:'icons/shell.svg',tint:true,run:null,installed:true},...native.filter(p=>safeKey(p.key)&&p.key!=='terminal').map(p=>({...p,custom:false})),...(c.custom??[]).filter(p=>p&&safeKey(p.key)&&typeof p.command==='string'&&typeof p.name==='string').map(p=>({...p,custom:true,icon:'icons/shell.svg',tint:true,run:[p.command,...args(p.args)],installed:false}))];
 const items=base.map(p=>{
  const o=Object.prototype.hasOwnProperty.call(c.overrides??{},p.key)?c.overrides[p.key]??{}:{},command=Object.prototype.hasOwnProperty.call(o,'command')?string(o.command):p.run?.[0]??'',tail=Object.prototype.hasOwnProperty.call(o,'args')?args(o.args):p.run?.slice(1)??[];
  const preset=p.key==='terminal'&&command?selectedTerminal(machine):null;
  const run=preset?preset.run:command?[command,...tail]:null;
  // An override decides the role when present (unchecking must win over the stored custom entry).
  const role=Object.prototype.hasOwnProperty.call(o,'firstmate')?profileRole(p.key,o):profileRole(p.key,p);
  const look=p.custom?icons.get(exeName(command))??{icon:'icons/shell.svg',tint:true}:null;
  return{...p,...look,name:string(o.name,120)||p.name,show:o.show!==false,run,configuredArgs:preset?run?.slice(1)??[]:tail,available:preset?preset.available:run?(p.installed&&command===p.run?.[0]?true:null):p.key==='terminal',command:preset?.command??command,role};
 });
 const order=c.order??[];return applyProfileVisibility(machine,items.map((p,i)=>({p,rank:order.includes(p.key)?order.indexOf(p.key):order.length+i})).sort((a,b)=>a.rank-b.rank).map(x=>x.p));
}
// Shell menus share a persisted, machine-scoped catalog, independent of popup lifetime.
const shellCacheKey=machine=>`custom.shell-catalog:${JSON.stringify(machine??null)}`;
const shellPending=new Map(),shellRetryAfter=new Map();
function shellCatalog(machine){const c=shared(shellCacheKey(machine));return c?.policy===2&&Array.isArray(c.items)?c:null;}
export function cachedTerminalShells(machine){return shellCatalog(machine)?.items??[];}
export function warmTerminalShells(machine){
 const c=shellCatalog(machine),now=Date.now();
 if(c&&now-c.checkedAt<60000||now<(shellRetryAfter.get(shellCacheKey(machine))??0))return Promise.resolve(cachedTerminalShells(machine));
 return loadTerminalShells(machine);
}
export function loadTerminalShells(machine){
 const key=shellCacheKey(machine);if(shellPending.has(key))return shellPending.get(key);
 const job=(async()=>{
  try{
   const source=await readTextFile(`${appHome()}/mods/custom-new-menu/shells.cjs`);if(!source)throw Error('Missing shell discovery');
   const result=await exec('node',['--input-type=commonjs','-e',source],{on:machine??null});if(result.code!==0)throw Error('Shell discovery failed');
   const list=JSON.parse(result.stdout).shells;if(!Array.isArray(list))throw Error('Invalid shell catalog');
   const items=list.filter(p=>p.source==='Installed shell'&&typeof p.key==='string'&&typeof p.name==='string'&&Array.isArray(p.run)&&p.run.length&&p.run.every(v=>typeof v==='string'&&!v.includes('\0')));
   const current=shellCatalog(machine);
   // Identical discovery should not invalidate/redraw every mounted mod.
   if(!current||JSON.stringify(current.items)!==JSON.stringify(items))setShared(key,{policy:2,items,checkedAt:Date.now()});
   else shellRetryAfter.set(key,Date.now()+60000);
   return items;
  }catch{shellRetryAfter.set(key,Date.now()+15000);return cachedTerminalShells(machine);}
  finally{shellPending.delete(key);}
 })();shellPending.set(key,job);return job;
}
export function selectTerminalShell(machine,shell){if(shell&&(!Array.isArray(shell.run)||!shell.run.length||!shell.run.every(v=>typeof v==='string'&&!v.includes('\0'))))throw Error('Invalid shell profile');updateProfile(machine,'terminal',{command:shell?.run[0]??'',args:shell?.run.slice(1)??[],shell_profile:shell?.key??null});}
// Shared state survives popup destruction and app restarts; sessionStorage did not.
const cacheKey=machine=>`custom.profile-catalog:${JSON.stringify(machine??null)}`;
const CACHE_MS=60000,pending=new Map(),retryAfter=new Map();
function catalog(machine){const c=shared(cacheKey(machine));return c?.policy===4&&Array.isArray(c.native)&&c.probes&&typeof c.probes==='object'?c:null;}
function commandList(items){return items.filter(p=>p.run).map(p=>({key:p.key,command:p.command}));}
function fromCatalog(machine,c){
 const items=composeProfiles(machine,c.native).map(p=>{
  if(!p.run)return p;
  // Proof belongs to the configured command, never merely to its profile key.
  const proof=Object.prototype.hasOwnProperty.call(c.probes,p.key)?c.probes[p.key]:null;
  if(proof?.command!==p.command)return p;
  if(proof.found&&Array.isArray(proof.run)&&proof.run.length&&proof.run.every(v=>typeof v==='string'&&!v.includes('\0')))
   return{...p,available:true,run:[...proof.run,...p.configuredArgs],resolved:proof.run[0]};
  return{...p,available:p.available===true?true:proof.found===false?false:null};
 });
 return applyProfileVisibility(machine,items);
}
export function cachedProfiles(machine){
 const c=catalog(machine);if(c)return fromCatalog(machine,c);
 // Reuse an already-open older build's exact cache while the shared one warms.
 try{const old=JSON.parse(sessionStorage.getItem(cacheKey(machine))??'null');return old?.policy===3&&old.config===JSON.stringify(profileConfig(machine))&&Array.isArray(old.items)?old.items:[];}catch{return[];}
}
export function warmProfiles(machine){
 const c=catalog(machine),key=cacheKey(machine),now=Date.now();
 if(c&&now-c.checkedAt<CACHE_MS&&c.commands===JSON.stringify(commandList(composeProfiles(machine,c.native))))return Promise.resolve(fromCatalog(machine,c));
 if(now<(retryAfter.get(key)??0))return Promise.resolve(cachedProfiles(machine));
 return loadProfiles(machine);
}
export function loadProfiles(machine){
 const key=cacheKey(machine);let config=JSON.stringify(profileConfig(machine));
 const existing=pending.get(key);if(existing?.config===config)return existing.promise;
 const job={config,promise:null};
 job.promise=(async()=>{
  try{
   const native=await knownAgents({on:machine??null});
   // A settings edit while detection was running invalidates that whole result.
   if(JSON.stringify(profileConfig(machine))!==config)return cachedProfiles(machine);
   // Our own one-time migration is not such an edit: carry on with what it saved.
   if(mergeRoleCopies(machine,composeProfiles(machine,native)))config=job.config=JSON.stringify(profileConfig(machine));
   const items=composeProfiles(machine,native),commands=commandList(items);
   const source=await readTextFile(`${appHome()}/mods/custom-new-menu/discovery.cjs`);
   if(!source)throw Error('Profile discovery unavailable');
   const result=await exec('node',['--input-type=commonjs','-e',source,'--',JSON.stringify({commands})],{on:machine??null});
   const found=result.code===0?JSON.parse(result.stdout).entries:null;
   if(!found||typeof found!=='object'||Array.isArray(found))throw Error('Profile discovery unavailable');
   if(JSON.stringify(profileConfig(machine))!==config)return cachedProfiles(machine);
   const probes=Object.fromEntries(commands.map(p=>[p.key,{...found[p.key],command:p.command}]));
   const next={policy:4,native,probes,commands:JSON.stringify(commands),checkedAt:Date.now()};
   setShared(key,next);retryAfter.delete(key);
   return fromCatalog(machine,next);
  }catch(e){retryAfter.set(key,Date.now()+15000);throw e;}
  finally{if(pending.get(key)===job)pending.delete(key);}
 })();
 pending.set(key,job);return job.promise;
}
