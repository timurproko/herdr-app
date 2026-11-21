import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import nodeFs from 'node:fs';
// The real ui.js basics (dist/lib/ui.js) on this test's element: shared rows/buttons as shipped.
const uiReal=(el,svgEl=el)=>{const src=nodeFs.readFileSync(new URL('../lib/ui.js',import.meta.url),'utf8').replace(/^import [^\n]*\n/gm,'');const names=[...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m=>m[1]);return vm.runInNewContext(src.replace(/^export /gm,'')+`\n({${names.join(',')}})`,{div:el,svg:svgEl,Popover:{new:el},Input:{new:el}});};
const require = createRequire(import.meta.url);
const helper = require('../mods/custom-workspace-status/previews.cjs');
const root = new URL('../mods/custom-workspace-status/', import.meta.url);

test('only loopback HTTP(S), with full paths, queries, fragments, IPv6 and latest mentions', () => {
  assert.deepEqual(helper.extractLinks('https://example.com/ http://localhost.evil:3000/ http://user:secret@localhost:3000/ ftp://localhost:3000/'), []);
  assert.deepEqual(helper.extractLinks('curl http://127.0.0.1:5182/api/ping\nPreview: (http://localhost:5182/).'), [{url:'http://localhost:5182/', label:'localhost:5182'}]);
  assert.equal(helper.extractLinks('curl http://127.0.0.1:5182/api/ping')[0].url, 'http://127.0.0.1:5182/');
  assert.equal(helper.extractLinks('http://localhost:3000/health?token=abc')[0].url, 'http://localhost:3000/health?token=abc');
  const value = 'https://[::1]:8443/test?a=1&token=secret%3D#here';
  assert.equal(helper.extractLinks(value)[0].url, value);
  assert.equal(helper.localURL(new URL(value), 5555), 'https://127.0.0.1:5555/test?a=1&token=secret%3D#here');
  assert.deepEqual(helper.destination(new URL('http://[::]:3000')), {host:'::1', port:3000});
  assert.deepEqual(helper.destination(new URL('https://localhost/')), {host:'127.0.0.1', port:443});
  assert.equal(helper.previewURL('javascript:alert(1)'), null);
  assert.equal(helper.previewURL('http://localhost:99999/'), null);
  assert.equal(helper.extractLinks(Array.from({length:8}, (_,i)=>`http://localhost:${3000+i}/`).join('\n')).length, 3);
});

