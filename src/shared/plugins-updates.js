import { hc, machines, shared, setShared, checking } from './host.js';
import { PLUGINS, pluginSetting } from './plugins.js';
import { pluginMachineContext, checkPluginUpdate, runPluginFixes, reconcilePluginFix, pluginOperationId, latestPluginUpdateCheck } from './plugins-operations.js';
import { settingsCommands } from './settings-requests.js';

export const PLUGIN_UPDATES_KEY = 'custom.plugin-updates';
const INTERVAL = 120000, LEASE = 90000;
export const pluginUpdateSnapshot = () => {
  const value = shared(PLUGIN_UPDATES_KEY) ?? {};
  // An abandoned native Task cannot leave an eternal spinner or grant replay.
  if (value.batch?.running && value.batch.expires <= Date.now()) return { ...value, batch: { ...value.batch, running: false },
    rows: value.rows?.map(row => row.outcome === 'running' ? { ...row, outcome: 'unknown', error: 'Update outcome unknown.' }
      : ['checking', 'queued'].includes(row.outcome) ? { ...row, outcome: 'failed', error: 'Not updated.' } : row) };
  return value;
};
const providers = () => PLUGINS.flatMap(plugin => (plugin.prerequisites ?? [])
  .filter(pre => pre.updates === true).map(pre => ({ plugin, pre })));
const id = pluginOperationId;
const connected = machine => machine === null || machines().some(m => m.name === machine && m.layout === 'ready');
export const pluginUpdateAvailable = () => (pluginUpdateSnapshot().rows ?? []).some(row => row.pending && connected(row.machine));
const errorText = error => String(error?.message ?? error).split(/[\r\n]/)[0].slice(0, 240);
const publish = value => setShared(PLUGIN_UPDATES_KEY, value);
const generation = plugin => JSON.stringify((plugin.settings ?? []).filter(def => def.type !== 'machine').map(def => [def.key, pluginSetting(plugin, def.key)]));
const configuration = () => JSON.stringify(providers().map(({ plugin, pre }) => [plugin.id, pre.id, generation(plugin)]));

// The ordinary Plugins page and background discovery publish the same facts.
export function recordPluginUpdate(machine, plugin, result) {
  if (!result.updates || !latestPluginUpdateCheck(machine, plugin, result)) return;
  reconcilePluginFix(machine, plugin, result, result);
  const snapshot = pluginUpdateSnapshot(), key = id(machine, plugin, result);
  const old = snapshot.rows?.find(row => row.id === key);
  const pending = result.update === true && typeof result.fix?.run === 'function' ? true
    : result.update === false ? false : Boolean(old?.pending);
  const row = { id: key, machine, plugin: plugin.id, prerequisite: result.id, name: plugin.name,
    pending, detail: typeof result.detail === 'string' ? result.detail.slice(0, 240) : '',
    ...(old?.outcome && !(old.outcome === 'updated' && pending) && !(result.update === false && result.status !== 'ready')
      ? { outcome: result.update === false ? 'updated' : old.outcome, error: result.update === false ? null : old.error } : {}) };
  publish({ ...snapshot, machines: [...new Set([null, ...(snapshot.machines ?? []), machine])],
    rows: [...(snapshot.rows ?? []).filter(row => row.id !== key), row] });
}

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

export function pluginUpdateRows() {
  const snapshot = pluginUpdateSnapshot(), order = snapshot.machines ?? [null];
  return (snapshot.rows ?? []).filter(row => row.outcome || row.pending && connected(row.machine))
    .sort((a, b) => order.indexOf(a.machine) - order.indexOf(b.machine));
}

