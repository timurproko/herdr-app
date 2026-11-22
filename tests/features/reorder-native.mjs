// All three real adapters in deferred drag/return/fade states, synthetic data only.
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
export function checkReorderStates(home, app) {
  const name='custom-reorder-fixture', dir=path.join(home,'mods',name);
  if(fs.existsSync(dir)) throw Error('Reorder fixture already exists; refusing to overwrite it.');
  let checked=0;
  for(const variant of ['tabs','spaces','workspace-chrome']) {
    const dispose=temporaryMod(home,name);
    try {
      fs.cpSync(path.join(home,'mods','custom-'+variant),dir,{recursive:true});
      fs.renameSync(path.join(dir,'main.js'),path.join(dir,'base.js'));
      fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
      fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
export const spaces=()=>[{id:'s',active:true,name:'Source',named:true,machine:null,folder:'/fixture',tabs:[{id:'a',name:'One',active:true},{id:'b',name:'Two'}]},{id:'other',name:'Destination',named:true,machine:null,tabs:[]}];
export const panes=()=>[];
export const machines=()=>[{name:null,layout:'ready'}];
export const shared=()=>null;
export const props=()=>({footer:true});
export const settings=()=>({zoom:1});
export const layout=()=>({id:'sidebar',size:{px:248}});
export const updates=()=>({app:{}});
export const run=()=>{throw Error('Reorder fixture cannot issue commands');};
export const exec=()=>{throw Error('Reorder fixture cannot launch processes');};
export const hc=()=>{throw Error('Reorder fixture cannot contact a Core');};
`);
      for(const phase of ['drag','return','fade']) {
        const source=variant==='tabs'?'a':variant==='spaces'?'s':'usage';
        const target=variant==='tabs'?'2':variant==='spaces'?"'other'":"{side:'right',before:null}";
        fs.writeFileSync(path.join(dir,'main.js'),`import Base from './base.js';
import {theme,spaces} from './host.js';
import {v_flex,h_flex} from 'gpui-base';
export default class Fixture extends Base {
 init(p,cx){this.titleWidths=new Map();this.drag.begin('${source}',{position:{x:12,y:12},bounds:{x:0,y:0,width:28,height:28}},cx,{meta:{space:'s'}});
 this.drag.over({position:{x:80,y:20}},${target},cx);
 this.drag.track({position:{x:80,y:20},local_position:{x:80,y:20},bounds:{width:248,height:120}},cx);
 ${phase!=='drag'?`this.drag.leaving={...this.drag.current,phase:'${phase}'};this.drag.current=null;`:''}}
 ${variant==='spaces'?`render(){const t=theme();return v_flex().relative().w(248).children(spaces().map((w,i)=>this.row({w,i,g:null,tree:null},t))).child(this.dragPreview(t));}`:variant==='workspace-chrome'?`render(){const t=theme();return this.footerSurface(t).child(this.footerGroup('left',t)).child(h_flex().flex_1()).child(this.footerGroup('right',t));}`:''}
}
`);
        app(['check',dir],home);checked++;
      }
    } finally {dispose();}
  }
  return checked;
}
