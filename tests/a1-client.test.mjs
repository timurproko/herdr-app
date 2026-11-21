// Shared adapter and self-contained worker fixtures. Never invoke an installed A1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {build,project} from '../tools/build.mjs';
const require=createRequire(import.meta.url),{resolveA1Command,createA1Client,validateA1Response}=require('../src/plugins/api.cjs');
assert.deepEqual(await resolveA1Command({platform:'linux',command:'/selected/bin/a1'}),['/selected/bin/a1']);
assert.deepEqual(await resolveA1Command({platform:'win32',env:{PATH:'C:\\bin'},node:'C:\\node.exe',exists:async file=>file==='C:\\bin\\a1.exe'}),['C:\\bin\\a1.exe']);
assert.deepEqual(await resolveA1Command({platform:'win32',env:{PATH:'C:\\other'},command:'D:\\selected\\a1.cmd',node:'C:\\node.exe',exists:async file=>file==='D:\\selected\\node_modules\\@timurproko\\a1\\bin\\cli.js'}),['C:\\node.exe','D:\\selected\\node_modules\\@timurproko\\a1\\bin\\cli.js']);
assert.deepEqual(await resolveA1Command({platform:'win32',env:{PATH:'C:\\bin',APPDATA:'C:\\Roaming'},node:'C:\\node.exe',exists:async file=>file==='C:\\Roaming\\npm\\node_modules\\@timurproko\\a1\\bin\\cli.js'}),['C:\\node.exe','C:\\Roaming\\npm\\node_modules\\@timurproko\\a1\\bin\\cli.js']);
await assert.rejects(resolveA1Command({platform:'win32',command:'D:\\missing\\a1.cmd',env:{PATH:'C:\\other'},exists:async file=>file.startsWith('C:')}),{code:'unsupported-installation'});
await assert.rejects(resolveA1Command({platform:'win32',env:{PATH:''},exists:async()=>false}),{code:'installation-unavailable'});
await assert.rejects(resolveA1Command({command:'a1; echo unsafe'}),{code:'unsupported-installation'});
await assert.rejects(resolveA1Command({platform:'linux',command:'./bin/a1'}),{code:'unsupported-installation'});
const target={scope:'session',sessionId:'11111111-1111-1111-1111-111111111111',runtimeId:'22222222-2222-2222-2222-222222222222'};
const request={version:1,id:'fixture',type:'settings.update',target,setting:'accentColor',value:'pink'};
const response={version:1,id:'fixture',type:'response',command:'settings.update',success:true,data:{target,setting:'accentColor',storedValue:'pink',effectiveValue:'pink',origin:'session',application:'live',status:'applied'}};
const result=value=>({code:value.success?0:1,stdout:JSON.stringify(value)+'\n'});
assert.equal(validateA1Response(result(response),request).effectiveValue,'pink');
for(const patch of [{id:'wrong'},{version:2},{type:'event'},{command:'settings.get'},{success:'true'},{data:{}},{extra:true}])assert.throws(()=>validateA1Response(result({...response,...patch}),request),{code:'invalid-response'});
for(const patch of [{status:'queued'},{effectiveValue:'blue'},{target:{...target,runtimeId:target.sessionId}},{setting:'defaultAccentColor'}])assert.throws(()=>validateA1Response(result({...response,data:{...response.data,...patch}}),request),{code:'invalid-response'});
for(const stdout of ['',JSON.stringify(response),JSON.stringify(response)+'\n\n','noise\n'+JSON.stringify(response)+'\n','x'.repeat(8193)+'\n'])assert.throws(()=>validateA1Response({code:0,stdout},request),{code:'invalid-response'});
const failure={...response,success:false,error:{code:'request-expired',message:'Timed out \u2028 not a record \u2029 boundary'}};delete failure.data;
assert.throws(()=>validateA1Response(result(failure),request),error=>error.code==='request-expired' && error.response?.error.message===failure.error.message);
// Additive boolean descriptors must not break existing space-color discovery.
const listRequest={version:1,id:'fixture',type:'settings.list'};
const descriptors=[{id:'accentColor',scope:'session',type:'string',choices:['pink','blue']},
 {id:'sessionAutoName',scope:'session',type:'boolean',choices:[true,false]}];
const listResponse={...response,command:'settings.list',data:{settings:descriptors}};
assert.equal(validateA1Response(result(listResponse),listRequest).settings.length,2);
for(const setting of [{...descriptors[1],type:'number'},{...descriptors[1],choices:['false']},{...descriptors[0],choices:[false]}]){
 assert.throws(()=>validateA1Response(result({...listResponse,data:{settings:[setting]}}),listRequest),{code:'invalid-response'});
}
for(const enabled of [false,true]){
 const policy={...request,setting:'sessionAutoName',value:enabled};
 const ack={...response,data:{...response.data,setting:'sessionAutoName',storedValue:enabled,effectiveValue:enabled}};
 assert.equal(validateA1Response(result(ack),policy).effectiveValue,enabled);
 for(const patch of [{storedValue:String(enabled)},{effectiveValue:!enabled},{storedValue:null},{origin:'profile'},{status:'queued'}]){
  assert.throws(()=>validateA1Response(result({...ack,data:{...ack.data,...patch}}),policy),{code:'invalid-response'});
 }
 const read={...policy,type:'settings.get'};delete read.value;
 const inherited={...ack,command:'settings.get',data:{target,setting:'sessionAutoName',storedValue:null,effectiveValue:enabled,origin:'profile',application:'live'}};
 assert.equal(validateA1Response(result(inherited),read).effectiveValue,enabled);
 for(const patch of [{origin:'session'},{storedValue:false},{effectiveValue:'false'}]){
  assert.throws(()=>validateA1Response(result({...inherited,data:{...inherited.data,...patch}}),read),{code:'invalid-response'});
 }
}
let calls=0;
const literal='$(touch unsafe); two words & \"quoted\" \u2028 \u2029';
const client=createA1Client({command:'D:\\chosen\\a1.cmd',id:()=> 'fixture',resolveCommand:async options=>{assert.equal(options.command,'D:\\chosen\\a1.cmd');return ['node','D:\\chosen\\cli.js'];},execute:async(command,args)=>{
 calls++;assert.equal(command,'node');assert.equal(args.length,3);assert.equal(args[0],'D:\\chosen\\cli.js');assert.equal(args[1],'api');
 const input=JSON.parse(args[2]);assert.equal(input.value,literal);
 return result({...response,data:{...response.data,storedValue:literal,effectiveValue:literal}});
}});
await client.request('settings.update',{target,setting:'accentColor',value:literal});assert.equal(calls,1,'Literal data never becomes shell text or a retry');
await assert.rejects(client.request('settings.get',{target:{...target,runtimeId:'prefix'},setting:'accentColor'}),{code:'invalid-target'});
const {output}=build(),worker=path.join(output,'mods/custom-spaces/plugins/a1-colors/session-color.cjs');
for(const args of [[worker,JSON.stringify({expiresAt:Date.now()+10000,targets:[]})],['--input-type=commonjs','-e',fs.readFileSync(worker,'utf8'),'--',JSON.stringify({expiresAt:Date.now()+10000,targets:[]})]]) {
 const value=JSON.parse(execFileSync(process.execPath,args,{cwd:path.parse(project).root,encoding:'utf8',timeout:5000}));
 assert.deepEqual(value,{colors:[],errors:[]},'Packaged file and transported node -e run without source paths or companion dependencies');
}
console.log('PASS: shared A1 client resolution, exact target/envelope/completion, structured failures, LF framing, literal args and self-contained worker');
