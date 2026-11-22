// Installs the same reviewed Herdr facade into short-lived diagnostic/migration mods.
// Temporary mods must not create a second direct native-module boundary.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, read } from './files.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Claim before copying/writing a mod; call the returned disposer in finally (after
// closing its overlay). Only this exact invocation's name is eligible for removal.
// Existing mod/data paths are never adopted. Exit/SIGINT/SIGTERM are best-effort;
// forced termination/power loss and late host writes cannot be recovered here.
export function temporaryMod(home, name, canRemove = () => true) {
  if (!/^custom-[a-z0-9][a-z0-9-]*$/.test(name)) throw Error('Invalid temporary mod name');
  const dir = path.join(home, 'mods', name), data = path.join(home, 'data', name);
  const exists = file => { try { fs.lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
  if (exists(dir) || exists(data)) throw Error(`Temporary mod path already exists; preserve it: ${name}`);
  fs.mkdirSync(path.dirname(dir), {recursive: true});
  fs.mkdirSync(dir); // Atomic claim, never merge into an installed mod.
  let disposed = false;
  const interrupt = () => process.exit(130), terminate = () => process.exit(143);
  const onExit = () => { try { dispose(); } catch (error) { console.error(error); process.exitCode = 1; } };
  function dispose() {
    if (disposed) return;
    if (exists(dir) && !canRemove(dir)) {
      release();
      throw Error(`Temporary mod changed; preserve mod and data: ${name}`);
    }
    fs.rmSync(dir, {recursive: true, force: true});
    fs.rmSync(data, {recursive: true, force: true});
    release();
  }
  function release() {
    disposed = true;
    process.removeListener('exit', onExit);
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
  }
  process.once('exit', onExit);
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', terminate);
  return dispose;
}

export function installTemporaryHostFacade(dir, root = project) {
  for (const name of ['compatibility.js', 'host.js']) {
    const source = fs.readFileSync(path.join(root, 'src/integration/herdr', name), 'utf8');
    const target = path.join(dir, name), current = read(target);
    if (current !== null && current !== source) throw Error(`Temporary mod facade conflict: ${target}`);
    if (current === null) put(target, source);
  }
}
