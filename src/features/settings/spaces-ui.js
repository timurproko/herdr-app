import { v_flex } from 'gpui-base';
import { spacePreferences, updateSpacePreferences } from './space-preferences.js';
export function spacesPage(owner, t) {
  const prefs = spacePreferences();
  const toggle = (key, id) => owner.toggle(t, id, prefs[key], (_e, cx) => {
    updateSpacePreferences({ [key]: !spacePreferences()[key] });
    cx.notify();
  }).role('switch').accessibility_label(key === 'connectFleetToCoordinator' ? 'Connect fleet space to coordinator' : key === 'confirmLastTab' ? 'Confirm before closing the last tab' : 'Close space when the last tab closes');
  return v_flex().w_full()
    .child(owner.heading(t, 'Spaces', 'Applies to the Custom layout on this computer, for local and remote spaces.'))
    .child(owner.row(t, 'Confirm before closing the last tab', 'Ask when you close the last tab or its last pane, including from the Agents menu. Process exits never prompt.', toggle('confirmLastTab', 'st-spaces-confirm')))
    .child(owner.row(t, 'Close space when the last tab closes', 'Turn off to keep the space in the sidebar with a Start page, a Terminal row and your exposed profiles.', toggle('closeOnLastTab', 'st-spaces-close')))
    .child(owner.row(t, 'Connect fleet space to coordinator', 'Attach the Crew fleet in the sidebar and show recorded task PRs in the coordinator’s Git panel.', toggle('connectFleetToCoordinator', 'st-spaces-fleet'), true));
}