test('metadata validation accepts only loopback previews and preserves query-bearing paths', async () => {
  const {previewLink, previewName, previewOpenRequests} = await import(new URL('preview-link.js', root));
  // Open requests (crew show): once per request, only for live terminals with a valid page,
  // never for a request far from now; a remote terminal's machine is its address prefix.
  {
    const now = 1794940000000, url = 'http://127.0.0.1:4387/session/abc', at = n => String(now - n);
    const term = (address, labels, state = 'live') => ({ address, state, labels });
    const list = [
      term('pc2/t5', { 'custom.preview.url': url, 'custom.preview.open': at(1000) }),
      term('t7', { 'custom.preview.url': url, 'custom.preview.open': at(2000) }),
      term('t8', { 'custom.preview.url': url }),
      term('t9', { 'custom.preview.url': 'https://example.com/', 'custom.preview.open': at(0) }),
      term('t10', { 'custom.preview.url': url, 'custom.preview.open': 'soon' }),
      term('t11', { 'custom.preview.url': url, 'custom.preview.open': at(16 * 60000) }),
      term('t12', { 'custom.preview.url': url, 'custom.preview.open': at(0) }, 'finished'),
    ];
    const found = previewOpenRequests(list, {}, now);
    assert.deepEqual(found.map(r => [r.address, r.machine, r.link.url]), [['pc2/t5', 'pc2', url], ['t7', null, url]]);
    assert.deepEqual(previewOpenRequests(list, { 'pc2/t5': at(1000) }, now).map(r => r.address), ['t7'], 'A handled request is not opened again');
    assert.deepEqual(previewOpenRequests(list, { 'pc2/t5': at(5000) }, now).map(r => r.address), ['pc2/t5', 't7'], 'A newer request for the same terminal is');
    assert.deepEqual(previewOpenRequests(null, null, now), []);
  }
  // A named preview (a page a tool published): a short plain name, or the localhost label stays.
  assert.deepEqual(['Lavish', ' Crew report ', 'v1.2_a-b'].map(previewName), ['Lavish', 'Crew report', 'v1.2_a-b']);
  for (const bad of [null, 7, '', ' ', 'x'.repeat(25), 'a\nb', '<b>', '-x', 'Lavish‮']) assert.equal(previewName(bad), null);
  for (const value of [null, 'https://example.com/', 'http://localhost.evil:3000/', 'http://user@localhost:3000/', 'http://localhost:0/', 'http://localhost:65536/', 'http://localhost:3000/\nother']) assert.equal(previewLink(value),null);
  assert.deepEqual(previewLink('http://127.0.0.1:5182/api/ping'),{url:'http://127.0.0.1:5182/',label:'localhost:5182'});
  const value='http://localhost:3000/?x=/health';
  assert.equal(previewLink(value).url,value);
  assert.equal(previewLink('https://[::1]/path?a=1#x').label,'localhost:443');
  const {previewEndpoint} = await import(new URL('preview-link.js', root));
  assert.equal(previewEndpoint('pc2','http://localhost:5182/a'),previewEndpoint('pc2','https://127.0.0.1:5182/b'));
  assert.notEqual(previewEndpoint('pc2','http://localhost:5182/'),previewEndpoint('pc3','http://localhost:5182/'));
  assert.notEqual(previewEndpoint('pc2','http://localhost:5182/'),previewEndpoint('pc2','http://[::1]:5182/'));
});

test('screen discovery is passive; never request history or accept option-shaped addresses', () => {
  assert.deepEqual(helper.screenReadArgs('pc2/t44'), ['read','pc2/t44','--lines','0','--json']);
  assert.throws(()=>helper.screenReadArgs('--all'));
  assert.throws(()=>helper.screenReadArgs('pc2/t44\nother'));
});

test('SSH argv binds only local loopback, fails closed, and preserves configured target', () => {
  const args = helper.sshArgs('ssh://me@dev:2222', '::1', 5182, 55182);
  assert.ok(args.includes('BatchMode=yes'));
  assert.ok(args.includes('ExitOnForwardFailure=yes'));
  assert.ok(args.includes('127.0.0.1:55182:[::1]:5182'));
  assert.deepEqual(args.slice(-2), ['--', 'ssh://me@dev:2222']);
  assert.throws(()=>helper.sshArgs('-oProxyCommand=bad', '127.0.0.1', 80, 9000));
  assert.throws(()=>helper.sshArgs('host\nother', '127.0.0.1', 80, 9000));
});

test('prefer the remote port to preserve Host checks; choose another if occupied', async () => {
  const server = net.createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const occupied = server.address().port;
  try { assert.notEqual(await helper.freePort(occupied), occupied); }
  finally { await new Promise(resolve=>server.close(resolve)); }
  assert.equal(await helper.freePort(occupied), occupied);
});

test('leases are owner-scoped; close removes only this mod copy’s leases', async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'herdr-previews-'));
  try {
    for (const owner of ['one', 'two']) {
      const dir = helper.ownerDir(home, owner);
      await fs.mkdir(dir, {recursive:true});
      await fs.writeFile(path.join(dir, 'test.lease'), '');
      await fs.writeFile(path.join(dir, 'test.json'), '{}');
      await fs.utimes(path.join(dir, 'test.lease'), new Date(0), new Date(0));
    }
    await helper.heartbeat(home, 'one');
    const lease = path.join(helper.ownerDir(home, 'one'), 'test.lease');
    assert.ok((await fs.stat(lease)).mtimeMs > Date.now()-10000);
    await helper.heartbeat(home, 'one', true);
    await assert.rejects(fs.stat(lease));
    assert.equal((await fs.stat(path.join(helper.ownerDir(home, 'two'), 'test.lease'))).mtimeMs, 0);
    assert.ok(await fs.stat(path.join(helper.ownerDir(home, 'one'), 'test.json')));
    await assert.rejects(helper.openPreview(home, 'one', 'pc2', 'https://example.com'), /localhost/);
    assert.deepEqual(await helper.openPreview(home, 'one', '', 'http://0.0.0.0:3000/path?q=1'), {url:'http://127.0.0.1:3000/path?q=1'});
  } finally { await fs.rm(home, {recursive:true, force:true}); }
});

