// Shared modal geometry only. No live window, terminal input or application commands.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
function element(){const style={};let el;el=new Proxy({style},{get(o,k){if(k in o)return o[k];return(...args)=>{style[k]=args;return el;};}});return el;}
const context={div:element};
const source=fs.readFileSync(new URL('lib/ui.js',root),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
vm.runInNewContext(source+'\nglobalThis.api={U,DIALOG_SCROLL,dialogScrollFrame,dialogScrollArea,dialogScrollbar,dialogScrollRow,dialogScrollBody};',context);
const {U,DIALOG_SCROLL:S,dialogScrollFrame:frame,dialogScrollArea:area,dialogScrollbar:bar,dialogScrollRow:row,dialogScrollBody:body}=context.api;
assert.equal(S.inset,8);assert.equal(S.rightInset,0);assert.equal(S.gutter,8);assert.ok(Object.isFrozen(S));
for(const parentInset of [0,16,24]){
  const view=frame(element(),{parentInset});assert.equal(view.style.ml[0]+parentInset,8,'Parent padding must not double the left inset');assert.equal(view.style.mr[0]+parentInset,0,'No extra gap between the scrollbar lane and the right edge');assert.equal(view.style.my[0],8);
  assert.ok(view.style.relative);assert.ok(view.style.overflow_hidden);assert.equal(view.style.p,undefined);
  const scroll=area(element(),{parentInset});assert.equal(scroll.style.ml[0]+parentInset,8);assert.equal(scroll.style.mr[0]+parentInset,0);assert.equal(scroll.style.my[0],8);assert.ok(scroll.style.overflow_y_scrollbar);assert.equal(scroll.style.mode[0],'scrolling');
}
const rail=bar(element());assert.equal(rail.style.mode[0],'scrolling');assert.ok(rail.style.absolute);assert.ok(rail.style.inset_0);
assert.equal(rail.style.mx,undefined,'Rail fills the already-inset viewport, with no second margin');assert.equal(rail.style.my,undefined);
assert.equal(bar(element(),{mode:'always'}).style.mode[0],'always','Visibility policy need not change to share spacing');
const content=body(element()),item=row(element());assert.equal(item.style.mr[0],8);assert.equal(content.style.pl[0],8);assert.equal(content.style.pr[0],16);assert.equal(content.style.py[0],8);
assert.equal(S.rightInset+item.style.mr[0]+8,S.rightInset+content.style.pr[0],'List text and form content share the same trailing clearance');
const mods=new URL('mods/',root);
for(const name of fs.readdirSync(mods)){
  const metadata=new URL(name+'/mod.json',mods);if(!fs.existsSync(metadata))continue;
  if(JSON.parse(fs.readFileSync(metadata,'utf8')).overlay?.kind!=='dialog')continue;
  const code=fs.readFileSync(new URL(name+'/main.js',mods),'utf8');assert.match(code,/dialogScroll(?:Frame|Area)\(/,name+' must use the shared modal scroll contract');
}
for(const name of ['palette','feedback'])assert.match(fs.readFileSync(new URL('frame-patches/'+name+'/'+name+'-ui.js',root),'utf8'),/dialogScroll(?:Frame|Area)\(/,name+' must use the same contract');
const picker=JSON.parse(fs.readFileSync(new URL('mods/custom-picker/mod.json',root),'utf8'));
assert.equal(picker.overlay.height,48+U.field+2*U.gutter+1+320+2*S.inset+2,'Jump reserves its complete symmetric geometry before first paint');
console.log('PASS: right-edge modal scrollbar lanes, preserved 8px content gutters/vertical insets, nested-padding compensation, unchanged visibility policies and every skin dialog covered.');
