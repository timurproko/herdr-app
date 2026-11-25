import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {choiceModules,element,svg,Popover,nodes,find,inlineGeometry,theme as t} from './support/choice-menu.mjs';
const current={email:'one@example.test',account:'one',organization:'org'};
const terminal={address:'t1',program:{key:'claude'},labels:{'custom.claude.at':String(Date.now()),'custom.claude.email':current.email,'custom.claude.account':current.account,'custom.claude.organization':current.organization,'custom.claude.session':'fixture-session','custom.claude.control':'1'}};
const host={terminals:()=>[terminal]};
const {ClaudeAccount,sessionAccount,choiceDropdown,EnrollmentPicker}=await loadMod({host,modules:{...choiceModules,'enrollment-picker.js':'src/plugins/git/mod/enrollment-picker.js'},
  entry:'export * from "./claude-account.js"; export * from "./choice-menu.js"; export * from "./enrollment-picker.js";'});
let rendering=false;
const render=fn=>{rendering=true;try{return fn();}finally{rendering=false;}};
const cx={focus_handle(){assert.equal(rendering,false,'Never create a focus handle inside render');return {};},notify(){assert.equal(rendering,false,'Never notify inside render');},stop_propagation(){}};
const account=new ClaudeAccount();account.init(cx);
const target={terminal:'t1',on:null};account.opening=sessionAccount(target);account.rows=[current,{email:'two@example.test',account:'two'}];account.index=0;account.opened=true;
const actual=render(()=>account.render(target,t,cx));
const trigger=actual.attrs.trigger[0],menu=actual.attrs.content[0].kids[0];
assert.equal(actual.attrs.anchor[0],'bottom_left');assert.equal(actual.attrs.overlay_closable[0],true);
assert.equal(actual.attrs.content[0].kids.at(-1).attrs.h[0],4);
assert.equal(trigger.attrs.gap[0],6);assert.equal(trigger.attrs.text_color[0],t.muted);assert.equal(trigger.attrs.px[0],6);assert.equal(trigger.attrs.ml[0],-6);assert.equal(trigger.attrs.mr[0],-6);
assert.equal(trigger.kids.at(-1).attrs.size[0],12);assert.match(trigger.kids.at(-1).attrs.asset[0],/chevron-up.svg$/);assert.equal(trigger.kids.at(-1).attrs.text_color,undefined,'Chevron inherits muted trigger colour');
assert.equal(trigger.mouse.left,undefined,'Native Popover receives left mouse-down');assert.equal(typeof trigger.mouse.right,'function');
for(const [key,value] of Object.entries({min_w:180,max_w:360,max_h:280,p:4,pt:5,pb:3,rounded:8,ml:-8,bg:t.popover,border_color:t.border}))assert.equal(menu.attrs[key][0],value,key);
assert.ok(menu.attrs.overflow_y_scroll);assert.ok(menu.attrs.shadow_md);
for(let i=0;i<2;i++){
 const row=find(menu,`status-claude-choice-${i}`);assert.equal(row.attrs.h[0],28);assert.equal(row.attrs.px[0],8);assert.equal(row.attrs.gap[0],8);assert.equal(row.attrs.rounded[0],6);
 assert.equal(row.kids.at(-1).attrs.size[0],14);assert.equal(row.kids.at(-1).kids.length,i?0:1);
 assert.equal(row.attrs.hover[0](element()).attrs.bg[0],t.hover);
}
assert.equal(find(menu,'status-claude-choice-0').attrs.bg[0],t.hover);
find(menu,'status-claude-choice-1').attrs.on_hover[0](true,cx);assert.equal(account.index,1);assert.equal(find(render(()=>account.render(target,t,cx)).attrs.content[0],'status-claude-choice-1').attrs.bg[0],t.hover);
// Helper output is the account output, not an independently recreated row or popup.
const focus=cx.focus_handle();
const other=render(()=>choiceDropdown(t,{id:'other',label:'Choose',content:['Choose'],open:true,focus,onOpen(){},onKeyDown(){},rows:[{id:'other-row',label:'Owner/repo',onClick(){}}]}));
for(const key of ['anchor','overlay_closable'])assert.deepEqual(other.attrs[key],actual.attrs[key]);
for(const key of ['min_w','max_w','max_h','p','pt','pb','rounded','ml','bg'])assert.deepEqual(other.attrs.content[0].kids[0].attrs[key],menu.attrs[key]);
assert.equal(nodes(other.attrs.content[0]).filter(n=>n.attrs.h?.[0]===28).length,1);
const snapshot={key:'scope',choices:['owner/repo','owner/second']},picker=new EnrollmentPicker({focus:cx.focus_handle(),current:()=>snapshot,onChoose(){}});
let footer=render(()=>picker.render(t,snapshot));find(footer,'git-enrollment-popup').attrs.on_open_change[0](true,cx);footer=render(()=>picker.render(t,snapshot));
const enrollment=find(footer,'git-enrollment-popup'),enrollmentTrigger=enrollment.attrs.trigger[0],enrollmentMenu=enrollment.attrs.content[0].kids[0];
for(const key of ['anchor','overlay_closable'])assert.deepEqual(enrollment.attrs[key],actual.attrs[key]);
for(const key of ['gap','text_color','px','ml','rounded'])assert.deepEqual(enrollmentTrigger.attrs[key],trigger.attrs[key]);
assert.equal(trigger.attrs.h[0],28,'Account pill height remains unchanged');assert.equal(enrollmentTrigger.attrs.h[0],20,'Enrollment uses the ordinary notice line height');
assert.deepEqual(enrollmentTrigger.kids.at(-1).attrs,trigger.kids.at(-1).attrs,'Both actual callers emit the identical chevron');assert.equal(enrollmentTrigger.mouse.left,undefined);
for(const key of ['min_w','max_w','max_h','p','pt','pb','rounded','ml','bg','border_color','shadow_md','overflow_y_scroll'])assert.deepEqual(enrollmentMenu.attrs[key],menu.attrs[key]);
for(let i=0;i<2;i++){
 const a=find(menu,`status-claude-choice-${i}`),b=find(enrollmentMenu,`git-enrollment-choice-${i}`);
 for(const key of ['h','px','gap','rounded'])assert.deepEqual(b.attrs[key],a.attrs[key]);
 assert.deepEqual(b.kids.at(-1).attrs,a.kids.at(-1).attrs,'Enrollment preserves the empty selected slot');
 assert.equal(b.attrs.hover[0](element()).attrs.bg[0],t.hover);
}
assert.equal(find(enrollmentMenu,'git-enrollment-choice-0').attrs.bg[0],t.hover);
find(enrollmentMenu,'git-enrollment-choice-1').attrs.on_hover[0](true,cx);assert.equal(find(render(()=>picker.render(t,snapshot)),'git-enrollment-choice-1').attrs.bg[0],t.hover);
// Compare against the actual ordinary-panel card, not a reconstructed reference.
const {Main}=await loadMod({mod:'custom-changes',host:{...host,props(){},settings:()=>({zoom:1}),theme:()=>t,closeOverlay(){},openOverlay(){},nextCommand(){}},modules:{...choiceModules,
 'gpui-kit':{View:class{},div:element,svg,PathBuilder:{}},'gpui-base':{Popover,Input:{},h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col()},
 'main.js':'src/plugins/git/mod/main.js','enrollment-picker.js':'src/plugins/git/mod/enrollment-picker.js','pulls.js':'src/plugins/git/mod/pulls.js','label-colors.js':'src/plugins/git/mod/label-colors.js',
 'location.js':{location:()=>({})},'plugins.js':{sidebarPanelEnabled:()=>true},'agent-links.js':{AgentLinks:class{}},'aggregate.js':{AggregatePulls:class{}},'webhooks.js':{GitWebhooks:class{}},'notices.js':{GitNotices:class{}},
 'pin-swap.js':{PinSwap:class{},PIN_SWAP_MS:320},'panel-pin.js':{panelPin:element},'sidebar-title.js':{sidebarTitle:element},'panel-state.js':{changePanel(){}},'settings-dialog.js':{openSettings(){}},'space-color-state.js':{currentSpaceColor:()=>null},
 'panel-kit.js':{headerTool:element,contextMenu:element,panelMessage:element}},entry:'export {default as Main} from "./main.js";'});