test('disconnect is scoped to one endpoint and waits for worker shutdown', async () => {
  const home=await fs.mkdtemp(path.join(os.tmpdir(),'herdr-preview-close-'));
  const first='http://127.0.0.1:5182/',second='http://127.0.0.1:5183/';
  try {
    const files=[];
    for (const [owner,url] of [['one',first],['one',second],['two',first]]) {
      const dir=helper.ownerDir(home,owner),key=helper.tunnelKey('pc2',new URL(url));
      await fs.mkdir(dir,{recursive:true});
      for(const ext of ['lease','lock','json'])await fs.writeFile(path.join(dir,`${key}.${ext}`),ext==='json'?'{}':'');
      files.push({dir,key});
    }
    const stop=helper.disconnectPreview(home,'one','pc2',first);
    await new Promise(resolve=>setTimeout(resolve,100));
    await assert.rejects(fs.stat(path.join(files[0].dir,`${files[0].key}.lease`)));
    assert.ok(await fs.stat(path.join(files[0].dir,`${files[0].key}.lock`)),'Stop waits for the worker to release the port');
    await fs.rm(path.join(files[0].dir,`${files[0].key}.lock`));
    await stop;
    await assert.rejects(fs.stat(path.join(files[0].dir,`${files[0].key}.json`)));
    for(const file of files.slice(1))for(const ext of ['lease','lock','json'])assert.ok(await fs.stat(path.join(file.dir,`${file.key}.${ext}`)),'Other endpoints and owners remain untouched');
    await assert.rejects(helper.disconnectPreview(home,'one','pc2','https://example.com'),/localhost/);
    assert.deepEqual(await helper.disconnectPreview(home,'one',null,first),{});
  } finally { await fs.rm(home,{recursive:true,force:true}); }
});

