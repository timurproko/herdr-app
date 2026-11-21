// Explicit read-only live UI preview. Never submits a move or changes topology.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {app, defaultHome} from './deploy.mjs';
const home = defaultHome(), name = 'custom-tab-move-preview', dir = path.join(home, 'mods', name);
const nonce = crypto.randomBytes(8).toString('hex');
const receipt = path.join(home, '.customizations', `tab-move-inspect-${nonce}.json`);
const shot = path.resolve(process.argv[2] ?? '.work/tab-move-menu.png');
const kind = process.argv[3] ?? 'dialog';
if (!['dialog', 'popup'].includes(kind)) throw Error('Preview kind must be dialog or popup.');
const machine = process.argv[4] && process.argv[4] !== 'local' ? process.argv[4] : null;
if (machine !== null && !/^[a-z0-9_-]{1,200}$/i.test(machine)) throw Error('Invalid preview machine.');
if (fs.existsSync(dir)) throw Error('Preview directory already exists; refusing to overwrite.');
let opened = false;
try {
  fs.cpSync(path.join(home, 'mods/custom-menu'), dir, {recursive: true});
  fs.renameSync(path.join(dir, 'host.js'), path.join(dir, 'native-host.js'));
  fs.writeFileSync(path.join(dir, 'host.js'), `export * from './native-host.js';
import {props as originalProps,spaces,panes} from './native-host.js';
let target;
export const props=()=>{if(!target){const ps=panes(),s=spaces().find(s=>(s.machine??null)===${JSON.stringify(machine)}&&s.tabs.some(t=>ps.some(p=>p.tab===t.id&&p.terminal)));target={space:s?.id,id:s?.tabs.find(t=>ps.some(p=>p.tab===t.id&&p.terminal))?.id};}return {...originalProps(),tab:'tab',target};};
`);
  fs.renameSync(path.join(dir, 'tab-moves.js'), path.join(dir, 'tab-moves-readonly.js'));
  fs.writeFileSync(path.join(dir, 'tab-moves.js'), `export {inspectTabMove,tabMoveDestinations} from './tab-moves-readonly.js';
export const requestTabMove=()=>false; // Even an accidental click cannot submit a mutation.
`);
  fs.renameSync(path.join(dir, 'main.js'), path.join(dir, 'menu-base.js'));
  fs.writeFileSync(path.join(dir, 'main.js'), `import Menu from './menu-base.js';
import {props,appHome,writeTextFile} from './host.js';
import {inspectTabMove} from './tab-moves.js';
export default class Preview extends Menu {
 checkMove(){} // The explicit read-only receipt probe below owns this preview.
 init(p,cx){super.init(p,cx);this.moveTo=true;cx.spawn(async cx=>{this.moveCapability=await inspectTabMove(props().target);await writeTextFile(appHome()+'/.customizations/tab-move-inspect-${nonce}.json',JSON.stringify({nonce:'${nonce}',ok:this.moveCapability.ok,status:this.moveCapability.status,message:this.moveCapability.message}),null);cx.notify();});}
}
`);
  // Dialog is the stable default; popup also checks the real menu's overlay mode.
  fs.writeFileSync(path.join(dir, 'mod.json'), JSON.stringify({place: 'none', overlay: {kind, modal: true, frame: 'none', width: 250, ...(kind === 'popup' ? {at: {x: 430, y: 130}} : {})}}));
  app(['check', dir], home);
  for (let i = 0; i < 30; i++) {
    try { app(['do', 'mod.open', '--name', name], home); opened = true; break; }
    catch (e) { if (i === 29) throw e; await new Promise(r => setTimeout(r, 200)); }
  }
  let result;
  for (let i = 0; i < 200; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (fs.existsSync(receipt)) { result = JSON.parse(fs.readFileSync(receipt, 'utf8')); if (result.nonce === nonce) break; }
  }
  if (!result) throw Error('Read-only native worker probe timed out.');
  await new Promise(r => setTimeout(r, 500));
  const status = JSON.parse(app(['status'], home));
  if (!status.overlays.includes(name)) throw Error('Preview was dismissed before capture; no screenshot claimed.');
  if (status.errors.length) throw Error('The app reports errors: ' + status.errors.join('; '));
  fs.mkdirSync(path.dirname(shot), {recursive: true}); app(['shot', shot], home);
  console.log(JSON.stringify({readOnlyInstalledProbe: result, machine, screenshot: shot, mutationsEnabled: false}, null, 2));
} finally {
  if (opened) try { app(['do', 'overlay.close', JSON.stringify({id: 'mod-' + name})], home); } catch {}
  fs.rmSync(dir, {recursive: true, force: true});
  if (fs.existsSync(receipt) && JSON.parse(fs.readFileSync(receipt, 'utf8')).nonce === nonce) fs.rmSync(receipt);
}
