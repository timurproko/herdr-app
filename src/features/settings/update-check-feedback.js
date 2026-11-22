import { h_flex } from 'gpui-base';
import { U } from './ui.js';

// Native Settings' request-age window, shared by native and Custom checks.
export const recentlyAsked = (owner, key) => Boolean(owner[key] && Date.now() - owner[key] < 3000);
export function initUpdateCheckFeedback(owner, cx, channels) {
  cx.timer.every(300, cx => {
    let active = false;
    for (const { key, checking } of channels) {
      if (!owner[key]) continue;
      active = true;
      if (checking()) owner[key] = Date.now();
      else if (Date.now() - owner[key] >= 3000) owner[key] = null;
    }
    if (active) cx.notify();
  });
}

export function updateCheckSlot(owner, theme, { id, slotId = `${id}-slot`, key, checking, checked, label = 'Check now', enabled = true, onClick }) {
  const confirmed = recentlyAsked(owner, key) && checked && !checking;
  return h_flex().id(slotId).w(112).h(U.field).flex_none().items_center().justify_center()
    .child(owner.button(theme, id, checking ? 'Checking…' : confirmed ? '✓ Up to date' : label, onClick,
      { enabled: enabled && !checking && !confirmed }).w_full());
}
