// Captured machine contexts and admission shared by Settings plugin entrypoints.
import { pluginContext, pluginEnabled, checkPlugin } from './plugins.js';
import { settingsCommands, settingsGroups } from './settings-requests.js';

export function pluginMachineContext(plugin, { machine = null, current = () => true, task, done, session = {} } = {}) {
  const base = pluginContext(plugin);
  return { ...base, machine, session, isCurrent: current, enabled: () => pluginEnabled(plugin),
    // A read/action target must never be selected by changing portable settings.
    setting: key => plugin.settings?.some(def => def.key === key && def.type === 'machine') ? machine : base.setting(key),
    ...(task ? { request: (work, options = {}) => settingsCommands(work, {
      retry: true, ...options, current, done, sleep: ms => task.sleep(ms),
    }) } : {}),
  };
}

export async function checkPluginUpdate(plugin, prerequisite, context, task, done) {
  return settingsGroups(async () => (await checkPlugin({ ...plugin, prerequisites: [prerequisite] }, {
    ...context, updateCheck: true, checkReason: 'automatic',
  }))[0], { current: context.isCurrent, done, sleep: ms => task.sleep(ms) });
}
