// Opt-in live check: only a disposable space and a Node argv fixture, no agents.
// Restores the original selected tab and closes every temporary terminal.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),{connect,launchProfile}=require('../mods/custom-new-menu/profile-launch.cjs');
const app=(...args)=>JSON.parse(execFileSync('herdr-app',args,{encoding:'utf8'}));
const original=app('status'),client=connect();let space,launched;
try {
 space=app('do','space.new',JSON.stringify({name:'__profile-default-shell-smoke'})).space;
 for(let i=0;i<40;i++){
  if((await client.call('doc.get',{name:'herdr-app'})).value?.spaces?.some(s=>s.id===space))break;
  await new Promise(r=>setTimeout(r,100));
 }
 const values=['two words',"a'b",'$(echo NOT_EXECUTED)','; echo NOT_EXECUTED'];
 const launchStart=Date.now(),timings=[];
 const timedRpc=async(method,params)=>{const at=Date.now();try{return await client.call(method,params);}finally{timings.push({method,ms:Date.now()-at});}};
 launched=await launchProfile({space,shell:[],argv:['node','-e',"process.stdout.write('CUSTOM_PROFILE_ARGV='+JSON.stringify(process.argv.slice(1))+'\\n')",...values]},timedRpc);
 const launchMs=Date.now()-launchStart;
 assert.equal(launched.ok,true,launched.error);
 const terminal=await client.call('terminal.get',{terminal:launched.address});
 assert.match(terminal.argv[0],/bash(?:\.exe)?$/i,'The configured core default is Bash, not CMD');
 assert.ok(terminal.argv.includes('-c'),'The profile starts as part of shell startup, never as pasted input');
 let output='';
 for(let i=0;i<60;i++){
  output=(await client.call('terminal.read',{terminal:launched.address,lines:100})).text;
  if(output.split(/\r?\n/).some(line=>line.startsWith('CUSTOM_PROFILE_ARGV=[')))break;
  await new Promise(r=>setTimeout(r,100));
 }
 if(process.env.CUSTOM_PROFILE_TIMING)console.log(JSON.stringify({launchMs,firstOutputMs:Date.now()-launchStart,timings}));
 const receipt=output.split(/\r?\n/).find(line=>line.startsWith('CUSTOM_PROFILE_ARGV=['));
 assert.ok(receipt,output);assert.deepEqual(JSON.parse(receipt.slice('CUSTOM_PROFILE_ARGV='.length)),values);
 assert.equal(output.split(/\r?\n/).find(line=>line.trim()),receipt,'No initial shell prompt or echoed startup command precedes the program output');
 let adopted=false;
 for(let i=0;i<60;i++){
  adopted=app('ls').spaces.some(s=>s.id===space&&s.tabs.some(t=>t.id===launched.tab));
  if(adopted)break;await new Promise(r=>setTimeout(r,100));
 }
 assert.ok(adopted,'The shell is adopted as an unnamed numbered tab');
 console.log('PASS live: prompt-free default Git Bash startup, literal argv, no echoed command, shell remaining open after fixture exit, native tab adoption.');
} finally {
 if(space)try{app('do','space.close',JSON.stringify({id:space,confirmed:true}));}catch{}
 if(launched?.address)try{await client.call('terminal.kill',{terminal:launched.address});}catch{}
 if(original.tab)try{app('do','tab.select',JSON.stringify({id:original.tab}));}catch{}
 client.close();
}
