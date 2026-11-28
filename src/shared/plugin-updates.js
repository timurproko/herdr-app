import { hc, machines, shared, setShared, checking } from './host.js';
import { PLUGINS } from './plugins.js';
import { pluginMachineContext, checkPluginUpdate } from './plugin-operations.js';
import { settingsCommands } from './settings-requests.js';

export const PLUGIN_UPDATES_KEY = 'custom.plugin-updates';
const INTERVAL = 120000, LEASE = 90000;
export const pluginUpdateSnapshot = () => shared(PLUGIN_UPDATES_KEY) ?? {};
const providers = () => PLUGINS.flatMap(plugin => (plugin.prerequisites ?? [])
  .filter(pre => pre.updates === true).map(pre => ({ plugin, pre })));
const id = (machine, plugin, pre) => JSON.stringify([machine, plugin.id, pre.id]);
const connected = machine => machine === null || machines().some(m => m.name === machine && m.layout === 'ready');
export const pluginUpdateAvailable = () => (pluginUpdateSnapshot().rows ?? []).some(row => row.pending && connected(row.machine));
const errorText = error => String(error?.message ?? error).split(/[\r\n]/)[0].slice(0, 240);
const publish = value => setShared(PLUGIN_UPDATES_KEY, value);

// This is the same peer inventory/order used by deploy:all, never alphabetical.
export async function pluginUpdateMachines(context, task, done) {
  const result = await settingsCommands(() => hc(['machine', 'ls', '--json']), {
    current: context.isCurrent, done, sleep: ms => task.sleep(ms), retry: true, timeout: 17000,
  });
  let list;
  try { list = JSON.parse(result.stdout).machines; } catch {}
  if (result.code !== 0 || !Array.isArray(list) || list.some(m => typeof m?.name !== 'string' || !m.name))
    throw Error('Could not check connected machines.');
  return [null, ...new Set(list.filter(m => m.state === 'connected').map(m => m.name))];
}

export function refreshPluginUpdates(owner, cx, { force = false } = {}) {
  if (checking() || owner.pluginUpdatesClosed) return;
  const before = pluginUpdateSnapshot(), now = Date.now();
  if (before.batch?.running || before.scan?.expires > now || (!force && before.nextCheck > now)) return;
  const token = `${now}-${Math.random()}`, scan = { token, expires: now + LEASE };
  publish({ ...before, scan });
  let task;
  task = cx.spawn(async taskContext => {
    // Native spawn may begin inline; no IO/publication on a render stack.
    await Promise.resolve();
    const done = () => Boolean(task?.is_done?.());
    const current = () => !owner.pluginUpdatesClosed && !done() && pluginUpdateSnapshot().scan?.token === token;
    const context = { isCurrent: current };
    try {
      const targets = await pluginUpdateMachines(context, taskContext, done);
      if (!current()) return;
      const kept = (pluginUpdateSnapshot().rows ?? []).filter(row => targets.includes(row.machine));
      publish({ ...pluginUpdateSnapshot(), rows: kept, machines: targets });
      for (const machine of targets) for (const { plugin, pre } of providers()) {
        if (!current()) return;
        publish({ ...pluginUpdateSnapshot(), scan: { token, expires: Date.now() + LEASE } });
        const result = await checkPluginUpdate(plugin, pre, pluginMachineContext(plugin, {
          machine, current, task: taskContext, done,
        }), taskContext, done);
        if (!current()) return;
        const snapshot = pluginUpdateSnapshot(), key = id(machine, plugin, pre);
        const old = snapshot.rows?.find(row => row.id === key);
        // Missing/unknown/error evidence cannot clear last-confirmed availability.
        const pending = result.update === true && typeof result.fix?.run === 'function' ? true
          : result.update === false ? false : Boolean(old?.pending);
        const row = { id: key, machine, plugin: plugin.id, prerequisite: pre.id, name: plugin.name,
          pending, detail: typeof result.detail === 'string' ? result.detail.slice(0, 240) : '',
          ...(old?.outcome ? { outcome: old.outcome, error: old.error } : {}) };
        publish({ ...snapshot, rows: [...(snapshot.rows ?? []).filter(row => row.id !== key), row] });
      }
      if (current()) publish({ ...pluginUpdateSnapshot(), error: null, nextCheck: Date.now() + INTERVAL });
    } catch (error) {
      if (current()) publish({ ...pluginUpdateSnapshot(), error: errorText(error), nextCheck: Date.now() + INTERVAL });
    } finally {
      if (current()) { publish({ ...pluginUpdateSnapshot(), scan: null }); cx.notify(); }
    }
  });
}
