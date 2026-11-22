// Explicit, terminal-free native preview. Synthetic spaces; no move worker/commands.
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {app, defaultHome} from '../../tools/deploy.mjs';
const home = defaultHome(), name = 'custom-tab-arrival-preview', dir = path.join(home, 'mods', name);
const prefix = path.resolve(process.argv[2] ?? path.join(os.tmpdir(), 'herdr-tab-arrival'));
if (fs.existsSync(dir)) throw Error('Preview already exists; refusing to overwrite it.');
const before = JSON.parse(app(['status'], home));
if (before.overlays.length) throw Error('Dismiss other overlays before previewing.');
let opened = false;
const dispose=temporaryMod(home,name);
try {
  fs.cpSync(path.join(home, 'mods/custom-spaces'), dir, {recursive: true});
  fs.renameSync(path.join(dir, 'main.js'), path.join(dir, 'spaces.js'));
  fs.renameSync(path.join(dir, 'host.js'), path.join(dir, 'native-host.js'));
  fs.writeFileSync(path.join(dir, 'host.js'), `export * from './native-host.js';
export const spaces=()=>[{id:'source',name:'Source space',named:true,machine:null,tabs:[]},{id:'target',name:'Destination space',named:true,machine:null,tabs:[{id:'tab'}]}];
export const panes=()=>[];
export const shared=()=>null;
export const exec=()=>{throw Error('Preview cannot execute workers');};
export const hc=()=>{throw Error('Preview cannot contact a Core');};
export const run=()=>{throw Error('Preview cannot navigate or move tabs');};
`);
  fs.writeFileSync(path.join(dir, 'mod.json'), JSON.stringify({place:'none',overlay:{width:288,height:140,frame:'none'}}));
  fs.writeFileSync(path.join(dir, 'main.js'), `import Spaces from './spaces.js';
import {receiveTabArrival} from './tab-arrival.js';
import {theme,spaces} from './host.js';
import {div} from 'gpui-kit';
import {v_flex} from 'gpui-base';
export default class Preview extends Spaces {
 init(p,cx){this.pressed=null;cx.timer.after(2500,cx=>receiveTabArrival(this,'tab-arrived:'+JSON.stringify({requestId:'preview',spaceId:'target',tabId:'tab',expiresAt:Date.now()+2000}),cx));}
 render(){const t=theme();return v_flex().p(14).gap(8).rounded(10).bg(t.chrome).border_1().border_color(t.border)
 .child(div().text_size(12).text_color(t.muted).child('Move to… · animation preview'))
 .children(spaces().map((w,i)=>this.row({w,i,g:null,tree:null},t)));}
}
`);
  app(['check', dir], home);
  for (let i = 0;; i++) {
    try { app(['do', 'mod.open', '--name', name], home); opened = true; break; }
    catch (error) { if (i === 20) throw error; await new Promise(r => setTimeout(r, 150)); }
  }
  const start = Date.now(), shots = [];
  for (const [at, stage] of [[350,'before'],[2520,'rising'],[2600,'hop'],[2700,'landing'],[3000,'done']]) {
    await new Promise(r => setTimeout(r, Math.max(0, start + at - Date.now())));
    const status = JSON.parse(app(['status'], home));
    if (!status.overlays.includes(name) || status.errors.length) throw Error('Preview dismissed or has native errors.');
    const file = prefix + '-' + stage + '.png';
    fs.mkdirSync(path.dirname(file), {recursive:true}); app(['shot', file], home); shots.push(file);
  }
  console.log(JSON.stringify({syntheticSpaces:true,liveMoves:false,shots},null,2));
} finally {
  try { if (opened) app(['do','overlay.close',JSON.stringify({id:'mod-'+name})],home); }
  finally {dispose();}
}
const after = JSON.parse(app(['status'],home));
if (before.space !== after.space || before.tab !== after.tab || before.focused_pane !== after.focused_pane)
  throw Error('Focus changed during the preview; inspect before continuing.');
