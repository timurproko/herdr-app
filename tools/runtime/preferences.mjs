// Explicit safe yadm snapshot. Never exports shared.json wholesale or provider data.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {settingsShortcuts} from './settings-sections.js';
const read=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
function object(raw){try{const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw Error('Invalid preference JSON; nothing exported.');}}
function safe(value){
 const visit=v=>{if(!v||typeof v!=='object')return;for(const [key,child]of Object.entries(v)){if(/^(?:password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|authorization)$/i.test(key))throw Error('Potential credential in preferences; export/import refused.');visit(child);}};visit(value);
 const text=JSON.stringify(value);
 if(text.length>131072||/-----BEGIN [A-Z ]*PRIVATE KEY|\bBearer\s+\S+|\b(?:sk-ant-|sk-proj-|gh[pousr]_|github_pat_)[A-Za-z0-9_-]+|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|--(?:api[-_]?key|token|password|secret)(?:[= "\\]|$)|https?:\/\/[^/\s"]+:[^/\s"]+@/i.test(text))throw Error('Potential credential in preferences; export/import refused.');
 return value;
}
function pick(value,fields){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid preference shape.');return Object.fromEntries(fields.filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]]));}
function profile(value){
 if(value?.version!==1)throw Error('Unsupported profile version.');
 // The launch role is a boolean bound to the profile key; live launch jobs, labels and tokens are never preferences.
 const role=v=>{if(Object.hasOwn(v,'firstmate')&&typeof v.firstmate!=='boolean')throw Error('Invalid profile role.');return v;};
 const overrides=Object.fromEntries(Object.entries(value.overrides??{}).map(([key,v])=>{if(['__proto__','constructor','prototype'].includes(key))throw Error('Unsafe profile key.');return[key,role(pick(v,['show','name','command','args','shell_profile','firstmate']))];}));
 return safe({version:1,overrides,custom:(value.custom??[]).map(v=>role(pick(v,['key','name','command','args','firstmate']))),order:value.order??[]});
}
function terminals(value){
 if(value?.version!==1)throw Error('Unsupported terminal settings version.');
 const overrides=Object.fromEntries(Object.entries(value.overrides??{}).map(([key,v])=>{if(['__proto__','constructor','prototype'].includes(key))throw Error('Unsafe terminal key.');return[key,pick(v,['show','name','command','args','noLogo','loadProfile','login','interactive','autorun'])];}));
 return safe({version:1,overrides,order:value.order??[]});
}
// Plugin switches/settings: scalars or bounded plain-string multiselect values.
const pluginValue=value=>['boolean','string','number'].includes(typeof value)
 ||(Array.isArray(value)&&value.length<=64&&new Set(value).size===value.length
   &&value.every(v=>typeof v==='string'&&v.length<=128&&!/[\u0000-\u001f\u007f]/.test(v)));
function plugins(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid plugin preferences.');
 return Object.fromEntries(Object.entries(value).filter(([id])=>/^[a-z0-9-]{1,64}$/.test(id)).map(([id,v])=>{
  const out={};if(typeof v?.enabled==='boolean')out.enabled=v.enabled;
  if(v?.settings&&typeof v.settings==='object'&&!Array.isArray(v.settings))out.settings=Object.fromEntries(Object.entries(v.settings).filter(([k,x])=>/^[A-Za-z0-9_-]{1,64}$/.test(k)&&pluginValue(x)));
  return[id,out];}));
}
function allowed(key){return ['workspace.panels','sidebar.width','sidebar.collapsed','agents.sort','custom.preview-font','custom.match-agent-session-color','custom.plugins','custom.spaces.preferences','custom.sidebar.footer'].includes(key)||/^custom\.usage\.(?:local|remote:[^\r\n]{1,200})\.preferences$/.test(key)||/^custom\.(?:profiles|terminals):(?:null|"[^\r\n]{1,200}")$/.test(key);}
function sharedPreferences(input,strict=false){
 const entries=[];
 for(const [key,value]of Object.entries(input)){
  if(!allowed(key)){if(strict)throw Error('Non-preference key in snapshot; import refused.');continue;}
  let saved=value;
  if(key.startsWith('custom.terminals:'))saved=terminals(value);
  else if(key.startsWith('custom.profiles:'))saved=profile(value);
  else if(key.startsWith('custom.usage.'))saved=pick(value,['enabled','summary','remaining','claudeAutomatic','pins']);
  else if(key==='custom.preview-font')saved=pick(value,['size','family']);
  else if(key==='custom.match-agent-session-color' && typeof value!=='boolean')throw Error('Invalid agent color preference.');
  else if(key==='custom.plugins')saved=plugins(value);
  else if(key==='custom.sidebar.footer'){
   if(value?.version!==1)throw Error('Invalid sidebar footer preferences.');
   const ids=settingsShortcuts().map(item=>item.id);
   if(ids.some(id=>value[id]!==undefined&&typeof value[id]!=='boolean'))throw Error('Invalid sidebar shortcut preference.');
   if(value.order!==undefined&&(!Array.isArray(value.order)||value.order.length>ids.length||new Set(value.order).size!==value.order.length||value.order.some(id=>!ids.includes(id))))throw Error('Invalid sidebar icon order.');
   if(value.sides!==undefined&&(!value.sides||typeof value.sides!=='object'||Array.isArray(value.sides)||Object.entries(value.sides).some(([id,side])=>!ids.includes(id)||!['left','right'].includes(side))))throw Error('Invalid sidebar icon pinning.');
   saved=pick(value,['version',...ids,'order','sides']);
  }
  else if(key==='custom.spaces.preferences'){
   if(value?.version!==1||['confirmLastTab','closeOnLastTab'].some(k=>typeof value[k]!=='boolean'))throw Error('Invalid spaces preferences.');
   saved=pick(value,['version','confirmLastTab','closeOnLastTab']);
  }
  entries.push([key,safe(saved)]);
 }
 return Object.fromEntries(entries.sort(([a],[b])=>a.localeCompare(b)));
}
function palette(value){
 if(value?.version!==1)throw Error('Unsupported palette version.');
 const colors=pick(value.palette,['accent','background','sidebar','surface','border','foreground','muted']);
 if(Object.keys(colors).length!==7||Object.values(colors).some(v=>typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v)))throw Error('Invalid palette colors.');
 const next={version:1,palette:colors};
 if(typeof value.custom_accent==='boolean')next.custom_accent=value.custom_accent;
 if(typeof value.custom_color==='string'&&/^#[0-9a-f]{6}$/i.test(value.custom_color))next.custom_color=value.custom_color;
 return next;
}
function desktopOpen(){
 try{return execFileSync('powershell.exe',['-NoProfile','-Command',"if (Get-Process herdr-app -ErrorAction SilentlyContinue) { 'running' } else { 'closed' }"],{encoding:'utf8',timeout:10000}).trim()!=='closed';}
 catch{throw Error('Cannot verify that the Herdr desktop is closed.');}
}
function commit(jobs,inputs=[]){
 for(const [file,raw]of [...inputs,...jobs.map(j=>[j.file,j.before])])if(read(file)!==raw)throw Error('Preference file changed concurrently; retry.');
 for(const {file,before,value}of jobs){const text=JSON.stringify(value,null,2)+'\n';if(text===before)continue;if(read(file)!==before)throw Error('Preference file changed concurrently; stopped.');fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+`.custom-preferences-${process.pid}.tmp`;try{fs.writeFileSync(temp,text,{flag:'wx'});fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
}
export function syncPreferences(action,home,{hostname=os.hostname(),isDesktopOpen=desktopOpen,snapshotDir=path.join(home,'preferences')}={}){
 if(!/^[a-z0-9][a-z0-9._-]{0,62}$/i.test(hostname))throw Error('Invalid snapshot hostname.');
 const dir=snapshotDir,hostFile=path.join(dir,hostname.toLowerCase()+'.json'),paletteFile=path.join(dir,'palette.json'),sharedFile=path.join(home,'shared.json'),metaFile=path.join(home,'.customizations/palette.json'),themeFile=path.join(home,'themes/custom-palette.json');
 if(action==='export'){
  const raw=read(sharedFile);if(raw===null)throw Error('No live Herdr preferences to export.');
  const inputs=[[sharedFile,raw]],jobs=[{file:hostFile,before:read(hostFile),value:{version:1,shared:sharedPreferences(object(raw))}}];
  const metaRaw=read(metaFile);inputs.push([metaFile,metaRaw]);
  if(metaRaw!==null){const meta=object(metaRaw),theme=read(themeFile);inputs.push([themeFile,theme]);if(theme===null)throw Error('Custom theme is missing.');const value=meta.theme===theme?meta.customization:meta.previous===theme?meta.previous_customization:null;if(!value)throw Error('Palette is changing or externally edited; retry after saving it in Settings.');jobs.push({file:paletteFile,before:read(paletteFile),value:palette(value)});}
  commit(jobs,inputs);return `Exported safe Herdr preferences for ${hostname.toLowerCase()}; caches/accounts/sessions excluded.`;
 }
 if(action!=='import')throw Error('Use export or import.');
 if(isDesktopOpen())throw Error('Close the Herdr desktop before import; core/terminals need not be stopped.');
 const jobs=[],inputs=[],hostRaw=read(hostFile),paletteRaw=read(paletteFile);inputs.push([hostFile,hostRaw],[paletteFile,paletteRaw]);
 if(hostRaw!==null){const saved=object(hostRaw);if(saved.version!==1)throw Error('Unsupported snapshot version.');const prefs=sharedPreferences(saved.shared??{},true),raw=read(sharedFile);jobs.push({file:sharedFile,before:raw,value:{...(raw===null?{}:object(raw)),...prefs}});}
 if(paletteRaw!==null){const value=palette(object(paletteRaw)),theme=read(themeFile);inputs.push([themeFile,theme]);if(theme===null)throw Error('Restore the tracked custom theme before importing its palette.');const raw=read(metaFile),current=raw===null?{}:object(raw);jobs.push({file:metaFile,before:raw,value:{...current,customization:value,theme}});}
 commit(jobs,inputs);return hostRaw===null?'Imported shared palette only; no snapshot for this host, local profiles left unchanged.':'Imported preferences; unrelated runtime/session state retained.';
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{console.log(syncPreferences(process.argv[2],process.argv[3]??process.env.HERDR_APP_HOME??path.join(os.homedir(),'.config/herdr-app'),process.argv[4]?{hostname:process.argv[4]}:{}));}catch(e){console.error(e.message);process.exitCode=1;}}
