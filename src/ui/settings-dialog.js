import { openOverlay } from './host.js';

// Host overlay IDs are process-local counters. This identity belongs to the
// opening's props, so replacement retains it but another opening never borrows it.
export function openSettings(props = {}, options = {}) {
  const settingsOpening = `settings-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return openOverlay({ mod: 'custom-settings', kind: 'dialog', frame: 'none', width: 900,
    ...options, props: { ...props, settingsOpening } });
}
