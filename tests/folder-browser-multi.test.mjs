import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {realUi} from './support/panel-kit.mjs';
// The settings folder browser with `multi`: a checkbox per folder, ticks kept while browsing,
// and the chosen list handed to onPick. Listing is answered by a fake `exec`.
function element(){const n={attrs:{},kids:[]};let p;return p=new Proxy(n,{get:(n,k)=>k in n?n[k]:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?c=>{n.kids.push(c);return p;}:k==='children'?c=>{n.kids.push(...c);return p;}:(...a)=>{n.attrs[k]=a;return p;}});}
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean)??(n?.attrs?.content?.[0]?find(n.attrs.content[0],id):undefined);
const same=(a,b,m)=>assert.equal(JSON.stringify(a),JSON.stringify(b),m); // values cross the vm realm
const words=n=>typeof n==='string'?[n]:(n?.kids??[]).flatMap(words);
const tree={'':{path:'',parent:null,dirs:['C:\\','D:\\']},'D:\\':{path:'D:\\',parent:'',dirs:['Git','Work']},'D:\\Git':{path:'D:\\Git',parent:'D:\\',dirs:['crew','a1']},'D:\\Work':{path:'D:\\Work',parent:'D:\\',dirs:['site']}};
const asked=[];
let viewport=null;
const host={settings:()=>({zoom:1}),machines:()=>[{name:null},{name:'pc2'}],exec:async(_cmd,args,options)=>{const path=/ '((?:[^']|'')*)'$/.exec(args.at(-1))[1];asked.push([options.on,path]);return {code:0,stdout:JSON.stringify(tree[path]),stderr:''};}};
const {fb}=await loadMod({host,modules:{'folder-browser.js':'src/features/settings/folder-browser.js','settings-kit.js':'src/ui/settings-kit.js','gpui-kit':{div:element,svg:element},
  'gpui-base':{h_flex:element,v_flex:element,Popover:{new:id=>element().id(id)}},
  'ui.js':{menuRow:realUi(element).menuRow,collapsible:realUi(element).collapsible,settingsRow:realUi(element).settingsRow,SETTINGS_ROW:32,chevron:element,dropdown:(id,trigger)=>element().id(id).child(trigger),dropdownPlacement:(bounds,height,viewportHeight)=>{const below=viewportHeight-bounds.y-bounds.height-12,up=below<height&&bounds.y-12>below;return {above:up,height:Math.max(72,Math.min(height,up?bounds.y-12:below))};},U:{row:28,field:32,meta:12,radius:6,gutter:12,rowGap:2,smallIcon:14},menuSurface:(_t,e)=>e,description:(_t,x)=>element().child(x),spinner:()=>element(),control:(_t,x=element())=>x,itemHover(){},emptyState:(_t,{id})=>element().id(id),
    button:(_t,id,label,click,options={})=>element().id(id).child(label).on_click(click).disabled(options.enabled===false)}},
  entry:"export * as fb from './folder-browser.js';"});
const jobs=[],cx={notify(){},spawn:fn=>jobs.push(fn)},settle=async()=>{while(jobs.length)await jobs.shift()(cx);};
const view={},picked=[];
const kept=['D:\\Work\\old'];
const draw=(multi={existing:kept,label:(adds,removes)=>'+'+adds+' -'+removes})=>fb.folderBrowser(view,{}, {id:'fb',key:'k',trigger:element().id('fb-trigger'),focus:null,onOpen(){},onPick:value=>picked.push(value),multi});
const click=id=>find(draw(),id).attrs.on_click[0]({},cx);

