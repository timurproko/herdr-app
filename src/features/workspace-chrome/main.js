// Custom skin: presentation-only clone of Herdr App 0.1.13's workspace-chrome.
import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { U, slot, interactionFill, menuSurface } from "./ui.js";
import { FOOTER_ITEMS, footerItems, footerVisible, moveFooter } from './sidebar-footer.js';
import { enterCustom } from "./look.js";
import { restoreFrames } from "./startup.js";
import { pluginEvent } from './plugins.js';
import { reorder, groupedInsertion } from './reorder.js';
import { initCustomizationUpdates, customizationUpdateAvailable } from './customization-updates.js';
import { theme, run, props, window, shared, setShared, updates, layout, openOverlay, closeOverlay } from "./host.js";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The sidebar's rail goes by its width, not a flag: dragging its edge narrows it too.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// To the rail (on macOS wide enough for the traffic lights), or back to the width it had.
function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  // Mods edited before the rail went by width still read the flag.
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 44 });
}

export default class WorkspaceChrome extends View {
  init(_props, cx) {
    if (props()?.footerMenu) {
      this.at = -1;
      this.handle = cx.focus_handle();
      this.handle.focus();
      return;
    }
    if (!props()?.footer) {
      enterCustom(this, cx);
      restoreFrames(cx);
      initCustomizationUpdates(this, cx, 'custom-workspace-chrome', { chrome: true });
    }
  }
  button(id, label, action) {
    const t = theme();
    return div().id(id).size(U.control).flex_none().flex().items_center().justify_center().rounded(U.radius).text_color(t.muted).hover(s => s.bg(interactionFill(t)).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action).child(label);
  }
  footerEntries() {
    return [{ id: 'configure', label: 'Configure', icon: 'mods/custom-workspace-chrome/settings.svg' }];
  }
  footerMenu(t) {
    const entries = this.footerEntries();
    return menuSurface(t, v_flex()).id('sidebar-footer-menu').w_full().track_focus(this.handle)
      .on_key_down((e, cx) => {
        const key = e.key;
        if (key === 'escape') closeOverlay(props().overlay);
        else if (key === 'down' || key === 'up') {
          this.at = this.at < 0 ? (key === 'down' ? 0 : entries.length - 1)
            : (this.at + (key === 'down' ? 1 : -1) + entries.length) % entries.length;
          cx.notify();
        } else if ((key === 'enter' || key === 'space') && this.at >= 0) this.chooseFooter(entries[this.at]);
        else return;
        cx.stop_propagation();
      })
      .children(entries.map((item, index) => h_flex().id(`footer-toggle-${item.id}`)
        .h(U.row).px(8).gap(U.gap).items_center().rounded(U.radius).text_color(t.foreground)
        .when(this.at === index, el => el.bg(t.hover)).hover(el => el.bg(t.hover)).cursor_pointer()
        .role('menu_item').accessibility_label(item.label)
        .on_click(() => this.chooseFooter(item))
        .child(slot(svg(item.icon).size(U.smallIcon).text_color(t.muted)))
        .child(div().flex_1().child(item.label))));
  }
  chooseFooter(item) {
    closeOverlay(props().overlay);
    openOverlay({ mod: 'custom-settings', kind: 'dialog', frame: 'none', width: 900,
      props: { section: 'look', lookPage: 'sidebar' } });
  }
  get drag() { return reorder(this, 'icons'); }
  openFooterMenu() {
    this.drag.reset();
    openOverlay({ mod: 'custom-workspace-chrome', kind: 'popup', frame: 'none', width: 200,
      height: 10 + U.row, props: { footerMenu: true } });
  }
  openFooter(id) {
    const action = footerItems().find(item => item.id === id)?.action;
    if (!action) return;
    if (action.command === 'custom.settings') openOverlay({ mod: 'custom-settings', kind: 'dialog', frame: 'none', width: 900,
      props: action.args });
    else run(action.command, action.args);
  }
  footerUnit() {
    // Fit every enabled shortcut without pushing the mandatory Settings gear
    // outside the sidebar. The usual four shortcuts retain their 28px targets.
    const width = find(layout(), 'sidebar')?.size?.px ?? Infinity;
    return Math.min(U.control, Math.max(1, (width - 16) / footerItems().length));
  }
  footerTarget(e) {
    return groupedInsertion(e, {groups: {left: footerItems('left'), right: footerItems('right')},
      unit: this.footerUnit(), scale: this.drag.current?.scale, source: this.drag.current?.id});
  }
  dropFooter(at, cx) {
    const result = this.drag.take(at, cx);
    if (result?.kind === 'drop' && result.target) moveFooter(result.id, result.target.side, result.target.before);
    else if (result?.kind === 'click') this.openFooter(result.id);
  }
  cancelFooterDrag(cx) { this.drag.cancel(cx); }
  footerIcon(item, t) {
    const drag = this.drag, unit = this.footerUnit();
    return drag.item(div().id(item.id === 'machines' ? 'machine' : item.id).size(U.control).w(unit).flex_none().relative()
      .flex().items_center().justify_center().rounded(U.radius).text_color(t.muted), item.id,
      {hover: s => s.bg(interactionFill(t)).text_color(t.foreground), cursor: true, tooltip: item.label})
      .role('button').accessibility_label(item.label)
      .on_mouse_down('left', (e, cx) => {
        cx.stop_propagation();
        drag.begin(item.id, e, cx, {scale: (e.bounds?.width ?? unit) / unit, target: null});
      })
      .on_mouse_up('left', (_e, cx) => { cx.stop_propagation(); this.dropFooter(item.id, cx); })
      .on_mouse_down('right', drag.guard((_e, cx) => { cx.stop_propagation(); this.openFooterMenu(); }))
      .child(slot(svg(item.icon).size(Math.min(U.smallIcon, unit)), Math.min(U.icon, unit)))
      .when(item.id === 'settings' && Boolean(updates().app.ready || customizationUpdateAvailable()), el => el.child(div().absolute().top(2).right(2).size(6).rounded_full().bg(t.accent)));
  }
  footerGroup(side, t) {
    const items = footerItems(side), drag = this.drag;
    const active = drag.active && drag.target?.side === side;
    const marker = id => drag.marker(`footer-drop-${side}-${id}`, t.accent);
    // Empty groups must occupy zero width: reserving an icon slot shifts the
    // right-edge insertion line inward, while hit-testing uses the real edge.
    return h_flex().id(`footer-group-${side}`).relative().h(U.control).min_w(0).flex_none().items_center()
      .children(items.map(item => div().relative().flex_none()
        .child(this.footerIcon(item, t))
        .when(active && drag.target.before === item.id, el => el.child(marker(item.id)))))
      .when(active && !drag.target.before, el => el.child(marker('end').left(items.length * this.footerUnit() - 1)));
  }
  footerPreview(t) {
    const item = FOOTER_ITEMS.find(item => item.id === this.drag.view?.id);
    return item ? this.drag.preview('footer-drag', t, {icon: svg(item.icon).size(U.smallIcon)}) : null;
  }
  footerSurface(t) {
    return this.drag.surface(h_flex().id('sidebar-footer-controls').relative().size_full()
      .bg(t.chrome).border_t(1).border_color(t.border).px(8).py(4).items_center().text_size(U.meta),
      {release: (id, cx) => this.dropFooter(id, cx), target: e => this.footerTarget(e)})
      .on_mouse_down('right', this.drag.guard((_e, cx) => { cx.stop_propagation(); this.openFooterMenu(); }))
      .when(Boolean(this.drag.view), el => el.child(this.footerPreview(t)));
  }
  render(cx) {
    if (props()?.footerMenu) return this.footerMenu(theme());
    if (!props()?.footer) pluginEvent('sidebar.sync',{owner:this,cx});
    const t = theme();
    const collapsed = narrow();
    if (props()?.footer) {
      if (collapsed) return this.footerSurface(t).justify_center()
        .when(FOOTER_ITEMS.some(item => footerVisible(item.id)), el => el.child(this.button("footer-menu", svg("mods/custom-workspace-chrome/more.svg").size(U.smallIcon),
          () => openOverlay({ mod: "custom-menu", kind: "popup", frame: "none", width: 200, height: 10 + footerItems().length * U.row, props: { tab: "footer" } }))
          .relative().when(footerVisible('settings') && Boolean(updates().app.ready || customizationUpdateAvailable()), el => el.child(div().absolute().top(2).right(2).size(6).rounded_full().bg(t.accent)))));
      return this.footerSurface(t)
        .child(this.footerGroup('left', t))
        .child(div().flex_1())
        .child(this.footerGroup('right', t));
    }
    return h_flex().size_full().bg(t.chrome).pl(collapsed ? 0 : 16).pr(collapsed ? 0 : 8).gap(4).items_center().text_size(U.font)
      .when(collapsed, el => el.justify_center())
      .when(window()?.platform === "macos" && !window()?.fullscreen && !collapsed, el => el.pl(76))
      .when(!collapsed, el => el.child(h_flex().flex_1().gap(8).items_center().child(image("frame/welcome/herdr.png").size(20).rounded(5)).child(div().font_medium().text_color(t.foreground).child("Herdr"))))
      .when(!collapsed, el => el.child(this.button("search", svg("mods/custom-workspace-chrome/search.svg").size(U.icon), () => run("mod.open", { name: "custom-picker" }))))
      // On the macOS rail the traffic lights fill the row; the agents list's » unfolds it.
      .when(!(collapsed && window()?.platform === "macos"), el => el.child(this.button("sidebar-toggle", svg("mods/custom-workspace-chrome/sidebar.svg").size(U.icon), toggleSidebar)));
  }
}
