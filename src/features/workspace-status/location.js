// Resolve only the terminal being shown, never a space's first/background tab.
import { focused, panes, spaces, terminals } from './host.js';
import { paneDirectory } from './directory.js';
export function statusLocation() {
  const f = focused(), all = panes(), space = spaces().find(s => s.active);
  let pane;
  if (f) {
    const terminal = f.shown ?? f.terminal;
    // Composition/peek terminals need not have a model pane. A focused mod
    // deliberately has no terminal: do not borrow a different tab's branch.
    pane = terminal ? {terminal, cwd:f.cwd} : null;
    if (terminal) {
      const model = all.find(p => p.terminal === terminal);
      pane = model ?? pane;
    }
  } else {
    const tab = space?.tabs?.find(t => t.active)?.id;
    const mine = all.filter(p => p.tab === tab);
    pane = mine.find(p => p.focused) ?? mine[0];
  }
  const terminal = pane?.mod ? null : pane?.terminal ?? null;
  const on = terminal ? (terminal.includes('/') ? terminal.split('/')[0] : null) : space?.machine ?? null;
  const {cwd} = paneDirectory(pane, terminals(), f);
  return {terminal, cwd, on, key:JSON.stringify([terminal,cwd,on])};
}
