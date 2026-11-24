import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {build} from '../tools/build.mjs';
import {framePatch,inspectFramePatch} from '../tools/runtime/frame-patch.mjs';
import {restoreStartupFrames} from '../tools/runtime/startup-frames.mjs';
import {paletteCommand} from '../src/integration/native-patches/palette/routing.js';
const {output}=build(),source='src/integration/native-patches/palette';
const provenance=JSON.parse(fs.readFileSync(`${source}/provenance.json`));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const put=(file,bytes)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
const temp=fs.mkdtempSync(path.resolve('.artifacts/palette-stock-'));
const snapshot=dir=>Object.fromEntries(fs.readdirSync(dir,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>{const file=path.join(e.parentPath,e.name);return [path.relative(dir,file),fs.readFileSync(file).toString('base64')];}));
const stock=name=>fs.readFileSync(`${source}/${name}`);
try {
 for(const record of provenance.originals){
  const raw=stock(record.file);assert.equal(sha(raw),record.sha256);assert.equal(raw.length,record.bytes);
  assert.deepEqual(fs.readFileSync(path.join(output,'frame-patches/palette',record.file)),raw);
  assert.match(raw.toString(),/from "herdr"/);assert.doesNotMatch(raw.toString(),/\.\/host\.js/);
  const home=path.join(temp,record.file),main=path.join(home,'frame/palette/main.js'),state=path.join(home,'.customizations/frame-palette.json');
  const options={binary:Buffer.concat([Buffer.from('synthetic executable\0'),raw])};
  put(main,raw);assert.deepEqual(restoreStartupFrames(home,output,options),{ok:true,frames:{}});
  framePatch('apply',home,output,'palette',options);
  const expected=['v0.1.17','v0.1.18'].includes(record.release)?`main-${record.release.slice(1)}.js`:'main.js';
  assert.equal(fs.readFileSync(main,'utf8'),fs.readFileSync(`${source}/${expected}`,'utf8'));
  assert.match(inspectFramePatch(home,output,'palette',options).main,new RegExp(expected.replaceAll('.','\\.')));
  assert.equal(restoreStartupFrames(home,output,options).ok,true);assert.match(framePatch('check',home,output,'palette',options),/match/);
  const before=snapshot(home),stamp=fs.statSync(state).mtimeMs;
  assert.match(framePatch('apply',home,output,'palette',options),/already current/);assert.deepEqual(snapshot(home),before);assert.equal(fs.statSync(state).mtimeMs,stamp);
  const unknown=restoreStartupFrames(home,output,{binary:Buffer.from('unknown future binary')});assert.equal(unknown.ok,true);assert.equal(unknown.frames.palette.status,'skipped');assert.deepEqual(snapshot(home),before);
  const ambiguous=restoreStartupFrames(home,output,{binary:Buffer.concat([stock('original.js'),stock('original-0.1.17.js')])});assert.equal(ambiguous.frames.palette.status,'skipped');assert.deepEqual(snapshot(home),before);
  framePatch('restore',home,output,'palette',options);assert.deepEqual(fs.readFileSync(main),raw,'Restore never downgrades stock or normalizes bytes');
 }
 // Native reset AND an old owned entrypoint masking the release update.
 for(const version of ['0.1.17','0.1.18'])for(const reset of [false,true]){
  const home=path.join(temp,`upgrade-${version}-${reset}`),main=path.join(home,'frame/palette/main.js'),state=path.join(home,'.customizations/frame-palette.json');
  const old=stock(version==='0.1.18'?'original-0.1.17-windows.js':'original-windows.js'),updated=stock(`original-${version}-windows.js`),options={binary:updated};
  put(main,old);framePatch('apply',home,output,'palette',{binary:old});
  if(reset)put(main,updated);else assert.throws(()=>framePatch('check',home,output,'palette',options),/inactive/,'Old owned payload is not certified for the new original');
  assert.equal(restoreStartupFrames(home,output,options).ok,true);
  assert.equal(fs.readFileSync(main,'utf8'),fs.readFileSync(`${source}/main-${version}.js`,'utf8'));
  const record=JSON.parse(fs.readFileSync(state));assert.equal(record.original['main.js'],updated.toString());assert.ok(record.previousOriginals.includes(old.toString()),'Earlier raw backup retained');
  put(main,'// unknown future stock');const before=snapshot(home);const result=restoreStartupFrames(home,output,options);assert.equal(result.ok,true);assert.equal(result.frames.palette.status,'skipped');assert.match(result.frames.palette.advisory,/unknown target/);assert.deepEqual(snapshot(home),before);
  put(main,fs.readFileSync(`${source}/main-${version}.js`));
  const goodState=fs.readFileSync(state);record.previousOriginals={bad:true};put(state,JSON.stringify(record));assert.throws(()=>inspectFramePatch(home,output,'palette',options),/Unrecognized/);put(state,goodState);
  const helper=path.join(home,'frame/palette/custom-ui.js'),goodHelper=fs.readFileSync(helper);put(helper,'personal');assert.equal(restoreStartupFrames(home,output,options).ok,false);put(helper,goodHelper);
  framePatch('restore',home,output,'palette',options);assert.deepEqual(fs.readFileSync(main),updated);
 }
 // Actual native and Custom catalogs, not a restated theme-filter implementation.
 let dark=true,layout='Custom',skin=true;
 const calls=[],storage=new Map();
 const available=[{name:'aurora-night',light:false},{name:'paper-day',light:true},{name:'Custom',light:false},{name:'main',light:false},{name:'terminals',light:true}];
 const names=['app.theme','app.settings','tab.rename','space.rename','tab.close','pane.close','space.close','layout.clone','mod.clone','fixture.new_action'];
 const host={commands:()=>names.map(name=>({name,args:[],about:'fixture'})),layouts:()=>['main','Custom','terminals'],themes:()=>available,settings:()=>({dark}),shared:()=>layout,window:()=>({platform:'windows'}),keys:()=>[],props:()=>({overlay:'fixture'}),run:(...args)=>calls.push(args),closeOverlay(){},openOverlay(){}};
 async function load(file){
  const context=vm.createContext({console,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
  const text=fs.readFileSync(`${source}/${file}`,'utf8');
  const module=new vm.SourceTextModule(text+'\nexport { entries };',{context});
  const imports=new Map([...text.matchAll(/import \{([^}]+)\} from "([^"]+)"/g)].map(m=>[m[2],m[1].split(',').map(n=>n.trim().split(/\s+as\s+/)[0])]));
  await module.link(name=>{
   const values=Object.fromEntries(imports.get(name).map(key=>[key,()=>{}]));
   if(name==='herdr'||name==='./host.js')Object.assign(values,host);
   if(name==='gpui-kit')values.View=class{};
   if(name==='./custom-look.js')values.isCustom=()=>skin;
   if(name==='./custom-routing.js')values.paletteCommand=paletteCommand;
   return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context});
  });await module.evaluate();return module.namespace;
 }
 const native=await load('original-0.1.17.js'),custom=await load('main-0.1.17.js'),legacy=await load('main.js');
 const themes=ns=>JSON.parse(JSON.stringify(ns.entries().filter(e=>e.name==='app.theme')));
 for(const mode of [false,true])for(const active of ['Custom','main','terminals']){
  dark=mode;layout=active;
  assert.deepEqual(themes(custom),themes(native),'Native dynamic choices, IDs and arguments preserved exactly');
 }
 dark=true;layout='Custom';assert.deepEqual(themes(custom).map(e=>e.args.name),['aurora-night','Custom']);
 dark=false;assert.deepEqual(themes(custom).map(e=>e.args.name),['paper-day']);
 layout='terminals';assert.deepEqual(themes(custom).map(e=>e.args.name),['paper-day','terminals']);
 assert.deepEqual(themes(legacy).map(e=>e.args.name),['graphite','ink','moss','atom-one-dark']);
 for(const ns of [custom,legacy]){
  skin=true;assert.ok(ns.entries().some(e=>e.title==='Usage'));assert.ok(ns.entries().some(e=>e.name==='fixture.new_action'));
  const palette=new ns.default();palette.recent=[];
  for(const [name,expected]of [['app.settings','mod.open'],['tab.rename','custom-tabs.rename-tab'],['space.rename','custom-tabs.rename-space'],['tab.close','custom-tabs.close-tab'],['pane.close','custom-tabs.close-pane'],['space.close','custom-tabs.close-space']]){palette.go({name,args:{},id:name});assert.equal(calls.at(-1)[0],expected);}
  for(const name of ['picker','settings','machine-add','worktree']){palette.go({name:'mod.open',args:{name},id:name});assert.equal(calls.at(-1)[1].name,`custom-${name}`);}
  const e=themes(custom)[0];palette.go(e);assert.equal(calls.at(-1)[0],'app.theme');assert.equal(calls.at(-1)[1].name,e.args.name);
  skin=false;assert.ok(!ns.entries().some(e=>e.title==='Usage'));palette.go({name:'tab.close',args:{},id:'tab.close'});assert.equal(calls.at(-1)[0],'tab.close');
 }
 console.log('PASS real palette stock: raw provenance/build, 0.1.13/16/17/18 selection, masked/reset upgrades, backups, safe skips/conflicts, actual native dynamic themes/dispatch and Custom routes');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
