// Explicit local/SSH transport. Packages only public config/code/history, never credentials.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {gzipSync}=require('node:zlib');
const {createHash}=require('node:crypto');
const {FILES}=require('./monitor-host.cjs');
function dispatch(input){
  if(!input||!['status','install','update','stop','probe'].includes(input.action)||(input.on!==null&&input.on!==undefined&&(typeof input.on!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(input.on))))throw Error('Invalid monitor control request');
  const hc=process.platform==='win32'?'hc.exe':'hc';
  let coreId;
  if(input.on){
    const listed=spawnSync(hc,['machine','ls','--json'],{encoding:'utf8',timeout:10000,windowsHide:true});
    if(listed.status!==0)throw Error('Could not verify remote machine');
    const machine=JSON.parse(listed.stdout).machines?.find(m=>m.name===input.on&&!m.temporary&&m.state==='connected');
    if(!machine||machine.session)throw Error('Select a connected default-session Core');coreId=machine.id;
  }
  const source=fs.readFileSync(path.join(__dirname,'monitor-host.cjs'),'utf8');
  const encoded=gzipSync(source).toString('base64');
  const bootstrap=`let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>{s+=c;if(s.length>524288)process.exit(2)});process.stdin.on('end',async()=>{try{const m={exports:{}};new Function('require','module',require('node:zlib').gunzipSync(Buffer.from('${encoded}','base64')).toString())(require,m);const r=await m.exports.main(JSON.parse(s));console.log(JSON.stringify({ok:true,...r}));}catch{console.log(JSON.stringify({ok:false,error:'Background CI operation failed. Check local dependencies, task permissions and installation ownership.'}));process.exitCode=1;}});`;
  const request={...input,coreId};delete request.on;
  const files=Object.fromEntries(FILES.map(file=>[file,fs.readFileSync(path.join(__dirname,file),'utf8')]));
  const packageHash=createHash('sha256').update(JSON.stringify(files)).digest('hex');
  if(input.action==='install')request.files=files;
  const args=['exec',...(input.on?['--on',input.on]:[]),'-i','--timeout','120','node','-e',bootstrap];
  const result=spawnSync(hc,args,{input:JSON.stringify(request),encoding:'utf8',timeout:135000,windowsHide:true,maxBuffer:1024*1024});
  let reply;try{reply=JSON.parse(result.stdout.trim());}catch{throw Error('Monitor transport failed or timed out; check status before retrying');}
  if(!reply.ok)throw Error(reply.error||'Monitor operation failed');
  if(input.action==='status')reply.upToDate=reply.packageHash===packageHash;
  return reply;
}
module.exports={dispatch};
if(require.main===module){try{console.log(JSON.stringify(dispatch(JSON.parse(process.argv[2]??'{}'))));}catch(e){console.log(JSON.stringify({ok:false,error:e.message}));process.exitCode=1;}}
