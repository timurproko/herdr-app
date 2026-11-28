import assert from 'node:assert/strict';
import {formsHarness, find, words} from './support/plugin-forms.mjs';
for (const code of ['STORE_MALFORMED','STORE_PERMISSIONS','STORE_PERMISSION_CHECK','STORE_IN_CHECKOUT','STORE_UNSAFE_PATH','STORE_BUSY','STORE_IO','PUBLIC_STATE_INVALID','INTERNAL']) {
  const h = await formsHarness({checking:()=>false, appHome:()=>'/fake', exec:async(_p,args)=>args.includes('--discovery-all')?{code:0,stdout:JSON.stringify({ok:true,data:{pending:[]}})}:({code:3,stdout:JSON.stringify({version:1,ok:false,error:{code,message:'HOSTILE_FAKE_SECRET'}})})});
  const plugin=h.registry.pluginById('trello');h.registry.setPluginEnabled(plugin,true);
  h.ui.initPlugins(h.view,h.cx,'trello');h.view.pluginOpen['trello-requirements']=true;h.view.pluginOpen['trello-boards']=true;
  h.ui.reloadPlugins(h.view,h.cx,'trello');await h.flush();
  const setup=h.view.pluginChecks.trello.items.find(i=>i.id==='local-setup'),boards=h.view.pluginChecks.trello.items.find(i=>i.id==='boards');
  assert.equal(setup.status,'error');assert.equal(setup.configured,null);assert.equal(boards.detail,setup.detail);
  assert.ok(!find(h.render(),'st-plugin-form-trello-local-setup-save'));assert.ok(!find(h.render(),'st-plugin-list-trello-boards-add'));
  assert.ok(!words(h.render()).join(' ').includes('HOSTILE_FAKE_SECRET'));
  assert.ok(!words(h.render()).join(' ').includes('Save credentials above'));
}
console.log('PASS: blocked storage/tooling status is not missing setup, no dangling Save or lost board diagnostic');
