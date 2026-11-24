import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { digest, read, put, safeRelative } from './files.mjs';
import { HOST_CONTRACT } from '../src/integration/herdr/compatibility.js';
import { pluginEntries } from './plugins.mjs';
export const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function build(root = project) {
  const config = JSON.parse(read(path.join(root, 'customization.json')));
  if (config.version !== 1 || config.id !== 'custom') throw Error('Unsupported customization manifest.');
  const output = path.join(root, 'dist');
  const entries = new Map();
  const compressed=new Set(config.compressedNodeWorkers??[]);
  for(const dest of compressed)if(!/^mods\/custom-[a-z-]+\/[a-z-]+\.cjs$/.test(dest))throw Error(`Invalid compressed Node worker: ${dest}`);
  for (const [dest, source] of Object.entries(config.files)) {
    safeRelative(dest); safeRelative(source);
    let bytes = fs.readFileSync(path.join(root, source));
    // hc's Windows remote exec quotes the entire node -e source. Package
    // large, built-ins-only workers as deterministic gzip wrappers so both
    // local and remote calls stay well below CreateProcess's 32K limit.
    if(compressed.has(dest))bytes=Buffer.from(`// Generated Node transport; canonical source: ${source}\neval(require('node:zlib').gunzipSync(Buffer.from('${gzipSync(bytes,{level:9}).toString('base64')}','base64')).toString('utf8'));\n`);
    if (entries.has(dest.toLowerCase())) throw Error(`Duplicate output: ${dest}`);
    entries.set(dest.toLowerCase(), {dest, source, bytes});
  }
  // Plugins come from their folders (tools/plugins.mjs), never from manifest lines.
  for (const entry of pluginEntries(root, config)) {
    if (entries.has(entry.dest.toLowerCase())) throw Error(`Duplicate output: ${entry.dest} (plugins are packaged from src/plugins/, remove the manual mapping)`);
    if(compressed.has(entry.dest)) entry.bytes=Buffer.from(`// Generated Node transport; canonical source: ${entry.source}\neval(require('node:zlib').gunzipSync(Buffer.from('${gzipSync(entry.bytes,{level:9}).toString('base64')}','base64')).toString('utf8'));\n`);
    entries.set(entry.dest.toLowerCase(), entry);
  }
  for(const dest of compressed)if(!entries.has(dest.toLowerCase()))throw Error(`Missing compressed Node worker: ${dest}`);
  // Each GPUI mod is self-contained. These integration files are deliberate
  // build-injected dependencies; feature code still imports only local ./ files.
  for (const name of ['identity.js', 'terminal-labels.js', 'compatibility.js', 'host.js']) {
    const source=`src/integration/herdr/${name}`, bytes=fs.readFileSync(path.join(root,source));
    for (const dest of [`lib/${name}`, ...config.features.map(f=>`mods/${f.mod}/${name}`)]) entries.set(dest.toLowerCase(),{dest,source,bytes});
  }
  // Pure agent adapters are injected as one self-contained tree, like the host
  // facade. Registration stays outside UI and optional feature-plugin switches.
  const agentRoot = 'src/integration/agent-context';
  function agentFiles(directory, base = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      if (entry.isSymbolicLink()) throw Error('Refusing linked agent provider source.');
      const relative = base + entry.name;
      return entry.isDirectory() ? agentFiles(path.join(directory, entry.name), relative + '/') : relative.endsWith('.js') ? [relative] : [];
    });
  }
  for (const relative of agentFiles(path.join(root, agentRoot))) {
    const source = `${agentRoot}/${relative}`, bytes = fs.readFileSync(path.join(root, source));
    for (const base of ['lib', ...config.features.map(feature => `mods/${feature.mod}`)]) {
      const dest = `${base}/integration/agent-context/${relative}`;
      if (entries.has(dest.toLowerCase())) throw Error(`Duplicate agent provider output: ${dest}`);
      entries.set(dest.toLowerCase(), { dest, source, bytes });
    }
  }
  for (const name of ['deploy.mjs','files.mjs']) {
    const dest=`scripts/${name}`,source=`tools/${name}`;
    entries.set(dest.toLowerCase(),{dest,source,bytes:fs.readFileSync(path.join(root,source))});
  }
  // Filename/byte framing makes the revision deterministic and unambiguous.
  const shellNames=['bash-cwd-loader.sh','bash-cwd.sh','powershell-cwd.ps1'];
  const revision=digest(Buffer.concat(shellNames.flatMap(name=>{
    const bytes=entries.get(`shell/${name}`).bytes;
    return [Buffer.from(`${name}\0${bytes.length}\0`),bytes];
  })))+'\n';
  entries.set('shell/revision',{dest:'shell/revision',source:'generated:shell',bytes:Buffer.from(revision)});
  entries.set('package.json',{dest:'package.json',source:'generated',bytes:Buffer.from('{"private":true,"type":"module"}\n')});
  // Detect missing relative imports in the emitted graph before touching live files.
  for (const {dest,bytes} of entries.values()) if (/\.(?:m?js|cjs)$/.test(dest)) {
    for (const match of bytes.toString().matchAll(/(?:from\s*|import\s*)["'](\.\.?\/[^"']+)["']/g)) {
      const target=path.posix.normalize(path.posix.join(path.posix.dirname(dest),match[1]));
      if (!entries.has(target.toLowerCase()) && !dest.startsWith('scripts/') && !dest.includes('.test.') && !dest.startsWith('frame-patches/')) throw Error(`Missing packaged import: ${dest} -> ${target}`);
    }
  }
  const exportScripts=new Set(['scripts/export-preferences.mjs','scripts/runtime/preferences.mjs','scripts/runtime/settings-sections.js','scripts/layout-preferences.mjs','scripts/files.mjs']);
  const payload={};
  for (const {dest,source,bytes} of entries.values()) {
    const privateFile=/^(mods\/custom-[a-z-]+\/|layouts\/Custom\.json$|layouts\/custom\.svg$|themes\/Custom\.json$)/.test(dest) && !dest.includes('.test.');
    if (privateFile) payload[dest]={source,hash:digest(bytes)};
    const workerFile=/^(lib\/|frame-patches\/)/.test(dest) && !dest.endsWith('.md') || /^scripts\/(frame-(?:registry|patch)|startup-frames|palette-manifests|palette-policy|terminal-input|readline-paste|feedback-draft)\.mjs$/.test(dest) || dest==='scripts/a1-session-report.js' || ['scripts/palette-binding.js','scripts/palette-capabilities.js','scripts/compatibility.js'].includes(dest);
    if(workerFile || dest.startsWith('shell/') || exportScripts.has(dest))payload[`.customizations/runtime/${dest}`]={source,hash:digest(bytes),from:dest};
  }
  // Unlike development-only scripts, every exporter import must be installed.
  for(const dest of exportScripts) {
    const entry=entries.get(dest);if(!entry)throw Error(`Missing exporter dependency: ${dest}`);
    for(const match of entry.bytes.toString().matchAll(/(?:from\s*|import\s*)["'](\.\.?\/[^"']+)["']/g)) {
      const target=path.posix.normalize(path.posix.join(path.posix.dirname(dest),match[1]));
      if(!exportScripts.has(target))throw Error(`Uninstalled exporter import: ${dest} -> ${target}`);
    }
  }
  payload['.customizations/runtime/package.json']={source:'generated',hash:digest('{"type":"module"}\n'),text:'{"type":"module"}\n'};
  const manifest={version:2,id:config.id,layout:config.layout,supportedHerdr:[...HOST_CONTRACT.reviewedVersions],files:payload};
  // Build fully validates in memory first. dist is exclusively generated and disposable.
  fs.mkdirSync(output,{recursive:true});
  const wanted=new Set([...entries.values()].map(e=>e.dest));wanted.add('bundle.json');
  function prune(dir,base=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const rel=base+e.name,file=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Refusing linked build output.');if(e.isDirectory()){prune(file,rel+'/');if(!fs.readdirSync(file).length)fs.rmdirSync(file);}else if(!wanted.has(rel))fs.unlinkSync(file);}}
  prune(output);
  for (const {dest,bytes} of entries.values()) put(path.join(output,dest),bytes);
  put(path.join(output,'bundle.json'),JSON.stringify(manifest,null,2)+'\n');
  return {output,files:Object.keys(payload).length,modules:config.features.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{console.log(JSON.stringify(build(),null,2));}
  catch(error){console.error(JSON.stringify({deploymentFailure:{stage:'build',reason:error.message}}));process.exitCode=1;}
}
