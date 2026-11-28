import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {prefs,resetTypes,resetChoiceGroups,resetSelectionKey} from '../src/plugins/usage/model.js';
const bridge=createRequire(import.meta.url)('../src/plugins/usage/mod/bridge.cjs');
assert.equal(prefs().automaticReset,false);assert.deepEqual(prefs().resetSelections,[]);
assert.equal(prefs({automaticReset:'true'}).automaticReset,false);
assert.deepEqual(prefs({resetSelections:['a','a',null,4]}).resetSelections,['a']);
const report=bridge.claudeReport({cedar_ember:{eligible:true,grants:[
 {id:'full',resets_left:1,clears:['five_hour','seven_day'],usable_now:true},
 {id:'model',label:'Fable',resets_left:1,clears:['seven_day_fable'],usable_now:true},
 {id:'unknown',label:'Fable',resets_left:1,clears:['five_hour'],gives_back_weekly:true,usable_now:true},
 {id:'unusable',resets_left:1,clears:['five_hour','seven_day'],usable_now:false},
]}});
const entry={id:'one',sourceId:'claude',account:{id:'account',organizationId:'org',email:'one@example.test'},report};
const types=resetTypes(entry);assert.equal(types.length,3);
assert.deepEqual(types[0].grants.map(g=>g.usable),[true,false]);
assert.deepEqual(types[1].grants[0].covers,['model:fable']);assert.deepEqual(types[2].grants[0].covers,[]);
assert.notEqual(resetSelectionKey(entry,'full'),resetSelectionKey({...entry,account:{...entry.account,organizationId:'other'}},'full'));
assert.notEqual(resetSelectionKey(entry,'full'),resetSelectionKey({...entry,account:{id:'other'}},'full'));
const codex=await bridge.codexResetList({},async()=>({status:200,body:{credits:[
 {id:'a',title:'Full reset',status:'available'},{id:'b',title:'Full reset',status:'available'},
 {id:'c',title:'Future reset',status:'available'},
]}}));
assert.equal(resetTypes({sourceId:'codex',account:{id:'codex'},report:{codexResets:codex}}).length,2);
assert.deepEqual(codex.groups[0].covers,['session','weekly']);assert.deepEqual(codex.groups[2].covers,[]);
assert.equal(resetChoiceGroups([entry])[0].groups[0].options.length,3);
assert.deepEqual(resetChoiceGroups([{...entry,report:{status:'error',lastSuccessful:report}}]),[]);
console.log('PASS: reset metadata, exact-account consent, unchecked defaults and grouped choices');
