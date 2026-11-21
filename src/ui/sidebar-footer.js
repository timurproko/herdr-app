import { shared, setShared, window } from './host.js';
import { settingsShortcuts } from './settings-sections.js';
import { pluginIsEnabled } from './plugins.js';
const available = item => !item.plugin || pluginIsEnabled(item.plugin);

export const FOOTER_KEY = 'custom.sidebar.footer';
export const FOOTER_ITEMS = settingsShortcuts();
const validId = id => FOOTER_ITEMS.some(item => item.id === id);
export function footerPreferences() {
  const raw = shared(FOOTER_KEY), value = raw?.version === 1 ? raw : {};
  const order = [...new Set((Array.isArray(value.order) ? value.order : []).filter(validId))];
  for (const item of FOOTER_ITEMS) if (!order.includes(item.id)) order.push(item.id);
  const next = { version: 1, order, sides: {} };
  for (const item of FOOTER_ITEMS) {
    next[item.id] = item.required === true || (typeof value[item.id] === 'boolean' ? value[item.id] : item.defaultVisible !== false);
    next.sides[item.id] = ['left', 'right'].includes(value.sides?.[item.id]) ? value.sides[item.id] : item.side;
  }
  return next;
}
export const footerVisible = id => footerPreferences()[id] === true && available(FOOTER_ITEMS.find(item=>item.id===id) ?? {});
export const footerSide = id => footerPreferences().sides[id];
export function footerItems(side) {
  const p = footerPreferences();
  const items = p.order.map(id => FOOTER_ITEMS.find(item => item.id === id))
    .filter(item => available(item) && p[item.id] && (!item.platform || item.platform === window()?.platform));
  return side ? items.filter(item => p.sides[item.id] === side)
    : [...items.filter(item => p.sides[item.id] === 'left'), ...items.filter(item => p.sides[item.id] === 'right')];
}
export function toggleFooter(id) {
  const item=FOOTER_ITEMS.find(item=>item.id===id);
  if (!item || item.required || !available(item)) return;
  const next = footerPreferences(); next[id] = !next[id]; setShared(FOOTER_KEY, next);
}
// `before` is an icon ID, or null for the end of this side. Hidden icons keep their order.
export function moveFooter(id, side, before = null) {
  if (!validId(id) || !available(FOOTER_ITEMS.find(item=>item.id===id)) || !['left', 'right'].includes(side) || before === id) return;
  const next = footerPreferences();
  next.order = next.order.filter(other => other !== id);
  const index = next.order.indexOf(before);
  next.order.splice(index < 0 ? next.order.length : index, 0, id);
  next.sides[id] = side;
  setShared(FOOTER_KEY, next);
}
