// Follow the active tab's live terminal folder, not its launch/space folder.
import { focused, panes, spaces, terminals } from './host.js';
import { paneDirectory } from './directory.js';
export function location(previous) {
  const space = spaces().find(s => s.active), f = focused(), all = panes();
  const tab = space?.tabs?.find(t => t.active)?.id;
  const mine = all.filter(p => p.tab === tab);
  const matchingFocus = f && (!f.space || f.space === space?.id) && (!f.tab || f.tab === tab);
  let pane;
  if (matchingFocus) {
    const terminal = f.shown ?? f.terminal;
    pane = terminal ? all.find(p => p.terminal === terminal) ?? {terminal, cwd:f.cwd}
      : mine.find(p => p.pane === f.pane);
  }
  pane ??= mine.find(p => p.focused) ?? mine[0];
  // File tabs retain the explorer they were opened from; their viewer has its
  // own immutable path/machine and must never redirect to a background tab.
  if (pane?.mod === 'custom-files' && previous?.space === space?.id)
    return {cwd:previous.cwd, on:previous.on, space:space.id, terminal:previous.terminal??null, tab:tab??null};
  const terminal = pane?.mod ? null : pane?.terminal;
  const on = terminal ? (terminal.includes('/') ? terminal.split('/')[0] : null) : space?.machine ?? null;
  const {cwd} = paneDirectory(pane, terminals(), matchingFocus ? f : null);
  return {cwd, on, space:space?.id, terminal:terminal??null, tab:tab??null};
}
