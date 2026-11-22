import { h_flex } from 'gpui-base';
import { U } from './ui.js';
import { customizationRowState } from './customization-update-model.js';
import { customizationUpdateSnapshot, refreshCustomizationUpdates } from './customization-updates.js';

export function customizationUpdateRow(owner, theme) {
  const row = customizationRowState(customizationUpdateSnapshot(), { busy: owner.customUpdatePending, error: owner.customUpdateError });
  const button = owner.button(theme, 'st-check-customizations', row.label, (_event, cx) => {
    // Read current state again: retained nodes/duplicate pre-paint clicks cannot
    // launch an update after its availability or lock changed.
    const current = customizationRowState(customizationUpdateSnapshot(), { busy: owner.customUpdatePending, error: owner.customUpdateError });
    if (!current.enabled || current.action !== row.action) return;
    refreshCustomizationUpdates(owner, cx, current.action, true);
  }, { enabled: row.enabled }).w_full();
  return owner.row(theme, row.title, row.description, h_flex().id('st-customizations-slot').w(112).h(U.field).flex_none().items_center().justify_center().child(button));
}
