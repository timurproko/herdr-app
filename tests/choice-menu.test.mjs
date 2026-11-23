import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {choiceModules,element,nodes,find,theme as t} from './support/choice-menu.mjs';
const current={email:'one@example.test',account:'one',organization:'org'};
const terminal={address:'t1',program:{key:'claude'},labels:{'custom.claude.at':String(Date.now()),'custom.claude.email':current.email,'custom.claude.account':current.account,'custom.claude.organization':current.organization,'custom.claude.session':'fixture-session','custom.claude.control':'1'}};
const host={terminals:()=>[terminal]};
const {ClaudeAccount,sessionAccount,choiceDropdown}=await loadMod({host,modules:choiceModules,
  entry:'export * from "./claude-account.js"; export * from "./choice-menu.js";'});
const cx={focus_handle:()=>({}),notify(){},stop_propagation(){}};
const account=new ClaudeAccount();account.init(cx);
const target={terminal:'t1',on:null};account.opening=sessionAccount(target);account.rows=[current,{email:'two@example.test',account:'two'}];account.index=0;account.opened=true;
const actual=account.render(target,t,cx);
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
find(menu,'status-claude-choice-1').attrs.on_hover[0](true,cx);assert.equal(account.index,1);assert.equal(find(account.render(target,t,cx).attrs.content[0],'status-claude-choice-1').attrs.bg[0],t.hover);
// Helper output is the account output, not an independently recreated row or popup.
const other=choiceDropdown(t,{id:'other',label:'Choose',content:['Choose'],open:true,focus:cx.focus_handle(),onOpen(){},onKeyDown(){},rows:[{id:'other-row',label:'Owner/repo',onClick(){}}]});
for(const key of ['anchor','overlay_closable'])assert.deepEqual(other.attrs[key],actual.attrs[key]);
for(const key of ['min_w','max_w','max_h','p','pt','pb','rounded','ml','bg'])assert.deepEqual(other.attrs.content[0].kids[0].attrs[key],menu.attrs[key]);
assert.equal(nodes(other.attrs.content[0]).filter(n=>n.attrs.h?.[0]===28).length,1);
console.log('PASS actual account/shared choice presentation, inherited 12px chevron, upward native anchor, row states and selected slots');
