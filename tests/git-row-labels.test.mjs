import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {withKitUi} from './support/panel-kit.mjs';
import {labelColors} from '../src/plugins/git/mod/label-colors.js';

// Independent oracle: Python colorsys HLS conversion with Primer's rounded inputs,
// cross-checked in Chrome against the upstream CSS for green, amber and purple.
// Columns: original hex, dark text, light text, light border (including alpha).
const colorCases=[
  ['#1a7f37','#2ed45d','#ffffff','#04150900'],
  ['#9a6700','#f6a400','#ffffff','#1a110000'],
  ['#840479','#fb72ef','#ffffff','#0a000900'],
  ['#ff0000','#ffc6c6','#ffffff','#80000000'],
  ['#0000ff','#ffffff','#ffffff','#00008000'],
  ['#000000','#999999','#ffffff','#00000000'],
  ['#010101','#989898','#ffffff','#00000000'],
  ['#ffffff','#ffffff','#000000','#bfbfbfff'],
  ['#fefefe','#ffffff','#000000','#bfbfbfff'],
  ['#ffff00','#ffff00','#000000','#7f800000'],
  ['#737373','#999999','#ffffff','#33333300'],
  ['#747474','#989898','#000000','#33333300'],
  ['#989898','#9a9a9a','#000000','#59595900'],
  ['#999999','#999999','#000000','#59595900'],
  ['#9a9a9a','#999999','#000000','#59595900'],
  ['#f4f4f4','#f5f5f5','#000000','#b5b5b500'],
  ['#f5f5f5','#f5f5f5','#000000','#b5b5b514'],
  ['#f6f6f6','#f5f5f5','#000000','#b5b5b578'],
];
function assertColor(actual,expected) {
  assert.match(actual,/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i);
  assert.equal(actual.length,expected.length);
  for(const at of [1,3,5])assert.ok(Math.abs(parseInt(actual.slice(at,at+2),16)-parseInt(expected.slice(at,at+2),16))<=1,`${actual} differs from independent expected ${expected}`);
  assert.equal(actual.slice(7),expected.slice(7),'Only RGB conversion may round by one; alpha is exact');
}
for(const [color,darkText,lightText,lightBorder] of colorCases)for(const dark of [true,false]) {
  const result=labelColors({background:dark?'#191d28':'#ffffff'},color);
  assert.equal(result.background,dark?`${color}2e`:color);
  assertColor(result.foreground,dark?darkText:lightText);
  assertColor(result.border,dark?`${darkText}4d`:lightBorder);
}
const neutral={raised:'#222222',foreground:'#eeeeee'};
for(const color of [undefined,null,'','#fff','#12345678','red;bad',{},123456]) {
  assert.deepEqual(labelColors(neutral,color),{background:neutral.raised,foreground:neutral.foreground,border:'#00000000'});
}
for(const background of [undefined,null,'bad','#7f7f7f'])assert.deepEqual(labelColors({background},'#840479'),labelColors({background:'#191d28'},'#840479'));
for(const background of ['#808080','#ffffff'])assert.deepEqual(labelColors({background},'#840479'),labelColors({background:'#ffffff'},'#840479'));
assert.deepEqual(labelColors({},'#1A7F37'),labelColors({},'#1a7f37'),'Uppercase hex stays valid');

