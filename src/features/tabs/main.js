// Custom skin: presentation-only clone of Herdr App 0.1.13's tabs.
import { View, div, svg, image } from "gpui-kit";
import { h_flex, Toggle } from "gpui-base";
import { U, slot, itemHover, interactionFill, subtleActionFill, iconButton, spinner, inlineRename, INLINE_RENAME } from "./ui.js";
import { spaces, panes, run, openOverlay, theme, window, layout, settings } from "./host.js";
import { fileIconAsset } from './file-icons.js';
import { programIcon } from './program-icon.js';
import { tabDirectory } from './directory.js';
import { startProfileWarm } from './profile-warm.js';
import { startProfileLaunches } from './profile-launches.js';
import { tabTitle, beginTabRename, cancelTabRename, saveTabRename, syncTabRename } from './tab-rename.js';
import { startRenameKeys } from './rename-keys.js';
import { closeWithConfirmation } from './close-space.js';
import { startSpaceLifecycle, workTabs } from './space-lifecycle.js';
import { reorder, insertionIndex, insertionSlot } from './reorder.js';
import { changePanel, syncPanelState } from './panel-state.js';
import { sidebarPanels } from './plugins.js';

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// Just enough fill to reveal the inactive tab's full footprint beside +.
export function inactiveTabFill(t) {
  if (![t.chrome, t.foreground].every(c => /^#[0-9a-f]{6}$/i.test(c ?? ""))) return t.surface ?? t.chrome;
  return "#" + [1, 3, 5].map(i => Math.round(parseInt(t.chrome.slice(i, i + 2), 16) * 0.975
    + parseInt(t.foreground.slice(i, i + 2), 16) * 0.025).toString(16).padStart(2, "0")).join("");
}

// Convert an insertion slot (before removal) to the final one-based tab index.
export const moveIndex = insertionIndex;

export default class Tabs extends View {
  init(_props, cx) {
    startProfileWarm(cx);
    startRenameKeys(cx);
    startSpaceLifecycle(this, cx);
    this.actionHovered = null;
    this.rename = null;
    this.titleWidths = new Map();
    this.renameChromeWidth = 3 * U.gap + U.smallIcon + U.insetControl - INLINE_RENAME.gap;
    // Unpinned tabs share the native sidebar choice; explicit pins override it.
  }

  close() { cancelTabRename(this, null); }

  get drag() { return reorder(this, 'strip'); }
  cancelDrag(cx) { this.drag.reset(cx); }

  finishDrag(space, cx, clicked) {
    const result = this.drag.take(clicked, cx);
    const current = spaces().find(s => s.active);
    if (!result || result.meta?.space !== space?.id || current?.id !== space?.id) return;
    space = current; // Resolve fresh tabs, not the render snapshot captured by the handler.
    if (result.kind === 'drop') {
      const visible = workTabs(space);
      const index = insertionIndex(visible.findIndex(t => t.id === result.id), result.target, visible.length);
      if (index !== null) run("tab.move", { id: result.id, index: space.tabs.findIndex(t => t.id === visible[index - 1].id) + 1 });
    } else run("tab.select", { id: result.id });
  }

  render(cx) {
    startProfileLaunches(this, cx);
    syncTabRename(this, cx); // Native editor allocation yields out of the render phase.
    syncPanelState(this, cx);
    const t = theme(), drag = this.drag;
    const inactive = inactiveTabFill(t);
    const space = spaces().find(p => p.active);
    const allPanes = panes(), shown = space ? workTabs(space, allPanes) : [];
    const stop = (_e, cx) => cx.stop_propagation();
    if (drag.current && (drag.current.meta?.space !== space?.id || !shown.some(t => t.id === drag.current.id))) drag.reset();
    const button = (id, label, action) => drag.control(div().id(id).size(U.control).flex_none().flex().items_center().justify_center().rounded(U.radius).text_color(t.dim),
      {hover: s => s.bg(t.hover).text_color(t.foreground)})
      .on_mouse_down("left", stop).on_click(drag.guard(action)).child(label);
    // The shared icon button (ui.js): inset inside a tab, large for the bar's own +.
    const tabAction = (id, icon, action, inset = false, tooltip) => iconButton(t, { id, icon, large: !inset, tooltip: drag.active ? null : tooltip, color: t.muted, enabled: !drag.active,
      label: tooltip ?? (id === 'tab-new' ? 'New tab' : id.startsWith('close-') ? 'Close tab' : id), onClick: drag.guard(action) })
      .on_hover(drag.guard((hovered, cx) => { this.actionHovered = hovered ? id : null; cx.notify(); }));
    const item = (c, i) => {
      const program = allPanes.find(p => p.tab === c.id && p.program?.agent)?.program ?? allPanes.find(p => p.tab === c.id)?.program;
      const isFile = allPanes.some(p => p.tab === c.id && p.mod === 'custom-files');
      const directory = !isFile && c.named === false && program?.shell ? tabDirectory(c.id,allPanes) : null;
      const name = tabTitle(c, i, isFile);
      const edit = this.rename?.id === c.id && this.rename.space === space.id ? this.rename : null;
      const renameWidth = Math.max(INLINE_RENAME.minFieldWidth + INLINE_RENAME.gap + INLINE_RENAME.actionsWidth, edit?.startWidth ?? 0);
      return drag.item(h_flex().id(`tab-${c.id}`).relative().h(U.control).pl(8).pr(2).gap(edit ? INLINE_RENAME.gap : U.gap).rounded(U.radius).items_center().flex_none().text_size(U.font)
        .border(1).border_color(c.active ? t.border : inactive).bg(c.active ? t.selected : inactive).text_color(c.active ? t.foreground : t.muted), c.id,
        {hover: s => s.bg(this.actionHovered === `close-${c.id}` ? (c.active ? t.selected : inactive) : itemHover(t, c.active)), cursor: true,
          tooltip: !edit ? isFile ? c.name : directory?.cwd : null})
        .on_mouse_down("left", (e, cx) => {
          cx.stop_propagation();
          if (e.click_count === 2) return beginTabRename(this, c.id, cx);
          drag.begin(c.id, e, cx, {meta: {space: space.id}, target: i, scale: settings().zoom});
        })
        .on_mouse_move((e, cx) => drag.over(e, insertionSlot(e, i), cx))
        .on_mouse_up("left", (_e, cx) => { cx.stop_propagation(); this.finishDrag(space, cx, c.id); })
        .on_mouse_down("right", drag.guard((_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "custom-menu", kind: "popup", frame: "none", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }); }))
        .when(drag.active && insertionIndex(shown.findIndex(t => t.id === drag.current?.id), drag.target, shown.length) !== null
          && (drag.target === i || (i === shown.length - 1 && drag.target === shown.length)), el => el.child(
            drag.marker('tab-drop-indicator', t.accent, {edge: drag.target === i ? 'before' : 'after'})))
        .child(isFile ? slot(image(fileIconAsset(c.name)).size(U.icon)).text_size(U.font) : programIcon(program,t.foreground))
        .child(h_flex().id(edit ? `tab-title-slot-${c.id}-${edit.token}` : `tab-title-slot-${c.id}`).h(U.insetControl).min_w(0).flex_none().items_center().overflow_hidden()
          .when(Boolean(edit), el=>el.w(edit.expanded ? renameWidth : edit.startWidth)
            .on_mouse_down_out((_e,cx)=>cancelTabRename(this,cx,edit)))
          // First paint seeds the native width tracker; one layout event opens it.
          .when(Boolean(edit && !edit.expanded), el=>el.on_size_change((_size,cx)=>{
            if(this.rename===edit && !edit.expanded){edit.expanded=true;cx.notify();}
          }))
          .transition('width',{duration:edit ? 180 : 0,easing:'ease-out'})
          .child(edit ? inlineRename(t,{id:'tab-rename',target:c.id,input:edit.input,inputLabel:`Rename tab ${i+1}`,
            applyId:`rename-apply-${c.id}`,cancelId:`rename-cancel-${c.id}`,enabled:!drag.active,
            onApply:drag.guard((_e,cx)=>{cx.stop_propagation();saveTabRename(this,cx,edit);}),
            onCancel:drag.guard((_e,cx)=>{cx.stop_propagation();cancelTabRename(this,cx,edit,true);})}).w(renameWidth).flex_none()
            .track_focus(edit.handle).key_context('CustomTabRename')
            .on_action('custom-tab-rename.ignore',(_e,cx)=>cx.stop_propagation())
            .on_mouse_down('left',stop).on_mouse_down('right',stop).on_mouse_up('left',stop)
            .on_key_down((e,cx)=>{
              if(e.key==='f2'){cx.stop_propagation();return;}
              if(e.key==='escape'){cx.stop_propagation();cancelTabRename(this,cx,edit,true);}
            })
            : div().id(`tab-label-${c.id}`).max_w(170).truncate()
              .on_size_change(size=>{if(size.width>0){this.titleWidths??=new Map();this.titleWidths.set(c.id,Math.ceil(size.width));}})
              .child(c.zoomed ? `${name} Z` : name)))
        .when(!edit, el=>el
          .child(slot(c.status === "working" ? spinner(t.working)
            : div().size(U.statusSize).rounded_full().bg(c.status === "blocked" || c.status === "done" ? t[c.status] : t.chrome + "00"), U.smallIcon).id(`tab-status-${c.id}`))
          .child(slot(c.active ? tabAction(`close-${c.id}`, "mods/custom-pane/close.svg",
            (_e, cx) => { cx.stop_propagation(); closeWithConfirmation("tab.close", { id: c.id }); }, true) : div(), U.insetControl)));
    };
    const dragged = shown.find(c => c.id === drag.view?.id);
    const dragFile = dragged && allPanes.some(p => p.tab === dragged.id && p.mod === 'custom-files');
    const dragProgram = dragged && allPanes.find(p => p.tab === dragged.id)?.program;
    const dragLabel = dragged ? tabTitle(dragged, shown.indexOf(dragged), dragFile) : '';
    const root = layout(), sidebar = find(root, "sidebar"), w = window();
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(10, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 10;
    const panel = find(root, "panel");
    // Native welcome preferences do not own independently enabled plugins.
    const enabled = sidebarPanels();
    const explorerToggle = drag.control(Toggle.new('panel-files').pressed(Boolean(panel && !panel.hidden))
      .size(U.control).flex_none().flex().items_center().justify_center().rounded(U.radius)
      .text_color(t.muted).cursor_pointer().accessibility_label('Toggle right sidebar'),
      {hover: el=>el.bg(t.hover).text_color(t.foreground)})
      // This control lives in a window-drag block: never start an OS title-bar drag.
      .on_mouse_down('left',stop)
      .on_change(drag.guard((open,cx)=>{
        cx.stop_propagation();
        changePanel({open});
      }))
      .child(svg('mods/custom-workspace-chrome/sidebar-right.svg').size(U.icon));
    return drag.surface(h_flex().id("tabs-bar").relative().size_full().min_w(0).px(U.gutter).pl(lightsPadding).gap(4).items_center().bg(t.chrome).border_b(1).border_color(t.border),
      {release: (_id, cx) => this.finishDrag(space, cx)})
      .on_scroll_wheel(drag.guard(e => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); }))
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().gap(4).overflow_x_scrollbar().children(shown.map(item))
        .child(tabAction("tab-new", "mods/custom-workspace-chrome/plus.svg",
          () => openOverlay({ mod: "custom-new-menu", kind: "popup", frame: "none", width: 250, height: 512 }))
          .on_mouse_move((e, cx) => drag.over(e, shown.length, cx))))
      .when(Boolean(drag.view && dragged), el => el.child(drag.preview('tab-drag', t, {
        icon: dragFile ? slot(image(fileIconAsset(dragged.name)).size(U.icon)).text_size(U.font) : programIcon(dragProgram,t.foreground), label: dragLabel})))
      .when(enabled.length > 0, el => el.child(h_flex().id('panel-toggle-wrapper').flex_none().child(explorerToggle)))
      .when(w?.buttons, el => el.child(button("minimize", w.platform === "windows" ? svg("mods/custom-tabs/win-min.svg").size(16) : "−", () => run("window.minimize")))
        .child(button("maximize", w.platform === "windows" ? svg(`mods/custom-tabs/${w.maximized ? "win-restore" : "win-max"}.svg`).size(16) : "□", () => run("window.maximize")))
        .child(button("close-window", w.platform === "windows" ? svg("mods/custom-tabs/win-close.svg").size(16) : svg("mods/custom-pane/close.svg").size(13), () => run("window.close"))));
  }
}
