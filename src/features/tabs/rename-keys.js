// Custom's key/palette command receiver. Rename editors stay with their owning
// mods; all closes that remove a space use the shared private confirmation.
// The tab bar is always shown in Custom; no native Prompt/Confirm patch needed.
import { nextCommand, run, spaces, readTextFile } from './host.js';
import { requestInlineTabRename } from './tab-rename.js';
import { requestInlineSpaceRename } from './space-rename.js';
import { closeWithConfirmation } from './close-space.js';
import { routeTabMove } from './tab-moves.js';
import { composeProfiles } from './profiles.js';
import { launchSpaceProfile } from './profile-actions.js';
import { warmSpaceStartFolder } from './directory.js';

// New tab from the keyboard (Ctrl+Shift+T in Custom): the + menu's Terminal row, so it starts
// where that row does: the selected tab's folder, except a crew worker's copy.
export function routeNewTab(command) {
  if (command !== 'new-tab') return false;
  const space = spaces().find(s => s.active), machine = space?.machine ?? null;
  const terminal = space ? composeProfiles(machine, []).find(p => p.key === 'terminal') : null;
  if (terminal) launchSpaceProfile(terminal, space.id, machine);
  else run('tab.new'); // No space shown: Herdr's own new tab.
  return true;
}

export const RENAME_COMMANDS = Object.freeze({ 'rename-tab': 'tab.rename', 'rename-space': 'space.rename' });

export function routeRename(command) {
  const name = Object.hasOwn(RENAME_COMMANDS, command) ? RENAME_COMMANDS[command] : null;
  if (!name) return false;
  const request = { command: { name, args: {} } };
  const inline = name === 'tab.rename' ? requestInlineTabRename(request) : requestInlineSpaceRename(request);
  if (!inline) run(name); // Hidden sidebar or no inline target: Herdr asks with its own prompt.
  return true;
}

export const CLOSE_COMMANDS = Object.freeze({ 'close-tab': 'tab.close', 'close-pane': 'pane.close', 'close-space': 'space.close' });

export function routeClose(command) {
  if (!Object.hasOwn(CLOSE_COMMANDS, command)) return false;
  closeWithConfirmation(CLOSE_COMMANDS[command]);
  return true;
}

export function startRenameKeys(cx) {
  cx.spawn(async cx => {
    for (;;) {
      const command = await nextCommand();
      if (routeTabMove(command, cx) || routeRename(command) || routeClose(command) || routeNewTab(command)) cx.notify();
    }
  });
  // A key has no menu opening first: keep the shown space's start folder known (a worker
  // copy's .git file is read once, then remembered).
  cx.timer.every(2000, () => { warmSpaceStartFolder(spaces().find(s => s.active), readTextFile).catch(() => {}); });
}