fb.openBrowser(view,cx,'k','pc2',null,{from:'',selected:kept});
{const opening=draw();assert.ok(words(find(opening,'fb-loading')).includes('Loading'),'Loading shows bottom left while the first listing loads');assert.equal(find(opening,'fb-count'),undefined,'in place of the count');assert.ok(words(find(opening,'fb-panel')).includes('Drives on pc2'),'The header already says where it is');assert.ok(!words(find(opening,'fb-panel')).includes('Loading…'));}
await settle();assert.equal(find(draw(),'fb-loading'),undefined);
same(asked.splice(0),[['pc2','']],'Opens on that machine’s drives');
same(view.folderBrowser.selected,kept,'What is already added starts ticked');
assert.equal(find(draw(),'fb-d0-check'),undefined,'Drives are opened, not ticked');
assert.equal(find(draw(),'fb-choose').attrs.disabled[0],true,'Nothing to choose on the list of drives');
click('fb-d1');await settle();click('fb-d0');await settle();
assert.equal(view.folderBrowser.path,'D:\\Git');
assert.ok(find(draw(),'fb-d0-check')&&find(draw(),'fb-d1-check'),'Every folder has a checkbox beside its name');
// The host knows this role as check_box; any other spelling makes the picker fail to draw.
assert.equal(find(draw(),'fb-d0-check').attrs.role[0],'check_box');
// Folders are chosen only by ticking: with nothing changed there is nothing to apply.
same([words(find(draw(),'fb-choose')),find(draw(),'fb-choose').attrs.disabled[0]],[['+0 -0'],true]);
// Tick two here, browse elsewhere, tick one more: all three are kept.
click('fb-d0-check');click('fb-d1-check');
same(view.folderBrowser.selected,['D:\\Work\\old','D:\\Git\\crew','D:\\Git\\a1']);
click('fb-up');await settle();click('fb-d1');await settle();click('fb-d0-check');
same(words(find(draw(),'fb-count')),['3 selected'],'The count is what this visit ticks, not the folders already added');
same(words(find(draw(),'fb-choose')),['+3 -0']);
// Unticking, and a name that still opens its folder.
click('fb-up');await settle();click('fb-d0');await settle();click('fb-d1-check');
same(view.folderBrowser.selected,['D:\\Work\\old','D:\\Git\\crew','D:\\Work\\site'],'A second click unticks');
// Unticking something already added asks for its removal.
fb.toggleSelected(view.folderBrowser,'d:/work/OLD/');
same(words(find(draw(),'fb-choose')),['+2 -1'],'Paths are compared the way Windows compares them');
same(words(find(draw(),'fb-count')),['2 selected · 1 to remove'],'Unticking an added folder counts as a removal');
click('fb-choose');same(picked.splice(0),[{add:['D:\\Git\\crew','D:\\Work\\site'],remove:['D:\\Work\\old']}],'New ticks and removed ones are handed over together');
// Ticks belong to their machine.
click('fb-m-local');await settle();
same([view.folderBrowser.machine,view.folderBrowser.selected],[null,[]]);
// A caller with its own machine dropdown leaves the machine tabs out.
assert.ok(find(draw(),'fb-header')&&find(draw(),'fb-m-pc2'),'The machine tabs are there by default');
{
  const bare=fb.folderBrowser(view,{}, {id:'fb',key:'k',trigger:element().id('fb-trigger'),focus:null,onOpen(){},onPick(){},multi:{},machineSwitch:false});
  assert.equal(find(bare,'fb-header'),undefined);assert.equal(find(bare,'fb-m-pc2'),undefined);
  assert.ok(find(bare,'fb-list')&&find(bare,'fb-choose'),'The rest of the browser is unchanged');
}
// Without `multi` the browser is as before: no checkboxes, one path.
click('fb-d1');await settle();
assert.equal(find(draw(null),'fb-d0-check'),undefined);find(draw(null),'fb-choose').attrs.on_click[0]({},cx);same(picked.splice(0),['D:\\']);
// It opens like a dropdown menu: narrower, right edges aligned, below its button or above it
// when the button is low in the window.
{
  const anchor=()=>draw().attrs.anchor[0],panel=()=>find(draw(),'fb-panel'),list=()=>find(draw(),'fb-list');
  same([anchor(),panel().attrs.w[0],list().attrs.h[0]],['top_right',320,240],'No window to measure: below, full height');
  const realm=fb.openBrowser.constructor('return globalThis')(); // the mod's own global, where it reads the window
  realm.window={viewport_size:()=>({height:viewport})};
  const trigger=draw().attrs.trigger[0];
  viewport=900;trigger.attrs.on_mouse_down[1]({bounds:{y:100,height:24}});fb.openBrowser(view,cx,'k',null,null,{from:''});await settle();
  same([anchor(),list().attrs.h[0]],['top_right',240],'Room below: opens under the button');
  trigger.attrs.on_mouse_move[0]({bounds:{y:700,height:24}});fb.openBrowser(view,cx,'k',null,null,{from:''});await settle();
  same([anchor(),list().attrs.h[0]],['bottom_right',240],'Button low in the window: opens above it');
  viewport=420;trigger.attrs.on_mouse_move[0]({bounds:{y:300,height:24}});fb.openBrowser(view,cx,'k',null,null,{from:''});await settle();
  same([anchor(),list().attrs.h[0]],['bottom_right',178],'Little room either way: the list shrinks to fit');
  delete realm.window;
}
console.log('PASS: folder browser multi-select: checkboxes per folder, ticks kept while browsing and cleared per machine, count and button label, list handed to onPick, single mode unchanged');
