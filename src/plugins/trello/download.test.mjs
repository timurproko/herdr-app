import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fixture, A, B, C, L, ITEM, credentials} from './testing.test.mjs';
import {trelloServer, json} from '../../../tests/support/trello-server.mjs';
const require = createRequire(import.meta.url);
const {run} = require('./operations.cjs'), {execute} = require('./cli.cjs');
const {Client} = require('./client.cjs'), {authority} = require('./policy.cjs');
const {downloadUrl} = require('./attachments.cjs'), {TrelloError} = require('./errors.cjs');
const {binary, outputFile, MAX_BYTES} = require('./download.cjs');
const png = Buffer.from([137,80,78,71,13,10,26,10,1,2,3]), previewUrl = `https://trello.com/1/cards/${C}/attachments/${ITEM}/previews/${B}/download`;
const original = {id: ITEM, name: 'Mutable name is never the filename', fileName: 'screen.png', isUpload: true, bytes: png.length, mimeType: 'image/png',
  url: `https://trello.com/1/cards/${C}/attachments/${ITEM}/download/screen.png`, previews: [{id: B, width: 300, height: 200, bytes: png.length, scaled: true, url: previewUrl}]};
const f = fixture(); let row = original, mode = 'normal', body = png, type = 'image/png';
const external = await trelloServer((_u,_q,r) => json(r, {}));
const api = await trelloServer((url, request, response) => {
  if (url.pathname.includes('/download')) {
    assert.equal(request.headers.authorization, `OAuth oauth_consumer_key="${credentials.apiKey}", oauth_token="${credentials.token}"`);
    assert.equal(url.search, '');
    if (mode === 'redirect') { response.writeHead(302, {Location: external.origin}); return response.end(); }
    if (mode === 'rate') return json(response, {}, 429, {'Retry-After': '120'});
    if (mode === 'disable') f.state(false);
    if (mode === 'oversize') { response.writeHead(200, {'Content-Type': type}); response.write(png); return response.end(Buffer.alloc(MAX_BYTES)); }
    if (mode === 'length') { response.writeHead(200, {'Content-Type': type, 'Content-Length': String(MAX_BYTES+1)}); response.end(); return; }
    if (mode === 'delay') return; // Client deadline must close the request.
    response.writeHead(200, {'Content-Type': type}); return response.end(body);
  }
  assert.equal(url.searchParams.get('key'), credentials.apiKey); assert.equal(url.searchParams.get('token'), credentials.token); assert.equal(request.headers.authorization, undefined);
  if (url.pathname === `/1/boards/${A}/cards`) return json(response, [{id: C, idBoard: A, idList: L}]);
  assert.equal(url.pathname, `/1/cards/${C}/attachments/${ITEM}`); assert.equal(url.searchParams.get('fields'), 'all'); json(response, row);
});
const args = {board: A, card: C, attachment: ITEM, out: f.root};
const download = extra => run(f.store, 'attachments.get', {...args, ...extra}, api);
const files = () => fs.readdirSync(f.root).filter(n => n.startsWith('trello-attachment-'));
try {
  const result = await download(); assert.ok(fs.readFileSync(result.path).equals(png)); assert.ok(path.isAbsolute(result.path));
  assert.equal(result.mimeType, 'image/png'); assert.equal(result.bytes, png.length); assert.equal(result.preview, false);
  assert.equal(path.basename(result.path), ITEM + '-screen.png');
  if (process.platform !== 'win32') { assert.equal(fs.statSync(result.path).mode & 0o777, 0o600); assert.equal(fs.statSync(path.dirname(result.path)).mode & 0o777, 0o700); }
  const savedDirs = files().length;
  // Exclusive creation never overwrites a prior file, even under a forced test collision.
  const open = fs.openSync; let collision;
  try {
    fs.openSync = (file, flags, ...rest) => {
      if (flags === 'wx' && path.basename(file) === 'collision.png') { collision = file; const fd = open(file, flags, ...rest); fs.writeSync(fd, 'keep'); fs.closeSync(fd); }
      return open(file, flags, ...rest);
    };
    assert.throws(() => outputFile(f.root, 'collision.png', Buffer.from('no'), () => {}), {code: 'STORE_IO'});
  } finally { fs.openSync = open; }
  assert.equal(fs.readFileSync(collision, 'utf8'), 'keep');
  fs.rmSync(path.dirname(collision), {recursive: true});
  assert.ok(fs.readFileSync(result.path).equals(png));
  row = {...original, bytes: MAX_BYTES+1};
  const preview = await download({previewWidth: 200}); assert.equal(preview.width, 300); assert.equal(preview.preview, true);
  assert.ok(fs.readFileSync(preview.path).equals(png));
  await assert.rejects(download(), {code: 'ATTACHMENT_SIZE'});
  row = {...original, previews: []}; await assert.rejects(download({previewWidth: 300}), {code: 'ATTACHMENT_PREVIEW'});
  const {representation} = require('./download.cjs');
  const small = {...original.previews[0], id: A, width: 100, height: 70, url: previewUrl.replace(B,A)};
  const choices = {...original, previews: [original.previews[0], small]};
  assert.equal(representation(choices, C, 50).width, 100); assert.equal(representation(choices, C, 999).width, 300);
  for (const url of ['https://evil.invalid/download', `https://trello.com.evil.invalid/1/cards/${C}/attachments/${ITEM}/download/a.png`, original.url+'?token=oops', original.url+'#fragment', original.url.replace('https:', 'http:'), original.url.replace('trello.com','trello.com:444'), original.url.replace(C,A), original.url.replace('screen.png','..%2fsecret'), original.url.replace('screen.png','CON')]) {
    assert.throws(() => downloadUrl(url, C, ITEM));
  }
  for (const name of ['../x', 'x\\y', 'x:stream', 'CON', 'nul.txt', 'x.', 'x ']) { row = {...original, fileName: name}; await assert.rejects(download(), {code: 'RESPONSE'}); }
  for (const url of [external.origin, 'https://evil.invalid/x']) { row = {...original, isUpload: false, url}; await assert.rejects(download({allowOtherTypes: true}), {code: 'ATTACHMENT_LINK'}); }
  row = {...original, mimeType: 'application/pdf', fileName: 'file.pdf'}; type = 'application/pdf'; body = Buffer.from('%PDF-fake');
  await assert.rejects(download(), {code: 'ATTACHMENT_TYPE'});
  const pdf = await download({allowOtherTypes: true}); assert.equal(fs.readFileSync(pdf.path,'utf8'), '%PDF-fake');
  row = original; type = 'text/html'; body = Buffer.from('<html>not image'); await assert.rejects(download(), {code: 'ATTACHMENT_TYPE'});
  type = 'image/png'; await assert.rejects(download(), {code: 'ATTACHMENT_TYPE'}); body = png;
  for (const [kind, code] of [['redirect','REMOTE'], ['oversize','ATTACHMENT_SIZE'], ['length','ATTACHMENT_SIZE'], ['disable','STALE']]) {
    const before = files().length; mode = kind; await assert.rejects(download(), {code}); assert.equal(files().length, before); f.state();
  }
  mode = 'delay'; await assert.rejects(run(f.store,'attachments.get',args,{...api,timeout:20}),{code:'TRANSPORT'});
  mode = 'rate'; await assert.rejects(download(), {code: 'RATE_LIMIT'}); const count = api.calls.length;
  await assert.rejects(download(), {code: 'RATE_LIMIT'}); assert.equal(api.calls.length,count);
  f.store.write('cooldown', {version:1,retryAt:0}, f.store.read('cooldown')); mode = 'normal';
  const client = new Client(f.store, authority(f.store), api); client.count=20;
  await assert.rejects(client.download(original.url,C,ITEM,()=>{}),{code:'LIMIT'});
  client.count=0; client.started-=60001; await assert.rejects(client.download(original.url,C,ITEM,()=>{}),{code:'LIMIT'});
  const before = files().length;
  for (const when of [2,3,4]) {
    let n=0; assert.throws(()=>outputFile(f.root,'partial.png',png,()=>{if(++n===when)throw new TrelloError('STALE');}),{code:'STALE'});
    assert.equal(files().length,before);
  }
  const link=path.join(f.root,'linked'); fs.symlinkSync(path.dirname(result.path),link,process.platform==='win32'?'junction':'dir');
  assert.throws(()=>outputFile(link,'x.png',png,()=>{}),{code:'STORE_UNSAFE_PATH'});
  const checkout=path.join(f.root,'checkout');fs.mkdirSync(checkout);fs.mkdirSync(path.join(checkout,'.git'));
  assert.throws(()=>outputFile(checkout,'x.png',png,()=>{}),{code:'STORE_IN_CHECKOUT'});
  if(process.platform==='win32'){
    const old=process.env.SystemRoot;try{process.env.SystemRoot='C:\\nonexistent-trello-test';assert.throws(()=>outputFile(f.root,'x.png',png,()=>{}),{code:'STORE_PERMISSION_CHECK'});}finally{process.env.SystemRoot=old;}
    assert.equal(files().length,before);
  }
  for (const [mime, data] of [['image/jpeg',Buffer.from([255,216,255,0])],['image/gif',Buffer.from('GIF89a')],['image/webp',Buffer.from('RIFFxxxxWEBP')]]) {
    const b=await binary(new Response(data,{headers:{'Content-Type':mime}}),new AbortController().signal,mime,false);assert.equal(b.type,mime);
  }
  const response=new Response(png,{headers:{'Content-Type':'image/png'}}),abort=new AbortController();abort.abort();
  await assert.rejects(binary(response,abort.signal,'image/png',false),{code:'TRANSPORT'});
  for(const flags of [['--preview-width','0'],['--url',original.url],['--allow-other-types','false']])assert.equal((await execute(['attachments','get','--board',A,'--card',C,'--attachment',ITEM,'--out',f.root,...flags],{store:f.store,...api})).exit,2);
  const cli=await execute(['attachments','get','--board',A,'--card',C,'--attachment',ITEM,'--out',f.root,'--preview-width','300'],{store:f.store,...api});
  assert.equal(cli.exit,0);assert.ok(fs.existsSync(cli.result.data.path));
  assert.ok(files().length>savedDirs); assert.equal(external.calls.length,0);
  assert.ok(!JSON.stringify(cli).includes(credentials.apiKey));assert.ok(!JSON.stringify(cli).includes(credentials.token));
} finally { await api.close(); await external.close(); f.cleanup(); }
console.log('PASS: fake-server read-only originals/previews, OAuth-only Trello downloads, type/size gates, private output and cleanup');