function element() {
  const node={attrs:{},kids:[]};let proxy;
  return proxy=new Proxy(node,{get(target,key){
    if(key in target)return target[key];
    if(key==='then')return undefined;
    if(key==='when')return(yes,fn)=>yes?fn(proxy):proxy;
    if(key==='child')return child=>{node.kids.push(child);return proxy;};
    if(key==='children')return children=>{node.kids.push(...children);return proxy;};
    return(...args)=>{node.attrs[key]=args;return proxy;};
  }});
}
const all=node=>node&&typeof node==='object'?[node,...node.kids.flatMap(all)]:[];
const find=(node,id)=>all(node).find(n=>n.attrs.id?.[0]===id);
const text=node=>typeof node==='string'?node:(node?.kids??[]).map(text).join('');
const U={font:12,meta:11,icon:16,tinyIcon:12,gap:8,radius:6};
let zoom=1;
const host={props:()=>null,closeOverlay(){},openOverlay(){},nextCommand(){},settings:()=>({zoom}),theme:()=>({})};
const modules={
  'enrollment-picker.js':{EnrollmentPicker:class{}},
  'main.js':'src/plugins/git/mod/main.js','pulls.js':'src/plugins/git/mod/pulls.js',
  'label-colors.js':'src/plugins/git/mod/label-colors.js',
  'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},'gpui-base':{h_flex:element,v_flex:element},
  'ui.js':withKitUi({U,headerTools:e=>e,reveal:e=>e,subtleActionFill:()=>'',refreshButton:element},element),
  'aggregate.js':{AggregatePulls:class{}},'agent-links.js':{AgentLinks:class{}},'pin-swap.js':{PinSwap:class{},PIN_SWAP_MS:320},
  'webhooks.js':{GitWebhooks:class{}},'notices.js':{GitNotices:class{}},'location.js':{location:()=>({})},
  'panel-pin.js':{panelPin:element},'panel-state.js':{changePanel(){}},'sidebar-title.js':{sidebarTitle:element},
  'settings-dialog.js':{openSettings(){}},'plugins.js':{sidebarPanelEnabled:()=>true},
  'panel-kit.js':{headerTool:element,contextMenu:element,panelMessage:element},
};
const {Main,facts}=await loadMod({host,modules,mod:'custom-changes',entry:'export {default as Main} from "./main.js"; export * as facts from "./pulls.js";'});
const panel=new Main();panel.agentLinks={related:()=>null};
const t={background:'#191d28',foreground:'#eeeeee',muted:'#999999',dim:'#666666',raised:'#222222',ansi1:'red',ansi2:'green',ansi3:'yellow',ansi5:'purple'};
const labels=[{name:'🤖 Under review',color:'840479'},{name:'🚀 Ready · with a deliberately long label name',color:'ffffff'},
  ...colorCases.filter(([color])=>!['#840479','#ffffff'].includes(color)).map(([color])=>({name:`Hue ${color}`,color:color.slice(1)}))];
