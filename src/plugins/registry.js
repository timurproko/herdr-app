// Plugins: optional integrations people switch on in Settings > Plugins.
// Each plugin is a folder in src/plugins/; the build packages all of them into every
// mod that uses plugins (customization.json "plugins") and generates plugins/index.js.
// Only their on/off state and settings are shared at run time.
import { shared, setShared, notify } from './host.js';
import list from './plugins/index.js';

export const PLUGINS = Object.freeze([...list]);
export const PLUGINS_KEY = 'custom.plugins';

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const stored = id => object(object(shared(PLUGINS_KEY))[id]);
function store(id, change) {
  const all = object(shared(PLUGINS_KEY)), mine = stored(id);
  setShared(PLUGINS_KEY, { ...all, [id]: { ...mine, ...change } });
}

export const pluginById = id => PLUGINS.find(p => p.id === id) ?? null;

// The order of the cards on Settings › Plugins, as the person dragged them. Display only:
// hooks, transforms and events keep PLUGINS' order. Unlisted plugins follow in that order.
export const PLUGIN_ORDER_KEY = 'custom.plugins.order';
export function orderedPlugins() {
  const saved = shared(PLUGIN_ORDER_KEY), order = Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : [];
  const rank = plugin => { const at = order.indexOf(plugin.id); return at < 0 ? order.length + PLUGINS.indexOf(plugin) : at; };
  return [...PLUGINS].sort((a, b) => rank(a) - rank(b));
}
export function setPluginOrder(ids) {
  setShared(PLUGIN_ORDER_KEY, [...new Set((Array.isArray(ids) ? ids : []).filter(id => PLUGINS.some(p => p.id === id)))]);
}
export const pluginIsEnabled = id => { const plugin=pluginById(id); return Boolean(plugin && pluginEnabled(plugin)); };

// Sidebar composition is a registry contribution, not a Files/Git switch in the
// host UI. Stable stack/mod IDs belong to each plugin's declaration.
const PANELS = Object.freeze(PLUGINS.filter(p => p.sidebar).map(p => Object.freeze({ ...p.sidebar, plugin: p.id })));
export function sidebarPanels({ enabled = true } = {}) {
  return PANELS.filter(panel => !enabled || pluginEnabled(pluginById(panel.plugin)));
}
export const sidebarPanelEnabled = id => sidebarPanels().some(panel => panel.id === id);

// A plugin may keep its on/off state elsewhere (an older preference it took over).
export function pluginEnabled(plugin) {
  if (plugin.state) return plugin.state.get() === true;
  const saved = stored(plugin.id).enabled;
  return typeof saved === 'boolean' ? saved : plugin.defaultEnabled === true;
}
export function setPluginEnabled(plugin, enabled) {
  const next=enabled === true, changed=pluginEnabled(plugin)!==next;
  if (plugin.state) plugin.state.set(next);
  else store(plugin.id, { enabled: next });
  if(changed && plugin.onEnabledChange) {
    try { const result=plugin.onEnabledChange(next,{...pluginContext(plugin),enabled:()=>next});if(result?.catch)result.catch(e=>failed(plugin,'enabled',e)); }
    catch(e) { failed(plugin,'enabled',e); }
  }
}

