// The only version-sensitive map between Custom and Herdr's public mod API.
// Add a reviewed profile after an upstream update; feature code stays unchanged.
export const HOST_CONTRACT = Object.freeze({
  api: Object.freeze([
    'agents', 'appHome', 'checking', 'closeOverlay', 'commands', 'exec', 'feedbackAttachImages',
    'feedbackClearImages', 'feedbackPasteImage', 'feedbackPickImages', 'feedbackPreview',
    'focused', 'fonts', 'hc', 'home', 'keys', 'knownAgents', 'layout', 'layouts',
    'machines', 'nextCommand', 'notify', 'openOverlay', 'panes', 'playSound', 'props',
    'readTextFile', 'run', 'sendFeedback', 'setAgentOrder', 'setShared', 'settings',
    'shared', 'spaces', 'telemetry', 'terminals', 'theme', 'themes', 'updates',
    'watchFolder', 'window', 'writeTextFile',
  ]),
  reviewedVersions: Object.freeze(['0.1.13', '0.1.14', '0.1.15', '0.1.16']),
});

const SAME = Object.freeze({ api: Object.freeze({}), commands: Object.freeze({}) });
export const HOST_PROFILES = Object.freeze({
  '0.1.13': SAME,
  '0.1.14': SAME,
  '0.1.15': SAME,
  // Public SDK/command catalog reviewed; no aliases or shape changes needed.
  // This does not widen the separate exact-version Core-document adapters.
  '0.1.16': SAME,
});

export function hostProfile(version) {
  return HOST_PROFILES[String(version ?? '')] ?? null;
}

export function apiCandidates(name, version) {
  const mapped = hostProfile(version)?.api?.[name];
  return [...new Set([...(Array.isArray(mapped) ? mapped : mapped ? [mapped] : []), name])];
}

export function nativeCommand(name, version) {
  return hostProfile(version)?.commands?.[name] ?? name;
}

export const normalizeList = value => Array.isArray(value) ? value : [];
export const normalizeObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
