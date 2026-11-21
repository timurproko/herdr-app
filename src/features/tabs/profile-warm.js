// Keep discovery out of the + popup's lifetime and critical click path.
import { machines, spaces } from './host.js';
import { warmProfiles, warmTerminalShells } from './profiles.js';

export function startProfileWarm(cx) {
  const busy = new Set();
  const refresh = cx => {
    const active = spaces().find(s => s.active)?.machine ?? null;
    const ready = machines().filter(m => m.layout === 'ready').map(m => m.name);
    // Local discovery can start while its first layout snapshot is still loading.
    const targets = [...new Set([null, ...ready])];
    targets.sort((a, b) => Number(b === active) - Number(a === active));
    for (const machine of targets) {
      if (busy.has(machine)) continue;
      busy.add(machine);
      cx.spawn(async cx => {
        try { await Promise.all([warmProfiles(machine), warmTerminalShells(machine)]); }
        catch { /* A failed/offline check never clears the last usable catalog. */ }
        finally { busy.delete(machine); }
      });
    }
  };
  refresh(cx);
  // Cache TTL keeps filesystem/shell probes to once a minute per machine.
  cx.timer.every(15000, refresh);
}