const field = (plugin, key) => (plugin.settings ?? []).find(s => s.key === key);
function valid(def, value) {
  if (def.type === 'toggle') return typeof value === 'boolean';
  if (def.type === 'choice') return def.options.some(([v]) => v === value);
  // One of a list the plugin supplies at draw time (it may depend on the machine and change
  // between visits), so only the shape is checked here; the plugin decides what a stored
  // value that is no longer offered means.
  if (def.type === 'select') return typeof value === 'string' && value.length <= 200 && ![...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
  if (def.type === 'multiselect') return Array.isArray(value) && value.length <= def.options.length
    && new Set(value).size === value.length && value.every(item => def.options.some(([v]) => v === item));
  // A Herdr machine name, or null for this computer. Not checked against the live
  // list here: a machine that no longer exists shows up as a failing check.
  if (def.type === 'machine') return value === null || (typeof value === 'string' && value.trim() !== '');
  // Free text on one line (a path, say); empty is allowed and means "not set".
  if (def.type === 'text') return typeof value === 'string' && value.length <= 1024 && ![...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);
  return typeof value === 'string';
}
export function pluginSetting(plugin, key) {
  const def = field(plugin, key);
  if (!def) return undefined;
  const settings = object(stored(plugin.id).settings);
  if (!Object.hasOwn(settings, key)) return def.default;
  const value = settings[key];
  return valid(def, value) ? value : def.default;
}
export function setPluginSetting(plugin, key, value) {
  const def = field(plugin, key);
  if (!def || !valid(def, value)) return;
  const changed=JSON.stringify(pluginSetting(plugin,key))!==JSON.stringify(value);
  store(plugin.id, { settings: { ...object(stored(plugin.id).settings), [key]: value } });
  if(changed&&plugin.onSettingChange){
    try{const result=plugin.onSettingChange(key,{...pluginContext(plugin),enabled:()=>pluginEnabled(plugin)});if(result?.catch)result.catch(e=>failed(plugin,'settings',e));}
    catch(e){failed(plugin,'settings',e);}
  }
}

// Small tags enabled plugins add to a space's sidebar row: `spaceTags(space, cx)` returns
// `[{ label, tooltip? }]`, synchronously, from live data only (it runs on every draw). A failing
// plugin is reported once and adds none.
export function pluginSpaceTags(space, context = {}) {
  return PLUGINS.flatMap(plugin => {
    if (typeof plugin.spaceTags !== 'function' || !pluginEnabled(plugin)) return [];
    try {
      const tags = plugin.spaceTags(space, { ...context, ...pluginContext(plugin) });
      return (Array.isArray(tags) ? tags : []).filter(tag => typeof tag?.label === 'string' && tag.label.trim())
        .slice(0, 3).map(tag => ({ plugin: plugin.id, label: tag.label.trim().slice(0, 20), tooltip: typeof tag.tooltip === 'string' ? tag.tooltip.slice(0, 200) : null }));
    } catch (e) { failed(plugin, 'spaceTags', e); return []; }
  });
}

// Read-only contextual contributions. Plugins own their identity/source policy;
// features never import a provider's implementation or start work during render.
export function pluginWorkspaceLinks() {
  return PLUGINS.flatMap(plugin => {
    if(!pluginEnabled(plugin) || !plugin.workspaceLinks) return [];
    try { return (plugin.workspaceLinks(pluginContext(plugin))??[]).filter(link=>typeof link?.parent==='string' && typeof link?.child==='string' && link.parent!==link.child && typeof link.binding==='string'); }
    catch(e) { failed(plugin,'workspaceLinks',e);return []; }
  });
}
export function pluginPullContext(space) {
  const found=[];
  for(const plugin of PLUGINS) {
    if(!pluginEnabled(plugin) || !plugin.pullContext) continue;
    try { const value=plugin.pullContext({space,...pluginContext(plugin)});if(value?.kind==='tasks' && typeof value.scope==='string' && Array.isArray(value.links)) found.push(value); }
    catch(e) { failed(plugin,'pullContext',e); }
  }
  return found.length===1 ? found[0] : null;
}

// Asks enabled plugins, in order, to handle a moment a feature exposes (a hook).
// The first one that returns true handles it; a failing plugin is reported and
// the feature carries on with its own behaviour.
export async function runPluginHook(name, context) {
  for (const plugin of PLUGINS) {
    const hook = plugin.hooks?.[name];
    if (!hook || !pluginEnabled(plugin)) continue;
    try {
      if (await hook({ ...context, setting: key => pluginSetting(plugin, key) }) === true) return true;
    } catch (e) {
      notify({ title: `${plugin.name} could not do that`, body: String(e?.message ?? e).slice(0, 1400), level: 'error' });
    }
  }
  return false;
}

// Synchronous eligibility for an already-captured UI action, never a mutation.
export function pluginAllows(name, context = {}) {
  const providers = PLUGINS.filter(plugin => pluginEnabled(plugin) && plugin.guards?.[name]);
  if (providers.length !== 1) return false;
  try { return providers[0].guards[name]({ ...context, ...pluginContext(providers[0]) }) === true; }
  catch (error) { failed(providers[0], name, error); return false; }
}

// Freeze menu contributions at popup creation; actions recheck plugin availability at activation.
export function pluginMenuItems(name, context = {}) {
  return PLUGINS.flatMap(plugin => {
    if (!pluginEnabled(plugin) || !plugin.menus?.[name]) return [];
    try {
      return plugin.menus[name]({ ...context, ...pluginContext(plugin) }).map(item => ({ ...item,
        run(cx) { if (pluginEnabled(plugin)) return item.run(cx); },
      }));
    } catch (error) { failed(plugin, name, error); return []; }
  });
}

// What a prerequisite's check() and fix.run() receive: the plugin's settings.
// One object per round of checks, so a plugin can share work between its checks.
export const pluginContext = plugin => ({ setting: key => pluginSetting(plugin, key) });
// The [value, label] pairs a `select` setting offers now. A plugin that throws offers none.
export function pluginOptions(plugin, def) {
  try {
    const list = typeof def.options === 'function' ? def.options(pluginContext(plugin)) : def.options;
    return Array.isArray(list) ? list.filter(o => Array.isArray(o) && typeof o[0] === 'string' && typeof o[1] === 'string') : [];
  } catch { return []; }
}

// Tells every enabled plugin about a moment (an event): unlike a hook, nobody handles
// it alone. Synchronous; a plugin starts its own async work with context.cx. A failing
// plugin is reported once per event, and the feature carries on.
const reported = new Set();
function failed(plugin, name, e) {
  const key = `${plugin.id}:${name}`;
  if (reported.has(key)) return;
  reported.add(key);
  notify({ title: `${plugin.name} could not do that`, body: String(e?.message ?? e).slice(0, 1400), level: 'error' });
}
export function pluginEvent(name, context = {}) {
  for (const plugin of PLUGINS) {
    const enabled=pluginEnabled(plugin), lifecycle=plugin.lifecycle?.[name];
    const hook = lifecycle ?? plugin.events?.[name];
    if (!hook || (!enabled && !lifecycle)) continue;
    try {
      const result = hook({ ...context, enabled, setting: key => pluginSetting(plugin, key) });
      if (result && typeof result.catch === 'function') result.catch(e => failed(plugin, name, e));
    } catch (e) { failed(plugin, name, e); }
  }
}

// Passes a value through every enabled plugin's transform, in order (e.g. the argv an
// agent starts with). A plugin returns the new value, or undefined to keep it. A failing
// plugin is reported and skipped, so the feature still gets a value.
export async function pluginTransform(name, value, context = {}) {
  let current = value;
  for (const plugin of PLUGINS) {
    const transform = plugin.transforms?.[name];
    if (!transform || !pluginEnabled(plugin)) continue;
    try {
      const next = await transform(current, { ...context, setting: key => pluginSetting(plugin, key) });
      if (next !== undefined) current = next;
    } catch (e) { failed(plugin, name, e); }
  }
  return current;
}

// A gate is a REQUIRED moment: exactly one enabled plugin must claim it and return a
// prepared object, or the feature refuses. Unlike hooks/transforms nothing is swallowed
// here and there is no "carry on without it": a disabled, missing, duplicated, throwing or
// empty-handed gate is a refusal with a reason the feature shows. Gates: `profile.role.firstmate`
// (prepare a role-marked profile launch; `{ machine, space, profile, argv, cwd, token }`).
// Whether a gate would be tried now (exactly one enabled plugin claims it), for a feature
// deciding what to offer. The gate itself still decides at launch.
export function pluginGateReady(name) {
  return PLUGINS.filter(p => typeof p.gates?.[name] === 'function' && pluginEnabled(p)).length === 1;
}
export async function pluginGate(name, context = {}) {
  const claimants = PLUGINS.filter(p => typeof p.gates?.[name] === 'function');
  const enabled = claimants.filter(p => pluginEnabled(p));
  if (!claimants.length) return { ok: false, plugin: null, reason: `No plugin provides ${name}.` };
  if (!enabled.length) return { ok: false, plugin: claimants[0].id, reason: `${claimants[0].name} is turned off. Turn it on in Settings › Plugins.` };
  if (enabled.length > 1) return { ok: false, plugin: null, reason: `Several plugins claim ${name}: ${enabled.map(p => p.name).join(', ')}. Keep one enabled.` };
  const plugin = enabled[0];
  try {
    const value = await plugin.gates[name]({ ...context, setting: key => pluginSetting(plugin, key) });
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, plugin: plugin.id, reason: `${plugin.name} did not prepare ${name}.` };
    return { ok: true, plugin: plugin.id, value };
  } catch (e) {
    return { ok: false, plugin: plugin.id, reason: String(e?.message ?? e).slice(0, 1400) };
  }
}

// Runs a plugin's prerequisite checks: [{ id, label, about, status, detail, fix }].
// status: 'ready' | 'missing' | 'recommended' | 'error'. A result may set fix: null
// to hide the fix where it can't help.
export async function checkPlugin(plugin) {
  const context = pluginContext(plugin);
  return Promise.all((plugin.prerequisites ?? []).map(async pre => {
    try {
      const result = await pre.check(context);
      return { ...pre, ...result };
    } catch (e) {
      return { ...pre, status: 'error', detail: String(e?.message ?? e).slice(0, 300) };
    }
  }));
}
