// A persistent, terminal-free landing pane; no launch happens until a click.
import { View, div, svg, image } from 'gpui-kit';
import { v_flex, h_flex } from 'gpui-base';
import { spaces, panes, props, theme, window, readTextFile, keys, nextCommand } from './host.js';
import { warmSpaceStartFolder } from './directory.js';
import { U, slot, menuHeading, menuRow, hotkey, ROLE_LABELS, ROLE_ACTIONS, rolePillButton } from './ui.js';
import { cachedProfiles, composeProfiles, warmProfiles, PROFILE_ROLES, plainProfile, launchList } from './profiles.js';
import { launchSpaceProfile, pendingSpaceProfile } from './profile-actions.js';
import { pluginGateReady } from './plugins.js';
const shortcut = name => hotkey(keys().find(k => k.section === 'global' && k.action === name)?.keys);
export default class SpaceStart extends View {
  init(_props, cx) {
    this.spaceId = props()?.spaceId;
    const space = spaces().find(s => s.id === this.spaceId);
    this.machine = space?.machine ?? null;
    // Keyboard: the landing pane takes focus so number keys start profiles, like the + menu.
    this.handle = cx.focus_handle();
    this.handle.focus();
    this.shown = true;
    cx.spawn(async cx => { for (let c; typeof (c = await nextCommand()) === 'string';) if (c === 'focus') { this.handle.focus(); cx.notify(); } });
    cx.spawn(async cx => {
      try { await warmProfiles(this.machine); } catch { /* Keep the cached choices. */ }
      cx.notify();
    });
    // Where a launch from here starts (a worker copy's primary checkout, read in the background).
    warmSpaceStartFolder(space, readTextFile).catch(() => {});
    // Tabs already owns discovery. Follow its catalog/preferences without doing
    // more probes, and redraw only when this visible landing page changes.
    cx.timer.every(500, cx => {
      const space = spaces().find(s => s.active && s.id === this.spaceId);
      const activeTab = space?.tabs.find(t => t.active);
      const shown = Boolean(window()?.active && activeTab && panes().some(p => p.tab === activeTab.id && p.mod === 'custom-space-start'));
      // Coming back to this landing page (space or tab switch) hands it the keyboard again.
      if (shown && !this.shown) this.handle.focus();
      this.shown = shown;
      if (!shown) return;
      if (this.displayKey !== this.displayState()) cx.notify();
    });
  }
  allProfiles() {
    const cached = cachedProfiles(this.machine);
    return cached.length ? cached : composeProfiles(this.machine, []);
  }
  // The roles (Crew) whose plugin is on: a profile in one gets that role's pill on its row.
  roles() { return PROFILE_ROLES.filter(role => ROLE_LABELS[role] && pluginGateReady(`profile.role.${role}`)); }
  profileItems() { return launchList(this.allProfiles(), this.roles()); }
  displayState() {
    return JSON.stringify([this.profileItems(), this.roles(), pendingSpaceProfile(this.spaceId, this.machine) ?? null]);
  }
  // The row under the mouse: only it shows its role pill (Start Crew).
  hover(id, over, cx) {
    if (over) this.hoverRow = id; else if (this.hoverRow === id) this.hoverRow = null;
    cx?.notify();
  }
  // A fast exit can skip a row's leave event and keep its pill up: leaving the list, or any
  // move on the page outside it, clears the hovered row too.
  clearHover(cx) {
    if (this.hoverRow === null || this.hoverRow === undefined) return;
    this.hoverRow = null;
    cx?.notify();
  }
  row(t, id, icon, name, action, { enabled = true, hint = '', pill = null } = {}) {
    // The shared popup-menu row (ui.js), like the + menu's.
    return menuRow(t, { id, icon, label: name, hint: hint || null, trailing: this.hoverRow === id ? pill : null, enabled, dim: false,
      onClick: () => action(), onHover: (over, cx) => this.hover(id, over, cx) })
      .text_size(U.font).text_color(t.foreground);
  }
  render() {
    const t = theme(), space = spaces().find(s => s.id === this.spaceId && (s.machine ?? null) === this.machine);
    const roles = this.roles(), items = this.profileItems(), terminal = items.find(p => p.key === 'terminal');
    const profiles = items.filter(p => p.key !== 'terminal');
    // Number keys start the available rows as themselves, in the order shown.
    const available = profiles.filter(p => p.available === true);
    const pending = pendingSpaceProfile(this.spaceId, this.machine);
    this.displayKey = this.displayState();
    const launch = profile => { if (space && !pendingSpaceProfile(this.spaceId, this.machine)) launchSpaceProfile(profile, this.spaceId, this.machine); };
    const glyph = p => p.icon ? (p.tint ? svg(p.icon).size(U.icon).text_color(t.foreground) : image(p.icon).size(U.icon)) : svg('icons/shell.svg').size(U.icon);
    // The row starts the profile as itself; its role pill (Crew) starts it in that role.
    const profileRow = (p, id) => {
      const enabled = Boolean(space?.active && !pending && p.available === true);
      return this.row(t, id, glyph(p), p.name, () => launch(plainProfile(p)), {
        enabled, hint: p.key === 'terminal' ? (p.run ? '' : shortcut('tab.new'))
          : p.available === false ? 'not found' : p.available !== true ? 'not checked'
          : available.indexOf(p) < 9 ? String(available.indexOf(p) + 1) : '',
        pill: roles.includes(p.role) ? rolePillButton(t, { id: `space-start-${p.role}-${p.key}`, label: ROLE_ACTIONS[p.role] ?? ROLE_LABELS[p.role], enabled, onClick: () => launch(p) }) : null,
      });
    };
    const heading = (label, id) => menuHeading(t, label).id(id).h(30).flex_none().px(8).pt(8).pb(4);
    const list = (id, rows) => v_flex().id(id).h(Math.min(240, rows.length * U.row + Math.max(0, rows.length - 1) * U.rowGap)).flex_none().min_h(0).gap(U.rowGap).overflow_y_scrollbar().children(rows);
    return v_flex().id('space-start').size_full().min_h(0).bg(t.background).items_center().justify_center().p(24)
      .track_focus(this.handle)
      .on_mouse_down('left', () => this.handle.focus())
      .on_mouse_move((_e, cx) => { if (!this.overList) this.clearHover(cx); })
      .on_hover((over, cx) => { if (!over) this.clearHover(cx); })
      .on_key_down((e, cx) => {
        if (e.modifiers.control || e.modifiers.platform || e.modifiers.alt) return;
        const profile = /^[1-9]$/.test(e.key) ? available[Number(e.key) - 1] : null;
        if (!profile || !space?.active || pending) return;
        cx.stop_propagation();
        launch(plainProfile(profile));
      })
      // Same spacing as the + menu: 4px surface padding, rows U.rowGap apart, same headings.
      // Only things to start: the terminal and Profiles (a Crew pill on the crew ones).
      .child(v_flex().id('space-start-content').w_full().max_w(308).min_h(0).gap(U.rowGap)
        .p(4).rounded(8).border_1().border_color(t.border).bg(`${t.foreground}03`).text_size(U.font)
        .on_hover((over, cx) => { this.overList = over; if (!over) this.clearHover(cx); })
        .when(Boolean(terminal), el => el.child(profileRow(terminal, 'space-start-terminal')))
        .when(profiles.length > 0, el => el
          .child(heading('Profiles', 'space-start-profiles-heading'))
          .child(list('space-start-profiles', profiles.map(p => profileRow(p, `space-start-profile-${p.key}`))))));
  }
}
