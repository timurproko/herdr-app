// Shared pure contract checks for installed host facts and source-only candidates.
import {HOST_CONTRACT,HOST_PROFILES,hostVersionStatus,apiCandidates,nativeCommand} from '../src/integration/herdr/compatibility.js';
export function hostSourceFacts(files) {
  const used=new Set(),stateKeys=new Set(),directImports=[];
  for(const [file,text] of Object.entries(files)) {
    if(!file.endsWith('.js')||/(?:^|\/)original(?:-[^/]*)?\.js$/.test(file))continue;
    for(const m of text.matchAll(/(?:shared|setShared)\(\s*["']([^"']+)["']/g))stateKeys.add(m[1]);
    for(const m of text.matchAll(/["']((?:space|tab|pane|terminal|agent|layout|app|window|mod|overlay)\.[a-zA-Z0-9_.-]+)["']/g))used.add(m[1]);
    if(!file.endsWith('/host.js')&&file!=='host.js'&&/from\s+["']herdr["']/.test(text))directImports.push(file);
  }
  const commands=[...used].filter(n=>!stateKeys.has(n)).sort();
  const consumers=Object.fromEntries([...HOST_CONTRACT.api,...commands].map(name=>[name,Object.entries(files).filter(([file,text])=>file.endsWith('.js')&&!/(?:^|\/)original(?:-[^/]*)?\.js$/.test(file)&&text.includes(name)).map(([file])=>file)]));
  return {commands,directImports,consumers};
}
export function checkHostFacts({version,declarations,commands,files}) {
  const exported=new Set([...declarations.matchAll(/^export function\s+([A-Za-z0-9_]+)/gm)].map(m=>m[1]));
  const source=hostSourceFacts(files),catalog=new Set(commands);
  const missingApi=HOST_CONTRACT.api.filter(name=>!apiCandidates(name,version).some(candidate=>exported.has(candidate)));
  const missingCommands=source.commands.filter(name=>!catalog.has(nativeCommand(name,version)));
  const versionStatus=hostVersionStatus(version);
  return {ok:versionStatus.supported&&!missingApi.length&&!missingCommands.length&&!source.directImports.length,version,reviewed:Boolean(HOST_PROFILES[version]),versionStatus,missingApi,missingCommands,directImports:source.directImports};
}
