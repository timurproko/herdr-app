// Reversible file patch engine. Dialog-specific paths live only in registry.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { bundle, loadFrameRegistry } from './frame-registry.mjs';
import { inspectNative, mutateNative } from './native-frame.mjs';
import { transformNative } from './native-transform.mjs';
import { retainNativeBackup, nativeAtomic as atomic } from './native-recovery.mjs';
const hash = text => text === null ? null : crypto.createHash('sha256').update(text).digest('hex');
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
// Inspect before mutation. Exact owned bytes are not native compatibility proof
// after a binary upgrade: the old patch can mask a newly shipped original.
export function inspectFramePatch(home, root = bundle, frame, options = {}) {
  let {binary}=options;
  const patch = loadFrameRegistry(root).find(patch => patch.id === frame);
  if (!patch) throw Error(`Unregistered frame patch: ${frame}`);
  if(patch.transform)return inspectNative(home,root,patch,(source,prefix,options)=>transformNative(frame,source,prefix,options),options);
  const raw = read(path.join(home, `.customizations/frame-${frame}.json`));
  const state = raw === null ? null : JSON.parse(raw);
  if (state && (state.version !== 1 || !state.original || !state.installed
      || typeof state.original !== 'object' || typeof state.installed !== 'object'))
    throw Error(`Unrecognized ${frame} patch record; nothing changed.`);
  const current = Object.fromEntries(Object.keys(patch.files).map(n => [n, read(path.join(home, patch.target, n))]));
  const originals = patch.originals.map(source => read(path.join(root, source)));
  if (originals.some(text => text === null)) throw Error(`Missing original ${frame} snapshot; nothing changed.`);
  const recognized = n => state && [state.installed[n], state.previousInstalled?.[n], hash(state.original[n] ?? null)].includes(hash(current[n]));
  for (const [n, source] of Object.entries(patch.files)) {
    const payload = read(path.join(root, source));
    if (payload === null) throw Error('Missing patch dependency; nothing changed.');
    if (n !== 'main.js' && current[n] !== null && current[n] !== payload && !recognized(n))
      throw Error(`Personal ${frame} dependency conflict: ${n}; nothing changed.`);
  }
  const active = Boolean(state && Object.keys(patch.files).every(n => hash(current[n]) === state.installed[n]));
  const stock = originals.includes(current['main.js']);
  let nativeReviewed = stock;
  if (!stock && recognized('main.js')) {
    if (binary === undefined) {
      const exe = process.env.HERDR_APP_BIN || path.join(process.env.LOCALAPPDATA ?? '', 'Programs/herdr-app/herdr-app.exe');
      try { binary = fs.readFileSync(exe); } catch { binary = null; }
    }
    nativeReviewed = Buffer.isBuffer(binary) && originals.some(text => binary.includes(Buffer.from(text)));
  }
  if ((!stock && !recognized('main.js')) || !nativeReviewed) {
    const retained = Boolean(recognized('main.js') && !stock);
    return {ok:true, status:'skipped', active, retained,
      advisory:`Optional ${frame} patch skipped: ${retained ? 'retained owned patch, current host native original unreviewed' : 'unsupported original/unknown target'}; bytes and opt-in unchanged. Review/rebase the native patch to restore supported customization.`};
  }
  return {ok:true, status:'ready', active};
}
export function framePatch(action, home, root = bundle, frame, options = {}) {
  if (!['apply', 'check', 'restore', 'inspect', 'recover'].includes(action)) throw Error(`Unknown frame patch action: ${action}`);
  if (action === 'inspect') return inspectFramePatch(home, root, frame, options);
  const structural=loadFrameRegistry(root).find(p=>p.id===frame);
  if(structural?.transform) {
    if(['apply','restore','recover'].includes(action))return mutateNative(action,home,root,structural,(source,prefix,opts)=>transformNative(frame,source,prefix,opts),options);
    const result=inspectFramePatch(home,root,frame,options);
    if(!result.ok)throw Error(result.error);
    if(result.status==='skipped')return result.advisory;
    if(!result.active)throw Error(`${frame} patch is repair-needed; structural repair required.`);
    return `${frame} frame patch and dependencies match.`;
  }
  if(action==='recover')throw Error('Journal recovery is supported only for structural frames.');
  if (action === 'apply') {
    const inspection = inspectFramePatch(home, root, frame, options);
    if (inspection.status === 'skipped') throw Error(inspection.advisory);
  }
  const patch = loadFrameRegistry(root).find(patch => patch.id === frame);
  if (!patch) throw Error(`Unregistered frame patch: ${frame}`);
  const dir = path.join(home, patch.target);
  const stateFile = path.join(home, `.customizations/frame-${frame}.json`);
  const stateRaw = read(stateFile);
  const state = stateRaw === null ? null : JSON.parse(stateRaw);
  if (state && (state.version !== 1 || !state.original || !state.installed)) throw Error(`Unrecognized ${frame} patch record; nothing changed.`);
  const sources = patch.files;
  // Dependencies first on apply, entrypoint first on restore, regardless of JSON order.
  const names = [...Object.keys(sources).filter(name => name !== 'main.js'), 'main.js'];
  const current = Object.fromEntries(names.map(n => [n, read(path.join(dir, n))]));
  const originals = patch.originals.map(source => read(path.join(root, source)));
  if (originals.some(text => text === null)) throw Error(`Missing original ${frame} snapshot; nothing changed.`);
  const supportedStock = originals.includes(current['main.js']);
  const recognized = n => state && [state.installed[n], state.previousInstalled?.[n], hash(state.original[n] ?? null)].includes(hash(current[n]));
  if (action === 'apply') {
    if (!supportedStock && !recognized('main.js')) throw Error(`${frame} frame differs from the supported original/owned patch; nothing changed.`);
    const payload = Object.fromEntries(names.map(n => [n, read(path.join(root, sources[n]))]));
    if (Object.values(payload).some(t => t === null)) throw Error('Missing patch dependency; nothing changed.');
    for (const n of names.filter(n => n !== 'main.js')) {
      if (current[n] !== null && current[n] !== payload[n] && !recognized(n)) throw Error(`Personal ${frame} dependency conflict: ${n}; nothing changed.`);
    }
    const changed = names.some(n => current[n] !== payload[n]);
    if (!changed && names.every(n => state?.installed[n] === hash(payload[n]))) return `Custom ${frame} frame already current.`;
    const next = { version: 1, original: { ...current, ...(state?.original ?? {}) },
      installed: Object.fromEntries(names.map(n => [n, hash(payload[n])])), previousInstalled: Object.fromEntries(names.map(n => [n, hash(current[n])])) };
    // A reviewed reset/update rebases the backup rather than downgrading on removal.
    if (supportedStock) next.original['main.js'] = current['main.js'];
    if(stateRaw!==null)retainNativeBackup(home,frame,Buffer.from(stateRaw),'record');
    atomic(stateFile, JSON.stringify(next, null, 2) + '\n');
    for (const n of names) if ((n === 'main.js' && changed) || current[n] !== payload[n]) {
      if (read(path.join(dir, n)) !== current[n]) throw Error(`${frame} file changed during apply: ${n}; stopped safely.`);
      atomic(path.join(dir, n), payload[n]);
    }
    return `Custom ${frame} frame applied (other layouts retain stock styling).`;
  }
  if (!state) return `No ${frame} frame patch is installed.`;
  if (action === 'check') {
    const inspection = inspectFramePatch(home, root, frame, options);
    if (inspection.status === 'skipped') return inspection.advisory;
    for (const n of names) if (hash(current[n]) !== state.installed[n]) throw Error(`${frame} patch is inactive or changed: ${n}. Herdr may have restored its frame on startup; reapply explicitly.`);
    return `${frame} frame patch and dependencies match.`;
  }
  // Preserve unknown newer stock on removal, never replace it with an old backup.
  const newerStock = !recognized('main.js') && current['main.js'] !== null && !current['main.js'].includes('./custom-');
  for (const n of names) {
    if (n === 'main.js' && newerStock) continue;
    if (current[n] === null && n !== 'main.js') continue;
    if (!recognized(n)) throw Error(`${frame} file changed externally: ${n}; restore refused before writes.`);
  }
  for (const n of [...names].reverse()) {
    if (n === 'main.js' && newerStock) continue;
    const original = state.original[n] ?? null;
    if (original === null) { if (current[n] !== null) fs.unlinkSync(path.join(dir, n)); }
    else if (current[n] !== original) atomic(path.join(dir, n), original);
  }
  // Preserve every prior original, including obsolete stock or unmapped helpers,
  // before deleting the opt-in. Recovery archives are never scanned as opt-ins.
  retainNativeBackup(home,frame,Buffer.from(stateRaw),'record');
  for(const n of names) {
    const expected=n==='main.js'&&newerStock?current[n]:state.original[n]??null;
    if(read(path.join(dir,n))!==expected)throw Error(`${frame} restore readback failed: ${n}; backup and record retained.`);
  }
  if(read(stateFile)!==stateRaw)throw Error(`${frame} record changed during restore; backups retained.`);
  fs.unlinkSync(stateFile);
  return `${frame} frame restored; personal settings and shortcuts unchanged.`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const home = process.argv[4] || process.env.HERDR_APP_HOME || path.join(process.env.USERPROFILE, '.config/herdr-app');
  try { const result = framePatch(process.argv[2], home, bundle, process.argv[3]); console.log(typeof result === 'string' ? result : JSON.stringify(result)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
