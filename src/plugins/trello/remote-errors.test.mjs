import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fixture, fakeTransport, credentials} from './testing.test.mjs';
const require = createRequire(import.meta.url);
const {execute} = require('./cli.cjs');
const {publicError, TrelloError} = require('./errors.cjs');
const f = fixture();
const read = (transport, extra = {}) => execute(['boards', 'list'], {store: f.store, transport, ...extra});
const noSecrets = result => {
  const text = JSON.stringify(result);
  for (const secret of [credentials.apiKey, credentials.token, 'evil.invalid', 'PRIVATE_PATH', '\\u001b']) assert.ok(!text.includes(secret));
};
try {
  for (const [status, code, phrase] of [[400,'REMOTE','Bad Request'],[401,'AUTH','Unauthorized'],[403,'FORBIDDEN','Forbidden'],[404,'NOT_FOUND','Not Found'],[429,'RATE_LIMIT','Too Many Requests'],[500,'REMOTE','Internal Server Error'],[302,'REMOTE','Found']]) {
    const fake = fakeTransport(() => new Response('unrecognized explanation', {status, statusText: credentials.token, headers: {'Retry-After':'1'}}));
    const out = await read(fake.transport), error = out.result.error;
    assert.equal(error.code, code); assert.equal(error.httpStatus, status); assert.equal(error.httpReason, phrase);
    assert.ok(error.message.includes(`HTTP ${status} ${phrase}`)); assert.equal(fake.calls.length, 1); noSecrets(out);
    if (status === 429) {
      assert.ok(error.retryAt > Date.now());
      const blocked = await read(fake.transport); assert.equal(blocked.result.error.code, 'RATE_LIMIT'); assert.equal(fake.calls.length, 1);
      f.store.write('cooldown', {version:1,retryAt:0}, f.store.read('cooldown'));
    }
  }
  for (const body of ['invalid value for filter', JSON.stringify({message:'invalid value for filter'}), JSON.stringify({error:'invalid value for filter'})]) {
    const out = await read(async () => new Response(body, {status:400}));
    assert.equal(out.result.error.httpReason, 'Bad Request: Invalid value for filter'); noSecrets(out);
  }
  for (const body of [credentials.token, `invalid value for filter ${credentials.apiKey}`, 'https://evil.invalid/?key='+credentials.apiKey, 'PRIVATE_PATH\u001b[31m', '{invalid json', 'x'.repeat(4097), JSON.stringify({message:'invalid value for filter', echo:credentials.token})]) {
    const out = await read(async () => new Response(body, {status:400}));
    assert.equal(out.result.error.httpReason, 'Bad Request'); noSecrets(out);
  }
  // Unknown/forged extras cannot cross the error boundary as provider text.
  noSecrets(publicError(new TrelloError('REMOTE', {httpStatus:400, httpReason:credentials.token, providerReason:credentials.token})));
  for (const timeout of [40, 1000]) {
    let cancelled = false;
    const start = performance.now();
    const out = await read(async () => ({status:403, body:{getReader:()=>({read:()=>new Promise(()=>{}),cancel:()=>{cancelled=true;return new Promise(()=>{});},releaseLock:()=>{}}),cancel:()=>new Promise(()=>{})}}), {timeout});
    assert.equal(out.result.error.httpStatus, 403); assert.equal(out.result.error.httpReason, 'Forbidden');
    assert.ok(performance.now()-start < 1500); // Diagnostics/cancel cannot use an unbounded new deadline.
    // A request deadline can win before diagnostic cleanup; allow its bounded sub-budget to settle.
    if (!cancelled) await new Promise(resolve=>setTimeout(resolve,220));
    assert.equal(cancelled, true);
  }
} finally { f.cleanup(); }
console.log('PASS: safe HTTP status/reasons, hostile bodies/statusText, bounded diagnostics/cancellation and persistent rate refusal');
