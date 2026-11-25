// Run the actual private worker transport with a fake child, not real gh/auth.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
let reply,captured;
const module={exports:{}};
vm.runInNewContext(fs.readFileSync(new URL('../src/plugins/git/github.cjs',import.meta.url),'utf8'),{
 module,process:{env:{}},setTimeout,clearTimeout,Date:class extends Date{static now(){return 0;}},
 require(name){assert.equal(name,'node:child_process');return {spawn(program,args){
  assert.equal(program,'gh');captured=Array.from(args);
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();child.stdin.end=()=>{};child.kill=()=>{};
  queueMicrotask(()=>{if(reply.out)child.stdout.emit('data',reply.out);if(reply.err)child.stderr.emit('data',reply.err);child.emit('close',reply.code??0,reply.signal);});return child;
 }};},
});
const read=()=>module.exports.gh(['api','repos/owner/repo/hooks','--paginate','--slurp'],undefined,{});
for(const out of [
 'HTTP/2.0 200 OK\r\nContent-Type: application/json\r\n\r\n[[{"id":1}],[]]',
 '[HTTP/2.0 200 OK\nContent-Type: application/json\n\n[{"id":1}],HTTP/2.0 200 OK\nContent-Type: application/json\n\n[]]',
]) {reply={out};assert.deepEqual(JSON.parse(await read()),[[{id:1}],[]]);assert.ok(captured.includes('--include'));}
reply={code:1,out:'HTTP/2.0 403 Forbidden\r\nX-RateLimit-Remaining: 3300\r\nRetry-After: 1800\r\n\r\n{"message":"You have exceeded a secondary rate limit"}'};
await assert.rejects(read(),e=>e.rateLimited===true&&e.retryAfter===1800000);
reply={code:1,out:'HTTP/2.0 429 Too Many Requests\nRetry-After: Thu, 01 Jan 1970 00:30:00 GMT\n\n{}'};
await assert.rejects(read(),e=>e.rateLimited===true&&e.retryAfter===1800000);
reply={code:1,out:'[HTTP/2.0 200 OK\nRetry-After: 1200\n\n[],HTTP/2.0 429 Too Many Requests\nRetry-After: 2400\n\n{}]'};
await assert.rejects(read(),e=>e.rateLimited===true&&e.retryAfter===2400000,'Later pagination headers cannot shorten Retry-After');
reply={code:1,err:'gh: Too Many Requests (HTTP 429)'};await assert.rejects(read(),e=>e.rateLimited===true);
for(const value of [
 {code:1,out:'HTTP/2.0 403 Forbidden\nX-RateLimit-Remaining: 3300\n\n{"message":"Resource not accessible by integration"}'},
 {code:1,out:'HTTP/2.0 401 Unauthorized\nX-RateLimit-Remaining: 0\n\n{"message":"Bad credentials"}'},
 {code:1,out:'HTTP/2.0 401 Unauthorized\n\n{"message":"API rate limit exceeded"}'},
 {code:-1073741502,err:'API rate limit exceeded'},
 {code:null,signal:'SIGTERM',err:'API rate limit exceeded'},
 {code:1,err:'command timed out; check API rate limits'},
]) {reply=value;await assert.rejects(read(),e=>e.safe===true&&e.rateLimited!==true);}
console.log('PASS actual worker API header capture, numeric/date Retry-After, slurped pagination stripping and strict quota-header/auth/process/timeout exclusions');
