// Ephemeral, presentation-only feedback. No shared/persisted jobs or navigation.
import { nextCommand, spaces, window as appWindow } from './host.js';

const PREFIX = 'tab-arrived:';
const ARM_MS = 16;
const HOP_MS = 140;
const SETTLE_MS = 220;

export function receiveTabArrival(owner, command, cx) {
  if (typeof command !== 'string' || !command.startsWith(PREFIX)) return false;
  if (command.length > 4096 || appWindow()?.active === false) return true;
  let event;
  try { event = JSON.parse(command.slice(PREFIX.length)); } catch { return true; }
  const now = Date.now();
  if (!event || typeof event.requestId !== 'string' || !event.requestId || event.requestId.length > 100
      || typeof event.spaceId !== 'string' || typeof event.tabId !== 'string'
      || !Number.isFinite(event.expiresAt) || event.expiresAt <= now || event.expiresAt > now + 3000
      || owner.tabArrivalToken === event.requestId) return true;
  const space = spaces().find(s => s.id === event.spaceId && s.tabs?.some(t => t.id === event.tabId));
  if (!space) return true;
  owner.tabArrivalToken = event.requestId;
  // A folded group speaks up through its header; do not unfold it or steal focus.
  const arrival = owner.tabArrival = { spaceId: space.id, machine: space.machine ?? null, phase: 'arm' };
  cx.notify();
  const step = (delay, phase) => cx.timer.after(delay, cx => {
    if (owner.tabArrival !== arrival) return; // A newer move supersedes these callbacks.
    if (phase) arrival.phase = phase; else owner.tabArrival = null;
    cx.notify();
  });
  // Only phase boundaries use JS. Native position transitions draw every frame.
  step(ARM_MS, 'hop');
  step(ARM_MS + HOP_MS, 'settle');
  step(ARM_MS + HOP_MS + SETTLE_MS + 40, null);
  return true;
}

export function startTabArrivals(owner, cx) {
  cx.spawn(async cx => {
    for (;;) receiveTabArrival(owner, await nextCommand(), cx);
  });
}

export function tabArrivalMotion(owner, element) {
  const hop = owner.tabArrival?.phase === 'hop';
  // Apply only to the item's icon/label, never its hover/selection surface.
  return element.relative().top(hop ? -7 : 0)
    .transition('top', { duration: hop ? HOP_MS : SETTLE_MS, easing: 'ease-out' });
}