const ordinary=render(()=>new Main().liveCIInfo(t,'repository','owner/repo'));
const ordinaryCard=find(ordinary,'git-live-ci-owner/repo-info'),coordinatorCard=find(footer,'git-enrollment-info');
for(const key of ['px','py','gap','rounded','bg','w_full'])assert.deepEqual(coordinatorCard.attrs[key],ordinaryCard.attrs[key],`Card ${key}`);
assert.deepEqual(find(footer,'git-enrollment-icon').attrs.size,find(ordinary,'git-live-ci-owner/repo-icon').attrs.size);
const ordinaryTitle=find(ordinary,'git-live-ci-owner/repo-title');
const coordinatorTitle=enrollmentTrigger.kids[0];
assert.equal(coordinatorTitle.attrs.flex_wrap,undefined,'The compact message stays on one line');assert.ok(coordinatorTitle.attrs.whitespace_nowrap);
for(const zoom of [0.75,1,1.25,1.5,2]){
 const a=inlineGeometry(ordinary,zoom),b=inlineGeometry(footer,zoom),iconA=a.get(find(ordinary,'git-live-ci-owner/repo-icon')),iconB=b.get(find(footer,'git-enrollment-icon'));
 assert.equal(a.get(ordinaryCard).height,32*zoom,'Ordinary card retains its compact height');assert.equal(b.get(coordinatorCard).height,a.get(ordinaryCard).height,'Coordinator card matches ordinary height');
 assert.equal(b.get(footer).height,a.get(ordinary).height,'No outer wrapper adds height');assert.equal(iconB.height,iconA.height);
 const lineA=a.get(ordinaryTitle.kids[0]),lineB=b.get(coordinatorTitle.kids[0]);
 assert.equal(iconB.cy,iconA.cy);assert.equal(lineB.cy,lineA.cy,'Text vertical centre matches ordinary');
 for(const node of [coordinatorTitle.kids[0],coordinatorTitle.kids[1],enrollmentTrigger.kids.at(-1)])assert.equal(b.get(node).cy,iconB.cy,'Icon, text, Settings and chevron share one centre');
 assert.equal(lineB.x-iconB.x-iconB.width,lineA.x-iconA.x-iconA.width,'Icon-to-message gap matches ordinary');
 assert.equal(b.get(coordinatorTitle.kids[1]).x-(lineB.x+lineB.width),a.get(ordinaryTitle.kids[1]).x-(lineA.x+lineA.width),'Settings gap matches ordinary');
 const label=b.get(coordinatorTitle),chevron=b.get(enrollmentTrigger.kids.at(-1));assert.equal(chevron.x-label.x-label.width,6*zoom,'Only the trailing chevron is added');
}
console.log('PASS actual account/enrollment choice presentation, ordinary/coordinator card height and vertical centres at 75–200% zoom, unchanged account, upward native anchor and row states');
