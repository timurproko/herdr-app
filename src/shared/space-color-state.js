// Durable Custom space-color state. Keep it independent from transient host snapshots.
// Agent color matching is a plugin (src/plugins/a1-colors); it reads colors through the plugin API.
import { shared, setShared, spaces } from './host.js';

export const SPACE_COLOR_KEY = 'custom.space-colors';
export const LEGACY_SPACE_COLOR_KEY = 'space.colors';
export const AUTO_KEY = 'custom.space-color-auto';
export const PROJECT_COLORS = Object.freeze(['ansi6', 'ansi3', 'ansi4', 'ansi5', 'ansi2', 'ansi1']);
export const SPACE_COLORS = Object.freeze([
  { value: null, name: 'Automatic' },
  { value: 'ansi4', name: 'Blue' },
  { value: 'ansi2', name: 'Green' },
  { value: 'ansi3', name: 'Orange' },
  { value: 'ansi1', name: 'Red' },
  { value: 'ansi5', name: 'Purple' },
  { value: 'ansi6', name: 'Teal' },
  { value: '#8e98a8', name: 'Gray' },
]);
export const COLOR_COUNT = SPACE_COLORS.length;

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const colors = value => Object.fromEntries(Object.entries(object(value)).filter(([id, color]) => typeof id === 'string' && typeof color === 'string'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function savedSpaceColors() {
  const custom = shared(SPACE_COLOR_KEY);
  return custom && typeof custom === 'object' && !Array.isArray(custom) ? colors(custom) : colors(shared(LEGACY_SPACE_COLOR_KEY));
}

export function publishSpaceColors(value) {
  const next = colors(value), custom = shared(SPACE_COLOR_KEY), legacy = shared(LEGACY_SPACE_COLOR_KEY);
  if (!custom || typeof custom !== 'object' || Array.isArray(custom) || !same(colors(custom), next)) setShared(SPACE_COLOR_KEY, next);
  // Space colors are the source of truth. Agent matching never recolors spaces.
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy) || !same(colors(legacy), next)) setShared(LEGACY_SPACE_COLOR_KEY, next);
  return next;
}

export function reconcileSpaceColors(list = spaces()) {
  const next = { ...savedSpaceColors() };
  const currentIds = new Set(list.map(space => space.id));
  for (const space of list) {
    if (next[space.id] || space.name === '~') continue;
    const uses = color => [...currentIds].filter(id => next[id] === color).length;
    next[space.id] = PROJECT_COLORS.reduce((best, color) => uses(color) < uses(best) ? color : best);
  }
  // Never delete unknown IDs here: machines/spaces can be temporarily absent during startup.
  if (list.length || Object.keys(next).length || shared(SPACE_COLOR_KEY) !== undefined) return publishSpaceColors(next);
  return next;
}

export function currentSpaceColor(id) { return savedSpaceColors()[id] ?? 'ansi6'; }
export function selectedColorIndex(id) {
  if (object(shared(AUTO_KEY))[id] || !Object.prototype.hasOwnProperty.call(savedSpaceColors(), id)) return 0;
  const index = SPACE_COLORS.findIndex(color => color.value === currentSpaceColor(id));
  return index < 0 ? 0 : index;
}
export function colorAt(index) { return SPACE_COLORS[index]?.value ?? null; }

export function setSpaceColor(id, color) {
  if (typeof id !== 'string' || !spaces().some(space => space.id === id)) return false;
  if (!SPACE_COLORS.some(option => option.value === color)) return false;
  const saved = savedSpaceColors(), automatic = object(shared(AUTO_KEY));
  if (color === null) {
    if (automatic[id] === true) return true;
    setShared(AUTO_KEY, { ...automatic, [id]: true });
    if (Object.prototype.hasOwnProperty.call(saved, id)) { const next = { ...saved }; delete next[id]; publishSpaceColors(next); }
  } else {
    if (automatic[id]) { const next = { ...automatic }; delete next[id]; setShared(AUTO_KEY, next); }
    if (saved[id] !== color) publishSpaceColors({ ...saved, [id]: color });
  }
  return true;
}
