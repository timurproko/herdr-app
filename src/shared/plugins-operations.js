// Captured machine contexts and admission shared by Settings plugin entrypoints.
import { pluginContext, pluginEnabled, checkPlugin } from './plugins.js';
import { settingsCommands, settingsGroups } from './settings-requests.js';
import { shared, setShared } from './host.js';

export function pluginMachineContext(plugin, { machine = null, current = () => true, task, done, session = {}, captureMachine = true } = {}) {
  const base = pluginContext(plugin);
  return { ...base, machine, session, isCurrent: current, enabled: () => pluginEnabled(plugin),
    // A read/action target must never be selected by changing portable settings.
    setting: key => captureMachine && plugin.settings?.some(def => def.key === key && def.type === 'machine') ? machine : base.setting(key),
    ...(task ? { request: (work, options = {}) => settingsCommands(work, {
      retry: true, ...options, current, done, sleep: ms => task.sleep(ms),
    }) } : {}),
  };
}

const OPERATIONS = 'custom.plugin-update-actions';
export const pluginOperationId = (machine, plugin, pre) => JSON.stringify([machine, plugin.id, pre.id]);
const operation = key => shared(OPERATIONS)?.[key];
export function pluginFixUncertain(machine, plugin, pre) {
  const state = operation(pluginOperationId(machine, plugin, pre));
  return Boolean(state && (state.state === 'unknown' || state.expires <= Date.now()));
}
export function reconcilePluginFix(machine, plugin, pre, result) {
  const key = pluginOperationId(machine, plugin, pre);
  if (result.update === false && pluginFixUncertain(machine, plugin, pre)) {
    const all = { ...shared(OPERATIONS) }; delete all[key]; setShared(OPERATIONS, all);
  }
}

// Both Settings entrypoints invoke this executor, never a copied install command.
// Uncertain submitted writes remain guarded across view/module replacement.
export async function runPluginFixes(plugin, items, context, { confirmed = false, onItem = () => {}, recheck = () => {} } = {}) {
  try {
    for (const item of items) {
      if (!context.isCurrent()) throw Object.assign(Error('Obsolete Settings request.'), { obsolete: true });
      if ((item.fix?.requiresEnabled || item.fix?.confirm) && !pluginEnabled(plugin)) throw Error('Plugin is turned off.');
      if (item.fix?.confirm && !confirmed) throw Error('This action needs confirmation in Plugins.');
      if (typeof item.fix?.run !== 'function') throw Error('Update is unavailable.');
      const key = pluginOperationId(context.machine, plugin, item), previous = item.updates && operation(key);
      if (previous) throw Error(previous.state === 'running' && previous.expires > Date.now()
        ? 'An update is already running on this machine.' : 'Previous update outcome unknown. Check this machine before retrying.');
      const token = `${Date.now()}-${Math.random()}`;
      if (item.updates) setShared(OPERATIONS, { ...shared(OPERATIONS), [key]: { token, state: 'running', expires: Date.now() + 360000 } });
      try {
        onItem(item);
        await item.fix.run(context);
        if (item.updates && operation(key)?.token === token) {
          const all = { ...shared(OPERATIONS) }; delete all[key]; setShared(OPERATIONS, all);
        }
      } catch (cause) {
        const error = cause && typeof cause === 'object' ? cause : new Error(String(cause));
        if (item.updates && operation(key)?.token === token) {
          const all = { ...shared(OPERATIONS) };
          if (error.uncertain || /timed?\s*out|disconnect|unreachable|outcome unknown/i.test(String(error.message))) {
            error.uncertain = true; all[key] = { ...all[key], state: 'unknown' };
          } else delete all[key];
          setShared(OPERATIONS, all);
        }
        throw error;
      }
    }
  } finally {
    if (context.isCurrent()) await recheck();
  }
}

const READS = 'custom.plugin-update-reads';
export function beginPluginUpdateCheck(machine, plugin, pre) {
  const token = `${Date.now()}-${Math.random()}`, key = pluginOperationId(machine, plugin, pre);
  const all = { ...shared(READS) }; delete all[key]; all[key] = token;
  setShared(READS, Object.fromEntries(Object.entries(all).slice(-256)));
  return token;
}
export const latestPluginUpdateCheck = (machine, plugin, result) => !result.updateRead ||
  shared(READS)?.[pluginOperationId(machine, plugin, result)] === result.updateRead;

export async function checkPluginUpdate(plugin, prerequisite, context, task, done) {
  return settingsGroups(async () => {
    const updateRead = beginPluginUpdateCheck(context.machine, plugin, prerequisite);
    const result = (await checkPlugin({ ...plugin, prerequisites: [{ ...prerequisite, updateRead }] }, {
      ...context, updateCheck: true, checkReason: 'automatic',
    }))[0];
    if (!latestPluginUpdateCheck(context.machine, plugin, result)) throw Object.assign(Error('Obsolete Settings request.'), { obsolete: true });
    return result;
  }, { current: context.isCurrent, done, sleep: ms => task.sleep(ms) });
}
