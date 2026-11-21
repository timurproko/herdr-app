// Supported Node plugin API: the shared A1 integration client. No color or membership policy.
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {randomUUID} = require('node:crypto');
const executeFile = promisify(execFile);
const LIMIT = 8192;
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
class A1ApiError extends Error {
  constructor(code, message, response) { super(message); this.name = 'A1ApiError'; this.code = code; this.response = response; }
}
const invalid = message => { throw new A1ApiError('invalid-response', message); };

async function resolveA1Command({command='a1',env=process.env,platform=process.platform,node=process.execPath,exists=async file=>{try{return(await fs.stat(file)).isFile();}catch{return false;}}}={}) {
  if(typeof command!=='string' || /[\0\r\n]/.test(command) || !/^a1(?:\.exe|\.cmd|\.bat)?$/i.test(command.split(/[\\/]/).at(-1))) throw new A1ApiError('unsupported-installation','Choose an explicit supported A1 executable or npm launcher.');
  if(/[\\/]/.test(command) && !(platform==='win32'?path.win32:path.posix).isAbsolute(command)) throw new A1ApiError('unsupported-installation','Use an absolute A1 installation path for external control; relative launch paths have no stable worker directory.');
  if(platform!=='win32') return [command];
  // An explicit installation never falls back to another A1 on PATH.
  if(/[\\/]/.test(command)) {
    if(/\.exe$/i.test(command) && await exists(command)) return [command];
    const entry=path.win32.join(path.win32.dirname(command),'node_modules','@timurproko','a1','bin','cli.js');
    if(!/\.exe$/i.test(command) && await exists(entry)) return [node,entry];
    throw new A1ApiError('unsupported-installation','The selected A1 launcher has no supported public CLI entry.');
  }
  const dirs=(env.PATH??env.Path??'').split(';').map(dir=>dir.replace(/^"|"$/g,'')).filter(Boolean).slice(0,100);
  for(const dir of dirs) { const exe=path.win32.join(dir,'a1.exe'); if(await exists(exe)) return [exe]; }
  const roots=[env.npm_config_prefix,env.NPM_CONFIG_PREFIX,env.APPDATA&&path.win32.join(env.APPDATA,'npm'),...dirs].filter(Boolean);
  for(const root of new Set(roots)) {
    const entry=path.win32.join(root,'node_modules','@timurproko','a1','bin','cli.js');
    if(await exists(entry)) return [node,entry];
  }
  throw new A1ApiError('installation-unavailable','A1 is not installed on this machine. Install a version supporting integration protocol 1.');
}
async function execute(command,args) {
  try { return {code:0,...await executeFile(command,args,{timeout:5000,windowsHide:true,maxBuffer:LIMIT+1024})}; }
  catch(error) {
    if(typeof error.code==='number' && typeof error.stdout==='string') return {code:error.code,stdout:error.stdout,stderr:error.stderr};
    throw new A1ApiError('execution-unavailable','A1 could not be reached within the bounded execution budget.');
  }
}

