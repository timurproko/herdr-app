// Terminal-free native preview of Look's deferred sidebar configuration pages.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { app, defaultHome } from '../../tools/deploy.mjs';
const home = defaultHome(), name = 'custom-sidebar-settings-preview';
const dir = path.join(home, 'mods', name);
const page = process.argv[2] ?? 'sidebar';
if (!['look', 'sidebar', 'hover'].includes(page)) throw Error('Use look, sidebar or hover.');
if (fs.existsSync(dir)) throw Error('Preview already exists; inspect before retrying.');
if (JSON.parse(app(['status'], home)).overlays?.length) throw Error('Dismiss existing dialogs before previewing.');
try {
  fs.cpSync(path.join(home, 'mods/custom-settings'), dir, { recursive: true });
  fs.renameSync(path.join(dir, 'main.js'), path.join(dir, 'settings.js'));
  fs.renameSync(path.join(dir, 'host.js'), path.join(dir, 'native-host.js'));
  fs.writeFileSync(path.join(dir, 'host.js'), `export * from './native-host.js';
// All fixture preference changes stay in memory; no real settings are written.
const state = new Map();
export const shared = key => key === 'layout' ? 'Custom' : state.get(key);
export const setShared = (key, value) => state.set(key, value);
export const run = () => { throw Error('Preview cannot run commands'); };
export const writeTextFile = () => { throw Error('Preview cannot write files'); };
`);
  fs.writeFileSync(path.join(dir, 'mod.json'), JSON.stringify({ place: 'none', overlay: { width: 900, height: 620, frame: 'none' } }));
  if (page === 'hover') {
    const file = path.join(dir, 'sidebar-ui.js');
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('.hover(el => el.bg(t.hover))')) throw Error('Unknown hover fixture source.');
    fs.writeFileSync(file, source.replace('.hover(el => el.bg(t.hover))', '.bg(t.hover)'));
  }
  fs.writeFileSync(path.join(dir, 'main.js'), `import Settings from './settings.js';
import { statusbarSection } from './sidebar-ui.js';
export default class Preview extends Settings {
 init(p,cx) { super.init(p,cx); this.section='look'; this.lookPage=${JSON.stringify(page === 'sidebar' ? 'sidebar' : null)}; }
 ${page === 'hover' ? 'look(t) { return statusbarSection(this,t); }' : ''}
}`);
  app(['check', dir], home);
  for (let attempt = 0;; attempt++) {
    try { app(['do', 'mod.open', '--name', name], home); break; }
    catch (error) { if (attempt === 20) throw error; await new Promise(r => setTimeout(r, 150)); }
  }
  await new Promise(r => setTimeout(r, 750));
  const status = JSON.parse(app(['status'], home));
  if (status.errors.length) throw Error(JSON.stringify(status.errors));
  if (!status.overlays?.includes(name)) throw Error('Preview was dismissed.');
  const shot = path.join(os.tmpdir(), `sidebar-settings-${page}.png`);
  app(['shot', shot], home);
  console.log(`PASS: deferred ${page} renders natively; inspect ${shot}`);
} finally {
  try {
    if (JSON.parse(app(['status'], home)).overlays?.includes(name)) app(['do', 'mod.open', '--name', name], home);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
