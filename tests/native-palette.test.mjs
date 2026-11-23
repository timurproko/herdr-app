import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transformPalette } from '../tools/runtime/native-transform.mjs';
import { tree, method, text } from '../tools/runtime/native-ast.mjs';
import { harness,paletteFiles,byId,words } from './native-harness.mjs';
for(const version of ['0.1.16','0.1.17','future']) {
  let stock=fs.readFileSync(`tests/fixtures/native-stock/${version==='future'?'0.1.17':version}/palette.js`,'utf8');
  if(version==='future')stock=stock.replace('const NAMED = [','const NAMED = [\n ["app.future", {}, "App", "Future native action", "new"],').replace('if (e.name === "mod.clone")','if (e.name === "app.future") { run("app.future", { native: true }); } else if (e.name === "mod.clone")');
  const source=transformPalette(stock,'./custom-test');
  const originalTree=tree(stock),patchedTree=tree(source),view=a=>a.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
  for(const name of ['rows','title'])assert.equal(text(stock,method(view(originalTree),name).body),text(source,method(view(patchedTree),name).body),'native search/title unchanged');
  const h=await harness(source,paletteFiles());
  h.state.commands=['tab.new','app.settings','tab.rename','space.rename','tab.close','pane.close','space.close','app.theme','mod.open','mod.clone','layout.clone','app.future','app.additional'].map(name=>({name,args:[],about:'new action'}));
  h.state.themes=[{name:'dark',light:false},{name:'light',light:true},{name:'main',light:false},{name:'Custom',light:false}];
  const p=new h.View();p.init({},h.cx);
  const entries=p.rows().map(r=>r.e);assert.ok(entries.some(e=>e.title==='Usage'));assert.ok(entries.some(e=>e.name==='app.additional'));
  if(version!=='0.1.16'){assert.deepEqual(Array.from(entries.filter(e=>e.name==='app.theme'),e=>e.args.name).sort(),['Custom','dark']);h.state.dark=false;assert.deepEqual(Array.from(p.rows().filter(r=>r.e.name==='app.theme'),r=>r.e.args.name),['light']);h.state.dark=true;}
  assert.equal(p.input.options.placeholder,'Search for a command…');
  let rendered=p.render();assert.ok(byId(rendered,'palette-search-header'));assert.ok(byId(rendered,'palette-pinned-heading'));assert.ok(byId(rendered,'palette-native-rows'));
  p.query='Settings';p.input.set_value('Settings');p.input.events.change({},h.cx);assert.equal(p.at,0);rendered=p.render();assert.match(words(byId(rendered,'palette-pinned-heading')),/item/);
  p.query='zzzznotfound';assert.ok(byId(p.render(),'palette-empty'));p.query='';
  for(const [name,want]of [['app.settings','mod.open'],['tab.rename','custom-tabs.rename-tab'],['space.rename','custom-tabs.rename-space'],['tab.close','custom-tabs.close-tab'],['pane.close','custom-tabs.close-pane'],['space.close','custom-tabs.close-space']]){p.go({name,args:{},id:name});assert.equal(h.calls.at(-1)[0],want);}
  p.go({name:'mod.open',args:{name:'picker',extra:1},id:'picker'});assert.equal(h.calls.at(-1)[1].name,'custom-picker');assert.equal(h.calls.at(-1)[1].extra,1);
  p.go({name:'tab.close',args:{id:'pc2/tab'},id:'target'});assert.equal(h.calls.at(-1)[0],'tab.close');assert.equal(h.calls.at(-1)[1].id,'pc2/tab');
  p.go({name:'mod.clone',args:{},id:'clone'});assert.equal(h.overlays.at(-1).props.command.name,'mod.clone');
  p.go({name:'layout.clone',args:{},id:'layout'});assert.equal(h.calls.at(-1)[1].name,'Custom');
  if(version==='future'){p.go(entries.find(e=>e.name==='app.future'));assert.equal(h.calls.at(-1)[1].native,true);}
  h.shared['custom.plugins']={usage:{enabled:false}};assert.ok(!p.rows().some(r=>r.e.title==='Usage'));
  assert.ok(h.timers.find(t=>t.ms===32).cancelled);
  h.state.skin=false;const native=new h.View();native.init({},h.cx);assert.equal(native.input.options.placeholder,'Type a command…');native.go({name:'tab.close',args:{},id:'close'});assert.equal(h.calls.at(-1)[0],'tab.close');assert.ok(!byId(native.render(),'palette-search-header'));
  for(const changed of [stock.replace('go(e) {','activate(e) {'),stock.replace('function entries()', 'function entriesBROKEN()')])assert.throws(()=>transformPalette(changed,'./custom-test'),/anchor/);
  assert.throws(()=>transformPalette(stock.replace('return v_flex()','return v_flex().on_click(() => run("app.future", {}))'),'./custom-test'),/native row action/);
  assert.throws(()=>transformPalette(stock.replace('k === "pagedown"','k === "home"'),'./custom-test'),/keyboard actions/);
  // Formatting and local binding renames are not review/byte gates.
  transformPalette('\ufeff'+stock.replaceAll('\n','\r\n').replaceAll('keyParts','splitBinding'),'./custom-test');
}
console.log('PASS actual 0.1.16/0.1.17 and future palette: native actions/themes/history/dispatch, Custom UI/routing and non-Custom behavior');
