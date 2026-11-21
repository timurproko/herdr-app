// No real terminals or credentials: launch routing and core RPCs are fixtures.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {isolatedClaudeCommand,launchProfile,profileLine,profileShellArgv}=require('../src/services/terminals/profile-launch.cjs');
const home='C:\\Users\\Fixture User',launcher=home+'\\.claude\\plugins-local\\account-switcher\\bin\\claude-as.sh',helper=launcher.replace('claude-as.sh','session-dir.js');
const bash='C:\\Tools\\Git\\bin\\bash.exe',gitBash='C:\\Program Files\\Git\\bin\\bash.exe';
const files=new Set([launcher,helper,bash,gitBash]),reads=[];
const options={home,platform:'win32',env:{ProgramFiles:'C:\\Program Files'},readText:async()=> '# account-switcher-launch-protocol: 1',exists:async file=>{reads.push(file);return files.has(file);}};
const literal=['--model','haiku','--resume','two words',"a'b",'$(not-a-command)','C:\\literal\\argument'];
const target={profile:'claude',argv:['claude',...literal]},original=structuredClone(target);
let result=await isolatedClaudeCommand(target,[bash,'--login','-i'],options);
assert.deepEqual(result,[bash,'--noprofile','--norc','-c',profileLine(['bash'],[launcher.replace(/\\/g,'/'),'--command','claude','--',...literal])]);
assert.deepEqual(target,original,'Configured arguments are never mutated');
result=await isolatedClaudeCommand({...target,argv:['C:\\Chosen Claude\\claude.exe',...literal]},['pwsh.exe'],options);
assert.equal(result[0],gitBash);
assert.equal(result[4],profileLine(['bash'],[launcher.replace(/\\/g,'/'),'--command','C:\\Chosen Claude\\claude.exe','--',...literal]),'The exact configured executable and literal args are preserved');
for(const item of [{profile:'a1',argv:['a1']},{profile:'custom-claude',argv:['claude']},{profile:'claude',argv:['my-claude-wrapper']}]) {
  const before=reads.length;assert.equal(await isolatedClaudeCommand(item,['pwsh.exe'],options),item.argv);assert.equal(reads.length,before,'Other agents and explicit custom wrappers are untouched');
}
await assert.rejects(isolatedClaudeCommand(target,[bash],{...options,exists:async file=>file!==helper&&files.has(file)}),/launcher/);
await assert.rejects(isolatedClaudeCommand(target,['pwsh.exe'],{...options,exists:async file=>[launcher,helper].includes(file)}),/Bash/);
await assert.rejects(isolatedClaudeCommand(target,[bash],{...options,readText:async()=> '# old launcher without --command support'}),/0\.8\.5/,'Old remote launchers fail before creating a shared or broken session');
const linuxHome='/home/fixture',linuxLauncher=linuxHome+'/.claude/plugins-local/account-switcher/bin/claude-as.sh';
result=await isolatedClaudeCommand(target,['/bin/zsh'],{home:linuxHome,platform:'linux',env:{},readText:options.readText,exists:async file=>[linuxLauncher,linuxLauncher.replace('claude-as.sh','session-dir.js'),'/bin/bash'].includes(file)});
assert.equal(result[0],'/bin/bash');assert.ok(result[4].includes("'"+linuxLauncher+"'"),'Remote Unix paths are resolved on that host, not the desktop');
const calls=[],rpc=async(method,args)=>{calls.push({method,args});if(method==='doc.get')return{value:{spaces:[{id:'space'}]}};if(method==='terminal.run')return{address:'fixture',state:'live'};throw Error('Unexpected RPC: '+method);};
const launch={...target,space:'space',cwd:'D:/project',shell:['pwsh.exe','-NoProfile']};
let reply=await launchProfile(launch,rpc,options);assert.equal(reply.ok,true);
const started=calls.find(call=>call.method==='terminal.run');
assert.deepEqual(started.args.argv,profileShellArgv(launch.shell,await isolatedClaudeCommand(launch,launch.shell,options)));
assert.equal(started.args.cwd,'D:/project');assert.equal(started.args.keep,true);
assert.equal(calls.filter(call=>call.method==='terminal.run').length,1,'Only an explicit new session starts; no existing session is restarted');
calls.length=0;reply=await launchProfile(launch,rpc,{...options,exists:async()=>false});assert.equal(reply.ok,false);assert.ok(!calls.some(call=>call.method==='terminal.run'),'Missing isolation support must not silently start a shared Claude login');
console.log('PASS: automatic isolated Claude startup, configured executable/args, target-machine paths, PowerShell/Git Bash/Unix shells, custom-agent preservation and no shared fallback');
