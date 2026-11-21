// Explicit, terminal-free live preview of the sidebar's deferred context menu.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { app, defaultHome } from '../../tools/deploy.mjs';
const home = defaultHome(), name = 'custom-sidebar-footer-preview';
const dir = path.join(home, 'mods', name);
const mode = process.argv[2] ?? 'menu';
if (!['menu', 'drag', 'drag-right', 'return'].includes(mode)) throw Error('Use menu, drag, drag-right or return.');
const dragging = mode !== 'menu';
if (fs.existsSync(dir)) throw Error('Preview already exists; preserve it and inspect first.');
try {
  fs.cpSync(path.join(home, 'mods/custom-workspace-chrome'), dir, { recursive: true });
  fs.renameSync(path.join(dir, 'main.js'), path.join(dir, 'chrome.js'));
  fs.renameSync(path.join(dir, 'host.js'), path.join(dir, 'native-host.js'));
  fs.writeFileSync(path.join(dir, 'host.js'), `export * from './native-host.js';
// Fixture-only state: preview clicks cannot change the real footer preferences.
let value = ${mode === 'drag-right' ? JSON.stringify({version:1,sides:{usage:'left',machines:'left',plugins:'left',settings:'left'}}) : 'null'};
export const shared = key => key === 'custom.sidebar.footer' ? value : null;
export const setShared = (key, next) => { if (key !== 'custom.sidebar.footer') throw Error('Unexpected fixture write'); value = next; };
export const run = () => { throw Error('Preview cannot run commands'); };
`);
  fs.writeFileSync(path.join(dir, 'mod.json'), JSON.stringify({ place: 'none', overlay: {
    width: dragging ? 248 : 200, height: dragging ? 36 : 122, frame: 'none' } }));
  fs.writeFileSync(path.join(dir, 'main.js'), `import Chrome from './chrome.js';
import { theme } from './host.js';
import { div } from 'gpui-kit';
export default class Preview extends Chrome {
 init(_p,cx) { this.at=-1;this.handle=cx.focus_handle();this.handle.focus();
   if (${dragging && mode !== 'return'}) this.drag.current=${JSON.stringify(mode === 'drag-right'
     ? {id:'plugins',active:true,target:{side:'right',before:null},point:{x:224,y:-38}}
     : {id:'plugins',active:true,target:{side:'left',before:'usage'},point:{x:70,y:-38}})};
   if (${mode === 'return'}) {
     this.drag.begin('plugins',{position:{x:184,y:4},bounds:{x:184,y:4}},cx);
     this.drag.track({position:{x:60,y:0},local_position:{x:60,y:0},bounds:{width:248,height:36}},cx);
     // Allow an arm screenshot, then run the real cancellation sequence.
     cx.timer.after(900,cx=>this.cancelFooterDrag(cx));
   }
 }
 render() { const t=theme(); return ${dragging}
   ? this.footerSurface(t).child(this.footerGroup('left',t)).child(div().flex_1()).child(this.footerGroup('right',t))
   : this.footerMenu(t); }
}`);
  app(['check', dir], home);
  for (let i = 0;; i++) {
    try { app(['do', 'mod.open', '--name', name], home); break; }
    catch (error) { if (i === 20) throw error; await new Promise(r => setTimeout(r, 150)); }
  }
  await new Promise(r => setTimeout(r, 600));
  const status = JSON.parse(app(['status'], home));
  if (status.errors.length) throw Error(JSON.stringify(status.errors));
  if (!status.overlays?.includes(name)) throw Error('Preview was dismissed; native animation capture is inconclusive.');
  const image = path.join(os.tmpdir(), `sidebar-footer-${mode}.png`);
  app(['shot', image], home);
  if (mode === 'return') {
    for (const [delay, stage] of [[350, 'moving'], [220, 'fading'], [220, 'done']]) {
      await new Promise(r => setTimeout(r, delay));
      if (!JSON.parse(app(['status'], home)).overlays?.includes(name)) throw Error('Preview dismissed during animation capture.');
      app(['shot', path.join(os.tmpdir(), `sidebar-footer-return-${stage}.png`)], home);
    }
  }
  console.log(`PASS: ${mode} renders natively; inspect ${image}`);
} finally {
  try {
    const status = JSON.parse(app(['status'], home));
    if (status.overlays?.includes(name)) app(['do', 'mod.open', '--name', name], home);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
