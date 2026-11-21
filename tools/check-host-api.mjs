// Read-only compatibility audit against the currently installed Herdr SDK/commands.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {project} from './build.mjs';
import {defaultHome} from './deploy.mjs';
import {HOST_CONTRACT,HOST_PROFILES,apiCandidates,nativeCommand} from '../src/integration/herdr/compatibility.js';
import {tabMoveVersionStatus, auditHostTabMove} from './check-tab-move.mjs';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
export function checkHostApi(home=defaultHome()) {
 const executable=process.env.HERDR_APP_BIN||path.join(process.env.LOCALAPPDATA??'','Programs/herdr-app/herdr-app.exe');
 const version=cp.execFileSync(executable,['--version'],{encoding:'utf8',timeout:15000,windowsHide:true}).trim().replace(/^herdr-app\s+/,'');
 const declarations=fs.readFileSync(path.join(home,'herdr.d.ts'),'utf8');
 const exported=new Set([...declarations.matchAll(/^export function\s+([A-Za-z0-9_]+)/gm)].map(m=>m[1]));
 const missingApi=HOST_CONTRACT.api.filter(name=>!apiCandidates(name,version).some(candidate=>exported.has(candidate)));
 const commandCatalog=JSON.parse(cp.execFileSync(executable,['commands'],{encoding:'utf8',timeout:30000,windowsHide:true,env:{...process.env,HERDR_APP_HOME:home}}));
 const commands=new Set(commandCatalog.map(entry=>entry.name));
 const used=new Set(),stateKeys=new Set();
 for(const file of walk(path.join(project,'src')).filter(file=>file.endsWith('.js')&&!/[\\/]original(?:-[^\\/]*)?\.js$/.test(file))) {
  const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/(?:shared|setShared)\(\s*["']([^"']+)["']/g))stateKeys.add(match[1]);
  for(const match of text.matchAll(/["']((?:space|tab|pane|terminal|agent|layout|app|window|mod|overlay)\.[a-zA-Z0-9_.-]+)["']/g))used.add(match[1]);
 }
 const missingCommands=[...used].filter(name=>!stateKeys.has(name)&&!commands.has(nativeCommand(name,version))).sort();
 const directImports=walk(path.join(project,'src')).filter(file=>file.endsWith('.js')&&!file.endsWith(`${path.sep}host.js`)&&!/[\\/]original(?:-[^\\/]*)?\.js$/.test(file)&&/from\s+["']herdr["']/.test(fs.readFileSync(file,'utf8'))).map(file=>path.relative(project,file));
 return {ok:Boolean(HOST_PROFILES[version])&&!missingApi.length&&!missingCommands.length&&!directImports.length,version,reviewed:Boolean(HOST_PROFILES[version]),missingApi,missingCommands,directImports,tabMove:tabMoveVersionStatus(version)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const publicResult=checkHostApi(process.argv[2]??defaultHome());
 // An upgrade audit is advisory for this feature, never a global deployment gate.
 // Known releases stay offline/fast; a new one gets a bounded public-source diff
 // and synthetic regressions automatically on the ordinary host/deploy check.
 const result=await auditHostTabMove(publicResult);
 console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
}
