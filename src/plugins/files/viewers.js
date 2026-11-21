// File tabs belong to the Files plugin: turning it off closes every open file viewer.
// A tab holding only file viewers closes whole (never confirmed, so closing a space's
// last tab still asks); a viewer split beside other panes closes on its own.
import { panes, run } from '../api.js';

export const FILE_VIEWER_MOD = 'custom-files';

export function closeFileViewers({ list = panes, command = run } = {}) {
  const all = (list() ?? []).filter(p => p && p.tab != null);
  const viewers = all.filter(p => p.mod === FILE_VIEWER_MOD);
  const tabs = new Set();
  for (const pane of viewers) {
    if (all.every(p => p.tab !== pane.tab || p.mod === FILE_VIEWER_MOD)) {
      if (tabs.has(pane.tab)) continue;
      tabs.add(pane.tab); command('tab.close', { id: pane.tab });
    } else command('pane.close', { pane: pane.pane });
  }
  return viewers.length;
}
