// One catalog for navigation, configuration, shortcuts and portable preference IDs.
// Every section gets a shortcut automatically; metadata only customizes defaults.
export const SETTINGS_SECTIONS = [
  { id: 'look', title: 'Look', icon: 'palette' },
  { id: 'keyboard', title: 'Keyboard', icon: 'keyboard', platform: 'macos' },
  { id: 'machines', title: 'Machines', icon: 'server', shortcut: { defaultVisible: true, order: 1 } },
  { id: 'core', title: 'Core', icon: 'cpu' },
  { id: 'spaces', title: 'Spaces', icon: 'layers' },
  { id: 'profiles', title: 'Profiles', icon: 'agent' },
  { id: 'terminals', title: 'Terminals', icon: 'terminal' },
  { id: 'usage', title: 'Usage', icon: 'gauge', plugin: 'usage', machineScoped: true, shortcut: {
    defaultVisible: true, order: 0, icon: 'mods/custom-usage/gauge.svg',
    action: { command: 'mod.open', args: { name: 'custom-usage' } },
  } },
  { id: 'plugins', title: 'Plugins', icon: 'plug', shortcut: { defaultVisible: true, side: 'right', order: 2 } },
  { id: 'alerts', title: 'Alerts', icon: 'bell' },
  { id: 'updates', title: 'Updates', icon: 'refresh' },
  { id: 'privacy', title: 'Privacy', icon: 'shield' },
];
export const settingsSections = platform => SETTINGS_SECTIONS.filter(s => !s.platform || s.platform === platform);

// The global Settings escape hatch is not an optional section shortcut.
const GLOBAL_SETTINGS = {
  id: 'settings', label: 'Settings', icon: 'mods/custom-workspace-chrome/settings.svg',
  side: 'right', defaultVisible: true, required: true, order: 3,
  action: { command: 'custom.settings', args: { section: 'look' } },
};
export function settingsShortcuts() {
  return [...SETTINGS_SECTIONS.map(({ shortcut = {}, ...section }) => ({
    ...section, label: section.title, icon: `mods/custom-settings/${section.icon}.svg`,
    side: 'left', defaultVisible: false,
    action: { command: 'custom.settings', args: { section: section.id } },
    ...shortcut,
  })), GLOBAL_SETTINGS].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
}
