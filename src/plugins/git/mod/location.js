// Resolve Git against the selected tab's live directory, never its launch folder.
import { focused, panes, spaces, terminals } from './host.js';
import { paneDirectory } from './directory.js';

export function namedPullNumber(tab) {
  const match = tab?.named === true ? /^(?:PR\s*#?\s*|#)?([1-9]\d*)$/i.exec(tab.name.trim()) : null;
  const number = match ? Number(match[1]) : null;
  return Number.isSafeInteger(number) ? number : null;
}

// A frame may reuse pure selection/directory facts, never read or action
// authority. All non-render callers omit the snapshot and resolve live state.
export function location(snapshot) {
  if(snapshot?.place)return snapshot.place;
  const space = (snapshot?.groups??spaces()).find(s => s.active), f = focused(), all = snapshot?.all??panes();
  const selectedTab = space?.tabs?.find(t => t.active), tab = selectedTab?.id;
  const mine = all.filter(p => p.tab === tab);
  const matchingFocus = f && (!f.space || f.space === space?.id) && (!f.tab || f.tab === tab);
  let pane;
  if (matchingFocus) {
    const terminal = f.shown ?? f.terminal;
    pane = terminal ? all.find(p => p.terminal === terminal) ?? {terminal, cwd:f.cwd}
      : mine.find(p => p.pane === f.pane);
  }
  pane ??= mine.find(p => p.focused) ?? mine[0];
  const terminal = pane?.mod ? null : pane?.terminal ?? null;
  const on = terminal ? (terminal.includes('/') ? terminal.split('/')[0] : null) : space?.machine ?? null;
  const list = snapshot?.list??terminals();
  const {cwd} = paneDirectory(pane, list, matchingFocus ? f : null);
  const app = pane?.app ?? list.find(t => t.address === terminal)?.report?.app ?? null;
  // Agents can switch worktrees internally while their parent shell stays on develop.
  // An explicitly PR-named tab is a stronger link than that shell's branch.
  // Never interpret Herdr's automatic positional tab names as PR numbers, or
  // inherit the underlying tab's link when showing a different/peek terminal.
  const pullNumber = terminal && pane?.tab === tab ? namedPullNumber(selectedTab) : null;
  const place={cwd, on, terminal, space:space?.id, tab, pullNumber, app};
  if(snapshot)snapshot.place=place;
  return place;
}