/** LF is the only record separator; Unicode line/paragraph separators remain JSON string data. */
function validateA1Response(result,request) {
  const text=result?.stdout;
  if(typeof text!=='string' || Buffer.byteLength(text)>LIMIT || !text.endsWith('\n') || text.indexOf('\n')!==text.length-1) invalid('Expected one bounded LF-terminated A1 JSON response.');
  let response; try { response=JSON.parse(text.slice(0,-1)); } catch { invalid('A1 returned malformed JSON. Update the selected installation to protocol 1.'); }
  if(!object(response) || response.version!==1 || response.id!==request.id || response.type!=='response' || response.command!==request.type || typeof response.success!=='boolean') invalid('A1 response version, correlation or operation did not match.');
  const keys=['version','id','type','command','success',response.success?'data':'error'];
  if(Object.keys(response).some(key=>!keys.includes(key))) invalid('Unexpected A1 response fields.');
  if(!response.success) {
    if(!object(response.error) || typeof response.error.code!=='string' || typeof response.error.message!=='string' || result.code===0) invalid('Malformed A1 failure.');
    throw new A1ApiError(response.error.code,response.error.message,response);
  }
  if(result.code!==0 || !object(response.data)) invalid('A1 did not acknowledge successful completion.');
  const data=response.data;
  if(request.target) {
    if(!object(data.target) || Object.keys(data.target).length!==Object.keys(request.target).length || Object.entries(request.target).some(([key,value])=>data.target[key]!==value)) invalid('A1 replied for a different exact target.');
  }
  if(request.type==='capabilities' && (!Array.isArray(data.operations) || data.operations.some(value=>typeof value!=='string') || typeof data.launchColor!=='boolean' || typeof data.terminalIdentity!=='boolean')) invalid('Malformed A1 capabilities.');
  if(request.type==='settings.list') {
    if(!Array.isArray(data.settings) || !data.settings.length || data.settings.some(setting=>!object(setting) || typeof setting.id!=='string' || !['profile','session'].includes(setting.scope) || !['string','boolean'].includes(setting.type) || !Array.isArray(setting.choices) || !setting.choices.length || setting.choices.some(choice=>typeof choice!==setting.type))) invalid('Malformed A1 setting descriptors.');
    if(new Set(data.settings.map(setting=>setting.id)).size!==data.settings.length) invalid('Duplicate A1 setting descriptors.');
  }
  if(request.type==='session.get' || request.type==='session.rename') {
    if((data.name!==null && (typeof data.name!=='string' || Buffer.byteLength(data.name)>4096)) || typeof data.nameRevision!=='string' || !/^[a-f0-9]{64}$/.test(data.nameRevision)
      || (request.type==='session.rename' && (data.status!=='applied' || data.name!==request.name?.trim()))) invalid('A1 did not acknowledge the authoritative session name.');
  }
  if(request.setting) {
    const naming=request.setting==='sessionAutoName',inherited=naming && data.storedValue===null && data.origin==='profile';
    const values=naming ? typeof data.effectiveValue==='boolean' && (inherited || (typeof data.storedValue==='boolean' && data.origin==='session' && data.storedValue===data.effectiveValue))
      : typeof data.storedValue==='string' && typeof data.effectiveValue==='string' && ['default','stored','session','invocation'].includes(data.origin);
    if(data.setting!==request.setting || !values || (naming && request.target.scope!=='session') || data.application!==(request.target.scope==='session'?'live':'next-session')) invalid('Malformed A1 setting readback.');
    if(request.type==='settings.update' && (data.storedValue!==request.value || data.status!==(request.target.scope==='session'?'applied':'stored') || (request.target.scope==='session' && (data.effectiveValue!==request.value || data.application!=='live')))) invalid('A1 did not acknowledge the requested applied/stored value.');
  }
  return data;
}

/** Reusable literal command transport. It preserves structured failures and never retries or replays. */
function createA1Client({command='a1',resolveCommand=resolveA1Command,execute:run=execute,id=randomUUID,...resolution}={}) {
  let resolved;
  return { async request(type,fields={}) {
    if(Object.hasOwn(fields,'version') || Object.hasOwn(fields,'id') || Object.hasOwn(fields,'type')) throw new A1ApiError('invalid-request','Envelope identity is owned by the shared client.');
    if(fields.target?.scope==='session' && (!UUID.test(fields.target.sessionId??'') || !UUID.test(fields.target.runtimeId??''))) throw new A1ApiError('invalid-target','Exact session and runtime UUIDs are required.');
    const request={version:1,id:id(),type,...fields},json=JSON.stringify(request);
    if(typeof request.id!=='string' || !/^[a-zA-Z0-9._:-]{1,64}$/.test(request.id) || Buffer.byteLength(json)>4096) throw new A1ApiError('invalid-request','A1 request exceeds its bounded contract.');
    resolved ??= await resolveCommand({command,...resolution});
    const [executable,...prefix]=resolved;
    return validateA1Response(await run(executable,[...prefix,'api',json]),request);
  }};
}
module.exports={createA1Client,resolveA1Command,validateA1Response,A1ApiError};
