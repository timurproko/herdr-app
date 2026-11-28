// One client-local sidebar hold. Only the default choice is durable; the source
// lives in Herdr's cross-mod sessionStorage and is never restored after restart.
import { spaces, layout, shared, setShared, run } from './host.js';
import { sidebarPanels } from './plugins.js';
import { capturePanelSource, cleanPanelSource } from './panel-context.js';
const KEY = 'custom.panel.tabs', SESSION = 'custom.panel.session';
const views = () => sidebarPanels({enabled:false}).map(panel => panel.id);
const available = () => sidebarPanels().map(panel => panel.id);
const valid = value => value && typeof value.open === 'boolean' && views().includes(value.view);
function sessionValue() { try { return sessionStorage.getItem(SESSION); } catch { return null; } }
function sessionPin() {
  try { const pin = JSON.parse(sessionValue()); return valid(pin) && cleanPanelSource(pin.source) ? pin : null; } catch { return null; }
}
export function panelSource() { return custom() ? cleanPanelSource(store()?.pin?.source) : null; }
// Availability is a projection only: disabling a plugin never erases the hold.
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
  // A popup or rendered toggle cannot mutate a newer hold on the same tab.
  return tab ? {id:tab.id,space:space.id,pin:sessionValue()} : null;
}
const sameTab = (a,b) => a == null || b == null ? a === b : a.id === b.id && a.space === b.space && a.pin === b.pin;
export function panelSnapshot() {
  const root = layout(), panel = find(root,'panel'), body = find(root,'panel-body');
  if (!panel || !body) return null;
  return {open:!panel.hidden,view:views().includes(body.active) ? body.active : views()[0]};
}
function store() {
  const value = shared(KEY);
  if (value == null) return null;
  if (!valid(value.default) || ![1,2].includes(value.version)) return null;
  if (value.version === 1 && (!value.pins || typeof value.pins !== 'object' || Array.isArray(value.pins))) return null;
  return {version:2,default:value.default,pin:sessionPin()};
}
export function panelPinned() { return Boolean(custom() && store()?.pin); }
const custom = () => String(shared('layout') ?? '').toLowerCase() === 'custom';
function save(state) {
  // No fallback to persisted shared state: a storage refusal must not make the
  // held machine/path survive restart or silently create a per-mod-only pin.
  try {
    if (state.pin) sessionStorage.setItem(SESSION,JSON.stringify(state.pin));
    else sessionStorage.removeItem(SESSION);
  } catch { return false; }
  const durable = {version:2,default:state.default};
  if (JSON.stringify(shared(KEY)) !== JSON.stringify(durable)) setShared(KEY,durable);
  globalThis.window?.refresh?.();
  return true;
}
function saveChoice(state,choice) {
  const saved = save(state.pin ? {...state,pin:{...state.pin,...choice}} : {...state,default:choice});
  if (saved && !state.pin) setShared('custom.panel.view',choice.view);
  return saved;
}
function apply(choice) {
  choice = projectPanelChoice(choice);
  const current = panelSnapshot();
  if (!current) return;
  if (current.view !== choice.view) run('layout.select',{stack:'panel-body',child:choice.view});
  if (current.open !== choice.open) run(choice.open ? 'layout.show' : 'layout.hide',{id:'panel'});
}
export function togglePanelPin(tab = panelTab(), on = !panelPinned()) {
  const current = panelSnapshot();
  if (!custom() || !current || !sameTab(tab,panelTab()) || !available().length) return false;
  const previous = store();
  if (shared(KEY) != null && !previous) return false;
  const state = previous ?? {version:2,default:current,pin:null};
  if (on === Boolean(state.pin)) return true;
  if (!on) { if (!save({...state,pin:null})) return false; apply(state.default); }
  else {
    if (!tab) return false;
    const source = capturePanelSource(current.view);
    if (!source || !save({...state,pin:{...current,source}})) return false;
  }
  return true;
}
export function changePanel(choice, tab = panelTab()) {
  const current = panelSnapshot();
  if (!custom() || !current || !sameTab(tab,panelTab())) return false;
  const enabled = available();
  if (!enabled.length || (choice.view != null && !enabled.includes(choice.view))) return false;
  const state = store(), remembered = shared('custom.panel.view');
  if (shared(KEY) != null && !state) return false;
  const base = state?.pin ?? state?.default;
  const preferred = choice.view ?? base?.view ?? (views().includes(remembered) ? remembered : current.view);
  const view = enabled.includes(preferred) ? preferred : enabled[0];
  const next = {open:choice.open ?? current.open,view};
  if (!valid(next)) return false;
  if (state) { if (!saveChoice(state,choice.view == null && base ? {...next,view:base.view} : next)) return false; }
  else setShared('custom.panel.view',view);
  if (choice.view != null || next.open) run('layout.select',{stack:'panel-body',child:view});
  run(next.open ? 'layout.show' : 'layout.hide',{id:'panel'});
  return true;
}
// Mounted Tabs retains the existing yielded, acknowledgement-aware projection.
export function syncPanelState(owner,cx) {
  if (!cx?.spawn || owner.panelJob) return;
  const tab = panelTab(), current = panelSnapshot(), state = store();
  const binding = tab ? JSON.stringify([tab.space,tab.id]) : null;
  if (!custom() || !current || shared(KEY) != null && !state) {
    owner.panelBinding = binding;owner.panelTarget = null;owner.panelApplying = null;return;
  }
  const availability = JSON.stringify(available());
  const preferred = state?.pin ?? state?.default ?? current, desired = projectPanelChoice(preferred);
  const constrained = !equal(preferred,desired), target = signature(desired) + availability;
  const changed = binding !== owner.panelBinding || target !== owner.panelTarget;
  const migration = shared(KEY)?.version === 1;
  if (equal(current,desired) && !migration) {
    owner.panelBinding = binding;owner.panelTarget = target;owner.panelApplying = null;return;
  }
  const token = JSON.stringify([binding,target]);
  if (!changed && !migration && owner.panelApplying?.token === token && owner.panelApplying.until > Date.now()) return;
  owner.panelBinding = binding;owner.panelTarget = target;
  const before = JSON.stringify(shared(KEY)), session = sessionValue(), job = owner.panelJob = {};
  cx.spawn(async cx => {
    await cx.sleep(0);
    try {
      if (!custom() || !sameTab(tab,panelTab()) || sessionValue() !== session || JSON.stringify(shared(KEY)) !== before || JSON.stringify(available()) !== availability) return;
      if (migration || !state && constrained) {
        if (!save(state ?? {version:2,default:current,pin:null})) return;
      }
      if (changed || constrained || migration) {
        owner.panelApplying = {token,until:Date.now()+2000};apply(desired);
      } else {
        const actual = panelSnapshot();
        if (state && !constrained && actual && !equal(actual,desired)) saveChoice(state,actual);
        owner.panelApplying = null;
      }
    } finally { if (owner.panelJob === job) owner.panelJob = null;cx.notify(); }
  });
}
