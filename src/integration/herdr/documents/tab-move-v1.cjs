// Private Herdr document boundary. Review this contract after App/Core updates.
'use strict';
const {createHash} = require('node:crypto');
const {isDeepStrictEqual} = require('node:util');
const PROFILE = Object.freeze({ apps: Object.freeze(['0.1.15', '0.1.16']), cores: Object.freeze(['0.1.19', '0.1.21']), generation: 1 });
const ID = /^[a-zA-Z0-9_-]{1,200}$/;
const NODE_FIELDS = new Set('id type children content active header size min max hidden title background border radius shadow padding focus theme colors font font_size font_weight ui_font terminal_line_height terminal_cell_width terminal_scroll_speed terminal_padding terminal_opacity gap divider movable closable resizable floating titlebar traffic_lights preview terminal_menu window_drag cloned_from'.split(' '));
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const fail = message => { throw Error(message); };
function keys(value, allowed, where) {
  if (!object(value) || Object.keys(value).some(k => !allowed.includes(k))) fail(`Unsupported ${where}; review the tab-move document adapter.`);
}
function id(value) { if (typeof value !== 'string' || !ID.test(value)) fail('Invalid machine-local layout ID.'); return value; }
function fingerprint(value) {
  const canonical = x => Array.isArray(x) ? x.map(canonical) : object(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
function validateProfile(app, hello) {
  if (!PROFILE.apps.includes(app) || !PROFILE.cores.includes(hello?.version) || hello.generation !== PROFILE.generation)
    fail(`Tab moving needs a reviewed App/Core contract (reviewed Apps: ${PROFILE.apps.join(', ')}; Cores: ${PROFILE.cores.join(', ')}). Other Custom features are unaffected.`);
  for (const method of ['doc.get', 'doc.set', 'terminal.get', 'terminal.list', 'terminal.label'])
    if (!hello.methods?.includes(method)) fail(`Core is missing ${method}; tab moving is unavailable.`);
  if (typeof hello.core?.id !== 'string' || !hello.core.id) fail('Core identity is unavailable.');
}
function validateDocument(doc) {
  keys(doc, ['spaces'], 'layout document');
  if (!Array.isArray(doc.spaces) || doc.spaces.length > 2000 || Buffer.byteLength(JSON.stringify(doc)) > 1024 * 1024) fail('Invalid or oversized layout document.');
  const ids = new Set(), terminals = new Map(), tabs = new Map();
  const unique = value => { id(value); if (ids.has(value)) fail('Duplicate layout ID.'); ids.add(value); };
  let nodes = 0;
  function walk(n, space, tab, depth = 0) {
    if (++nodes > 20000 || depth > 64) fail('Layout is too complex for this adapter.');
    if (!object(n) || Object.keys(n).some(k => !NODE_FIELDS.has(k))) fail('Unsupported pane fields; review the tab-move adapter.');
    unique(n.id);
    if ((n.floating?.length ?? 0) !== 0 || n.header || n.preview || n.terminal_menu) fail('Floating panes, custom headers and previews are not yet supported by tab moving.');
    if (n.floating !== undefined && !Array.isArray(n.floating)) fail('Invalid floating panes.');
    if (['row', 'column', 'stack'].includes(n.type)) {
      if (!Array.isArray(n.children) || n.content !== undefined) fail('Invalid pane container.');
      n.children.forEach(child => walk(child, space, tab, depth + 1));
      if (n.active !== undefined && n.active !== null && !n.children.some(c => c.id === n.active)) fail('Invalid active stack child.');
    } else if (n.type === 'block') {
      if (n.children !== undefined) fail('Invalid block children.');
      const c = n.content;
      if (object(c) && typeof c.terminal === 'string') {
        keys(c, ['terminal'], 'terminal content');
        if (!/^t[a-z0-9]+$/i.test(c.terminal) || terminals.has(c.terminal)) fail('Invalid or duplicate terminal reference.');
        terminals.set(c.terminal, {space: space.id, tab: tab.id});
      } else if (object(c) && typeof c.mod === 'string' && c.mod) {
        keys(c, ['mod', 'props'], 'mod content');
      } else fail('Unsupported pane content.');
    } else fail('Unsupported pane container type.');
  }
  for (const space of doc.spaces) {
    keys(space, ['id', 'name', 'folder', 'tabs', 'color'], 'space fields');
    unique(space.id);
    if (!Array.isArray(space.tabs) || !space.tabs.length || typeof space.name !== 'string' || typeof space.folder !== 'string') fail('Invalid space.');
    if (space.color !== undefined && typeof space.color !== 'string') fail('Unsupported space color.');
    for (const tab of space.tabs) {
      keys(tab, ['id', 'name', 'root'], 'tab fields');
      id(tab.id);
      if (tabs.has(tab.id) || ids.has(tab.id) || typeof tab.name !== 'string' || tab.root?.id !== tab.id) fail('Invalid tab identity.');
      tabs.set(tab.id, {space, tab});
      walk(tab.root, space, tab);
    }
  }
  return {tabs, terminals};
}
function checkedSnapshot(snapshot) {
  if (!Number.isSafeInteger(snapshot?.version) || snapshot.version < 1) fail('Layout version is missing or unsafe.');
  return validateDocument(snapshot.value);
}
function movable(tab) {
  function visit(node) {
    if (node.content?.mod === 'custom-space-start') fail('Start pages belong to their space and cannot be moved.');
    const props = node.content?.props;
    if (object(props) && ['spaceId', 'space', 'sourceSpaceId'].some(k => Object.hasOwn(props, k))) fail('This mod pane is bound to its space and cannot safely move yet.');
    (node.children ?? []).forEach(visit);
  }
  visit(tab.root);
}
function locate(snapshot, request) {
  const inventory = checkedSnapshot(snapshot);
  id(request.tabId); id(request.sourceSpaceId);
  const found = inventory.tabs.get(request.tabId);
  if (!found || found.space.id !== request.sourceSpaceId) fail('The tab moved or was closed. Reopen its menu.');
  movable(found.tab);
  if (request.fingerprint && fingerprint(found.tab) !== request.fingerprint) fail('The tab changed. Reopen its menu before moving it.');
  return {...found, inventory};
}
function planMove(snapshot, request) {
  const {tab, space} = locate(snapshot, request);
  id(request.destinationSpaceId);
  if (space.id === request.destinationSpaceId) fail('Choose another space.');
  const value = structuredClone(snapshot.value);
  const source = value.spaces.find(s => s.id === space.id), destination = value.spaces.find(s => s.id === request.destinationSpaceId);
  if (!destination) fail('The destination space was closed.');
  const at = source.tabs.findIndex(t => t.id === tab.id);
  const last = destination.tabs.at(-1);
  const startLast = last?.root?.children?.length === 1 && last.root.children[0].content?.mod === 'custom-space-start';
  destination.tabs.splice(destination.tabs.length - (startLast ? 1 : 0), 0, source.tabs.splice(at, 1)[0]);
  if (!source.tabs.length) {
    if (request.keepSource !== false) fail('Prepare the source Start page before moving its final tab.');
    value.spaces.splice(value.spaces.indexOf(source), 1);
  }
  const inventory = validateDocument(value), before = validateDocument(snapshot.value);
  if (!isDeepStrictEqual(inventory.tabs.get(tab.id).tab, tab) || inventory.tabs.size !== before.tabs.size
      || !isDeepStrictEqual([...inventory.terminals.keys()].sort(), [...before.terminals.keys()].sort())) fail('Tab-move preservation check failed.');
  return {value, version: snapshot.version, terminals: [...before.terminals].filter(([,p]) => p.tab === tab.id).map(([a]) => a)};
}
// The ONLY document-write call site. No arbitrary document name/value is exported.
async function commitMove(rpc, snapshot, request) {
  const plan = planMove(snapshot, request);
  const result = await rpc('doc.set', {name: 'herdr-app', version: plan.version, value: plan.value});
  if (!Number.isSafeInteger(result?.version) || result.version <= plan.version) fail('Core returned an unconfirmed layout version.');
  return result.version;
}
// UI IDs are machine-qualified; a machine's document and adoption labels are not.
// Never strip arbitrary prefixes from document payloads or mod props.
function scopeRequest(request) {
  const machine = request?.machine;
  if (machine !== null) id(machine);
  const unqualify = value => {
    if (machine === null) return id(value);
    if (typeof value !== 'string' || !value.startsWith(machine + '/')) fail('Both spaces and the tab must belong to the same machine.');
    return id(value.slice(machine.length + 1));
  };
  return {...request, machine: null, tabId: unqualify(request.tabId), sourceSpaceId: unqualify(request.sourceSpaceId),
    ...(request.destinationSpaceId !== undefined ? {destinationSpaceId: unqualify(request.destinationSpaceId)} : {})};
}
// A fixed, read-only hello probe. No remote files/companion installation and no
// remote App binary needed. Keep stdin open until hc connect delivers its reply.
const REMOTE_HELLO = `const {spawn}=require('node:child_process');
const p=spawn('hc',['connect'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let b='',done=false;
const finish=(value,code)=>{if(done)return;done=true;clearTimeout(timer);if(value)console.log(JSON.stringify(value));p.stdin.end();p.kill();process.exitCode=code;};
const timer=setTimeout(()=>finish(null,1),4000);p.on('error',()=>finish(null,1));p.stdin.on('error',()=>finish(null,1));p.on('exit',()=>finish(null,1));p.stderr.resume();
p.stdout.setEncoding('utf8');p.stdout.on('data',c=>{b+=c;if(b.length>262144)return finish(null,1);let i;while((i=b.indexOf('\\n'))>=0){const line=b.slice(0,i);b=b.slice(i+1);try{const m=JSON.parse(line);if(m.id===1)finish(m.result,m.error?1:0);}catch{finish(null,1);}}});
p.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'hello',params:{generation:1}})+'\\n');`;
function machineRpc(base, machine) {
  if (machine === null) return base;
  id(machine);
  const prefix = machine + '/'; let pinned = null, localIdentity = null, invalidated = false;
  async function binding() {
    if (invalidated) fail('The machine binding changed; reopen the tab menu.');
    const list = await base('machine.list', {}), found = list?.machines?.find(m => m.name === machine);
    if (!found || found.state !== 'connected' || found.temporary || !found.id) fail('The selected machine is not connected.');
    const key = fingerprint({id: found.id, session: found.session ?? null, version: found.version});
    if (pinned && key !== pinned.key) { invalidated = true; fail('The machine identity/session/version changed; reopen the tab menu.'); }
    pinned ??= {key, id: found.id};
    return found;
  }
  function terminal(record) {
    if (!record || typeof record.address !== 'string' || !record.address.startsWith(prefix)) fail('Core returned a terminal from another machine.');
    return {...record, address: record.address.slice(prefix.length),
      ...(typeof record.parent === 'string' && record.parent.startsWith(prefix) ? {parent: record.parent.slice(prefix.length)} : {})};
  }
  return async (method, params) => {
    const selected = await binding();
    let result;
    if (method === 'hello') {
      const local = await base('hello', {generation: 1});
      validateProfile(PROFILE.apps[0], local);
      if (!['machine.list', 'machine.exec'].every(m => local.methods.includes(m))) fail('Core cannot verify remote machine routing.');
      if (localIdentity && localIdentity !== local.core.id) { invalidated = true; fail('The routing Core changed.'); }
      localIdentity = local.core.id;
      const probe = await base('machine.exec', {on: machine, argv: ['node', '-e', REMOTE_HELLO], timeout: 4.5});
      if (probe.code !== 0 || probe.timed_out || probe.truncated) fail('Could not verify the remote Core. Node.js and hc must be available on that machine.');
      try { result = JSON.parse(Buffer.from(probe.stdout, 'base64').toString('utf8')); } catch { fail('Invalid remote Core handshake.'); }
      if (result?.core?.id !== selected.id || result.version !== selected.version) { invalidated = true; fail('The remote Core identity/version does not match its connection.'); }
    } else if (method === 'doc.get' || method === 'doc.set') {
      if (params.name !== 'herdr-app' || params.on !== undefined) fail('Only the selected machine’s Herdr layout may be accessed.');
      result = await base(method, {...params, on: machine});
    } else if (method === 'terminal.list') {
      const listing = await base(method, params);
      if (!Array.isArray(listing?.terminals)) fail('Invalid terminal listing.');
      result = {...listing, terminals: listing.terminals.filter(t => t.address?.startsWith(prefix)).map(terminal)};
    } else if (method === 'terminal.get' || method === 'terminal.label') {
      if (!/^t[a-z0-9]+$/i.test(params.terminal ?? '')) fail('Invalid machine-local terminal address.');
      result = terminal(await base(method, {...params, terminal: prefix + params.terminal}));
    } else fail('Unsupported tab-move RPC.');
    await binding(); // Do not confirm a result after an alias/session changed.
    return result;
  };
}
module.exports = {PROFILE, id, fingerprint, validateProfile, validateDocument, checkedSnapshot, locate, planMove, commitMove, scopeRequest, machineRpc};
