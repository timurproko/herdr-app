// The Files implementation is packaged into its own mod, not peers. File tabs are part
// of the plugin: turning it off closes them, and the viewer refuses to render while off.
import { closeFileViewers } from './viewers.js';
export default {
  id: 'files', name: 'Files', category: 'Sidebar', version: '1.0.0', icon: 'mods/custom-workspace-chrome/files.svg',
  description: 'Browse local and SSH folders, preview files in tabs, and recycle files and folders.',
  defaultEnabled: true,
  sidebar: { id: 'files', name: 'Files', mod: 'custom-files', icon: 'mods/custom-workspace-chrome/files.svg' },
  onEnabledChange(next) { if (!next) closeFileViewers(); },
};
