import assert from 'node:assert/strict';
import {formsHarness,find} from './support/plugin-forms.mjs';
const options=[['plain','Plain'],['workflow','Delivery'],['gate','Gate']];
for(const route of ['select','escape','outside']) {
 const plugin={id:'dismiss',name:'Fixture',icon:'code',version:'1',defaultEnabled:true,settings:[],prerequisites:[{id:'rows',label:'Rows',section:true,
 list:{scope:{header:true},picker:{kind:'items'},candidates:async()=>({items:[]}),remove:async()=>{},rowChoice:{label:'Mode',options,set:async(_cx,_row,value)=>({value})}},
 check:async()=>({status:'ready',usable:true,rows:[0,1].map(i=>({id:String(i),label:'D:/fixture/'+i,choice:{value:'workflow',revision:'r'}}))})}]};
 const h=await formsHarness({},[plugin]);let focus;
 h.cx.focus_handle=()=>{const f={focus(){focus=f;},is_focused:()=>focus===f};return f;};
 h.ui.initPlugins(h.view,h.cx,plugin.id);h.view.pluginOpen['dismiss-rows']=true;h.ui.reloadPlugins(h.view,h.cx,plugin.id);await h.flush();
 const rid=i=>`st-plugin-list-dismiss-rows-row-${i}`,id=rid(0)+'-choice';
 const hover=(i,on)=>find(h.render(),rid(i)).attrs.on_hover[0](on,h.cx);
 const revealed=i=>find(h.render(),rid(i)+'-choice').attrs.border_color?.[0]!=='#00000000';
 hover(0,true);find(h.render(),id+'-popup').attrs.on_open_change[0](true,h.cx);
 hover(0,false);assert.ok(revealed(0),'Open menu retains its row');
 if(route==='select')find(h.render(),id+'-workflow').attrs.on_click[0]({},h.cx);
 if(route==='escape')find(h.render(),id+'-options').attrs.on_key_down[0]({key:'escape'},h.cx);
 if(route==='outside')find(h.render(),id+'-popup').attrs.on_open_change[0](false,h.cx);
 // Pointer-origin open-close-move must retire even Escape-restored focus.
 hover(1,true);
 assert.equal(revealed(0),false,route+' retires pointer-origin focus');
 assert.ok(revealed(1));
 hover(1,false);hover(0,true);assert.ok(revealed(0),'Pointer on original row keeps reveal');
 const text=find(h.render(),id).kids[0];assert.equal(text.attrs.text_right,undefined);assert.equal(text.attrs.truncate,undefined);
 for(const zoom of [1,1.3]) {
  assert.equal(find(h.render(),rid(0)+'-choice-slot').attrs.w[0]*zoom,150*zoom);
  assert.equal(find(h.render(),rid(0)+'-rail').attrs.w[0]*zoom,80*zoom);
 }
}
console.log('PASS row menu dismissal routes, second-row hover, stable left anchor and untruncated captions');