test('metadata-only rendering, zero background reads, uniform geometry and explicit discovery', async () => {
  const context = vm.createContext({}), cache = new Map(), pending = [], tasks = [], opened = [], notices = [], overlays = [], closed = [], commands = [];
  let currentProps = {};
  let focus = {terminal:'pc2/t44', cwd:'D:/repo'}, notifications = 0;
  const records = [{address:'pc2/t44',labels:{'custom.preview.url':'http://127.0.0.1:5182/path?q=1#x'}}];
  const element = asset => {
    const o = {kids:[],style:{},asset}; let p;
    p = new Proxy(o, {get:(o,k)=>k in o ? o[k] : k==='when' ? (yes,fn)=>yes?fn(p):p : k==='child' ? v=>{o.kids.push(v);return p;} : k==='children' ? vs=>{o.kids.push(...vs);return p;} : k==='hover' ? ()=>p : (...args)=>{o.style[k]=args;return p;}});
    return p;
  };
  const native = {
    focused:()=>focus, panes:()=>[], spaces:()=>[], terminals:()=>records, home:()=> 'C:/me', agents:()=>[], theme:()=>({muted:'muted',accent:'accent'}),
    keys:()=>[], nextCommand:()=>new Promise(()=>{}), run:command=>commands.push(command), shared:()=>null, setShared:()=>{}, appHome:()=> 'C:/app', notify:v=>notices.push(v),
    props:()=>currentProps,openOverlay:spec=>{overlays.push(spec);return `overlay-${overlays.length}`;},closeOverlay:id=>closed.push(id),
    exec:(cmd,args,options)=>cmd==='git' ? Promise.resolve({code:1,stdout:''}) : new Promise(resolve=>pending.push({cmd,args,options,resolve})),
  };
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v] of Object.entries(exports))this.setExport(k,v);},{context});
  async function load(url) {
    if (cache.has(url.href)) return cache.get(url.href);
    const loading=(async()=>{const mod = new vm.SourceTextModule(await fs.readFile(url,'utf8'),{context,identifier:url.href});
      await mod.link((s,r)=>s==='herdr'?synthetic(native):s==='gpui-kit'?synthetic({View:class{},div:element,svg:element}):s==='gpui-base'?synthetic({h_flex:element}):s==='./ui.js'?synthetic({menuRow:uiReal(element).menuRow,U:{smallIcon:14,icon:16},slot:v=>v,hotkey:()=>'',menuSurface:()=>element(),dropdown:()=>element(),PILL:{inset:6,menuShift:8},pillTrigger:()=>element(),pillMenu:m=>m}):load(new URL(s,r.identifier)));
      return mod;})();
    cache.set(url.href,loading);return loading;
  }
  const mod = await load(new URL('main.js',root)); await mod.evaluate();
  const view = new mod.namespace.default(); view.previewOwner = 'test';
  const timers = [];
  const cx = {focus_handle:()=>({focus:()=>{}}), notify:()=>notifications++, open_url:url=>opened.push(url), spawn:fn=>tasks.push(fn(cx)),stop_propagation:()=>{},timer:{every:(ms,fn)=>timers.push({ms,fn}),after:()=>({cancel(){}})}};
  const strings = n=>typeof n==='string'?[n]:(n?.kids??[]).flatMap(strings);
  const draw = ()=>strings(view.render(cx));
  const cold = new mod.namespace.default();
  cold.init({}, {...cx,spawn:()=>{}});
  for (let i=0;i<100;i++) for (const timer of timers) timer.fn({...cx,spawn:()=>{}});
  for (let i=0;i<100;i++) draw();
  assert.equal(pending.length,0,'Initialization, repeated renders and timer ticks never read terminal screens or start Node');
  assert.ok(draw().includes('localhost:5182'));
  focus = {terminal:'t1',cwd:'C:/me'};
  assert.ok(!draw().includes('localhost:5182'),'Metadata never leaks to another terminal');
  assert.ok(!draw().includes('Preview'),'Unknown URLs never add a placeholder to the status bar');
  assert.ok(!view.render(cx).kids.some(n=>n?.style?.id?.[0]==='preview-0'));
  focus = {terminal:null,cwd:null};
  assert.ok(!draw().includes('Preview'),'File-only panes have no preview action');
  focus = {terminal:'pc2/t44',cwd:'D:/repo'};
  const link = {url:records[0].labels['custom.preview.url'],label:'localhost:5182'};
  view.render(cx); view.branch = 'main';
  const tree = view.render(cx), button = tree.kids.find(n=>n?.style?.id?.[0]==='preview-0');
  assert.equal(button.style.opacity?.[0],0,'A newly shown preview starts transparent');
  view.reveal.changedAt = -1e9; view.reveal.loading.clear(); view.render(cx); // Fast-forward past the reveal (one armed hidden frame first).
  assert.equal(view.render(cx).kids.find(n=>n?.style?.id?.[0]==='preview-0').style.opacity?.[0],1,'then turns opaque when due (native transition animates it)');assert.equal(button.style.transition,undefined,'The hiding frame has no transition, so new content never flashes');
  const nodes = n=>n && typeof n==='object'?[n,...(n.kids??[]).flatMap(nodes)]:[];
  const icons = nodes(tree).filter(n=>n.asset?.endsWith('.svg'));
  assert.ok(icons.length>=3);
  assert.ok(icons.every(n=>n.style.size[0]===(n.asset.endsWith('/branch.svg')?16:14)),'Smaller branch artwork is optically compensated; other status glyphs are compact 14px');
  assert.equal(tree.style.gap[0],16,'One inter-item spacing contract');
  assert.equal(button.style.px[0],8,'Hover extends eight pixels around the content');
  assert.equal(button.style.mx[0],-8,'Negative margins cancel padding without moving content or neighboring items');
  assert.equal(button.style.px[0]+button.style.mx[0],0,'Unchanged content origin and outer footprint');
  assert.equal(button.kids[0].asset,'mods/custom-workspace-status/preview.svg','Browser icon precedes an unconnected preview');
  assert.equal(button.kids[1],link.label);
  assert.equal(button.style.gap[0],4,'Icon/text spacing matches neighboring metadata');
  assert.equal(button.style.text_color[0],'muted','Localhost icon and text use neutral status metadata color, not blue accent');
  assert.equal(button.style.text_color[0],tree.style.text_color[0],'Localhost matches neighboring status items');
  view.openPreview(cx,link,'pc2'); view.openPreview(cx,link,'pc2');
  assert.ok(draw().includes('Connecting…'));
  assert.ok(!draw().includes(link.label),'Connecting replaces the address, rather than appending to it');
  assert.equal(pending.length,1,'Repeated clicks do not create duplicate tunnels');
  assert.deepEqual(Array.from(pending[0].args.slice(-2)),['pc2',link.url]);
  pending.shift().resolve({code:0,stdout:'{"url":"http://127.0.0.1:55182/path?q=1#x"}'});
  await Promise.all(tasks);
  assert.deepEqual(opened,['http://127.0.0.1:55182/path?q=1#x']);
  assert.ok(draw().includes(link.label),'Address returns when connection finishes');
  assert.equal(view.render(cx).kids.find(n=>n?.style?.id?.[0]==='preview-0').kids[0].asset,'mods/custom-workspace-status/arrow-up-right.svg','Arrow appears only after successful opening');
  view.openPreview(cx,link,'pc2');
  assert.equal(pending.length,0,'Connected left-click uses the cached URL synchronously, without a helper or core request');
  assert.equal(opened.length,2);
  view.openPreview(cx,link,'pc2',true);
  assert.equal(pending[0].args[1],'reconnect','Only an explicit reconnect forces setup');
  pending.shift().resolve({code:1,stderr:'Permission denied'}); await Promise.all(tasks);
  assert.equal(opened.length,2); assert.equal(notices[0].level,'error');
  assert.equal(view.render(cx).kids.find(n=>n?.style?.id?.[0]==='preview-0').kids[0].asset,'mods/custom-workspace-status/preview.svg','Failed connection returns to the browser icon');
  view.keepPreviewAlive(cx); view.keepPreviewAlive(cx);
  assert.equal(pending.length,1,'Lease renewals are single-flight');
  assert.equal(pending[0].args[1],'keepalive','Keepalive only touches local files, never hc read');
  pending.shift().resolve({code:0,stdout:'{}'}); await Promise.all(tasks);
  // Read screen only registers metadata. It does not open a browser or establish a tunnel.
  view.discoverPreview(cx); view.discoverPreview(cx);
  assert.equal(pending.length,1); assert.equal(pending[0].args[1],'scan');
  assert.equal(pending[0].args.at(-1),'pc2/t44');
  pending.shift().resolve({code:0,stdout:'{"links":[{"url":"http://localhost:3000/"}]}'});
  await new Promise(setImmediate);
  assert.equal(pending[0].cmd,'hc');
  assert.deepEqual(Array.from(pending[0].args),['label','pc2/t44','custom.preview.url=http://localhost:3000/']);
  pending.shift().resolve({code:0,stdout:''});
  await Promise.all(tasks);
  assert.equal(pending.length,0,'Read screen does not start connection setup');
  assert.equal(opened.length,2,'Read screen does not open the browser');
  records[0].labels['custom.preview.url']='http://localhost:3000/';
  assert.ok(draw().includes('localhost:3000'),'The published metadata adds the localhost item without a placeholder');
  records[0].labels['custom.preview.url']=link.url;
  // Status bar and localhost have separate real context menus, with captured targets.
  const bar = view.render(cx);
  bar.style.on_mouse_down[1]({},cx);
  const statusMenu = overlays.at(-1);
  assert.deepEqual(Array.from(statusMenu.props.items,item=>item.label),['Read screen','Reconnect']);
  assert.equal(pending.length,0,'Opening a context menu does not read anything');
  view.handlePreviewMenu(statusMenu.props.items[0].command,cx);
  assert.equal(pending[0].args[1],'scan','Status-bar Read screen is the only discovery action');
  pending.shift().resolve({code:0,stdout:'{"links":[]}'});await Promise.all(tasks);
  assert.equal(pending.length,0,'An empty screen never starts setup');
  view.showPreviewMenu({terminal:'pc2/t44',on:'pc2'},link);
  view.handlePreviewMenu(view.previewMenuRequest.items[1].command,cx);
  assert.equal(pending[0].args[1],'reconnect','Status-bar Reconnect explicitly rebuilds the selected connection');
  pending.shift().resolve({code:0,stdout:'{"url":"http://127.0.0.1:55300/"}'});await Promise.all(tasks);
  const previewButton = view.render(cx).kids.find(n=>n?.style?.id?.[0]==='preview-0');
  previewButton.style.on_mouse_down[1]({},cx);
  const itemMenu = overlays.at(-1);
  assert.deepEqual(Array.from(itemMenu.props.items,item=>item.label),['Close']);
  const closeRequest = view.previewMenuRequest;
  // The popup copy renders only menu content; it creates no timers or background work.
  currentProps = {...itemMenu.props,overlay:'test-menu'};
  const menu = new mod.namespace.default(),beforeTimers=timers.length,beforeTasks=tasks.length;
  menu.init({},cx); const popup=menu.render(cx);
  assert.equal(timers.length,beforeTimers);assert.equal(tasks.length,beforeTasks);
  const heading=popup.kids.find(n=>n?.style?.id?.[0]==='preview-menu-heading');
  assert.ok(heading.kids.includes('Localhost'));
  assert.equal(heading.style.role,undefined,'Context heading is inert, not a menu action');
  popup.kids.find(n=>n?.style?.id?.[0]==='preview-menu-close').style.on_click[0]({},cx);
  assert.equal(closed.at(-1),'test-menu');
  assert.equal(commands.at(-1),`custom-workspace-status.${closeRequest.items[0].command}`);
  currentProps = {};
  const realTarget = {terminal:'pc2/t44',on:'pc2'};
  // Labels changed after a menu was opened: stale Close must not erase the replacement.
  records[0].labels['custom.preview.url']='http://localhost:3000/';
  view.handlePreviewMenu(closeRequest.items[0].command,cx);
  assert.equal(pending.length,0,'Stale close ignores a replaced URL');
  records[0].labels['custom.preview.url']=link.url;
  view.showPreviewMenu(realTarget,link,true);
  const validClose=view.previewMenuRequest.items[0].command;
  focus={terminal:'t1',cwd:'C:/me'};
  view.handlePreviewMenu(validClose,cx);
  assert.equal(pending[0].args[1],'disconnect');
  assert.deepEqual(Array.from(pending[0].args.slice(-2)),['pc2',link.url],'Close stays pinned to the clicked connection after focus changes');
  pending.shift().resolve({code:0,stdout:'{}'});await new Promise(setImmediate);
  assert.deepEqual(Array.from(pending[0].args),['label','pc2/t44','custom.preview.url=']);
  pending.shift().resolve({code:0,stdout:''});await Promise.all(tasks);
  // Context actions are one-shot and old menu commands cannot act on a new target.
  view.handlePreviewMenu(validClose,cx);assert.equal(pending.length,0);
  await view.close();assert.equal(pending.length,0,'No lease process after the last connection closes');
  const owningView=new mod.namespace.default();owningView.previewOwner='other';owningView.previewHasTunnel=true;
  const closing = owningView.close(); assert.equal(pending[0].args[1],'release');
  pending.shift().resolve({code:0,stdout:'{}'}); await closing;
  assert.ok(notifications>0);
});