export function updatePlugins(owner, cx) {
  if (checking() || owner.pluginUpdatesClosed || owner.pluginFixing) return;
  const before = pluginUpdateSnapshot();
  if (before.batch?.running) return;
  const rows = (before.rows ?? []).filter(row => row.pending && connected(row.machine));
  if (!rows.length) return;
  const token = `${Date.now()}-${Math.random()}`;
  publish({ ...before, scan: null, batch: { token, running: true, expires: Date.now() + 360000 },
    rows: before.rows.map(row => rows.some(candidate => candidate.id === row.id) ? { ...row, outcome: 'queued', error: null } : row) });
  let task;
  task = cx.spawn(async taskContext => {
    await Promise.resolve();
    const done = () => Boolean(task?.is_done?.());
    const current = () => !owner.pluginUpdatesClosed && !done() && pluginUpdateSnapshot().batch?.token === token;
    const change = (key, values) => {
      if (!current()) return;
      const snapshot = pluginUpdateSnapshot();
      publish({ ...snapshot, batch: { ...snapshot.batch, expires: Date.now() + 360000 },
        rows: snapshot.rows.map(row => row.id === key ? { ...row, ...values } : row) });
      cx.notify();
    };
    try {
      const targets = await pluginUpdateMachines({ isCurrent: current }, taskContext, done);
      if (!current()) return;
      publish({ ...pluginUpdateSnapshot(), machines: targets });
      for (const machine of [...targets, ...(before.machines ?? []).filter(name => !targets.includes(name))]) {
        const selected = rows.filter(row => row.machine === machine);
        let failed = false;
        for (const row of selected) {
          if (!current()) return;
          if (!targets.includes(machine) || !connected(machine)) {
            change(row.id, { outcome: 'failed', error: 'Machine not connected.' }); continue;
          }
          if (failed) { change(row.id, { outcome: 'failed', error: 'Not updated after this machine failed.' }); continue; }
          const provider = providers().find(({ plugin, pre }) => plugin.id === row.plugin && pre.id === row.prerequisite);
          if (!provider) { change(row.id, { outcome: 'failed', error: 'Update is unavailable.' }); continue; }
          const { plugin, pre } = provider;
          const captured = generation(plugin);
          const context = pluginMachineContext(plugin, { machine, current: () => current() && connected(machine) && generation(plugin) === captured, task: taskContext, done });
          let result;
          const recheck = async () => {
            result = await checkPluginUpdate(plugin, pre, { ...context, session: {} }, taskContext, done);
            if (!current()) return;
            reconcilePluginFix(machine, plugin, pre, result);
            change(row.id, { pending: result.update === false ? false : true });
          };
          try {
            change(row.id, { outcome: 'checking' });
            await recheck();
            if (!current()) return;
            if (result.update === false) { change(row.id, { outcome: result.status === 'ready' ? 'updated' : null, error: null }); continue; }
            if (result.update !== true || typeof result.fix?.run !== 'function') throw Error(result.status === 'error' && result.detail ? result.detail : 'Could not verify the pending update.');
            await runPluginFixes(plugin, [result], context, {
              onItem: () => change(row.id, { outcome: 'running' }), recheck,
            });
            if (!current()) return;
            const verified = result.update === false && result.status === 'ready';
            failed = !verified;
            change(row.id, verified ? { outcome: 'updated', error: null }
              : { outcome: 'failed', error: result.update === true ? 'Update is still available.' : 'Could not verify the update.' });
          } catch (error) {
            failed = true;
            change(row.id, { outcome: error.uncertain ? 'unknown' : 'failed', error: errorText(error) });
          }
        }
      }
    } catch (error) {
      for (const row of rows) change(row.id, { outcome: 'failed', error: errorText(error) });
    } finally {
      if (pluginUpdateSnapshot().batch?.token === token) {
        const snapshot = pluginUpdateSnapshot();
        publish({ ...snapshot, batch: { ...snapshot.batch, running: false }, nextCheck: Date.now() + INTERVAL,
          rows: snapshot.rows.map(row => ['running', 'checking', 'queued'].includes(row.outcome)
            ? { ...row, outcome: row.outcome === 'running' ? 'unknown' : 'failed', error: row.outcome === 'running' ? 'Could not verify the update.' : 'Not updated.' } : row) });
        cx.notify();
      }
    }
  });
}

export function refreshPluginUpdates(owner, cx, { force = false } = {}) {
  if (checking() || owner.pluginUpdatesClosed) return;
  const before = pluginUpdateSnapshot(), now = Date.now();
  const captured = configuration();
  if (before.batch?.running || (before.scan?.expires > now && before.scan.configuration === captured) || (!force && before.nextCheck > now)) return;
  const token = `${now}-${Math.random()}`, scan = { token, configuration: captured, expires: now + LEASE };
  publish({ ...before, scan });
  let task;
  task = cx.spawn(async taskContext => {
    // Native spawn may begin inline; no IO/publication on a render stack.
    await Promise.resolve();
    const done = () => Boolean(task?.is_done?.());
    const current = () => !owner.pluginUpdatesClosed && !done() && pluginUpdateSnapshot().scan?.token === token && configuration() === captured;
    const context = { isCurrent: current };
    try {
      const targets = await pluginUpdateMachines(context, taskContext, done);
      if (!current()) return;
      const kept = (pluginUpdateSnapshot().rows ?? []).filter(row => targets.includes(row.machine));
      publish({ ...pluginUpdateSnapshot(), rows: kept, machines: targets });
      for (const machine of targets) for (const { plugin, pre } of providers()) {
        if (!current()) return;
        publish({ ...pluginUpdateSnapshot(), scan: { token, configuration: captured, expires: Date.now() + LEASE } });
        const result = await checkPluginUpdate(plugin, pre, pluginMachineContext(plugin, {
          machine, current, task: taskContext, done,
        }), taskContext, done);
        if (!current()) return;
        recordPluginUpdate(machine, plugin, result);
      }
      if (current()) publish({ ...pluginUpdateSnapshot(), error: null, nextCheck: Date.now() + INTERVAL });
    } catch (error) {
      if (current()) publish({ ...pluginUpdateSnapshot(), error: errorText(error), nextCheck: Date.now() + INTERVAL });
    } finally {
      if (current()) { publish({ ...pluginUpdateSnapshot(), scan: null }); cx.notify(); }
    }
  });
}
