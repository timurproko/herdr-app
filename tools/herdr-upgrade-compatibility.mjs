// Only the credential-free child imports the evaluated checkout's adapters.
// The parent and publisher consume validated data, never candidate functions.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as trustedCompatibility from '../src/integration/herdr/compatibility.js';
import {releaseVersion,sha256} from './herdr-upgrade-releases.mjs';
import {testEnvironment} from './herdr-upgrade-environment.mjs';
const adapter='src/integration/herdr/compatibility.js',documentAdapter='src/integration/herdr/documents/tab-move-v1.cjs';
const identifier=name=>typeof name==='string'&&/^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
const command=name=>typeof name==='string'&&/^[A-Za-z0-9_.-]{1,200}$/.test(name);
function strings(values,test,{empty=false}={}) {
  if(!Array.isArray(values)||values.length>1000||(!empty&&!values.length)||values.some(v=>!test(v))||new Set(values).size!==values.length)throw Error('Invalid compatibility fact list.');
  return values;
}
const version=value=>{try{return releaseVersion(value)===value;}catch{return false;}};
function snapshotHost(module,versions,commands) {
  return {contract:{api:[...module.HOST_CONTRACT.api],minimumVersion:module.HOST_CONTRACT.minimumVersion,reviewedVersions:[...module.HOST_CONTRACT.reviewedVersions]},profiles:Object.keys(module.HOST_PROFILES),versions:Object.fromEntries(versions.map(v=>[v,{
    api:Object.fromEntries(module.HOST_CONTRACT.api.map(name=>[name,module.apiCandidates(name,v)])),
    commands:Object.fromEntries(commands.map(name=>[name,module.nativeCommand(name,v)])),
    versionStatus:module.hostVersionStatus(v),reviewed:Boolean(module.HOST_PROFILES[v]),
  }]))};
}
export function trustedCompatibilityFacts(versions,commands) {
  return snapshotHost(trustedCompatibility,versions,commands);
}
export function validateCompatibilityFacts(data,versions,commands) {
  const host=data?.host,contract=host?.contract;
  if(data?.schema!=='herdr-compatibility-facts-v1'||!contract)throw Error('Invalid compatibility facts schema.');
  strings(contract.api,identifier);releaseVersion(contract.minimumVersion);strings(contract.reviewedVersions,version);strings(host.profiles,version,{empty:true});
  if(!host.versions||Object.keys(host.versions).length!==versions.length)throw Error('Incomplete compatibility versions.');
  for(const v of versions) {
    const resolved=host.versions[v],status=resolved?.versionStatus;
    if(!resolved?.api||Object.keys(resolved.api).length!==contract.api.length||!resolved.commands||Object.keys(resolved.commands).length!==commands.length)throw Error('Incomplete resolved compatibility mappings.');
    for(const name of contract.api)strings(resolved.api[name],identifier);
    for(const name of commands)if(!Object.hasOwn(resolved.commands,name)||!command(resolved.commands[name]))throw Error('Invalid resolved command alias.');
    if(typeof resolved.reviewed!=='boolean'||typeof status?.supported!=='boolean'||!version(status.minimum)||!version(status.lastReviewed)||!['reason','advisory'].every(k=>status[k]===null||(typeof status[k]==='string'&&status[k].length<=2000)))throw Error('Invalid compatibility verdict facts.');
  }
  const documents=data.documents;
  if(!documents||!Number.isSafeInteger(documents.generation)||documents.generation<1)throw Error('Invalid document generation facts.');
  strings(documents.app,version);strings(documents.core,version);
  return data;
}
export function candidateCompatibilityFacts(root,versions,commands,{spawn=cp.spawnSync}={}) {
  versions=[...new Set(versions)];strings(versions,version);strings(commands,command,{empty:true});
  root=fs.realpathSync(root);
  const hashes=()=>Object.fromEntries([adapter,documentAdapter].map(file=>{
    const target=path.join(root,file);
    if(!fs.lstatSync(target).isFile()||!fs.realpathSync(target).startsWith(root+path.sep))throw Error('Compatibility adapter must be a regular evaluated-checkout file.');
    return [file,sha256(fs.readFileSync(target))];
  }));
  const sources=hashes();
  const result=spawn(process.execPath,[fileURLToPath(import.meta.url),'--snapshot-child',root],{cwd:root,env:testEnvironment(),input:JSON.stringify({versions,commands}),encoding:'utf8',timeout:15000,maxBuffer:1024*1024,windowsHide:true});
  if(result.error||result.status!==0)throw Error(`Candidate compatibility snapshot failed: ${result.error?.message??result.stderr??`exit ${result.status}`}`);
  let data;try{data=JSON.parse(result.stdout);}catch{throw Error('Candidate compatibility snapshot did not return bounded JSON facts.');}
  validateCompatibilityFacts(data,versions,commands);
  if(JSON.stringify(hashes())!==JSON.stringify(sources))throw Error('Candidate compatibility adapters changed during evaluation.');
  return {...data,sources};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if(process.argv[2]!=='--snapshot-child'||process.argv.length!==4)throw Error('Compatibility snapshot is an internal credential-free child operation.');
    const request=JSON.parse(fs.readFileSync(0,'utf8')),root=path.resolve(process.argv[3]);
    strings(request.versions,version);strings(request.commands,command,{empty:true});
    const module=await import(pathToFileURL(path.join(root,adapter)).href);
    const {PROFILE}=createRequire(import.meta.url)(path.join(root,documentAdapter));
    process.stdout.write(JSON.stringify({schema:'herdr-compatibility-facts-v1',host:snapshotHost(module,request.versions,request.commands),documents:{app:[...PROFILE.apps],core:[...PROFILE.cores],generation:PROFILE.generation}}));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
