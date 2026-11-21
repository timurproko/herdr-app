// A1 integration. Feature switches never gate vanilla program-status/name reporting.
import { a1Enabled, setA1Enabled, legacyColorPreference, matchAgentSessionColor, invalidateColorSync } from './state.js';
import { AgentSpaceColors } from './session-sync.js';
import { launchColorArgv } from './launch-color.js';

// One sync per Spaces view copy, kept for as long as that copy lives.
const syncs = new WeakMap();

export default {
  id: 'a1-colors',
  name: 'A1',
  category: 'agents',
  version: '3.1.0',
  icon: 'agent',
  description: 'Match A1 agents to their space’s color. Native A1 name updates always keep working.',
  state: { get: a1Enabled, set: setA1Enabled },
  prerequisites: [],
  settings: [
    { key: 'matchSpaceColor', type: 'toggle', label: 'Match space color', get default() { return legacyColorPreference(); } },
  ],
  onSettingChange(key) { if (key === 'matchSpaceColor') invalidateColorSync(); },
  events: {
    // { owner, cx }: Spaces looked at its spaces again (startup, changes, its timer).
    'spaces.refresh'({ owner, cx }) {
      let sync = syncs.get(owner);
      if (!sync) syncs.set(owner, sync = new AgentSpaceColors());
      sync.refresh(cx);
    },
  },
  transforms: {
    // An agent profile is about to start in a space: A1 starts in that space's color.
    'profile.launch'(argv, { space }) { return matchAgentSessionColor() ? launchColorArgv(argv, space) : argv; },
  },
};
