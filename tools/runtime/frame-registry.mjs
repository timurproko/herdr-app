// Declarative patch catalog shared by startup repair, CLI and the installer.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const relative = value => typeof value === 'string' && /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(value)
  && value.split('/').every(part => part !== '.' && part !== '..');

export function loadFrameRegistry(root = bundle) {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'frame-patches/registry.json'), 'utf8'));
  if (!object(registry) || registry.version !== 1 || !Array.isArray(registry.patches)) throw Error('Invalid frame registry.');
  const ids = new Set(), targets = new Set();
  for (const patch of registry.patches) {
    if (!object(patch) || typeof patch.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(patch.id) || ids.has(patch.id)
      || typeof patch.target !== 'string' || !/^(frame|mods)\/[a-z][a-z0-9-]*$/.test(patch.target) || targets.has(patch.target.toLowerCase())
      || !Array.isArray(patch.originals) || !patch.originals.length || !patch.originals.every(relative)
      || !object(patch.files) || !Object.hasOwn(patch.files, 'main.js')) throw Error('Invalid or duplicate frame registry entry.');
    if (patch.mainByOriginal !== undefined && (!object(patch.mainByOriginal)
      || Object.entries(patch.mainByOriginal).some(([original, main]) => !patch.originals.includes(original) || !relative(main))))
      throw Error(`Invalid frame original mapping: ${patch.id}.`);
    const names = new Set();
    for (const [name, source] of Object.entries(patch.files)) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name) || !relative(source) || names.has(name.toLowerCase())) throw Error(`Invalid frame file mapping: ${patch.id}.`);
      names.add(name.toLowerCase());
    }
    ids.add(patch.id); targets.add(patch.target.toLowerCase());
  }
  return registry.patches;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(loadFrameRegistry(process.argv[2] || bundle))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
