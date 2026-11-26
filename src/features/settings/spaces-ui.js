import { div } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { badge } from './settings-kit.js';
import { spacePreferences, updateSpacePreferences } from './space-preferences.js';
import { pluginEvent, pluginSettingsRows } from './plugins.js';
export function spacesPage(owner, t) {
  const prefs = spacePreferences(), rows = pluginSettingsRows('spaces');
  const toggle = (key, id) => owner.toggle(t, id, prefs[key], (_e, cx) => {
    updateSpacePreferences({ [key]: !spacePreferences()[key] });
    // Start verification from this event, not the sidebar's next lifecycle tick
    // (or the focus/snapshot refresh when the dialog closes).
    if (key === 'connectFleetToCoordinator') pluginEvent('workspace.context.refresh', { owner, cx });
    cx.notify();
  }).role('switch').accessibility_label(key === 'connectFleetToCoordinator' ? 'Connect fleet space to coordinator' : key === 'confirmLastTab' ? 'Confirm before closing the last tab' : 'Close space when the last tab closes');
  const page = v_flex().w_full()
    .child(owner.heading(t, 'Spaces', 'Applies to the Custom layout on this computer, for local and remote spaces.'))
    .child(owner.row(t, 'Confirm before closing the last tab', 'Ask when you close the last tab or its last pane, including from the Agents menu. Process exits never prompt.', toggle('confirmLastTab', 'st-spaces-confirm')))
    .child(owner.row(t, 'Close space when the last tab closes', 'Turn off to keep the space in the sidebar with a Start page, a Terminal row and your exposed profiles.', toggle('closeOnLastTab', 'st-spaces-close')))
    .child(owner.row(t, 'Connect fleet space to coordinator', 'Attach the Crew fleet in the sidebar and show recorded task PRs in the coordinator’s Git panel.', toggle('connectFleetToCoordinator', 'st-spaces-fleet'), !rows.length));
  rows.forEach((row, index) => page.child(owner.row(t, row.title, row.about,
      owner.toggle(t, `st-${row.id}`, row.value, (_e, cx) => row.change(!row.value, cx))
        .disabled(!row.available).when(!row.available, el => el.opacity(0.4))
        .role('switch').accessibility_label(row.title), index === rows.length - 1,
      row.statuses?.length ? v_flex().gap(4).children(row.statuses.map(status => h_flex().gap(8).items_center()
        .child(div().min_w(0).truncate().text_size(12).text_color(t.muted)
          .tooltip([status.machine, status.detail].filter(Boolean).join(' · '))
          .child([status.machine, status.detail].filter(Boolean).join(' · ')))
        .when(Boolean(status.label), el => el.child(badge(t, status.status, status.label))))) : null)));
  return page;
}
