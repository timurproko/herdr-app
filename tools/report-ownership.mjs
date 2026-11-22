// Read-only runtime ownership inventory. It never hashes or rewrites host session state.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { defaultHome } from './deploy.mjs';
import { json } from './files.mjs';

const posix = value => value.split(path.sep).join('/');
const dirs = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort() : [];
const files = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];

export function ownershipReport(home = defaultHome()) {
  const manifest = json(path.join(home, '.customizations/manifest.json')) ?? { files: {} };
  const registry = json(path.join(home, '.customizations/runtime/frame-patches/registry.json')) ?? { patches: [] };
  // Catalog membership is ownership evidence, not a claim of byte-for-byte stock.
  // Never modify installed.json or silently label arbitrary unprefixed folders native.
  const installed = json(path.join(home, 'installed.json')) ?? {};
  const hostMods = new Set(Object.keys(installed).filter(name => !name.includes(':')));
  const owned = new Set(Object.keys(manifest.files ?? {}));
  const ownedModDirs = new Set([...owned].filter(rel => rel.startsWith('mods/')).map(rel => rel.split('/')[1]));
  const nativePatchMods = new Set((registry.patches ?? []).map(p => p.target).filter(t => t.startsWith('mods/')).map(t => t.slice(5)));
  const result = { customOwned: [], customUnowned: [], hostCatalog: [], unknown: [], nativePatchMods: [], recovery: [] };
  const liveMods = dirs(path.join(home, 'mods'));
  for (const name of liveMods) {
    if (/^custom-/.test(name)) (ownedModDirs.has(name) ? result.customOwned : result.customUnowned).push(name);
    else if (/-edited(?:-\d+)?$/.test(name)) result.recovery.push(name);
    else if (nativePatchMods.has(name)) result.nativePatchMods.push(name);
    else (hostMods.has(name) ? result.hostCatalog : result.unknown).push(name);
  }
  const missingMods = [...ownedModDirs].filter(name => !liveMods.includes(name)).sort();
  const hostGenerated = [], unknownCustomFiles = [];
  for (const name of result.customOwned) for (const file of files(path.join(home, 'mods', name))) {
    const rel = posix(path.relative(home, file));
    if (owned.has(rel)) continue;
    if (['gpui-kit.d.ts', 'jsconfig.json'].includes(path.basename(file)) && path.dirname(rel) === `mods/${name}`) hostGenerated.push(rel);
    else unknownCustomFiles.push(rel);
  }
  const tempFiles = fs.existsSync(home) ? fs.readdirSync(home).filter(name => /^shared\.json\.tmp\./.test(name)).sort() : [];
  const recoveryArchives = dirs(path.join(home, '.customizations/recovery'));
  return {
    home,
    rules: {
      customRuntime: 'mods/custom-* (flat because Herdr discovers direct child mods)',
      hostRuntime: 'mods listed in read-only installed.json; catalog membership is not content verification',
      nativeExceptions: 'registry-backed frame targets only',
      source: 'src/ in your standalone checkout; never edit installed runtime copies',
    },
    mods: result,
    customFiles: { hostGenerated, unknown: unknownCustomFiles },
    missingMods,
    nativePatches: (registry.patches ?? []).map(p => ({ id: p.id, target: p.target, optedIn: fs.existsSync(path.join(home, `.customizations/frame-${p.id}.json`)) })),
    staleTemps: tempFiles,
    recoveryArchives,
    healthy: manifest.version === 2 && !result.customUnowned.length && !result.unknown.length
      && !result.recovery.length && !missingMods.length && !unknownCustomFiles.length && !tempFiles.length,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(ownershipReport(process.argv[2] ?? defaultHome()), null, 2));
}
