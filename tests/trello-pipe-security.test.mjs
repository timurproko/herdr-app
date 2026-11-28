// Real disposable hostile Windows pipe; no Core, SSH, credentials or elevation.
import assert from 'node:assert/strict';import cp from 'node:child_process';import path from 'node:path';import net from 'node:net';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{windowsPipe,coreConnection}=require('../src/services/private-actions/trello-bootstrap.cjs');
if(process.platform!=='win32')console.log('SKIP: Windows identification-only named-pipe regression');
else{
 const name='trello-sqos-fixture-'+process.pid;
 const source=`$ErrorActionPreference='Stop';$p=[IO.Pipes.NamedPipeServerStream]::new('${name}',[IO.Pipes.PipeDirection]::InOut);try{[Console]::WriteLine('LISTENING');$p.WaitForConnection();$null=$p.ReadByte();$levels=[Collections.Generic.List[string]]::new();try{$p.RunAsClient([IO.Pipes.PipeStreamImpersonationWorker]{$levels.Add([Security.Principal.WindowsIdentity]::GetCurrent().ImpersonationLevel.ToString())});[Console]::WriteLine('CLIENT_LEVEL='+$levels[0])}catch [UnauthorizedAccessException]{[Console]::WriteLine('IDENTITY_DENIED')}}finally{$p.Dispose()}`;
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>k.toLowerCase()!=='psmodulepath'));
 const server=cp.spawn(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(source,'utf16le').toString('base64')],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let output='',errors='',client,clientClosed=Promise.resolve();
 const deadline=setTimeout(()=>{client?.destroy();server.kill();},12000);
 try{
  server.stdout.on('data',chunk=>{output+=chunk;if(!client&&output.includes('LISTENING')){client=windowsPipe('\\\\.\\pipe\\'+name,{spawn(...args){const child=cp.spawn(...args);clientClosed=new Promise(resolve=>child.once('close',resolve));return child;}});client.on('error',()=>{});client.resume();client.write('{}\n');}});
  server.stderr.on('data',chunk=>errors+=chunk);
  const code=await new Promise((resolve,reject)=>{server.on('error',reject);server.on('close',resolve);});
  assert.equal(code,0,errors);assert.match(output,/CLIENT_LEVEL=Identification|IDENTITY_DENIED/);assert.doesNotMatch(output,/CLIENT_LEVEL=(Impersonation|Delegation)/);
  assert.match(coreConnection.toString(),/process.platform==='win32'\?windowsPipe:net.createConnection/,'Production Windows routing must not fall back to Node pipe opens');
  console.log('PASS: hostile normal-token server cannot acquire an impersonation/delegation-capable token through the production Windows connector');
 }finally{clearTimeout(deadline);client?.destroy();server.kill();await clientClosed;}
 const address='\\\\.\\pipe\\trello-rpc-sqos-'+process.pid;
 const echo=net.createServer(socket=>{let text='';socket.setEncoding('utf8');socket.on('data',chunk=>{text+=chunk;let i;while((i=text.indexOf('\n'))>=0){const request=JSON.parse(text.slice(0,i));text=text.slice(i+1);socket.write(JSON.stringify({id:request.id,result:request.params})+'\n');}});});
 await new Promise(resolve=>echo.listen(address,resolve));let bridgeClosed=Promise.resolve();
 const connection=coreConnection('fixture',{connect:()=>windowsPipe(address,{spawn(...args){const child=cp.spawn(...args);bridgeClosed=new Promise(resolve=>child.once('close',resolve));return child;}})});
 try{for(const params of [{generation:1},{value:'Unicode 雪 😀'}])assert.deepEqual(await connection.call('hello',params),params);console.log('PASS: identification-only connector relays sequential bounded JSON RPC and Unicode');}
 finally{connection.close();await bridgeClosed;await new Promise(resolve=>echo.close(resolve));}
}
