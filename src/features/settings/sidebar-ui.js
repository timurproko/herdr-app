import { div, svg } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { window } from './host.js';
import { U, slot, settingsRow, chevronSlot } from './ui.js';
import { sectionRow } from './modal-layout.js';
import { settingsSections } from './settings-sections.js';
import { pluginIsEnabled } from './plugins.js';
import { footerVisible, toggleFooter } from './sidebar-footer.js';
import { settingsBackButton, SETTINGS_BACK_LABEL_INSET } from './settings-back.js';

export function statusbarSection(owner, t) {
  return v_flex().id('st-statusbar').w_full()
    .child(owner.heading(t, 'Statusbar'))
    // The shared row with the shared chevron slot at its right edge.
    .child(settingsRow(t, 'st-left-sidebar', { label: 'Left sidebar' })
      .on_click((_e, cx) => { owner.lookPage = 'sidebar'; cx.notify(); })
      .child(div().flex_1().text_size(U.font).text_color(t.foreground).child('Left sidebar'))
      .child(chevronSlot(t, 'right')));
}

export const LOOK_BACK_LABEL_INSET = SETTINGS_BACK_LABEL_INSET;

export function lookBackButton(owner, t) {
  return settingsBackButton(owner, t, {id:'st-look-back',parent:'Look',onBack:()=>{owner.lookPage=null;}});
}

export function sidebarLookPage(owner, t) {
  return v_flex().w_full()
    .child(owner.heading(t, 'Left sidebar'))
    .child(div().pb(12).text_size(U.meta).text_color(t.muted)
      .child('Choose the settings shortcuts shown in the left sidebar status bar.'))
    .children(settingsSections(window()?.platform).filter(s=>!s.plugin||pluginIsEnabled(s.plugin)).map((section, index, sections) =>
      sectionRow(t, h_flex(), { last: index === sections.length - 1 })
        .id(`st-sidebar-row-${section.id}`).gap(U.gap).items_center()
        .child(slot(svg(`mods/custom-settings/${section.icon}.svg`).size(U.icon).text_color(t.muted)))
        .child(div().flex_1().text_size(U.font).text_color(t.foreground).child(section.title))
        .child(owner.toggle(t, `st-sidebar-${section.id}`, footerVisible(section.id), (_e, cx) => {
          toggleFooter(section.id); cx.notify();
        }).role('switch').accessibility_label(`${section.title}: ${footerVisible(section.id) ? 'on' : 'off'}`))));
}
