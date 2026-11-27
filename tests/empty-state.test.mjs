// One shared visual component; no app, files outside source, or native changes.
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {rowHarness,words,nodes,rowGeometry,t} from './support/git-row.mjs';
function element(){const node={style:{},kids:[]};let proxy;return proxy=new Proxy(node,{get:(n,k)=>k in n?n[k]:k==='when'?(yes,fn)=>yes?fn(proxy):proxy:k==='child'?child=>{n.kids.push(child);return proxy;}:(...args)=>{n.style[k]=args;return proxy;}});}
const context={div:element,svg:path=>element().asset(path)};vm.runInNewContext(fs.readFileSync(new URL('../src/ui/ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nglobalThis.emptyState=emptyState;',context);
const theme={muted:'muted',dim:'dim',foreground:'foreground'};
for(const title of ['No results','No results.','No results...','No results. ']){
 const view=context.emptyState(theme,{id:'empty',title});assert.equal(view.style.id[0],'empty');assert.ok(view.style.justify_center);assert.ok(view.style.items_center);assert.equal(view.style.gap[0],8);assert.equal(view.kids.length,2);
 const [icon,label]=view.kids;assert.equal(icon.style.asset[0],'mods/custom-workspace-chrome/search.svg');assert.equal(icon.style.size[0],24);assert.equal(label.style.text_size[0],13);assert.ok(label.style.font_normal);assert.equal(label.style.font_medium,undefined);assert.equal(label.style.text_color[0],theme.muted);assert.equal(label.kids[0],'No results');
}
assert.equal(context.emptyState(theme,{title:'No folders.',icon:'folder.svg'}).kids[0].style.asset[0],'folder.svg');
for(const file of ['features/picker/main.js','features/worktree/main.js','features/agents/main.js','features/settings/main.js','features/settings/plugins-ui.js','features/settings/folder-browser.js','features/settings/terminals-ui.js','features/new-menu/shell-switch.js','plugins/usage/mod/main.js'])assert.match(fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),/emptyState\(t/,file+' reuses the shared component');
for(const file of ['plugins/files/mod/main.js','plugins/git/mod/main.js']){const source=fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');assert.doesNotMatch(source,/emptyState\(t/,'Right sidebar status never gains the centered search illustration');if(file.startsWith('plugins/files/'))assert.match(source,/panelMessage\(t/,'Files retains panel-kit text and loading bulb');}
// Git intentionally uses header-position feedback and a stationary breathing
// line/dot instead of the Files loading bulb. Exercise its actual builders.
const h=await rowHarness();
for(const zoom of [1,1.3])for(const error of [false,true]){
 const message=h.panel.bodyMessage(t,'feedback','Repository status',{error});
 assert.equal(words(message).join(' '),'Repository status');assert.equal(rowGeometry(message,390,zoom).get(message).height,28*zoom);
 assert.equal(message.attrs.px[0],8);assert.equal(message.attrs.text_color[0],error?t.ansi1:t.dim);assert.equal(nodes(message).some(n=>n.attrs.asset),false);
}
const loading=h.panel.loadingMessage(t,'loading'),line=h.panel.loadingLine(t);
assert.equal(words(loading).join(' '),'Loading');assert.equal(nodes(loading).some(n=>n.attrs.asset),false,'Cold Git loading uses a dot, not a bulb/spinner');
assert.equal(loading.kids[0].attrs.loop[0],'opacity');assert.equal(line.attrs.h[0],1);assert.equal(line.attrs.left[0],0);assert.equal(line.attrs.right[0],0);assert.deepEqual(line.kids[0].attrs.loop,loading.kids[0].attrs.loop,'Stationary line and dot share one breathing rhythm');
{const view=context.emptyState(theme,{title:'Loading…',icon:'refresh.svg',loading:true}),[icon]=view.kids;assert.equal(icon.style.size[0],20,'The loading glyph looks the size of the search glyph');assert.equal(icon.style.m[0],2,'It keeps the 24px footprint');assert.equal(icon.style.spin[0],1000,'It turns while loading');
 assert.equal(context.emptyState(theme,{title:'x'}).kids[0].style.spin,undefined,'Ordinary empty states never spin');}
console.log('PASS: reusable empty-state component, centered 24px icon/8px gap, muted regular 13px text, no trailing periods and shared list/panel consumers');
