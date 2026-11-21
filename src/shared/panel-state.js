// Client-only right-sidebar choices. Pins belong to qualified native tab IDs;
// no core documents, terminal state, portable preferences or background polling.
import { spaces, layout, shared, setShared, run } from './host.js';
const KEY = 'custom.panel.tabs';
import { sidebarPanels } from './plugins.js';
const views = () => sidebarPanels({enabled:false}).map(panel => panel.id);
const available = () => sidebarPanels().map(panel => panel.id);
const valid = value => value && typeof value.open === 'boolean' && views().includes(value.view);
// Availability is a projection only: disabling a plugin never erases its pin.
export function projectPanelChoice(choice) {
  const enabled = available();
  return {open:enabled.length > 0 && choice.open,view:enabled.includes(choice.view) ? choice.view : enabled[0] ?? choice.view};
}
const equal = (a,b) => a?.open === b?.open && a?.view === b?.view;
const signature = value => JSON.stringify([value.open,value.view]);
function find(node,id) {
  if (node?.id === id) return node;
  return (node?.children ?? []).map(child=>find(child,id)).find(Boolean);
}
export function panelTab() {
  const space = spaces().find(s=>s.active), tab = space?.tabs?.find(t=>t.active);
  return tab ? {id:tab.id,space:space.id} : null;
}
const sameTab = (a,b) => Boolean(a && b && a.id === b.id && a.space === b.space);
export function panelSnapshot() {
  const root = layout(), panel = find(root,'panel'), body = find(root,'panel-body');
  if (!panel || !body) return null;
  return {open:!panel.hidden,view:views().includes(body.active) ? body.active : views()[0]};
}
function store() {
  const value = shared(KEY);
  if (value == null) return null;
  return value.version === 1 && valid(value.default) && value.pins && typeof value.pins === 'object' && !Array.isArray(value.pins) ? value : null;
}
const pinFor = (state,tab) => tab && Object.hasOwn(state?.pins ?? {},tab.id) && valid(state.pins[tab.id]) ? state.pins[tab.id] : null;
export function panelPinned(tab = panelTab()) { return Boolean(pinFor(store(),tab)); }
const custom = () => String(shared('layout') ?? '').toLowerCase() === 'custom';
function saveChoice(state,tab,choice) {
  const pin = pinFor(state,tab);
  setShared(KEY,pin ? {...state,pins:{...state.pins,[tab.id]:{...pin,space:tab.space,...choice}}} : {...state,default:choice});
  if (!pin) setShared('custom.panel.view',choice.view);
}
function apply(choice) {
  choice = projectPanelChoice(choice);
  const current = panelSnapshot();
  if (!current) return;
  if (current.view !== choice.view) run('layout.select',{stack:'panel-body',child:choice.view});
  if (current.open !== choice.open) run(choice.open ? 'layout.show' : 'layout.hide',{id:'panel'});
}
export function togglePanelPin(tab = panelTab(), on = !panelPinned(tab)) {
  const current = panelSnapshot();
  if (!custom() || !current || !sameTab(tab,panelTab()) || !available().length) return false;
  const previous = store();
  // An unfamiliar future version is not disposable data.
  if (shared(KEY) != null && !previous) return false;
  const state = previous ?? {version:1,default:current,pins:{}};
  const pins = {...state.pins}, pinned = Boolean(pinFor(state,tab));
  if (on === pinned) return true;
  if (pinned) {
    delete pins[tab.id];setShared(KEY,{...state,pins});apply(state.default);
  } else {
    pins[tab.id] = {...current,space:tab.space};setShared(KEY,{...state,pins});
  }
  return true;
}
// All Custom controls use this path so a queued layout command cannot be
// misattributed to the next tab before the native snapshot acknowledges it.
export function changePanel(choice, tab = panelTab()) {
  const current = panelSnapshot();
  if (!custom() || !current || !sameTab(tab,panelTab())) return false;
  const enabled = available();
  if (!enabled.length || (choice.view != null && !enabled.includes(choice.view))) return false;
  const state = store(), remembered = shared('custom.panel.view');
  const base = pinFor(state,tab) ?? state?.default;
  const preferred = choice.view ?? base?.view ?? (views().includes(remembered) ? remembered : current.view);
  const view = enabled.includes(preferred) ? preferred : enabled[0];
  const next = {open:choice.open ?? current.open,view};
  if (!valid(next)) return false;
  if (state) saveChoice(state,tab,choice.view == null && base ? {...next,view:base.view} : next);
  else setShared('custom.panel.view',view);
  if (choice.view != null || next.open) run('layout.select',{stack:'panel-body',child:view});
  run(next.open ? 'layout.show' : 'layout.hide',{id:'panel'});
  return true;
}
// Mounted Tabs owns reconciliation for every navigation path, including agent
// focus and native keyboard selection. State changes yield out of render.
export function syncPanelState(owner,cx) {
  if (!cx?.spawn || owner.panelJob) return;
  const tab = panelTab(), current = panelSnapshot(), state = store();
  const binding = tab ? JSON.stringify([tab.space,tab.id]) : null;
  if (!custom() || !tab || !current) {
    owner.panelBinding = binding;owner.panelTarget = null;owner.panelApplying = null;return;
  }
  const availability = JSON.stringify(available());
  if (!state) {
    const desired = projectPanelChoice(current);
    if (equal(current,desired)) {
      owner.panelBinding = binding;owner.panelTarget = null;owner.panelApplying = null;return;
    }
    const before = JSON.stringify(shared(KEY)), job = owner.panelJob = {};
    cx.spawn(async cx => {
      await cx.sleep(0);
      try {
        if (!custom() || !sameTab(tab,panelTab()) || JSON.stringify(available()) !== availability || JSON.stringify(shared(KEY)) !== before) return;
        // Capture the existing global choice only when availability first masks
        // it. No-pin navigation otherwise retains its existing native behavior.
        if (shared(KEY) == null) setShared(KEY,{version:1,default:current,pins:{}});
        apply(desired);
      } finally { if (owner.panelJob === job) owner.panelJob = null;cx.notify(); }
    });
    return;
  }
  const preferred = pinFor(state,tab) ?? state.default, desired = projectPanelChoice(preferred);
  const constrained = !equal(preferred,desired), target = signature(desired) + availability;
  const changed = binding !== owner.panelBinding || target !== owner.panelTarget;
  if (equal(current,desired)) {
    owner.panelBinding = binding;owner.panelTarget = target;owner.panelApplying = null;return;
  }
  const token = JSON.stringify([binding,target]);
  if (!changed && owner.panelApplying?.token === token && owner.panelApplying.until > Date.now()) return;
  owner.panelBinding = binding;owner.panelTarget = target;
  const before = JSON.stringify(state), job = owner.panelJob = {};
  cx.spawn(async cx => {
    await cx.sleep(0);
    try {
      if (!custom() || !sameTab(tab,panelTab()) || JSON.stringify(store()) !== before || JSON.stringify(available()) !== availability) return;
      if (changed || constrained) {
        owner.panelApplying = {token,until:Date.now()+2000};apply(desired);
      } else {
        // Native layout actions on a settled tab are deliberate edits too.
        // Capture them only after pending projection has had time to settle.
        const actual = panelSnapshot();
        if (!constrained && actual && !equal(actual,desired)) saveChoice(state,tab,actual);
        owner.panelApplying = null;
      }
    } finally { if (owner.panelJob === job) owner.panelJob = null;cx.notify(); }
  });
}
