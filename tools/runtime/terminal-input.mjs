// Explicit, independently reversible native terminal preferences. No session changes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
const read=p=>fs.readFileSync(p,'utf8');
const fields={'keys.json':[['terminal','ctrl-c'],['terminal','ctrl-v'],['terminal','ctrl-c ctrl-c']],'settings.json':[['minimum_contrast'],['colors','selection']]};
const at=(obj,keys)=>keys.reduce((v,k)=>v?.[k],obj);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function set(obj,keys,value){let target=obj;for(const key of keys.slice(0,-1))target=target[key]??={};if(value===undefined)delete target[keys.at(-1)];else target[keys.at(-1)]=value;}
function atomic(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=`${file}.terminal-${process.pid}.tmp`;try{fs.writeFileSync(temp,text);fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
export function terminalInput(action,home,{selection=false}={}) {
 const stateFile=path.join(home,'.customizations/terminal-input.json'),state=fs.existsSync(stateFile)?JSON.parse(read(stateFile)):null;
 if(state&&(state.version!==1||!state.files||Object.keys(state.files).some(k=>!Object.hasOwn(fields,k))))throw Error('Unknown terminal preference record.');
 if(action==='apply') {
  const names=selection?['keys.json','settings.json']:['keys.json'],files={...state?.files};
  for(const name of names){const current=read(path.join(home,name)),previous=files[name];if(previous&&![previous.original,previous.installed].includes(current))throw Error(`Personal conflict: ${name}. Nothing changed.`);const value=JSON.parse(current);
   if(name==='keys.json')value.terminal={...value.terminal,'ctrl-c':'custom-workspace-status.copy','ctrl-v':'terminal.paste','ctrl-c ctrl-c':'send:\u0003\u0003'};
   else{value.colors={...value.colors,selection:'#ffffff'};value.minimum_contrast=4.5;}
   files[name]={...previous,original:previous?.original??current,installed:JSON.stringify(value,null,2)+'\n'};
  }
  atomic(stateFile,JSON.stringify({version:1,files},null,2)+'\n');for(const name of names)atomic(path.join(home,name),files[name].installed);return;
 }
 if(!state)throw Error('Terminal preferences have not been opted into.');
 if(!['check','restore'].includes(action))throw Error('Unsupported terminal preference operation.');
 const jobs=[];
 for(const [name,record]of Object.entries(state.files)) {
  const current=read(path.join(home,name));let value,original,installed;
  try{value=JSON.parse(current);original=JSON.parse(record.original);installed=JSON.parse(record.installed);}catch{throw Error(`Personal conflict: ${name}; invalid JSON.`);}
  for(const keys of fields[name]){
   const before=at(original,keys),after=at(installed,keys),actual=at(value,keys);if(equal(before,after))continue;
   if(!equal(actual,before)&&!equal(actual,after))throw Error(`Personal conflict: ${name}/${keys.join('.')}; refusing overwrite.`);
   if(action==='check'&&!equal(actual,after))throw Error(`Terminal preferences are not applied: ${name}/${keys.join('.')}`);
   set(value,keys,before);
  }
  // Exact restore for untouched snapshots; otherwise preserve unrelated personal edits.
  const next=current===record.installed?record.original:equal(value,JSON.parse(current))?current:JSON.stringify(value,null,2)+'\n';
  jobs.push({name,current,next});
 }
 if(action==='restore'){
  for(const job of jobs)if(read(path.join(home,job.name))!==job.current)throw Error('Personal conflict during terminal restore.');
  for(const job of jobs)if(job.next!==job.current)atomic(path.join(home,job.name),job.next);
  fs.unlinkSync(stateFile);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[action,home]=process.argv.slice(2).filter(arg=>arg!=='--selection');try{terminalInput(action,home??process.env.HERDR_APP_HOME??path.join(process.env.USERPROFILE,'.config/herdr-app'),{selection:process.argv.includes('--selection')});console.log('Terminal preferences '+action+': OK');}catch(e){console.error(e.message);process.exitCode=1;}}
