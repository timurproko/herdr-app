// Stable facade over Herdr's versioned public module.
// Features import this file, never `herdr` directly. Keep wrappers deliberately thin.
import * as native from 'herdr';
import { apiCandidates, nativeCommand, normalizeList, normalizeObject } from './compatibility.js';

let version;
export function hostVersion() {
  if (version !== undefined) return version;
  let detected = null;
  try { detected = native.updates?.()?.app?.version ?? null; } catch {}
  // Startup can briefly expose no update metadata. Never cache that transient null,
  // or later version aliases would remain disabled for the lifetime of the mod.
  if (detected !== null && detected !== undefined && detected !== '') version = String(detected);
  return version ?? null;
}

function method(name) {
  for (const candidate of apiCandidates(name, hostVersion())) {
    if (typeof native[candidate] === 'function') return native[candidate];
  }
  throw Error(`Custom requires Herdr API ${name}; update integration/herdr/compatibility.js for host ${hostVersion() ?? 'unknown'}.`);
}
const call = (name, args) => method(name)(...args);

export const exec = (...args) => call('exec', args);
export const hc = (...args) => call('hc', args);
export const home = (...args) => call('home', args);
export const appHome = (...args) => call('appHome', args);
export const checking = (...args) => call('checking', args);
export const readTextFile = (...args) => call('readTextFile', args);
export const writeTextFile = (...args) => call('writeTextFile', args);
export const knownAgents = (...args) => call('knownAgents', args);
export const playSound = (...args) => call('playSound', args);
export const run = (...args) => {
  if (args.length) args[0] = nativeCommand(args[0], hostVersion());
  return method('run')(...args);
};
export const machines = (...args) => normalizeList(call('machines', args));
export const spaces = (...args) => normalizeList(call('spaces', args));
export const agents = (...args) => normalizeList(call('agents', args));
export const panes = (...args) => normalizeList(call('panes', args));
export const setAgentOrder = (...args) => call('setAgentOrder', args);
export const terminals = (...args) => normalizeList(call('terminals', args));
export const focused = (...args) => call('focused', args) ?? null;
export const props = (...args) => call('props', args) ?? null;
export const layout = (...args) => normalizeObject(call('layout', args));
export const settings = (...args) => normalizeObject(call('settings', args));
export const theme = (...args) => normalizeObject(call('theme', args));
export const window = (...args) => normalizeObject(call('window', args));
export const shared = (...args) => call('shared', args);
export const setShared = (...args) => call('setShared', args);
export const openOverlay = (...args) => call('openOverlay', args);
export const closeOverlay = (...args) => call('closeOverlay', args);
export const notify = (...args) => call('notify', args);
export const nextCommand = (...args) => call('nextCommand', args);
export const keys = (...args) => normalizeList(call('keys', args));
export const commands = (...args) => normalizeList(call('commands', args));
export const layouts = (...args) => normalizeList(call('layouts', args));
export const themes = (...args) => normalizeList(call('themes', args));
export const fonts = (...args) => normalizeList(call('fonts', args));
export const updates = (...args) => normalizeObject(call('updates', args));
export const telemetry = (...args) => call('telemetry', args);
export const watchFolder = (...args) => call('watchFolder', args);
export const feedbackPreview = (...args) => call('feedbackPreview', args);
export const feedbackPasteImage = (...args) => call('feedbackPasteImage', args);
export const feedbackPickImages = (...args) => call('feedbackPickImages', args);
export const feedbackAttachImages = (...args) => call('feedbackAttachImages', args);
export const feedbackClearImages = (...args) => call('feedbackClearImages', args);
export const sendFeedback = (...args) => call('sendFeedback', args);