const source={number:17,title:'Shared row',url:'https://github.com/example/repo/pull/17',author:{login:'owner'},createdAt:'2026-11-20T10:00:00Z',body:'- [x] done',statusCheckRollup:[{name:'CI',conclusion:'SUCCESS',status:'COMPLETED'}],labels,reviewDecision:'APPROVED'};
for(t.background of ['#191d28','#ffffff','#191d28'])for(zoom of [0.75,1,1.25,1.3,1.5,2])for(const state of ['OPEN','CLOSED','MERGED'])for(const coordinator of [false,true])for(const ghost of [false,true]) {
  const pr=facts.pullRow({...source,state},'owner');if(coordinator)pr.key='example/repo#17';
  const prefix=ghost?'swap-':'',id=pr.key??17;
  const row=panel.pullRow(t,pr,ghost),meta=find(row,`${prefix}pr-meta-${id}`),byline=find(row,`${prefix}pr-byline-${id}`);
  assert.equal(find(row,`${prefix}pr-owner-${id}`),undefined);assert.ok(!text(row).includes('Owner'));
  assert.equal(text(byline),`#17${pr.login}${pr.when}`);assert.equal(byline.attrs.overflow_hidden.length,0);
  assert.deepEqual(meta.kids.filter(n=>n.attrs.id).map(n=>n.attrs.id[0]),[...['tasks','checks','review'].map(kind=>`${prefix}pr-${kind}-${id}`),`${prefix}pr-meta-${id}-right`]);
  const right=find(row,`${prefix}pr-meta-${id}-right`);
  assert.ok(right.attrs.flex_1 && right.attrs.justify_end);assert.equal(right.kids.length,1,'No dot before labels');
  assert.equal(meta.attrs.h[0],18);assert.equal(meta.attrs.min_w[0],0);assert.equal(meta.attrs.flex_wrap,undefined);assert.ok(meta.attrs.overflow_hidden);
  const strip=find(row,`${prefix}pr-labels-${id}`);assert.equal(strip.attrs.min_w[0],0);assert.equal(strip.attrs.h[0],18);assert.ok(strip.attrs.flex_none);assert.equal(strip.attrs.flex_grow,undefined);assert.ok(strip.attrs.overflow_hidden);
  assert.equal(strip.attrs.tooltip,undefined,'Unmeasured complete labels have no repeat-only group hover');
  assert.equal(meta.attrs.tooltip,undefined,'The metadata parent cannot repeat complete visible facts');
  for(const [index,label] of facts.stageLabels(pr).entries()) {
    const pill=find(row,label.stage?`${prefix}pr-stage-${id}`:`${prefix}pr-label-${id}-${index}`);
    if(label.stage){assert.equal(text(pill),'Review');assert.equal(pill.attrs.px[0],6);assert.equal(pill.attrs.bg[0],t.raised);assert.equal(pill.attrs.border_1,undefined);assert.equal(pill.attrs.tooltip,undefined);continue;}
    const [color,darkText,lightText,lightBorder]=colorCases.find(([color])=>color===(label.color.startsWith('#')?label.color:`#${label.color}`)),dark=t.background!=='#ffffff';
    assert.equal(text(pill),label.name);if(label.stage)assert.ok(pill.attrs.tooltip[0].includes('🤖 Under review'));else assert.equal(pill.attrs.tooltip,undefined);assert.equal(pill.attrs.bg[0],dark?`${color}2e`:color);
    assertColor(pill.attrs.text_color[0],dark?darkText:lightText);assertColor(pill.attrs.border_color[0],dark?`${darkText}4d`:lightBorder);
    assert.equal(pill.attrs.h[0],18);assert.ok(pill.attrs.border_1);assert.ok(pill.attrs.rounded_full);
    assert.equal(pill.attrs.px[0]+1,5,'Border plus padding retains the original content inset/width');
    assert.equal(pill.attrs.min_w[0],0);assert.ok(pill.attrs.max_w_full);assert.ok(pill.attrs.overflow_hidden);assert.ok(pill.kids[0].attrs.overflow_hidden);assert.equal(pill.kids[0].attrs.truncate,undefined,'Clipped pills never paint a lone ellipsis');
  }
  assert.equal(text(find(row,`${prefix}pr-review-${id}`)),'Approved');
  const separators=[...byline.kids.filter(n=>!n.attrs.id),...meta.kids.filter(n=>!n.attrs.id)];
  assert.equal(separators.length,4,'Two byline dots and two left-status dots; none before labels');
  for(const dot of separators) {
    assert.equal(dot.attrs.size[0],3);assert.equal(dot.attrs.bg[0],t.muted);assert.ok(dot.attrs.flex_none);assert.ok(dot.attrs.rounded_full);
    assert.equal(dot.kids.length,0,'A shape has no font-baseline-dependent glyph');
    assert.deepEqual(dot.attrs.relative,[],'Only separator paint moves');
    assert.deepEqual(dot.attrs.top,[1],'Each lower line uses its native-measured x-height offset');
    assert.deepEqual(Object.keys(dot.attrs).sort(),['size','flex_none','rounded_full','bg','relative','top'].sort(),'No margins, padding or size changes');
  }
  for(const line of [byline,meta]) {
    assert.ok(line.attrs.items_center);assert.equal(line.attrs.gap[0],6,'Equal left/right separator spacing');
    assert.equal(line.attrs.flex_wrap,undefined,'Separators cannot orphan onto wrapped lines');
  }
  // Compare with the too-high, line-box-centred separator: only dots move.
  const separator=panel.metaSeparator;
  panel.metaSeparator=()=>{const dot=separator.call(panel,t);delete dot.attrs.relative;delete dot.attrs.top;return dot;};
  const before=panel.pullRow(t,pr,ghost);
  panel.metaSeparator=separator;
  const geometry=node=>JSON.stringify(node,(key,value)=>typeof value==='function'?'callback':key==='kids'?value.filter(child=>!child?.attrs?.invisible):value);
  const normalized=JSON.parse(geometry(row));
  for(const dot of [...find(normalized,`${prefix}pr-byline-${id}`).kids.filter(n=>!n.attrs.id),...find(normalized,`${prefix}pr-meta-${id}`).kids.filter(n=>!n.attrs.id)]) {
    delete dot.attrs.relative;delete dot.attrs.top;
  }
  assert.equal(geometry(normalized),geometry(before),'Only separator paint position changes; row height and neighbours stay identical');
  assert.equal(Boolean(row.attrs.on_mouse_down),!ghost);assert.equal(Boolean(row.attrs.on_click),!ghost);
  assert.equal(Boolean(row.attrs.on_size_change),!ghost&&!coordinator,'Ordinary measured row callbacks survive');
}
for(const tasks of [false,true])for(const checks of [false,true])for(const assigned of [[],labels]) {
  const pr=facts.pullRow({...source,state:'OPEN',body:tasks?source.body:'',statusCheckRollup:checks?source.statusCheckRollup:[],labels:assigned,reviewDecision:''},'owner');
  const row=panel.pullRow(t,pr),meta=find(row,'pr-meta-17');
  const right=find(row,'pr-meta-17-right'),left=meta.kids.filter(n=>n!==right);
  const groups=[...left.filter(n=>n.attrs.id),...(right?[right.kids[0]]:[])];
  assert.deepEqual(groups.map(n=>n.attrs.id[0]),[...(tasks?['pr-tasks-17']:[]),...(checks?['pr-checks-17']:[]),...(assigned.length?['pr-labels-17']:[])]);
  assert.equal(left.length,Math.max(0,(Number(tasks)+Number(checks))*2-1),'Only present left groups and separators occupy left-run width');
  assert.equal(meta.attrs.h[0],18,'Label add/remove cannot change status height');
  assert.equal(meta.kids.filter(n=>!n.attrs.id).length,Number(tasks&&checks),'Only tasks/checks have a joining dot');
  for(let at=1;at<left.length;at+=2) {
    const dot=left[at];assert.equal(dot.attrs.size[0],3);assert.equal(dot.attrs.invisible,undefined);
    assert.ok(left[at+1].attrs.id);assert.ok(left[at-1].attrs.id);
  }
  assert.equal(Boolean(right),Boolean(assigned.length),'No right slot without assigned labels');
  if(right)assert.equal(right.kids.length,1,'Label group has no joining separator');
  for(const group of groups) {
    assert.ok(group.attrs.flex_none,'Natural groups never stretch across free space');
    assert.equal(group.attrs.flex_basis,undefined);assert.equal(group.attrs.w,undefined,'Cold full-wording layout has no guessed fixed budget');
  }
  if(!assigned.length)assert.equal(find(row,'pr-labels-17'),undefined,'No label placeholder');
}
const changes=panel.pullRow(t,facts.pullRow({...source,state:'OPEN',reviewDecision:'CHANGES_REQUESTED'},'owner'));
assert.equal(text(find(changes,'pr-review-17')),'Changes requested');
assert.equal(find(changes,'pr-review-17').attrs.text_color[0],t.ansi1);
const fallback=panel.labelPill(t,{name:'Untrusted colour',color:'red;bad'},'fallback');
assert.equal(fallback.attrs.bg[0],t.raised);assert.equal(fallback.attrs.text_color[0],t.foreground);
assert.equal(facts.pullRow({...source,author:null},'owner').byline.startsWith('opened '),true);
assert.equal(fallback.attrs.border_color[0],'#00000000');
console.log('PASS Primer dark/light label formula over 18 independent hue/extreme/threshold samples, palette transitions, native alpha and border inset; shared ordinary/coordinator Open/Closed/pinned-compatible/ghost rows, exact emoji names/tooltips, bounded height/truncation, unchanged order/actions/separators across zoom levels (render-tree constraints, not native pixel proof)');
