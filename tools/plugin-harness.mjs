// Test loader: runs mod code the way it is packaged (plugins in mods/<mod>/plugins/...),
// in a node:vm context with fake modules for the host. No Herdr, cores or network.
// Uses tools/plugins.mjs, so tests and the build agree on where every plugin file goes.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { project } from './build.mjs';
import { pluginLayout, indexSource, whereSource } from './plugins.mjs';

// host: the fake ./host.js exports. modules: other mod files, { 'name.js': exportsObject
// | 'src/path.js' }. entry: module source placed at the mod's root.
export async function loadMod({ host, modules = {}, entry, mod = 'custom-settings', globals = {}, root = project }) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'customization.json'), 'utf8'));
  const { ids, files } = pluginLayout(root, config);
  const context = vm.createContext({ console, ...globals });
  const sources = new Map(files.map(f => [f.rel, fs.readFileSync(path.join(root, f.source), 'utf8')]));
  sources.set('plugins/index.js', indexSource(ids));
  sources.set('plugins/where.js', whereSource(mod));
  const synthetic = values => new vm.SyntheticModule(Object.keys(values), function () {
    for (const [k, v] of Object.entries(values)) this.setExport(k, v);
  }, { context });
  // Host functions a test did not fake fail loudly if a plugin calls them.
  const stub = name => () => { throw Error(`host.${name} is not faked in this test`); };
  const HOST = ['exec', 'hc', 'window', 'spaces', 'panes', 'terminals', 'machines', 'shared', 'setShared', 'appHome', 'readTextFile', 'writeTextFile', 'notify', 'layout', 'run', 'checking'];
  const cache = new Map([['host.js', synthetic({ ...Object.fromEntries(HOST.map(n => [n, stub(n)])), checking:()=>true, ...host })]]);
  cache.set('websocket', synthetic({ WebSocket:{ connect:stub('WebSocket.connect') } }));
  for (const [name, value] of Object.entries(modules)) {
    if (typeof value === 'string') sources.set(name, fs.readFileSync(path.join(root, value), 'utf8'));
    else cache.set(name, synthetic(value));
  }
  const load = rel => {
    if (!cache.has(rel)) {
      if (!sources.has(rel)) throw Error(`Not packaged for the test: ${rel}`);
      cache.set(rel, new vm.SourceTextModule(sources.get(rel), { context, identifier: rel }));
    }
    return cache.get(rel);
  };
  const main = new vm.SourceTextModule(entry, { context, identifier: '__entry__.js' });
  await main.link((specifier, from) => load(specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(from.identifier), specifier)) : specifier));
  await main.evaluate();
  return main.namespace;
}
