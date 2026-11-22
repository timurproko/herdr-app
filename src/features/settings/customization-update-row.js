import { recentlyAsked, updateCheckSlot } from './update-check-feedback.js';
import { customizationRowState } from './customization-update-model.js';
import { customizationUpdateSnapshot, refreshCustomizationUpdates } from './customization-updates.js';

export function customizationUpdateRow(owner, theme) {
  const row = customizationRowState(customizationUpdateSnapshot(), { busy: owner.customUpdatePending, error: owner.customUpdateError });
  const slot = updateCheckSlot(owner, theme, {
    id: 'st-check-customizations', slotId: 'st-customizations-slot', key: 'customUpdateAsked',
    checking: row.label === 'Checking…', checked: row.current, label: row.label, enabled: row.enabled,
    onClick: (_event, cx) => {
      // Read current state again: retained nodes/duplicate pre-paint clicks cannot
      // launch an update after its availability or lock changed.
      const current = customizationRowState(customizationUpdateSnapshot(), { busy: owner.customUpdatePending, error: owner.customUpdateError });
      if (!current.enabled || current.action !== row.action || (current.current && recentlyAsked(owner, 'customUpdateAsked'))) return;
      if (current.action === 'check') owner.customUpdateAsked = Date.now();
      refreshCustomizationUpdates(owner, cx, current.action, true);
    },
  });
  return owner.row(theme, row.title, row.description, slot);
}
