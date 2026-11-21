// Installs the same reviewed Herdr facade into short-lived diagnostic/migration mods.
// Temporary mods must not create a second direct native-module boundary.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, read } from './files.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function installTemporaryHostFacade(dir, root = project) {
  for (const name of ['compatibility.js', 'host.js']) {
    const source = fs.readFileSync(path.join(root, 'src/integration/herdr', name), 'utf8');
    const target = path.join(dir, name), current = read(target);
    if (current !== null && current !== source) throw Error(`Temporary mod facade conflict: ${target}`);
    if (current === null) put(target, source);
  }
}
