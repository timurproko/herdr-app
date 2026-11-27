import assert from 'node:assert/strict';
import {formsHarness,find,words} from './support/plugin-forms.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const options=[['workflow','Delivery workflow'],['plain','Plain'],['gate','Gate']];
async function fixture(){
 let stored='workflow',path='D:/fixture',readFail=false,lastRows=[],operation=deferred();const requests=[];
 const plugin={id:'choice-life',name:'Fixture',version:'1',icon:'code',defaultEnabled:true,machineScoped:true,settings:[],prerequisites:[
 {id:'items',label:'Items',section:true,list:{scope:{header:true},picker:{kind:'items'},candidates:async()=>({items:[]}),remove:async()=>{},rowChoice:{label:'Mode',options,
 set:async(cx,row,value)=>{requests.push({cx,row,value});const result=await operation.promise;if(cx.isCurrent()&&result?.value)stored=result.value;return result;}}},
 check:async()=>readFail?{status:'error',usable:false,rows:lastRows,detail:'Read failed.'}:{status:'ready',usable:true,rows:lastRows=[{id:'same.name',label:path,choice:{value:stored,revision:JSON.stringify([path,stored])}}]}}]};
 const h=await formsHarness({},[plugin]),{view,cx,ui,render}=h;ui.initPlugins(view,cx,plugin.id);view.pluginOpen['choice-life-items']=true;ui.reloadPlugins(view,cx,plugin.id);await h.flush();
 const rid='st-plugin-list-choice-life-items-row-0',id=rid+'-choice';
 const choose=value=>{find(render(),id+'-popup').attrs.on_open_change[0](true,cx);find(render(),id+'-'+value).attrs.on_click[0]({},cx);};
 return {...h,plugin,rid,id,choose,requests,get operation(){return operation;},next(){operation=deferred();},set readFail(v){readFail=v;},set path(v){path=v;}};
}
{
 const h=await fixture();h.choose('plain');const run=h.jobs.shift()(h.cx);assert.equal(h.requests.length,1);
 assert.ok(words(h.render()).includes('Delivery workflow'),'No optimistic change while setter is pending');
 assert.equal(find(h.render(),h.id).attrs.disabled[0],true);
 const state=[...h.view.pluginRowChoices.values()][0];assert.equal(state.open,false);
 h.operation.resolve({value:'plain'});await run;
 assert.ok(words(h.render()).includes('Plain'),'Stored acknowledgement publishes before reread settles');
 assert.equal(h.view.pluginSettling['choice-life:items'],true);assert.equal(find(h.render(),h.id).attrs.disabled[0],true);
 await h.flush();assert.equal(h.view.pluginFixing,null);assert.equal(find(h.render(),h.id).attrs.disabled[0],false);
 h.next();h.choose('gate');const refused=h.jobs.shift()(h.cx);h.operation.reject(new Error('Could not change delivery kind: another session owns the Crew home.'));await refused;await h.flush();
 assert.ok(words(h.render()).includes('Plain'));assert.ok(find(h.render(),h.rid+'-choice-error'));
 assert.equal(words(h.render()).filter(w=>w.includes('another session')).length,1,'Refusal is one row-local line, not duplicated in section detail');
 h.next();h.choose('gate');const unknown=h.jobs.shift()(h.cx);h.readFail=true;h.operation.reject(Object.assign(new Error('Could not confirm the delivery kind. Refresh before trying again.'),{uncertain:true}));await unknown;await h.flush();
 assert.ok(words(h.render()).includes('Plain'));assert.equal(find(h.render(),h.id).attrs.disabled[0],true,'Failed reconciliation cannot authorize another write');
 assert.equal(h.requests.length,3,'No automatic replay');
 h.readFail=false;h.ui.reloadPlugins(h.view,h.cx,h.plugin.id,'items');await h.flush();assert.equal(find(h.render(),h.id).attrs.disabled[0],false);assert.ok(!find(h.render(),h.rid+'-choice-error'));
}
{
 const h=await fixture();h.choose('plain');const old=h.jobs.shift()(h.cx),oldOperation=h.operation;
 h.view.settingsMachine='other';h.ui.followSettingsMachine(h.view);h.ui.reloadPlugins(h.view,h.cx,h.plugin.id);await h.flush();
 h.next();h.choose('gate');const newer=h.jobs.shift()(h.cx),newOperation=h.operation;
 oldOperation.resolve({value:'plain'});await old;assert.equal(h.view.pluginFixing,'choice-life:items','Retired completion cannot clear the successor busy latch');
 assert.ok(words(h.render()).includes('Delivery workflow'),'Retired acknowledgement cannot populate the replacement machine');
 newOperation.resolve({value:'gate'});await newer;await h.flush();assert.ok(words(h.render()).includes('Gate'));assert.equal(h.requests.length,2);
}
for(const retire of ['registration','away-back','close','disable']){
 const h=await fixture();find(h.render(),h.id+'-popup').attrs.on_open_change[0](true,h.cx);const stale=find(h.render(),h.id+'-plain').attrs.on_click[0];
 if(retire==='registration'){h.path='D:/replacement';h.ui.reloadPlugins(h.view,h.cx,h.plugin.id);await h.flush();}
 if(retire==='away-back'){h.view.settingsMachine='other';h.ui.followSettingsMachine(h.view);h.view.settingsMachine=null;h.ui.followSettingsMachine(h.view);h.ui.reloadPlugins(h.view,h.cx,h.plugin.id);await h.flush();}
 if(retire==='close')h.view.pluginClosed=true;
 if(retire==='disable')h.click('st-plugin-choice-life-enabled');
 stale({},h.cx);await h.flush();assert.equal(h.requests.length,0,retire+' invalidates captured callback');
}
{
 const h=await fixture();h.choose('plain');const old=h.jobs.shift()(h.cx);
 h.path='D:/replacement';h.ui.reloadPlugins(h.view,h.cx,h.plugin.id,'items');await h.flush();
 h.operation.resolve({value:'plain'});await old;
 assert.equal(h.jobs.length,0,'Replaced registration starts no obsolete follow-up check');
 assert.ok(words(h.render()).includes('Delivery workflow'),'A replaced row cannot receive an old stored-value acknowledgement');
 assert.equal(h.view.pluginFixing,null);
}
console.log('PASS row-choice lifecycle: acknowledged-only values, single-flight settlement, inline refusal, unknown-outcome read barrier and obsolete machine/row/session callbacks');
