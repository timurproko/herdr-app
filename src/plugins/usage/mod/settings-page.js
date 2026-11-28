// Usage's page in Settings, declared (docs/PLUGIN-UI.md): Settings draws it with the same
// rows and controls as every plugin, so this file has no UI code. Usage owns where the
// values live: per machine, in its shared preferences, for the machine chosen in the
// Settings header.
import { preferences, updatePreferences, refresh, cache } from './store.js';
import { pluginIsEnabled } from './plugins.js';
import { resetChoiceGroups } from './model.js';

export const usagePage = Object.freeze({
  id: 'usage', title: 'Usage', about: 'Account quota preferences for the selected machine.', machine: true,
  enabled: () => pluginIsEnabled('usage'),
  // The header's Refresh: asks every provider again for the machine in the Settings header.
  refresh: Object.freeze({
    label: 'Refresh usage', busyLabel: 'Refreshing usage…',
    enabled: machine => preferences(machine).enabled,
    busy: machine => Boolean(cache(machine).loading),
    run: (machine, cx) => refresh(machine, cx, { force: true }),
  }),
  fields: Object.freeze([
    { key: 'enabled', type: 'toggle', label: 'Check usage', about: 'Reads this machine’s CLI account quotas.',
      get: machine => preferences(machine).enabled,
      set: (machine, enabled, cx) => { updatePreferences(machine, { enabled }); if (enabled) refresh(machine, cx); } },
    { key: 'summary', type: 'toggle', label: 'Summary in sidebar', about: 'Pinned quotas appear together in the sidebar footer.',
      get: machine => preferences(machine).summary, set: (machine, summary) => updatePreferences(machine, { summary }) },
    { key: 'claude-automatic', type: 'toggle', label: 'Automatic Claude account', about: 'Use the selected Claude session’s account when opening Usage.',
      get: machine => preferences(machine).claudeAutomatic, set: (machine, claudeAutomatic) => updatePreferences(machine, { claudeAutomatic }) },
    { key: 'automatic-reset', type: 'toggle', label: 'Automatic reset',
      get: machine => preferences(machine).automaticReset,
      set: (machine, automaticReset, cx) => { updatePreferences(machine, { automaticReset }); if(automaticReset)refresh(machine,cx); },
      checkboxGroups: {
        title: 'Resets', groups: machine => resetChoiceGroups(cache(machine).reports),
        selected: machine => preferences(machine).resetSelections,
        set: (machine,key,on) => { const selected=preferences(machine).resetSelections;
          updatePreferences(machine,{resetSelections:on?[...new Set([...selected,key])]:selected.filter(value=>value!==key)}); },
      } },
    { key: 'percentages', type: 'choice', label: 'Percentages', about: 'Choose how quota percentages are displayed.',
      options: [[false, 'Used'], [true, 'Remaining']],
      get: machine => preferences(machine).remaining, set: (machine, remaining) => updatePreferences(machine, { remaining }) },
  ]),
});
