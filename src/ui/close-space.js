// Shared by Custom's close controls, keyboard receiver and palette routing.
// Direct native commands outside Custom retain their own validation/dialogs.
import { spaces, panes, agents, focused, run, openOverlay, notify } from './host.js';
import { spacePreferences } from './space-preferences.js';
import { ensureSpaceStart, isStartTab, workTabs } from './space-lifecycle.js';

// The hidden Start tab sits last, so natively closing the active tab next to it
// selects Start for a frame before the lifecycle switches back. Select the
// neighbouring work tab first; the close then removes an inactive tab.
function closeWorkTab(command, args, space, tab, allPanes) {
  // Only the shown tab can flash; selecting in a hidden space would switch spaces.
  if (!space.active || !tab?.active) return run(command, args);
  const work = workTabs(space, allPanes), at = work.findIndex(t => t.id === tab.id);
  const next = work[at + 1] ?? work[at - 1];
  if (!next || next.id === tab.id) return run(command, args);
  const explicit = command === 'tab.close' ? { ...args, id: tab.id } : { ...args, pane: args.pane ?? focused()?.pane };
  run('tab.select', { id: next.id });
  return run(command, explicit);
}

export function closeWithConfirmation(command, args = {}) {
  if (!['space.close', 'tab.close', 'pane.close'].includes(command) || args.confirmed === true) return run(command, args);
  const all = spaces(), allPanes = panes();
  let tabId = args.id;
  if (command === 'pane.close') {
    // Composition/peek focus must retain native validation, not borrow a pane.
    const paneId = args.pane ?? focused()?.pane;
    const pane = paneId && allPanes.find(p => p.pane === paneId);
    if (!pane || allPanes.filter(p => p.tab === pane.tab).length !== 1) return run(command, args);
    tabId = pane.tab;
  }
  const space = command === 'space.close'
    ? all.find(s => args.id != null ? s.id === args.id : s.active)
    : all.find(s => s.tabs?.some(tab => tabId != null ? tab.id === tabId : s.active && tab.active));
  if (!space) return run(command, args);
  const prefs = spacePreferences(), explicit = command === 'space.close';
  // A terminal-free Start page has no work to end; an explicit space close
  // should remove it immediately, regardless of last-tab confirmation settings.
  if (explicit && space.tabs.length > 0 && space.tabs.every(t => isStartTab(t, allPanes))) {
    return run('space.close', { id: space.id, confirmed: true });
  }
  const tab = !explicit && space.tabs.find(t => tabId != null ? t.id === tabId : t.active);
  if (!explicit) {
    if (isStartTab(tab, allPanes) && !prefs.closeOnLastTab) return;
    if (workTabs(space, allPanes).length > 1) return closeWorkTab(command, args, space, tab, allPanes);
    if (!isStartTab(tab, allPanes) && workTabs(space, allPanes).length !== 1) return run(command, args);
    tabId = tab.id;
    if (!prefs.closeOnLastTab && !ensureSpaceStart(space.id)) {
      return notify({ title: 'Could not keep this space open', body: 'Its last tab was not closed. Check the machine connection and try again.', level: 'error' });
    }
    if (!prefs.confirmLastTab) return prefs.closeOnLastTab
      ? run('space.close', { id: space.id, confirmed: true })
      : run('tab.close', { id: tabId, confirmed: true });
  }
  const tabs = new Set((explicit ? space.tabs : [tab]).map(t => t.id));
  const addresses = new Set(allPanes.filter(p => tabs.has(p.tab) && p.terminal).map(p => p.terminal));
  const agentAddresses = new Set(agents().map(a => a.address));
  const agentCount = [...addresses].filter(address => agentAddresses.has(address)).length;
  const terminalCount = addresses.size - agentCount;
  const detail = [[agentCount, 'agent'], [terminalCount, 'terminal']]
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}${count === 1 ? '' : 's'}`).join(' · ');
  return openOverlay({ mod: 'custom-confirm', kind: 'dialog', frame: 'none', width: 420,
    props: { spaceId: space.id, detail, ...(!explicit && !prefs.closeOnLastTab ? { tabId } : {}) } });
}
