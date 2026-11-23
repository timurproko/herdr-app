import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {project,build} from '../tools/build.mjs';
import {json,digest} from '../tools/files.mjs';
import {gunzipSync} from 'node:zlib';
import {pluginLayout,pluginTests,PLUGIN_SOURCE} from '../tools/plugins.mjs';
const {output}=build(),config=json(path.join(project,'customization.json')),bundle=json(path.join(output,'bundle.json'));
for(const [dest,entry]of Object.entries(bundle.files)) {
 assert.ok(!entry.source.startsWith('dist/'),'Generated copies cannot become canonical source');
 if(dest.startsWith('mods/'))assert.match(dest,/^mods\/custom-/);
}
for(const dest of config.compressedNodeWorkers??[]) {
 const packed=fs.readFileSync(path.join(output,dest),'utf8'),encoded=packed.match(/Buffer\.from\('([A-Za-z0-9+/=]+)','base64'\)/)?.[1];
 assert.ok(encoded,'A compressed worker uses only the fixed Node gzip wrapper');
 assert.deepEqual(gunzipSync(Buffer.from(encoded,'base64')),fs.readFileSync(path.join(project,bundle.files[dest].source)),'Transport must preserve the complete canonical source byte-for-byte');
 assert.ok(packed.length<20000,'Leave ample headroom for hc/JSON/Windows command quoting');
 const before=digest(packed);build();assert.equal(digest(fs.readFileSync(path.join(output,dest))),before,'Compression is deterministic across no-op builds');
}
assert.ok(!bundle.files['.customizations/runtime/scripts/a1-session-report.js'],'Legacy A1 companions are not shipped by the coordinated protocol');
for(const mod of config.plugins.mods) {
 const worker=fs.readFileSync(path.join(output,`mods/${mod}/plugins/a1-colors/session-color.cjs`),'utf8');
 const encoded=worker.match(/Buffer\.from\('([A-Za-z0-9+/=]+)','base64'\)/)?.[1];
 assert.ok(encoded,'A1 worker bundles the supported shared Node API');
 const source=gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
 assert.ok(source.includes(fs.readFileSync(path.join(project,'src/plugins/api.cjs'),'utf8')),'One canonical shared adapter is bundled verbatim');
 assert.ok(source.includes(fs.readFileSync(path.join(project,'src/plugins/a1-colors/session-color.cjs'),'utf8')),'One canonical color policy is bundled verbatim');
 assert.ok(worker.length<20000,'Self-contained transport stays below Windows command limits');
}
const ui=fs.readFileSync(path.join(project,'src/ui/ui.js'));
for(const f of config.features){
 assert.equal(digest(fs.readFileSync(path.join(output,'mods',f.mod,'ui.js'))),digest(ui));
 assert.ok(fs.existsSync(path.join(output,'mods',f.mod,'host.js')),'Every mod receives the same host facade');
 assert.ok(fs.existsSync(path.join(output,'mods',f.mod,'compatibility.js')),'Every mod receives the reviewed compatibility profile');
}
assert.match(fs.readFileSync(path.join(output,'mods/custom-workspace-chrome/startup.js'),'utf8'),/\.customizations\/runtime\/scripts\/startup-frames\.mjs/);
assert.deepEqual(json(path.join(output,'frame-patches/registry.json')).patches.map(p=>[p.id,p.target]).sort(),
 [['feedback','frame/feedback'],['palette','frame/palette']], 'New native exceptions require explicit policy/test review; no built-in mod patches');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const plugins=pluginLayout(project,config);
const mappedSources=new Set([...Object.values(config.files),...plugins.files.map(f=>f.source),...plugins.modFiles.map(f=>f.source),...plugins.ids.filter(id=>fs.existsSync(path.join(project,PLUGIN_SOURCE,id,'panel.json'))).map(id=>`${PLUGIN_SOURCE}/${id}/panel.json`),...pluginTests(project)]);
const agentSources=walk(path.join(project,'src/integration/agent-context')).filter(file=>file.endsWith('.js')).map(file=>path.relative(project,file).replaceAll('\\','/'));
const intentionallyInjected=[...['compatibility.js','host.js','identity.js','terminal-labels.js'].map(name=>`src/integration/herdr/${name}`),...agentSources].sort();
for(const feature of config.features)for(const source of agentSources) {
 const relative=source.slice('src/'.length),dest=`mods/${feature.mod}/${relative}`;
 assert.equal(bundle.files[dest].source,source,'Provider code has one canonical source and is independently source-selectable');
 assert.equal(digest(fs.readFileSync(path.join(output,dest))),digest(fs.readFileSync(path.join(project,source))));
}
const unmappedSource=walk(path.join(project,'src')).map(file=>path.relative(project,file).replaceAll('\\','/'))
 .filter(rel=>/\.(?:js|cjs|mjs|json|svg|txt|sh|ps1)$/.test(rel)&&!mappedSources.has(rel)).sort();
