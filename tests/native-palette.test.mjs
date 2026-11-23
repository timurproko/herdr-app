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
const auditStock=fs.readFileSync('tests/fixtures/native-stock/0.1.17/palette.js','utf8');
const widget='nativeWidget() { return div().id("native-extra").on_click(() => this.nativeExtra = true).child("Native action"); }\n decorateRow(node) { return h_flex().child(node).child(this.nativeWidget()); }\n ';
const withWidget=auditStock.replace('close() {',widget+'close() {');
const wrappedRow=withWidget.replace('.child(div().flex_1().min_w(0).child(this.title(t, r.e.title, r.hits, on)))','.child(this.decorateRow(div().flex_1().min_w(0).child(this.title(t, r.e.title, r.hits, on))))');assert.notEqual(wrappedRow,withWidget);
for(const [name,source]of [
 ['root sibling',withWidget.replace('.id("palette")','.child(this.nativeWidget()).id("palette")')],
 ['row wrapper',wrappedRow],
 ['root wrapper',withWidget.replace('return v_flex()','return this.decorateRow(v_flex())')],
 ['list wrapper',withWidget.replace('.children(fixed ? list : [v_flex().children(list)])','.children([...list, this.nativeWidget()])')],
]) {
 const h=await harness(source,paletteFiles());h.state.skin=false;const p=new h.View();p.init({},h.cx);
 const added=byId(p.render(),'native-extra');assert.ok(added,`${name}: native action exists`);added.events.on_click({},h.cx);assert.equal(p.nativeExtra,true);
 assert.throws(()=>transformPalette(source,'./custom-test'),/palette (?:root|render)/,`${name}: unsupported content must not disappear in Custom`);
}
const focus=auditStock.replace('this.input.focus();','this.input.on("focus",()=>this.nativeExtra=true); this.input.focus();');const nativeFocus=await harness(focus,paletteFiles()),focused=new nativeFocus.View();focused.init({},nativeFocus.cx);focused.input.events.focus();assert.equal(focused.nativeExtra,true);assert.throws(()=>transformPalette(focus,'./custom-test'),/native focus\/blur hooks/);
assert.throws(()=>transformPalette(auditStock.replace('init(_props, cx) {','init(_props, cx) { this.headingSync = null;'),'./custom-test'),/native state collides/);
assert.throws(()=>transformPalette(auditStock.replace('placeholder: "Type a command…"','placeholder: (this.nativeExtra = true, "Type a command…")'),'./custom-test'),/placeholder gained behavior/);
const computed=auditStock.replace(' : e.args);',' : (this.argumentEvaluations = (this.argumentEvaluations ?? 0) + 1, e.args));');assert.notEqual(computed,auditStock);
const h=await harness(transformPalette(computed,'./custom-test'),paletteFiles()),p=new h.View();p.init({},h.cx);
p.go({name:'app.settings',args:{},id:'settings'});assert.equal(p.argumentEvaluations,1,'Native dispatch arguments evaluate exactly once even with Custom routing');assert.equal(h.calls.at(-1)[0],'mod.open');
for(const [name,args]of [['app.settings',{section:'native-added'}],['tab.rename',{id:'native-tab'}],['space.rename',{id:'native-space'}]]) {p.go({name,args,id:name});assert.equal(h.calls.at(-1)[0],name,'Unknown explicit native arguments are not silently dropped');assert.equal(h.calls.at(-1)[1],args);}
console.log('PASS replacement audit: palette render wrappers refuse and native dispatch argument computation survives');
console.log('PASS actual 0.1.16/0.1.17 and future palette: native actions/themes/history/dispatch, Custom UI/routing and non-Custom behavior');
