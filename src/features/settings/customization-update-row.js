import { h_flex } from 'gpui-base';
import { recentlyAsked, updateCheckSlot } from './update-check-feedback.js';
import { customizationRowState } from './customization-update-model.js';
import { customizationUpdateSnapshot, refreshCustomizationUpdates } from './customization-updates.js';

export function customizationUpdateRow(owner, theme) {
  const row = customizationRowState(customizationUpdateSnapshot(), { busy: owner.customUpdatePending, error: owner.customUpdateError });
  const confirmation = owner.customUpdateRetry;
  const recoveryIdentity = snapshot => row.action === 'recover' ? snapshot?.clearRecovery?.identity : snapshot?.recovery?.identity;
  if (confirmation && ['retry', 'recover'].includes(row.action) && (confirmation.action || 'retry') === row.action && row.enabled && recoveryIdentity(customizationUpdateSnapshot()) === confirmation.identity) {
    const buttons = h_flex().gap(4)
      .child(owner.button(theme, 'st-custom-retry-cancel', 'Cancel', (_event, cx) => { owner.customUpdateRetry = null; cx.notify(); }, { enabled: true }))
      .child(owner.button(theme, 'st-custom-retry-confirm', row.action === 'recover' ? 'Clear stopped state' : 'Retry update', (_event, cx) => {
        const current = customizationUpdateSnapshot();
        const state = customizationRowState(current, { busy: owner.customUpdatePending });
        if (owner.customUpdateClosed || owner.customUpdateRetry !== confirmation || !state.enabled || state.action !== row.action || recoveryIdentity(current) !== confirmation.identity) return;
        owner.customUpdateRetry = null;
        refreshCustomizationUpdates(owner, cx, row.action, false, false, { identity: confirmation.identity, confirmedStopped: true });
      }, { enabled: true }));
    return owner.row(theme, row.title, row.action === 'recover'
      ? 'No recorded owner or local updater is running. Clear stale locks, status and results only after confirming all local and remote update work has stopped. This does not retry the update.'
      : 'The previous update may have finished. Confirm local and remote update work has stopped before retrying.', buttons);
  }
  const slot = updateCheckSlot(owner, theme, {
    id: 'st-check-customizations', slotId: 'st-customizations-slot', key: 'customUpdateAsked',
    checking: row.label === 'Checking…', checked: row.current, label: row.label, enabled: row.enabled,
    onClick: (_event, cx) => {
      // Read current state again: retained nodes/duplicate pre-paint clicks cannot
      // launch an update after its availability or lock changed.
      const current = customizationRowState(customizationUpdateSnapshot(), { busy: owner.customUpdatePending, error: owner.customUpdateError });
      if (!current.enabled || current.action !== row.action || (current.current && recentlyAsked(owner, 'customUpdateAsked'))) return;
      if (['retry', 'recover'].includes(current.action)) {
        const snapshot = customizationUpdateSnapshot();
        owner.customUpdateRetry = { action: current.action, identity: current.action === 'recover' ? snapshot.clearRecovery.identity : snapshot.recovery.identity };
        cx.notify(); return;
      }
      owner.customUpdateRetry = null;
      if (current.action === 'check') owner.customUpdateAsked = Date.now();
      refreshCustomizationUpdates(owner, cx, current.action, true);
    },
  });
  return owner.row(theme, row.title, row.description, slot);
}
