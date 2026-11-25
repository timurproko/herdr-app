// Standalone companion for one LOCAL Herdr Core. No desktop or remote-client dependency.
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {CoreCIMonitor} from './monitor-engine.js';
import {validateConfig} from './monitor-policy.js';
import {parseHistory,HISTORY_LIMIT} from './ci-history.js';
import {validRepository} from './ci-evidence.js';
export function readJSON(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
export function atomicJSON(file,value){
  if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('Linked state refused');
  const temp=file+'.'+randomUUID()+'.tmp';
  const fd=fs.openSync(temp,'wx',0o600);
  try{fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  try{fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
export function run(command,args,{cwd,timeout=15000}={}){
  const env={...process.env,GH_PROMPT_DISABLED:'1',GIT_TERMINAL_PROMPT:'0',HC_SESSION:'default'};delete env.HC_SOCKET;delete env.HC_TERMINAL_ID;
  return new Promise(resolve=>execFile(command,args,{cwd,timeout,windowsHide:true,maxBuffer:2*1024*1024,env},(e,stdout,stderr)=>resolve({code:e?typeof e.code==='number'?e.code:1:0,stdout:stdout??'',stderr:stderr??''})));
}
export class DiskJournal {
  constructor(file){this.file=file;}
  read(){return parseHistory(fs.existsSync(this.file)?fs.readFileSync(this.file,'utf8'):null);}
  async has(key){return this.read().entries.some(e=>e.key===key);}
  async claim(keys){
    const h=this.read(),token=randomUUID(),existing=new Set(h.entries.map(e=>e.key)),fresh=keys.filter(key=>!existing.has(key));
    if(fresh.length)atomicJSON(this.file,{version:1,entries:[...h.entries,...fresh.map(key=>({key,at:Date.now(),token,outcome:'attempted'}))].slice(-HISTORY_LIMIT)});
    return {keys:fresh,token};
  }
  async finish(claim,outcome){
    if(!['refused','delivered','unknown'].includes(outcome))throw Error('Invalid outcome');
    const h=this.read(),mine=e=>claim.keys.includes(e.key)&&e.token===claim.token;
    atomicJSON(this.file,{version:1,entries:outcome==='refused'?h.entries.filter(e=>!mine(e)):h.entries.map(e=>mine(e)?{...e,outcome}:e)});
  }
}
// Evidence only: never consulted to authorize, claim, release or retry a send.
export const DIAGNOSTIC_LIMIT=128,DIAGNOSTIC_BYTES=64*1024;
const REASONS=new Set(['no-monitored-repositories','no-verified-targets','agent-state-not-selected','workflow-still-running','already-sent','no-failed-workflows','no-action','not-owner','verification-failed','link-failed','dry-run','delivered','unknown','refused','target-changed']);
const EVENTS=new Set(['suppressed','delivered','unknown','refused','would-request','verification-failed','agent-unverified','link-failed']);
export function diagnosticEvent(event,at=Date.now()){
  if(!EVENTS.has(event?.event)||!REASONS.has(event.reason??event.event))return null;
  return {at,event:event.event,reason:event.reason??event.event,kind:['ci','conflict','merged'].includes(event.kind)?event.kind:null,
    repository:validRepository(event.repository)?event.repository.toLowerCase():null,
    pr:Number.isSafeInteger(event.pr)&&event.pr>0&&event.pr<=9999999999?event.pr:null,
    address:typeof event.address==='string'&&/^t[a-z0-9]{1,32}$/i.test(event.address)?event.address:null};
}
export class DiagnosticJournal {
  constructor(file){this.file=file;}
  record(event){
    try{
      const entry=diagnosticEvent(event);if(!entry)return false;
      let value={version:1,entries:[]};
      let stat;try{stat=fs.lstatSync(this.file);}catch(e){if(e.code!=='ENOENT')throw e;}
      if(stat){
        if(stat.isSymbolicLink()||!stat.isFile()||stat.size>DIAGNOSTIC_BYTES)throw Error('Unknown diagnostics');
        value=readJSON(this.file);
        if(value?.version!==1||!Array.isArray(value.entries)||value.entries.length>DIAGNOSTIC_LIMIT||value.entries.some(e=>{
          const clean=diagnosticEvent(e,e?.at);
          return !clean||!Number.isSafeInteger(e.at)||e.at<0||JSON.stringify(clean)!==JSON.stringify(e);
        }))throw Error('Unknown diagnostics');
      }
      const entries=value.entries,identity=e=>JSON.stringify([e.repository,e.pr,e.address,e.kind]);
      const prior=entries.findLastIndex(e=>identity(e)===identity(entry));
      if(prior>=0&&entries[prior].event===entry.event&&entries[prior].reason===entry.reason)return true;
      entries.push(entry);
      while(entries.length>DIAGNOSTIC_LIMIT||Buffer.byteLength(JSON.stringify(value))>DIAGNOSTIC_BYTES)entries.shift();
      atomicJSON(this.file,value);return true;
    }catch{return false;} // Malformed/linked/modified state is preserved; delivery continues.
  }
}
export function acquireLock(home){
  const file=path.join(home,'worker.lock'),value={pid:process.pid,token:randomUUID()};
  const guard=file+'.guard';let guardFD;
  try{guardFD=fs.openSync(guard,'wx',0o600);}catch(e){if(e.code==='EEXIST')return null;throw e;}
  try{
    if(fs.existsSync(file)){
      const old=readJSON(file);if(!Number.isSafeInteger(old.pid)||typeof old.token!=='string')throw Error('Unknown lock');
      let alive=true;try{process.kill(old.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;}
      if(alive)return null;
      fs.unlinkSync(file);
    }
    const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    return ()=>{if(readJSON(file).token===value.token)fs.unlinkSync(file);};
  }finally{fs.closeSync(guardFD);fs.unlinkSync(guard);}
}
export async function main(home,{once=false,dryRun=false,transport=run}={}){
  const config=()=>validateConfig(readJSON(path.join(home,'config.json'))),initial=config();
  // Never inherit another terminal/session/socket from an SSH installer.
  delete process.env.HC_SOCKET;delete process.env.HC_TERMINAL_ID;process.env.HC_SESSION='default';
  const release=acquireLock(home);if(!release)return {alreadyRunning:true};
  let stopping=false,lastEvent=null;
  const stop=()=>{stopping=true;};process.on('SIGTERM',stop);process.on('SIGINT',stop);
  const diagnostics=new DiagnosticJournal(path.join(home,'diagnostics.json'));
  const report=event=>{const clean=diagnosticEvent(event);if(clean){lastEvent=clean;if(!dryRun)diagnostics.record(clean);}};
  // Which agent owns each PR survives restarts, so a reinstall can't hand a PR to a newcomer.
  const ownersFile=path.join(home,'owners.json');
  const owners={read:()=>{try{return readJSON(ownersFile);}catch{return {};}},write:value=>atomicJSON(ownersFile,value)};
  const monitor=new CoreCIMonitor({run:transport,config,journal:new DiskJournal(path.join(home,'history.json')),owners,report});
  let result;
  try{do{
    const at=Date.now();
    atomicJSON(path.join(home,'status.json'),{version:1,pid:process.pid,heartbeat:at,coreId:initial.coreId,dryRun,lastEvent,health:'checking'});
    try{result=await monitor.cycle({send:!dryRun});}
    catch{report({event:'verification-failed',reason:'verification-failed'});result={health:'unavailable',reason:'verification-failed',detail:'Core, repository, GitHub authentication or configuration could not be verified. No new message was authorized.'};}
    atomicJSON(path.join(home,'status.json'),{version:1,pid:process.pid,heartbeat:Date.now(),coreId:initial.coreId,dryRun,lastEvent,...result});
    if(once||stopping)break;
    const until=Math.max(Date.now()+1000,at+60000);while(!stopping&&Date.now()<until)await new Promise(r=>setTimeout(r,Math.min(1000,until-Date.now())));
  }while(!stopping);return result;
  }finally{process.off('SIGTERM',stop);process.off('SIGINT',stop);release();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const home=process.argv[process.argv.indexOf('--home')+1];
  if(!process.argv.includes('--home')||!path.isAbsolute(home??''))throw Error('An absolute --home is required');
  await main(home,{once:process.argv.includes('--once'),dryRun:process.argv.includes('--dry-run')});
}
