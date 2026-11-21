// Runs locally after Custom mounts, after Herdr has seeded its shipped files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { framePatch } from './frame-patch.mjs';
import { loadFrameRegistry } from './frame-registry.mjs';
const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function restoreStartupFrames(home, root = bundle) {
  const owner = path.join(home, '.customizations');
  const frames = loadFrameRegistry(root).map(patch => patch.id).filter(frame => fs.existsSync(path.join(owner, `frame-${frame}.json`)));
  if (!frames.length) return { ok: true, frames: {} }; // Never opt a user in.
  const lock = path.join(owner, 'startup-frames.lock');
  let fd;
  try { fd = fs.openSync(lock, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    // An interrupted worker may leave its lock. Never steal a live worker's.
    let pid;
    try { pid = Number(fs.readFileSync(lock, 'utf8')); } catch { return { busy: true }; }
    if (!Number.isSafeInteger(pid) || pid <= 0) return { busy: true };
    try { process.kill(pid, 0); return { busy: true }; }
    catch (probe) { if (probe.code !== 'ESRCH') return { busy: true }; }
    // Use a later mount/retry to acquire the lock, not a racy recursive repair.
    try { fs.unlinkSync(lock); } catch {}
    return { busy: true };
  }
  try {
    fs.writeFileSync(fd, String(process.pid));
    const results = Object.create(null);
    for (const frame of frames) {
      try { results[frame] = { ok: true, message: framePatch('apply', home, root, frame) }; }
      catch (error) { results[frame] = { ok: false, error: error.message }; }
    }
    return { ok: Object.values(results).every(result => result.ok), frames: results };
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (!process.argv[2]) throw Error('App home is required.');
    const result = restoreStartupFrames(path.resolve(process.argv[2]));
    console.log(JSON.stringify(result));
    if (result.busy) process.exitCode = 75;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
