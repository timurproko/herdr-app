// Read-only compatibility audit against the currently installed Herdr SDK/commands.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {project} from './build.mjs';
import {defaultHome} from './deploy.mjs';
import {checkHostFacts} from './host-api-facts.mjs';
import {tabMoveVersionStatus, auditHostTabMove} from './check-tab-move.mjs';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
export function checkHostApi(home=defaultHome(), {exec=cp.execFileSync, source=path.join(project,'src')}={}) {
 const executable=process.env.HERDR_APP_BIN||path.join(process.env.LOCALAPPDATA??'','Programs/herdr-app/herdr-app.exe');
 const version=exec(executable,['--version'],{encoding:'utf8',timeout:15000,windowsHide:true}).trim().replace(/^herdr-app\s+/,'');
 const declarations=fs.readFileSync(path.join(home,'herdr.d.ts'),'utf8');
 const commandCatalog=JSON.parse(exec(executable,['commands'],{encoding:'utf8',timeout:30000,windowsHide:true,env:{...process.env,HERDR_APP_HOME:home}}));
 const files=Object.fromEntries(walk(source).filter(file=>file.endsWith('.js')).map(file=>[path.relative(project,file).replaceAll('\\','/'),fs.readFileSync(file,'utf8')]));
 const result=checkHostFacts({version,declarations,commands:commandCatalog.map(entry=>entry.name),files});
 return {...result,tabMove:tabMoveVersionStatus(version)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try {
 const publicResult=checkHostApi(process.argv[2]??defaultHome());
 // An upgrade audit is advisory for this feature, never a global deployment gate.
 // Known releases stay offline/fast; a new one gets a bounded public-source diff
 // and synthetic regressions automatically on the ordinary host/deploy check.
 const result=await auditHostTabMove(publicResult);
 console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
 }catch(error){console.error(JSON.stringify({deploymentFailure:{stage:'host check',reason:error.message}}));process.exitCode=1;}
}
