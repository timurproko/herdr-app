// Eager native menu/modal rendering in a scratch app home; no file operations.
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
export function checkFileDeleteStates(home, app) {
  const dir = path.join(home, 'mods/custom-files-delete-fixture');
  const dispose=temporaryMod(home,path.basename(dir));
  let checked = 0;
  try {
  fs.cpSync(path.join(home, 'mods/custom-files'), dir, { recursive: true });
  fs.renameSync(path.join(dir, 'main.js'), path.join(dir, 'feature-view.js'));
  fs.renameSync(path.join(dir, 'host.js'), path.join(dir, 'native-host.js'));
  fs.writeFileSync(path.join(dir, 'host.js'), `export * from './native-host.js';
export const props=()=>globalThis.fixtureProps;
export const exec=()=>{throw Error('Recycle fixture cannot run processes');};
export const run=()=>{throw Error('Recycle fixture cannot send commands');};
export const openOverlay=()=>{throw Error('Recycle fixture cannot open overlays');};
`);
    for (const kind of ['fileMenu', 'fileDelete']) for (const remote of [false, true]) for (const folder of [false, true]) {
      const target = { root: 'C:/fixture/中文 O’Brien’s folder', path: folder ? 'nested folder' : 'nested folder/literal [x] $file.txt', on: remote ? 'pc2' : null, dir: folder, token: 'fixture-token' };
      fs.writeFileSync(path.join(dir, 'main.js'), `import Feature from './feature-view.js';
export default class Fixture extends Feature {
 init(p,cx){globalThis.fixtureProps=${JSON.stringify({ [kind]: target })};super.init(p,cx);}
}
`);
      app(['check', dir], home); checked++;
    }
    return checked;
  } finally { dispose(); }
}
