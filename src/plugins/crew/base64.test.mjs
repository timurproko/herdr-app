import assert from 'node:assert/strict';
import {loadMod} from '../../../tools/plugin-harness.mjs';

// QuickJS has no Buffer/atob/TextDecoder. Count cross-string calls, not machine
// wall time: the old per-character decoder exceeded its 500 ms native task
// budget for a supported large status and stranded the current read's lease.
let stringCalls=0,pointCalls=0,maxArguments=0;
const TrackedString=new Proxy(String,{get(target,key){
 if(key==='fromCharCode')return(...codes)=>{stringCalls++;maxArguments=Math.max(maxArguments,codes.length);return String.fromCharCode(...codes);};
 if(key==='fromCodePoint')return(...codes)=>{pointCalls++;return String.fromCodePoint(...codes);};
 return Reflect.get(target,key);
}});
const {decodeBase64,decodeBase64Reply,recordedSource}=await loadMod({host:{},globals:{String:TrackedString},modules:{'space-color-state.js':'src/shared/space-color-state.js'},
 entry:'export {decodeBase64,decodeBase64Reply} from "./plugins/crew/plugin.js";export {recordedSource} from "./plugins/crew/fleet.js";'});
const b64=text=>Buffer.from(text,'utf8').toString('base64');
for(const text of ['', 'a','ab','abc','héllo ✓ 🚀','\0\r\n\t','é'.repeat(4095)+'🚢界','a'.repeat(4094)+'🚀'+'b'.repeat(4097)]) {
 assert.equal(decodeBase64(b64(text)),text);
 assert.equal(decodeBase64(`\r\n${b64(text)}\n`),text,'Whitespace/padding retain the existing decoding behavior');
}
assert.equal(decodeBase64(null),'');

const report={home:'fixture/.crew',owner:{terminal:'t1',live:true},tasks:[{id:'task',state:'working',terminal:'t2',pr:null}],padding:''};
report.padding='x'.repeat(1048576-JSON.stringify(report).length);
const text=JSON.stringify(report);assert.equal(Buffer.byteLength(text),1048576);
stringCalls=pointCalls=maxArguments=0;
const result=decodeBase64(b64(text));
assert.equal(result,text);
assert.equal(recordedSource(result).tasks.length,1,'The one-MiB input remains within the supported status limit');
assert.ok(stringCalls>0 && stringCalls<=Math.ceil(text.length/4095)+Math.ceil(b64(text).length/65536),'At most one bulk string conversion per bounded chunk, not per character');
assert.equal(pointCalls,0,'No per-codepoint string call can return on the large path');
assert.ok(maxArguments<=4096,'String argument lists remain bounded independently of response size');

let turns=0;
assert.equal(await decodeBase64Reply(b64(text),{yieldTurn:async()=>{turns++;}}),text);
assert.equal(turns,Math.ceil(b64(text).length/65536)-1,'Large replies yield one real task boundary between bounded pieces');
for(const prefix of [49149,49150,49151])for(const tail of ['é','界','🚀']) {
 const unicode='a'.repeat(prefix)+tail+'z'.repeat(70000);
 assert.equal(await decodeBase64Reply(b64(unicode),{yieldTurn:async()=>{}}),unicode,'UTF-8 bytes crossing a decoder piece are carried, not replaced');
}
let current=true;
await assert.rejects(decodeBase64Reply(b64(text),{current:()=>current,yieldTurn:async()=>{current=false;}}),error=>error.reason==='obsolete-generation');

const many={home:'fixture/.crew',owner:{terminal:'t1',live:true},tasks:Array.from({length:4096},(_,i)=>({id:`task-${i}`,state:'closed',terminal:null,pr:null}))};
assert.equal(recordedSource(decodeBase64(b64(JSON.stringify(many)))).tasks.length,4096,'Task validation still handles its bounded maximum');
assert.throws(()=>recordedSource(text+' '),/large/);
console.log('PASS Crew bulk Base64/UTF-8: one-MiB status, bounded conversion calls, chunk-edge Unicode and 4096-task validation');
