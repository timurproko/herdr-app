// Reversible file patch engine. Dialog-specific paths live only in registry.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { bundle, loadFrameRegistry } from './frame-registry.mjs';
const hash = text => text === null ? null : crypto.createHash('sha256').update(text).digest('hex');
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
function atomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.custom-${process.pid}.tmp`;
  try { fs.writeFileSync(temp, text); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
// Inspect before mutation. Exact owned bytes are not native compatibility proof
// after a binary upgrade: the old patch can mask a newly shipped original.
export function inspectFramePatch(home, root = bundle, frame, { binary } = {}) {
  const patch = loadFrameRegistry(root).find(patch => patch.id === frame);
  if (!patch) throw Error(`Unregistered frame patch: ${frame}`);
  const raw = read(path.join(home, `.customizations/frame-${frame}.json`));
  const state = raw === null ? null : JSON.parse(raw);
  if (state && (state.version !== 1 || !state.original || !state.installed
      || typeof state.original !== 'object' || typeof state.installed !== 'object'
      || (state.previousOriginals !== undefined && (!Array.isArray(state.previousOriginals) || !state.previousOriginals.every(text => typeof text === 'string')))))
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
  let reviewed = originals.indexOf(current['main.js']);
  const stock = reviewed !== -1;
  if (!stock && recognized('main.js')) {
    if (binary === undefined) {
      const exe = process.env.HERDR_APP_BIN || path.join(process.env.LOCALAPPDATA ?? '', 'Programs/herdr-app/herdr-app.exe');
      try { binary = fs.readFileSync(exe); } catch { binary = null; }
    }
    const matches = originals.flatMap((text, index) => Buffer.isBuffer(binary) && binary.includes(Buffer.from(text)) ? [index] : []);
    // LF/CRLF aliases may select one payload, but conflicting native evidence
    // must never silently choose a release by registry order.
    const mains = new Set(matches.map(index => patch.mainByOriginal?.[patch.originals[index]] ?? patch.files['main.js']));
    reviewed = mains.size === 1 ? matches[0] : -1;
  }
  if (reviewed === -1) {
    const retained = Boolean(recognized('main.js') && !stock);
    return {ok:true, status:'skipped', active, retained,
      advisory:`Optional ${frame} patch skipped: ${retained ? 'retained owned patch, current host native original unreviewed' : 'unsupported original/unknown target'}; bytes and opt-in unchanged. Review/rebase the native patch to restore supported customization.`};
  }
  const original = patch.originals[reviewed];
  return {ok:true, status:'ready', active, original, main:patch.mainByOriginal?.[original] ?? patch.files['main.js']};
}
export function framePatch(action, home, root = bundle, frame, options = {}) {
  if (!['apply', 'check', 'restore', 'inspect'].includes(action)) throw Error(`Unknown frame patch action: ${action}`);
  if (action === 'inspect') return inspectFramePatch(home, root, frame, options);
  const inspection = ['apply', 'check'].includes(action) ? inspectFramePatch(home, root, frame, options) : null;
  if (inspection?.status === 'skipped') {
    if (action === 'apply') throw Error(inspection.advisory);
    return inspection.advisory;
  }
  const patch = loadFrameRegistry(root).find(patch => patch.id === frame);
  if (!patch) throw Error(`Unregistered frame patch: ${frame}`);
  const dir = path.join(home, patch.target);
  const stateFile = path.join(home, `.customizations/frame-${frame}.json`);
  const stateRaw = read(stateFile);
  const state = stateRaw === null ? null : JSON.parse(stateRaw);
  if (state && (state.version !== 1 || !state.original || !state.installed
    || (state.previousOriginals !== undefined && (!Array.isArray(state.previousOriginals) || !state.previousOriginals.every(text => typeof text === 'string'))))) throw Error(`Unrecognized ${frame} patch record; nothing changed.`);
  const sources = { ...patch.files, ...(inspection ? { 'main.js': inspection.main } : {}) };
  // Dependencies first on apply, entrypoint first on restore, regardless of JSON order.
  const names = [...Object.keys(sources).filter(name => name !== 'main.js'), 'main.js'];
  const current = Object.fromEntries(names.map(n => [n, read(path.join(dir, n))]));
  const originals = patch.originals.map(source => read(path.join(root, source)));
  if (originals.some(text => text === null)) throw Error(`Missing original ${frame} snapshot; nothing changed.`);
  const supportedStock = originals.includes(current['main.js']);
  const recognized = n => state && [state.installed[n], state.previousInstalled?.[n], hash(state.original[n] ?? null)].includes(hash(current[n]));
  if (action === 'apply') {
    if(frame==='palette'&&fs.existsSync(path.join(home,'.customizations/palette-binding.json')))throw Error('Native palette patch is retired by the owned Custom palette; use its guarded binding repair.');
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
    // A reviewed reset/update rebases recovery to actual current native stock,
    // including when old owned code masks it. Keep earlier raw backups too.
    const native = supportedStock ? current['main.js'] : read(path.join(root, inspection.original));
    next.previousOriginals = [...(state?.previousOriginals ?? [])];
    const prior = state?.original['main.js'];
    if (prior != null && prior !== native && !next.previousOriginals.includes(prior)) next.previousOriginals.push(prior);
    next.original['main.js'] = native;
    atomic(stateFile, JSON.stringify(next, null, 2) + '\n');
    for (const n of names) if ((n === 'main.js' && changed) || current[n] !== payload[n]) {
      if (read(path.join(dir, n)) !== current[n]) throw Error(`${frame} file changed during apply: ${n}; stopped safely.`);
      atomic(path.join(dir, n), payload[n]);
    }
    return `Custom ${frame} frame applied (other layouts retain stock styling).`;
  }
  if (!state) return `No ${frame} frame patch is installed.`;
  if (action === 'check') {
    for (const n of names) if (hash(current[n]) !== state.installed[n]
      || (n === 'main.js' && patch.mainByOriginal && current[n] !== read(path.join(root, sources[n])))) throw Error(`${frame} patch is inactive or changed: ${n}. Herdr may have restored its frame on startup; reapply explicitly.`);
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
  fs.unlinkSync(stateFile);
  return `${frame} frame restored; personal settings and shortcuts unchanged.`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const home = process.argv[4] || process.env.HERDR_APP_HOME || path.join(process.env.USERPROFILE, '.config/herdr-app');
  try { const result = framePatch(process.argv[2], home, bundle, process.argv[3]); console.log(typeof result === 'string' ? result : JSON.stringify(result)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