assert.deepEqual(unmappedSource,intentionallyInjected,'New source must be mapped or declared as a deliberate build injection');
for(const file of walk(path.join(project,'src')).filter(p=>/\.(?:js|cjs|mjs|json|sh|ps1)$/.test(p))) {
 const rel=path.relative(project,file).replaceAll('\\','/'),text=fs.readFileSync(file,'utf8');
 if(/\/original[^/]*\.js$/.test(rel))continue;
 if(/from\s+["']herdr["']/.test(text))assert.equal(rel,'src/integration/herdr/host.js',`Direct Herdr import outside facade: ${rel}`);
 if(rel.startsWith('src/features/'))assert.doesNotMatch(text,/herdr-customizations\/|herdr-app\/customizations\/|custom-skin\//,`Runtime depends on source checkout: ${rel}`);
 if(rel==='src/integration/herdr/documents/tab-move-v1.cjs') {
  assert.equal([...text.matchAll(/rpc\(["']doc\.set["']/g)].length,1,'One reviewed CAS write boundary');
  assert.match(text,/rpc\('doc\.set', \{name: 'herdr-app', version: plan\.version, value: plan\.value\}\)/,'Only the validated move plan may be committed');
  assert.doesNotMatch(text,/["']doc\.(?:delete|remove)["']/);
 } else assert.doesNotMatch(text,/["']doc\.(?:set|delete|remove)["']/,`Core document writes are allowed only in the explicitly authorized tab-move adapter: ${rel}`);
}
// Plugins are self-contained: a plugin file imports only the plugin API (../api.js) and
// files in its own folder; the API reaches the app only through the host facade and
// Spaces' color state; features use plugins only through the registry (./plugins.js).
const importsOf=text=>[...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g)].map(m=>m[1]);
for(const id of plugins.ids)for(const file of walk(path.join(project,PLUGIN_SOURCE,id))) {
 const rel=path.relative(project,file).replaceAll('\\','/'),inside=path.posix.dirname(rel.slice(`${PLUGIN_SOURCE}/${id}/`.length));
 if(/\.test\.[cm]?js$/.test(rel))continue;
 if(rel.startsWith(`${PLUGIN_SOURCE}/${id}/mod/`)) {
  // A plugin-owned mod is an independent sandbox, using only declared local
  // dependencies and the injected host facade; never another plugin's code.
  const packageFile=plugins.modFiles.find(f=>f.source===rel);
  assert.ok(packageFile,`Unpackaged panel file: ${rel}`);
  for(const spec of importsOf(fs.readFileSync(file,'utf8')).filter(s=>s.startsWith('.'))) {
   const target=path.posix.normalize(path.posix.join(path.posix.dirname(packageFile.dest),spec));
   assert.ok(target.startsWith(path.posix.dirname(packageFile.dest).split('/').slice(0,2).join('/')+'/'),`Panel escapes its sandbox: ${rel}`);
   assert.ok(bundle.files[target],`Panel dependency was not packaged: ${rel} -> ${spec}`);
  }
  continue;
 }
 for(const spec of importsOf(fs.readFileSync(file,'utf8'))) {
  if(spec.startsWith('node:')||!spec.startsWith('.'))continue; // built-ins and gpui-kit/gpui-base only
  const target=path.posix.normalize(path.posix.join(inside,spec));
  assert.ok((target==='../api.js'||target==='../api.cjs')&&inside==='.'||target==='../'.repeat(inside.split('/').length)+'api.js'||!target.startsWith('..'),`Plugin ${id} reaches outside its folder: ${rel} -> ${spec}`);
 }
}
assert.deepEqual(importsOf(fs.readFileSync(path.join(project,PLUGIN_SOURCE,'api.js'),'utf8')).sort(),['../fleet-display.js','../host.js','../host.js','../space-color-state.js','./where.js','websocket'],'The plugin API exposes the host facade, guarded fleet persistence, space colors and native socket factory');
const fleetDisplay=fs.readFileSync(path.join(project,'src/shared/fleet-display.js'));
for(const mod of config.plugins.mods)assert.equal(digest(fs.readFileSync(path.join(output,`mods/${mod}/fleet-display.js`))),digest(fleetDisplay),'Every plugin uses the same canonical display guard');
for(const source of ['src/plugins/crew/fleet.js','src/shared/space-preferences.js'])assert.doesNotMatch(fs.readFileSync(path.join(project,source),'utf8'),/setShared\(\s*(?:DISPLAY_KEY|FLEET_DISPLAY_KEY|['"]custom\.fleet\.display)/,'Provider/preferences cannot bypass guarded display persistence');
for(const file of walk(path.join(project,'src')).filter(p=>/\.(?:js|mjs|cjs)$/.test(p))) {
 const rel=path.relative(project,file).replaceAll('\\','/');
 if(rel.startsWith(`${PLUGIN_SOURCE}/`))continue;
 for(const spec of importsOf(fs.readFileSync(file,'utf8')))assert.ok(!/^\.\/plugins\//.test(spec)&&(spec==='./plugin-pages.js'||!/plugin-[a-z0-9-]+\.js$/.test(spec)),`Feature reaches into a plugin's files instead of the registry: ${rel} -> ${spec}`);
}
for(const file of walk(path.join(project,'tools')).filter(p=>/\.(?:js|mjs|cjs)$/.test(p))) {
 const rel=path.relative(project,file).replaceAll('\\','/'),text=fs.readFileSync(file,'utf8');
 assert.doesNotMatch(text,/from\s+["']herdr["']/,`Temporary/developer mod bypasses facade: ${rel}`);
}
for(const action of Object.values(json(path.join(project,'package.json')).scripts))assert.doesNotMatch(action,/cargo|rustc|cmake|herdr-core.*(?:stop|restart)/i);
assert.equal(json(path.join(project,'package.json')).scripts['report:ownership'],'node tools/report-ownership.mjs');
assert.match(fs.readFileSync(path.join(project,'docs/ARCHITECTURE.md'),'utf8'),/Choose the least-coupled extension/);
assert.match(fs.readFileSync(path.join(project,'docs/DEVELOPMENT.md'),'utf8'),/Do not build, fork, replace, or patch/);
assert.equal(config.layout,'Custom');
for(const rel of ['mods/custom-new-menu/shell-replace.cjs','mods/custom-tabs/shell-handoff.js'])assert.ok(!bundle.files[rel],`Retired replacement worker must not deploy: ${rel}`);
console.log('PASS: documented ownership/decision model, single-source packaging, one Herdr facade including temporary mods, versioned compatibility profile, Custom identity, no source-dependent UI workers and no native build commands');
