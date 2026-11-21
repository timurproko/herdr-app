// A1 terminal-binding policy for color. Shared API owns execution/wire validation.
'use strict';
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {createA1Client} = require('../api.cjs');
const execute = promisify(execFile);
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const commandName = value => typeof value==='string' && !/[\0\r\n]/.test(value) && /^a1(?:\.exe|\.cmd|\.bat)?$/i.test(value.split(/[\\/]/).at(-1));
function commandFor(terminal) {
  const hint=terminal?.labels?.['custom.profile.a1-command'];
  if(hint!==undefined) return commandName(hint)?hint:null;
  return commandName(terminal?.argv?.[0])?terminal.argv[0]:'a1';
}
function matches(terminal,target,now) {
  const labels=terminal?.labels??{},at=labels['a1.at'];
  return terminal?.state==='live' && (terminal.status?.app??terminal.report?.app)==='a1'
    && labels['a1.session']===target.session && labels['a1.runtime']===target.runtime
    && labels['herdr.space']===target.space && labels['herdr.tab']===target.tab
    && typeof at==='string' && /^\d+$/.test(at) && Number.isFinite(Number(at)) && now-Number(at)<=90000 && Number(at)<=now+5000
    && commandFor(terminal)===(target.command??'a1');
}
async function collect(request,{getTerminal=async id=>JSON.parse((await execute('hc',['get',id,'--json'],{timeout:5000,windowsHide:true,maxBuffer:65536})).stdout),clientFor,now=Date.now}={}) {
  const id=value=>typeof value==='string' && /^[a-z0-9_-]{1,200}$/i.test(value);
  if(!Number.isFinite(request.expiresAt) || request.expiresAt>now()+15000 || !Array.isArray(request.targets) || request.targets.length>128
    || request.targets.some(t=>!/^t[a-z0-9]+$/i.test(t.terminal??'') || !UUID.test(t.session??'') || !UUID.test(t.runtime??'') || !id(t.space) || !id(t.tab)
      || typeof t.color!=='string' || !/^[a-z]{1,32}$/.test(t.color) || (t.command!==undefined && !commandName(t.command)))) throw Error('Invalid terminal targets.');
  const clients=new Map(),colors=[],errors=[],expired=()=>now()>=request.expiresAt;
  const client=command=>{if(!clients.has(command))clients.set(command,clientFor?clientFor(command):createA1Client({command}));return clients.get(command);};
  for(const target of request.targets) {
    try {
      if(expired() || !matches(await getTerminal(target.terminal),target,now())) continue;
      const api=client(target.command??'a1');
      const descriptors=await api.request('settings.list');
      const setting=descriptors.settings.find(setting=>setting.id==='accentColor' && setting.scope==='session' && setting.application==='live');
      if(!setting || !Array.isArray(setting.choices) || !setting.choices.includes(target.color)) continue;
      const scope={scope:'session',sessionId:target.session,runtimeId:target.runtime};
      if(expired()) continue;
      const value=await api.request('settings.get',{target:scope,setting:'accentColor'});
      if(expired() || !setting.choices.includes(value.effectiveValue) || !matches(await getTerminal(target.terminal),target,now())) continue;
      const changed=value.effectiveValue!==target.color;
      if(changed) {
        // The shared client rejects mismatched or merely queued acknowledgements.
        // No await separates the final membership/expiry check from submitting the write.
        if(expired()) continue;
        await api.request('settings.update',{target:scope,setting:'accentColor',value:target.color});
      }
      colors.push({...target,changed});
    } catch(error) {
      errors.push({terminal:target.terminal,code:error.code??'control-unavailable',message:(error.message??'A1 unavailable').slice(0,512)});
    }
  }
  return {colors,errors};
}
module.exports={collect,matches,commandFor};
if(require.main===module || !module.parent) {
  Promise.resolve().then(()=>{const request=JSON.parse(process.argv[require.main?2:1]??'{}');return collect(request);})
    .then(value=>console.log(JSON.stringify(value)),error=>{console.log(JSON.stringify({colors:[],error:{code:error.code??'invalid-request',message:error.message}}));process.exitCode=1;});
}
