// Custom settings: private presentation clone of Herdr App 0.1.13 settings.
// Existing settings keep their original commands; palette edits apply explicitly.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, Scrollbar, InputState, Input } from "gpui-base";
import { U, DIALOG_SCROLL, control, slot, itemHover, spinner, dialogHeader, dialogSurface, button as uiButton, sectionHeading, description, dropdown, menuSurface, dropdownPlacement, searchHeader, dialogScrollFrame, dialogScrollbar, dialogScrollBody, refreshButton, emptyState } from "./ui.js";
import { initDesign, accentControl } from "./design.js";
import { isCustom, refreshLook, watchSettingsLayout, liveTheme as theme } from "./look.js";
import { hc, run, themes, fonts, updates, telemetry, settings, layouts, shared, setShared, appHome, readTextFile, writeTextFile, playSound, props, closeOverlay, window, spaces, machines } from "./host.js";
import { pluginIsEnabled } from './plugins.js';
import { renderPluginSettings, pluginPageRefresh } from './plugin-pages.js';
import { previewFont, previewFontPreference, setPreviewFont, adjustPreviewFontSize } from './preview-font.js';
import { terminalSpacingLabel, changeTerminalSpacing } from './terminal-spacing.js';
import { spacesPage } from './spaces-ui.js';
import { settingsSections } from './settings-sections.js';
import { statusbarSection, sidebarLookPage, lookBackButton, LOOK_BACK_LABEL_INSET } from './sidebar-ui.js';
import { initPlugins, reloadPlugins, pluginsPage, pluginConfirmation, pluginTextPage, pluginTextActions, pluginTextOpen, pluginTextChanged, closePluginTextPage, provideProfiles, followSettingsMachine, pluginsChecking, recheckAllPlugins, reloadRolePage, roleLinks as pluginRoleLinks, openRoleLink as openPluginRoleLink } from './plugins-ui.js';
import { closeBrowser } from './folder-browser.js';
import { settingsBackButton, initSettingsPageScroll, settingsPageScroll } from './settings-back.js';
import { initProfiles, reloadProfiles, profilesSurface, cancelProfileEdit, profileEditorActions } from './profiles-ui.js';
import { initTerminals, reloadTerminals, terminalsPage, cancelTerminalEdit, terminalEditorActions } from './terminals-ui.js';
import { cancelProfileDrag } from './profile-drag.js';
import { cancelTerminalDrag } from './terminal-drag.js';
import { cachedProfiles, composeProfiles, warmProfiles, setProfileRole, roleOrder, setRoleOrder } from './profiles.js';
import { machinePicker } from './machine-picker.js';
import { initPermissions, reloadPermissions, corePage, coreHasChanges, coreEditorActions } from './permissions.js';

import { M, sectionAction, sectionRow, modalFooter } from './modal-layout.js';
import { initCustomizationUpdates, refreshCustomizationUpdates, customizationUpdateAvailable, customizationUpdateSnapshot } from './customization-updates.js';
import { customizationUpdateRow } from './customization-update-row.js';
import { initUpdateCheckFeedback, updateCheckSlot } from './update-check-feedback.js';

const I = (name) => `mods/custom-settings/${name}.svg`;
const SETTINGS_NAV_WIDTH = 176;
const SETTINGS_CONTENT_INSET = 16;
// Host runtime only: never a portable preference. Keep at most eight dialogs.
const SETTINGS_NAV_KEY = 'custom.settings.navigation';
const navigationRecords = () => {
  const value = shared(SETTINGS_NAV_KEY);
  return value?.version === 1 && Array.isArray(value.dialogs) ? value.dialogs.slice(-8) : [];
};

const SECTIONS = settingsSections(window()?.platform);
const sectionAvailable = section => !section.plugin || pluginIsEnabled(section.plugin);

const LOOKS = { main: "Herdr", terminals: "Terminals", win98: "Herdr 98", custom: "Custom" };
const APPEARANCES = [
  [null, "System"],
  ["light", "Light"],
  ["dark", "Dark"],
];

// What the app uses when settings.json names no font (settings.rs).
const DEFAULT_FONT = "JetBrains Mono";
const DEFAULT_UI_FONT = "Geist";

export default class Settings extends View {
  backToPlugins(cx) {
    this.pluginConfirm=null;this.pluginChoice=null;
    this.pluginTarget = null;
    reloadPlugins(this, cx);
  }

  // Machine-scoped pages share one header context.
  get usageMachine() { return this.settingsMachine ?? null; }
  set usageMachine(value) { this.settingsMachine = value ?? null; }
  get profileMachine() { return this.settingsMachine ?? null; }
  set profileMachine(value) { this.settingsMachine = value ?? null; }
  init(_props, cx) {
    // A plugin's role list (Crew › Settings › Profiles) reads and changes the app's profiles through this.
    provideProfiles({ list: warmProfiles, setRole: setProfileRole, order: roleOrder, setOrder: setRoleOrder });
    const overlay = props()?.overlay;
    this.settingsOverlay = typeof overlay === 'string' && overlay.length > 0 && overlay.length <= 128 ? overlay : null;
    const remembered = this.settingsOverlay && navigationRecords().find(record => record?.overlay === this.settingsOverlay)?.section;
    const valid = id => SECTIONS.some(s => s.id === id && sectionAvailable(s));
    const asked = props()?.section;
    this.section = valid(remembered) ? remembered : valid(asked) ? asked : 'look';
    this.lookPage = this.section === 'look' && props()?.lookPage === 'sidebar' ? 'sidebar' : null;
    const requestedMachine = this.section === 'profiles' ? props()?.profilesMachine
      : this.section === 'terminals' ? (props()?.terminalsMachine === null || typeof props()?.terminalsMachine === 'string' ? props().terminalsMachine : props()?.profilesMachine)
      : this.section === 'core' ? props()?.coreMachine
      : props()?.usageMachine;
    this.settingsMachine = requestedMachine === null || typeof requestedMachine === "string" ? requestedMachine : spaces().find(s => s.active)?.machine ?? null;
    this.settingsHostOpen = false;
    this.settingsHostFocus = cx.focus_handle();
    initSettingsPageScroll(this); // Back returns to the parent page's scroll position
    this.picking = null; // "font" | "ui_font" while its list is open
    this.filter = "";
    this.fontBounds = {};
    this.fontPlacement = { above: true, height: 264, triggerHeight: U.field };
    this.fontListFocus = cx.focus_handle();
    this.fontInput = InputState.new({ placeholder: "Search for fonts…" });
    this.fontInputFocused = false;
    this.fontInput.on("focus", (_e, cx) => { this.fontInputFocused = true; cx.notify(); });
    this.fontInput.on("blur", (_e, cx) => { this.fontInputFocused = false; cx.notify(); });
    this.fontInput.on("change", (_e, cx) => { this.filter = this.fontInput.value(); cx.notify(); });
    this.renameInput = InputState.new();
    this.renameInput.on("focus", (_e, cx) => { this.renameFocused = true; cx.notify(); });
    this.renameInput.on("blur", (_e, cx) => { this.renameFocused = false; cx.notify(); });
    this.renameInput.on("change", (_e, cx) => { if (this.machineEdit?.action === "rename") this.machineEdit.name = this.renameInput.value(); cx.notify(); });
    this.renameInput.on("submit", (_e, cx) => {
      const edit = this.machineEdit;
      if (edit?.action === "rename") this.machineAction(edit.machine, "rename", cx, edit.name);
    });
    this.person = {};
    this.raw = null;
    this.previews = {}; // layout name -> its "preview" picture
    this.previewsOf = "";
    this.showData = false;
    this.machineList = null;
    this.machineLoading = false;
    this.machineError = null;
    this.machineBusy = {};
    this.machineResults = {};
    this.machineEdit = null;
    this.machineNotice = null;
    this.handle = cx.focus_handle();
    this.handle.focus();
    initProfiles(this, cx);
    initTerminals(this, cx);
    initPermissions(this, cx);
    initCustomizationUpdates(this, cx, 'custom-settings');
    initPlugins(this, cx, this.section === 'plugins' ? props()?.plugin : null, {section:props()?.pluginSection,search:props()?.pluginSearch});
    if (this.section === 'plugins') { followSettingsMachine(this); reloadPlugins(this, cx, this.pluginTarget); }
    initDesign(this, cx);
    watchSettingsLayout(this, cx);
    cx.spawn(async (cx) => {
      await this.load();
      if (this.section === "machines") await this.loadMachines();
      cx.notify();
    });
    // After "Check now": follow the look (the answer comes from the app), then
    // "Up to date" for a moment.
    initUpdateCheckFeedback(this, cx, [
      { key: 'asked', checking: () => updates().checking },
      { key: 'customUpdateAsked', checking: () => this.customUpdatePending === 'check' || customizationUpdateSnapshot()?.checking },
    ]);
    cx.timer.every(3000, (cx) => {
      if (this.section !== "machines") return;
      cx.spawn(async (cx) => {
        await this.loadMachines();
        cx.notify();
      });
    });
  }

  file() {
    return `${appHome()}/settings.json`;
  }

  // Each layout file may name a picture of itself (`"preview"` on its root).
  loadPreviews(names, cx) {
    this.previewsOf = names.join("\n");
    cx.spawn(async (cx) => {
      const found = {};
      for (const name of names) {
        try {
          const preview = JSON.parse((await readTextFile(`${appHome()}/layouts/${name}.json`)) ?? "{}").preview;
          if (typeof preview === "string" && preview) found[name] = preview;
        } catch {}
      }
      this.previews = found;
      cx.notify();
    });
  }

  async load() {
    this.raw = await readTextFile(this.file());
    try {
      this.person = this.raw ? JSON.parse(this.raw) : {};
    } catch {
      this.person = {};
    }
  }

  // Changes settings.json the way an agent would: read, change, write back
  // only if nobody changed it meanwhile (else read again and redo).
  change(edit, cx) {
    cx.spawn(async (cx) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await this.load();
        const next = JSON.parse(JSON.stringify(this.person));
        edit(next);
        try {
          await writeTextFile(this.file(), JSON.stringify(next, null, 2) + "\n", this.raw);
          this.person = next;
          break;
        } catch {}
      }
      cx.notify();
    });
  }

  selectSection(section) {
    if (this.pluginClosed || !SECTIONS.some(s => s.id === section && sectionAvailable(s))) return;
    this.section = section;
    if (this.settingsOverlay) setShared(SETTINGS_NAV_KEY, { version: 1, dialogs: [
      ...navigationRecords().filter(record => record?.overlay !== this.settingsOverlay && typeof record?.overlay === 'string' && typeof record?.section === 'string').slice(-7),
      { overlay: this.settingsOverlay, section },
    ] });
  }

  // View.close is also called by host VM teardown; it must not dismiss the
  // overlay or erase the section before the replacement initializes.
  close() {
    this.pluginClosed=true;this.pluginConfirm=null;
  }

  dismiss() {
    if (this.settingsOverlay) setShared(SETTINGS_NAV_KEY, { version: 1,
      dialogs: navigationRecords().filter(record => record?.overlay !== this.settingsOverlay) });
    this.close();
    closeOverlay(props()?.overlay);
  }

  // Pieces ---------------------------------------------------------------

  heading(t, text, about) {
    return sectionHeading(t, text, about);
  }

  // Keep separators before another section, note or action footer. Only the
  // final content row omits its trailing rule (not simply the last in a group).
  row(t, title, about, control, endOfContent = false) {
    return sectionRow(t,h_flex(),{last:endOfContent})
      .id(`st-row-${title}`)
      .gap(16)
      .items_center()
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .gap(U.descriptionGap)
          .child(div().text_size(U.font).text_color(t.foreground).child(title))
          .when(Boolean(about), (el) => el.child(description(t, about))),
      )
      .child(div().flex_none().child(control));
  }

  button(t, id, label, onClick, options) {
    return uiButton(t, id, label, onClick, options);
  }

  // − value +
  stepper(t, id, value, onMinus, onPlus) {
    const b = (k, label, f) =>
      div()
        .id(`${id}-${k}`)
        .w(U.field - 2)
        .h(U.field - 2)
        .flex()
        .items_center()
        .justify_center()
        .cursor_pointer()
        .text_size(15)
        .text_color(t.muted)
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click(f)
        .child(label);
    return control(t, h_flex())
      .items_center()
      .overflow_hidden()
      .child(b("minus", "\u2212", onMinus))
      .child(div().w(54).text_size(13).text_color(t.foreground).flex().justify_center().child(value))
      .child(b("plus", "+", onPlus));
  }

  toggle(t, id, on, onClick) {
    return h_flex().h(U.field).items_center().child(div()
      .id(id)
      .w(36)
      .h(20)
      .rounded(10)
      .relative()
      .cursor_pointer()
      .bg(on ? t.accent : t.hover)
      .on_click(onClick)
      .child(div().id(`${id}-thumb`).absolute().left(on ? 18 : 2).top(2).size(16).rounded(8)
        .bg(on ? t.accent_foreground : t.muted).transition("left", { duration: 140, easing: "ease-out" })));
  }

  // Look -----------------------------------------------------------------

  // A small drawing of each layout, in the theme's colors (as the welcome draws them).
  preview(t, name) {
    const row = () => div().flex().flex_row();
    const col = () => div().flex().flex_col();
    const term = (bg = t.background, edge = t.border) => div().flex_1().rounded(2).bg(bg).border_1().border_color(edge);
    const line = (w, c = t.dim) => div().h(3).w(w).flex_none().rounded(2).bg(c);
    const lines = (n, c) => col().gap(4).p(5).children([...Array(n)].map((_, i) => line(i % 2 ? 22 : 32, c)));
    const frame = (el) => el.size_full().rounded(6).overflow_hidden().border_1().border_color(t.border).bg(t.surface);
    if (name === "main")
      return frame(row())
        .child(col().w(42).border_r(1).border_color(t.border).child(lines(4)))
        .child(
          col()
            .flex_1()
            .child(row().h(11).gap(2).p(2).border_b(1).border_color(t.border).child(div().w(20).rounded(2).bg(t.accent)).child(div().w(16).rounded(2).bg(t.raised)).child(div().w(16).rounded(2).bg(t.raised)))
            .child(row().flex_1().p(4).gap(3).child(term()).child(term())),
        );
    if (name === "terminals") {
      const card = () => col().flex_1().rounded(4).border_1().border_color("#2c2f34").bg("#17191c").child(row().h(7).px(3).items_center().border_b(1).border_color("#25282c").child(line(14, "#5d6168")));
      return frame(col())
        .bg("#131619")
        .p(4)
        .gap(4)
        .child(row().h(10).gap(3).p(1).rounded(4).bg("#1d1f22").child(div().w(30).rounded(3).bg("#34373c").border_1().border_color("#4a4d53")).child(div().w(30)))
        .child(row().flex_1().gap(4).child(card()).child(card()));
    }
    // A layout of the person's own: a plain frame.
    return frame(col()).child(row().h(11).border_b(1).border_color(t.border)).child(row().flex_1().p(4).child(term()));
  }

  layoutPicker(t, cx) {
    const current = shared("layout") ?? "main";
    // Shipped looks in the welcome's order, then the person's own; new files show up by themselves.
    const shipped = Object.keys(LOOKS);
    const rank = (n) => (shipped.includes(n.toLowerCase()) ? shipped.indexOf(n.toLowerCase()) : shipped.length);
    const names = [...layouts()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    if (names.join("\n") !== this.previewsOf) this.loadPreviews(names, cx);
    return h_flex()
      .w_full()
      .flex_wrap()
      .gap(8)
      .children(
        names.map((name) => {
          const on = name.toLowerCase() === String(current ?? "").toLowerCase();
          return v_flex()
            .id(`st-l-${name}`)
            .w(124)
            .gap(6)
            .p(6)
            .rounded(8)
            .border_1()
            .border_color(on ? t.input : "#00000000")
            .bg(on ? t.raised : "#00000000")
            .cursor_pointer()
            .hover((s) => s.bg(t.raised))
            .on_click((_e, cx) => {
              run("layout.switch", { name });
              refreshLook(this, cx);
              cx.notify();
            })
            .child(
              div()
                .h(62)
                .w_full()
                .child(
                  this.previews[name]
                    ? image(this.previews[name]).size_full().rounded(6).border_1().border_color(t.border)
                    : this.preview(t, name),
                ),
            )
            .child(
              h_flex()
                .gap(5)
                .items_center()
                .child(div().text_size(12.5).text_color(on ? t.foreground : t.muted).child(LOOKS[name.toLowerCase()] ?? name))
                .when(on, (el) => el.child(svg(I("check")).size(12).text_color(t.accent))),
            );
        }),
      );
  }

  appearancePicker(t, cx) {
    const now = this.person.appearance ?? null;
    return control(t, h_flex())
      .p(2)
      .gap(2)
      .children(
        APPEARANCES.map(([value, label]) =>
          div()
            .id(`st-ap-${label}`)
            .px(U.gutter)
            .h(U.field - 6).flex().items_center().justify_center()
            .rounded(4)
            .text_size(U.font)
            .cursor_pointer()
            .when(now === value, (el) => el.bg(t.selected).text_color(t.foreground))
            .when(now !== value, (el) => el.text_color(t.muted).hover((s) => s.bg(t.hover).text_color(t.foreground)))
            .on_click((_e, cx) =>
              this.change((p) => {
                if (value === null) delete p.appearance;
                else p.appearance = value;
              }, cx),
            )
            .child(label),
        ),
      );
  }

  themePicker(t, light) {
    const s = settings();
    const current = light ? s.theme_light : s.theme_dark;
    const skin = isCustom();
    const all = themes();
    const preferred = all.some(x => x.name === "custom-palette") ? "custom-palette" : all.find(x => isCustom(x.name))?.name;
    return h_flex()
      .w_full()
      .flex_wrap()
      .gap(8)
      .children(
        // A theme named like a layout (themes/win98.json) is that layout's own.
        all
          .filter((x) => skin ? (!light && x.name === preferred) : (Boolean(x.light) === light && x.name !== "custom-palette" && (x.name === shared("layout") || !layouts().includes(x.name))))
          .map(({ name, colors: c }) => {
          const on = skin ? (isCustom(current) || current === "custom-palette") : name === current;
          const dot = (color) => div().w(8).h(8).rounded(4).bg(color);
          return v_flex()
            .id(`st-t-${name}`)
            .w(124)
            .gap(6)
            .p(6)
            .rounded(8)
            .border_1()
            .border_color(on ? t.input : "#00000000")
            .cursor_pointer()
            .hover((s) => s.bg(t.raised))
            .on_click((_e, cx) => {
              run("app.theme", { name });
              refreshLook(this, cx);
              cx.notify();
            })
            .child(
              v_flex()
                .h(46)
                .w_full()
                .p(7)
                .gap(6)
                .rounded(6)
                .border_1()
                .border_color(t.border)
                .bg(c.background)
                .child(div().h(4).w(44).rounded(2).bg(c.terminal_foreground))
                .child(h_flex().gap(4).child(dot(c.accent)).child(dot(c.ansi1)).child(dot(c.ansi2)).child(dot(c.ansi3)).child(dot(c.ansi5))),
            )
            .child(
              h_flex()
                .gap(5)
                .items_center()
                .child(div().text_size(12.5).text_color(on ? t.foreground : t.muted).child(skin ? "Custom" : name.replace(/-/g, " ")))
                .when(on, (el) => el.child(svg(I("check")).size(12).text_color(t.accent))),
            );
        }),
      );
  }

  // The font in use, written in itself; a click opens the list.
  fontButton(t, which, family, def) {
    const open = this.picking === which;
    const trigger = control(t, h_flex())
      .id(`st-f-${which}`)
      .on_mouse_move(e => { this.fontBounds[which] = e.bounds; })
      .on_mouse_down("left", e => { this.fontBounds[which] = e.bounds; })
      .w(200)
      .px(U.gutter).gap(8).items_center()
      .border_color(open ? t.input : t.border)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .child(div().flex_1().min_w(0).truncate().font_family(family).text_size(U.font).text_color(t.foreground).child(family))
      .child(slot(svg("mods/custom-workspace-chrome/chevron-down.svg").size(U.smallIcon).text_color(t.muted)));
    return dropdown(`st-font-popup-${which}`, trigger, open ? this.fontList(t, which, def) : div(), {
      open, focus: this.fontListFocus, above: this.fontPlacement.above, triggerHeight: this.fontPlacement.triggerHeight,
      onOpen: (shown, cx) => {
        if (shown) this.fontPlacement = dropdownPlacement(this.fontBounds[which], 264, globalThis.window.viewport_size().height, settings().zoom);
        this.picking = shown ? which : null;
        this.filter = ""; this.fontInput.set_value(""); cx.notify();
        if (shown) cx.timer.after(0, () => this.fontInput.focus());
        else this.handle.focus();
      },
    });
  }

  fontList(t, which, def) {
    const q = this.filter.toLowerCase();
    const matches = fonts().filter((f) => f.toLowerCase().includes(q)).slice(0, 200);
    const choose = (name, cx) => {
      if (which === 'preview_font') setPreviewFont({ family: name });
      else this.change((p) => {
        if (name === null) delete p[which];
        else p[which] = name;
      }, cx);
      this.picking = null;
      this.handle.focus();
      cx.notify();
    };
    const selected = which === 'preview_font' ? previewFontPreference().family : this.person[which] ?? null;
    const item = (id, label, family, value, onClick) =>
      div()
        .id(id)
        .px(U.gutter)
        .h(U.field).flex().items_center().gap(8)
        .rounded(U.radius)
        .role("list_box_option")
        .cursor_pointer()
        .hover((s) => s.bg(t.hover))
        .on_click(onClick)
        .child(div().flex_1().min_w(0).truncate().font_family(family).text_size(U.font).text_color(t.foreground).child(label))
        .child(slot(value === selected ? svg(I("check")).size(U.smallIcon).text_color(t.muted) : div(), U.smallIcon));
    return menuSurface(t, v_flex()).id(`st-font-menu-${which}`).p(0).pt(0).pb(0).w(260).track_focus(this.fontListFocus)
      .on_key_down((e, cx) => { if (e.key === "escape") { this.picking = null; this.handle.focus(); cx.stop_propagation(); cx.notify(); } })
      // Let the child's native scroll run before stopping the page's wheel event.
      .on_scroll_wheel((_e, cx) => cx.stop_propagation())
      .child(searchHeader(t, this.fontInput, { id: `st-font-search-${which}`, fieldId: `st-font-input-${which}`, focused: this.fontInputFocused, onClear: () => { this.filter = ''; } }))
      .child(
        div()
          .id(`st-fl-${which}`)
          .h(Math.max(24, this.fontPlacement.height - 64))
          .p(4)
          .overflow_y_scrollbar()
          .when(!q, (el) => el.child(item(`st-fd-${which}`, `Default (${def})`, def, null, (_e, cx) => choose(null, cx))))
          .children(matches.map((f, i) => item(`st-fi-${which}-${i}`, f, f, f, (_e, cx) => choose(f, cx)))),
      );
  }

  look(t, cx) {
    if (this.lookPage) return sidebarLookPage(this, t);
    const s = settings();
    const preview = previewFont();
    const p = this.person;
    const own = (key, composed, def) => (p[key] ?? def) !== composed;
    const size = (key, value, d, cx) => this.change((q) => (q[key] = Math.max(8, Math.min(32, (q[key] ?? value) + d))), cx);
    const fontRow = (which, sizeKey, title, family, def, sizeNow) =>
      v_flex()
        .w_full()
        .child(
          this.row(
            t,
            title,
            which !== 'preview_font' && own(which, family, def) ? "This layout sets its own; yours shows in the others." : null,
            h_flex()
              .gap(8)
              .items_center()
              // Keep the font dropdown on the right, aligned with Interface font.
              .when(Boolean(sizeKey), (el) => el.child(this.stepper(t, `st-${sizeKey}`, `${Math.round(sizeNow)}`, (_e, cx) => which === 'preview_font' ? adjustPreviewFontSize(-1) : size(sizeKey, sizeNow, -1, cx), (_e, cx) => which === 'preview_font' ? adjustPreviewFontSize(1) : size(sizeKey, sizeNow, 1, cx))))
              .child(this.fontButton(t, which, family, def)), 
            which === "ui_font",
          ),
        );
    return v_flex()
      .w_full()
      .child(this.heading(t, "Layout"))
      .child(this.layoutPicker(t, cx))
      .child(div().h(18))
      .child(this.heading(t, "Color scheme"))
      // Matching A1 session colors moved to Settings > Plugins (A1 session colors).
      .when(isCustom(), el => el
        .child(this.row(t, "Accent color", "Applies the accent color throughout the interface", accentControl(this, t, cx), true)))
      .when(!isCustom(), el => el
        .child(this.row(t, "Appearance", "Light or dark, or as your system is now.", this.appearancePicker(t, cx)))
        .child(div().pt(12).pb(8).text_size(12.5).text_color(t.dim).child("For the layout you're in: each layout keeps its own light and dark theme."))
        .child(div().pb(6).text_size(12.5).font_medium().text_color(t.muted).child("Dark"))
        .child(this.themePicker(t, false))
        .child(div().pt(10).pb(6).text_size(12.5).font_medium().text_color(t.muted).child("Light"))
        .child(this.themePicker(t, true)))
      .child(div().h(18))
      .child(this.heading(t, "Size"))
      .child(
        this.row(
          t,
          "Zoom",
          "Terminals, panels, text.",
          h_flex().id('st-zoom-controls').flex_none().justify_end()
            .gap(8)
            .items_center()
            .child(this.stepper(t, "st-zoom", `${Math.round(s.zoom * 100)}%`, () => run("app.zoom_out"), () => run("app.zoom_in")))
            .child(this.button(t, "st-zoom-reset", "Reset", () => run("app.zoom_reset")).w(76)),
          !isCustom(),
        ),
      )
      .when(isCustom(), el => el
        .child(this.row(t, "Padding", null,
          h_flex().gap(8).items_center()
            .child(this.stepper(t, "st-terminal-spacing", terminalSpacingLabel(),
              (_e, cx) => this.changeTerminalSpacing(-1, cx),
              (_e, cx) => this.changeTerminalSpacing(1, cx)))
            .child(this.button(t, "st-terminal-spacing-reset", "Reset", (_e, cx) => this.changeTerminalSpacing(null, cx)).w(76)), true))
        .when(Boolean(this.terminalSpacingError), el => el.child(div().pt(8).text_size(12.5).text_color(t.muted).child(this.terminalSpacingError))))
      .child(div().h(18))
      .child(this.heading(t, "Fonts"))
      .child(fontRow("font", "font_size", "Terminal font", s.font_family, DEFAULT_FONT, s.font_size))
      .when(isCustom(), el => el.child(fontRow('preview_font', 'preview_font_size', 'Preview font', preview.family, s.font_family, preview.size)))
      .child(fontRow("ui_font", null, "Interface font", s.ui_font_family, DEFAULT_UI_FONT))
      .child(div().h(18))
      .child(statusbarSection(this, t));
  }

  changeTerminalSpacing(delta, cx) {
    this.terminalSpacingError = null;
    cx.spawn(async cx => {
      try { await changeTerminalSpacing(delta); }
      catch (error) { this.terminalSpacingError = String(error.message ?? error); }
      cx.notify();
    });
  }

  keyboard(t) {
    const choices = [
      ["auto", "Automatic (Alt on US keyboards)"],
      ["on", "Alt"],
      ["off", "Types characters"],
      ["left", "Left Option is Alt"],
      ["right", "Right Option is Alt"],
    ];
    return v_flex()
      .w_full()
      .child(this.heading(t, "Option key"))
      .child(div().pb(12).text_size(13).text_color(t.dim).child("Use Option for terminal shortcuts or to type accents and special characters."))
      .children(choices.map(([value, label]) => {
        const on = (this.person.option_as_alt ?? "auto") === value;
        return h_flex()
          .id(`st-option-${value}`)
          .gap(10)
          .px(12)
          .py(10)
          .rounded(7)
          .items_center()
          .cursor_pointer()
          .hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => this.change((p) => { p.option_as_alt = value; }, cx))
          .child(div().text_color(on ? t.accent : t.muted).child(on ? "◉" : "○"))
          .child(div().text_size(14).text_color(t.foreground).child(label));
      }));
  }

  // Machines -------------------------------------------------------------

  async loadMachines() {
    if (this.machineLoading) return;
    this.machineLoading = true;
    try {
      const r = await hc(["machine", "ls", "--json"]);
      if (r.code !== 0) throw new Error(r.stderr || r.stdout || "Couldn't read machines.");
      const list = JSON.parse(r.stdout).machines;
      if (!Array.isArray(list)) throw new Error("Couldn't read machines.");
      this.machineList = list.filter((m) => !m.temporary);
      this.machineError = null;
    } catch (e) {
      this.machineError = String(e);
    } finally {
      this.machineLoading = false;
    }
  }

  machineAction(machine, action, cx, name) {
    if (this.machineBusy[machine]) return;
    if (action === "rename" && (!name?.trim() || name.trim() === machine)) return;
    this.machineBusy[machine] = action;
    delete this.machineResults[machine];
    this.machineEdit = null;
    this.handle.focus();
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const args = ["machine", action, machine];
        if (action === "rename") args.push(name.trim());
        const r = await hc(args);
        let payload = null;
        try { payload = JSON.parse(r.stdout || r.stderr); } catch {}
        if (r.code !== 0) throw new Error(payload?.error?.message || (r.stderr || r.stdout || "It didn't work.").trim());
        const message = action === "update"
          ? `Updated ${machine}${payload?.version ? ` to hc ${payload.version}` : ""}; its terminals kept running.`
          : action === "rename" ? `Renamed ${machine} to ${name.trim()}.` : `Removed ${machine}; its terminals keep running there.`;
        if (action === "update") this.machineResults[machine] = { message, ok: true };
        else this.machineNotice = message;
      } catch (e) {
        this.machineResults[machine] = { message: String(e), ok: false };
      } finally {
        delete this.machineBusy[machine];
      }
      await this.loadMachines();
      cx.notify();
    });
  }

  olderCore(remote, local) {
    const parse = (v) => /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+.*)?$/.exec(v ?? "");
    const a = parse(remote), b = parse(local);
    if (!a || !b) return false;
    for (let i = 1; i <= 3; i++) {
      if (+a[i] !== +b[i]) return +a[i] < +b[i];
    }
    if (!a[4] || !b[4]) return Boolean(a[4] && !b[4]);
    const x = a[4].split("."), y = b[4].split(".");
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      if (x[i] === y[i]) continue;
      if (x[i] === undefined || y[i] === undefined) return x[i] === undefined;
      const xn = /^\d+$/.test(x[i]), yn = /^\d+$/.test(y[i]);
      return xn && yn ? +x[i] < +y[i] : xn !== yn ? xn : x[i] < y[i];
    }
    return false;
  }

  machineRow(t, m, localVersion) {
    const local = m.name == null;
    const busy = local ? null : this.machineBusy[m.name];
    const edit = this.machineEdit?.machine === m.name ? this.machineEdit : null;
    const state = String(m.state ?? "unknown").replace(/[_-]/g, " ");
    const color = ["connected", "online"].includes(m.state) ? t.ansi2 : ["connecting", "reconnecting"].includes(m.state) ? t.working : t.blocked;
    const result = this.machineResults[m.name];
    const controls = h_flex().gap(6).items_center();
    if (busy) controls.child(spinner(t.working)).child(div().text_size(12).text_color(t.muted).child(busy === "update" ? "Updating…" : busy === "rename" ? "Renaming…" : "Removing…"));
    else if (!local) {
      if (this.olderCore(m.version, localVersion)) controls.child(this.button(t, `st-m-update-${m.name}`, "Update", (_e, cx) => this.machineAction(m.name, "update", cx)));
      for (const [action, label] of [["rename", "Rename"], ["rm", "Remove"]]) {
        controls.child(this.button(t, `st-m-${action}-${m.name}`, label, (_e, cx) => {
          this.machineEdit = { machine: m.name, action, name: m.name };
          if (action === "rename") {
            this.renameInput.set_value(m.name);
            this.renameInput.set_selected_range({ start: 0, end: encodeURIComponent(m.name).replace(/%[0-9A-F]{2}/g, "_").length });
            this.renameFocused = true;
            this.renameInput.focus();
          }
          cx.notify();
        }).w(76));
      }
    }
    const row = sectionRow(t,v_flex()).id(local ? "st-row-This computer" : `st-machine-${m.name}`).gap(8)
      .child(h_flex().gap(10).items_center()
        .child(div().id(`st-machine-status-${m.name ?? "local"}`).w(7).h(7).flex_none().rounded(4).bg(color))
        .child(v_flex().flex_1().min_w(0).gap(3)
          .child(div().text_size(14).text_color(t.foreground).child(m.name ?? "This computer"))
          .child(div().text_size(12.5).text_color(t.dim).child(local ? `Connected · ${m.version ? `hc ${m.version}` : "hc version unknown"}` : `${m.target ?? ""} · ${state} · ${m.version ? `hc ${m.version}` : "hc version unknown"}`)))
        .child(controls.flex_none()));
    if (busy === "update") row.child(div().text_size(12.5).text_color(t.dim).child("Copying this computer's herdr-core. Its terminals keep running."));
    if (edit && !busy) {
      const cancel = this.button(t, `st-m-cancel-${m.name}`, "Cancel", (_e, cx) => { this.machineEdit = null; this.handle.focus(); cx.notify(); }).w(76);
      if (edit.action === "rm") row.child(v_flex().gap(8)
        .child(div().text_size(12.5).text_color(t.muted).child(`Remove ${m.name}? Its terminals keep running there.`))
        .child(h_flex().gap(6).child(cancel).child(this.button(t, `st-m-confirm-${m.name}`, "Remove machine", (_e, cx) => this.machineAction(m.name, "rm", cx)))));
      else row.child(v_flex().gap(6)
        .child(div().text_size(12).text_color(t.dim).child("New name (addresses using the old name stop working)"))
        .child(h_flex().gap(6).items_center()
          .child(control(t, Input.new(this.renameInput)).flex_1().min_w(0).px(U.gutter).border_color(this.renameFocused ? t.input : t.border))
          .child(cancel).child(this.button(t, `st-m-save-${m.name}`, "Save", (_e, cx) => this.machineAction(m.name, "rename", cx, edit.name)).w(76))));
    }
    if (result) row.child(div().text_size(12.5).text_color(result.ok ? t.ansi2 : t.blocked).child(result.message));
    return row;
  }

  machines(t) {
    const version = updates().core.version;
    return v_flex().w_full()
      .child(this.heading(t, "Machines", "Your computers, reached over ssh. Their terminals keep running when you disconnect."))
      .child(sectionAction(h_flex()).id("st-machine-actions").child(this.button(t, "st-m-add", "Add a machine", () => run("mod.open", { name: "custom-machine-add" }))))
      .child(this.machineRow(t, { name: null, state: "connected", version }, version).border_t(1))
      .children((this.machineList ?? []).map((m) => this.machineRow(t, m, version)))
      .when(this.machineList === null && !this.machineError, (el) => el.child(h_flex().py(M.sectionInset).gap(8).items_center().child(spinner(t.working)).child(div().text_size(12.5).text_color(t.dim).child("Reading machines…"))))
      .when(this.machineList?.length === 0, (el) => el.child(emptyState(t,{id:'machines-empty',title:'No other machines',icon:'mods/custom-workspace-chrome/server.svg'}).h(112).flex_none()))
      .when(Boolean(this.machineError), (el) => el.child(div().py(M.sectionInset).text_size(12.5).text_color(t.blocked).child(this.machineError)))
      .when(Boolean(this.machineNotice), (el) => el.child(div().py(M.sectionInset).text_size(12.5).text_color(t.ansi2).child(this.machineNotice)));
  }

  // Alerts ---------------------------------------------------------------

  // Settings › Profiles links to a plugin's role page (Crew: "Add a crew profile"); its Back
  // (button or Escape) returns to Profiles, not to Plugins.
  roleLinks() { return pluginRoleLinks(); }
  openRoleLink(link, cx) {
    if (this.profileEdit || this.terminalEdit) return;
    cancelProfileDrag(this);
    this.selectSection('plugins'); this.pluginTarget = null; this.pluginConfirm = null; this.pluginTextFrom = 'profiles';
    followSettingsMachine(this); reloadPlugins(this, cx);
    openPluginRoleLink(this, cx, link); cx.notify();
  }
  closePluginPage(cx) {
    const from = this.pluginTextFrom; this.pluginTextFrom = null;
    closePluginTextPage(this);
    if (from === 'profiles') { this.selectSection('profiles'); reloadProfiles(this, cx); }
  }

  machineSection() {
    return ['core','profiles','terminals','plugins'].includes(this.section) || Boolean(SECTIONS.find(s=>s.id===this.section)?.machineScoped);
  }

  machinePicker(t) {
    // A plugin install or list change runs on the machine it started on: no switching mid-way.
    const busy=Boolean(this.profileEdit||this.terminalEdit||this.permissionApplying||(this.section==='plugins'&&this.pluginFixing));
    return machinePicker(t,{id:'st-settings-host',selected:this.settingsMachine,open:this.settingsHostOpen,focus:this.settingsHostFocus,disabled:busy,
      onOpen:(open,cx)=>{this.settingsHostOpen=open;cx.notify();},
      onSelect:(machine,cx)=>{
        if(busy||this.profileEdit||this.terminalEdit||this.permissionApplying||(this.section==='plugins'&&this.pluginFixing)||!this.machineSection())return;
        cancelProfileDrag(this);cancelTerminalDrag(this);this.settingsMachine=machine;this.settingsHostOpen=false;
        this.profileSerial++;this.profileLoading=false;this.profileError=null;this.profileDelete=null;this.profileShells=[];this.profileShellOpen=false;
        this.profileItems=cachedProfiles(machine);if(!this.profileItems.length)this.profileItems=composeProfiles(machine,[]);
        this.terminalError=null;
        if(this.section==='profiles')reloadProfiles(this,cx);
        if(this.section==='terminals')reloadTerminals(this,cx);
        if(this.section==='core')reloadPermissions(this,cx);
        if(this.section==='plugins'){this.listPicker=null;closeBrowser(this);for(const id of followSettingsMachine(this))reloadPlugins(this,cx,id);reloadRolePage(this,cx);}
        cx.notify();
      }});
  }

  refreshBusy() {
    return Boolean(this.section==='core'?this.terminalPermissions?.get(this.profileMachine)?.loading
      :this.section==='profiles'?this.profileLoading:this.section==='terminals'?this.profileShellLoading
      :this.section==='plugins'?pluginsChecking(this):false);
  }

  headerTools(t) {
    if (!this.machineSection()) return null;
    const section=this.section, profiles=section==='profiles', core=section==='core';
    const tools=h_flex().id('st-header-tools').gap(12).items_center().child(this.machinePicker(t));
    // Plugins: re-run every check of every plugin on the header's machine.
    if (section==='plugins') {
      const busy=this.refreshBusy(), enabled=!busy&&!this.pluginFixing;
      return tools.child(refreshButton(t, { id:'st-plugins-refresh', icon:I('refresh'), label:busy?'Checking plugins…':'Check all plugins',
        busy, enabled, owner:this, scope:JSON.stringify(['plugins',this.settingsMachine??null]),
        onClick:(_e,cx)=>{ if(this.section!=='plugins'||!enabled)return; recheckAllPlugins(this,cx); cx.notify(); } }));
    }
    // A plugin page may declare a Refresh for the header's machine (Usage: every provider).
    const pageRefresh=pluginPageRefresh(section);
    if (pageRefresh) {
      const machine=this.settingsMachine??null, busy=Boolean(pageRefresh.busy?.(machine)), enabled=!busy&&pageRefresh.enabled?.(machine)!==false;
      return tools.child(refreshButton(t, { id:`st-${section}-refresh`, icon:I('refresh'), label:busy?pageRefresh.busyLabel??pageRefresh.label:pageRefresh.label,
        busy, enabled, owner:this, scope:JSON.stringify([section,machine]),
        onClick:(_e,cx)=>{ if(this.section!==section||(this.settingsMachine??null)!==machine||pluginPageRefresh(section)!==pageRefresh)return; pageRefresh.run(machine,cx); cx.notify(); } }));
    }
    if (!['core','profiles','terminals'].includes(section)) return tools;
    const busy=this.refreshBusy();
    const enabled=!busy&&!this.profileEdit&&!this.terminalEdit&&!this.permissionApplying;
    const subject=core?'core':profiles?'profiles':'terminals';
    const label=busy?`Refreshing ${subject}…`:`Refresh ${subject}`;
    return tools.child(refreshButton(t, { id: core?'st-core-refresh':profiles?'st-profile-refresh':'st-terminal-refresh',
      icon: I('refresh'), label, busy, enabled, owner: this, scope: JSON.stringify([section,this.profileMachine]),
      onClick: (_e,cx)=>{
        if(this.section!==section||this.profileEdit||this.terminalEdit||this.refreshBusy()||!enabled)return;
        if(core)reloadPermissions(this,cx);else if(profiles)reloadProfiles(this,cx);else reloadTerminals(this,cx,true);
        cx.notify();
      } }));
  }

  alerts(t) {
    const sounds = this.person.sounds ?? {};
    const on = sounds.enabled !== false;
    const file = (f) => (f ? f.split(/[\\/]/).pop() : "Herdr's sound");
    return v_flex()
      .w_full()
      .child(this.heading(t, "Sounds"))
      .child(
        this.row(
          t,
          "Play sounds",
          "When an agent needs you, and when one finishes while you're not looking. A note shows in the corner either way.",
          this.toggle(t, "st-sounds", on, (_e, cx) => this.change((p) => (p.sounds = { ...(p.sounds ?? {}), enabled: !on }), cx)),
        ),
      )
      .child(this.row(t, "An agent needs you", file(sounds.blocked), this.button(t, "st-play-blocked", "Play", () => playSound("blocked"))))
      .child(this.row(t, "An agent finished", file(sounds.done), this.button(t, "st-play-done", "Play", () => playSound("done"))))
      .child(div().pt(12).text_size(12.5).line_height("18px").text_color(t.dim).child("Want your own sounds? Ask your agent to set sounds.done and sounds.blocked in settings.json to an MP3."));
  }

  // Updates --------------------------------------------------------------

  updates(t) {
    const u = updates();
    const at = (secs) => {
      const d = new Date(secs * 1000);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const checked = u.checked ? ` Checked at ${at(u.checked)}.` : "";
    const outcome = u.checked ? `Up to date.${checked}`
      : "No successful check. Check your connection and try again.";
    // Keep the existing description during a check; progress belongs to the button.
    if (!u.checking) this.updateCheckDescription = outcome;
    const result = this.updateCheckDescription ?? outcome;
    // Pressed: "Checking\u2026" while it looks, then "Up to date" for a moment
    // (a find changes the row instead). One per row: an element shows once.
    const check = (id) => !u.checks ? null : updateCheckSlot(this, t, {
      id, key: 'asked', checking: u.checking, checked: u.checked,
      onClick: (_e, cx) => {
        if (updates().checking) return;
        this.asked = Date.now();
        run("app.check_updates");
        cx.notify();
      },
    });
    const primary = (id, label, f) =>
      control(t, div()).id(id).px(U.gutter).flex().items_center().justify_center().cursor_pointer()
        .bg(t.solid).border_color(t.solid).text_color(t.solid_foreground).hover((s) => s.opacity(0.9)).on_click(f).child(label);
    const app = !u.app.updates
      ? ["A build from source: it updates with git, not here.", null]
      : u.app.ready
        ? [`${u.app.ready} is ready. Restart to switch now; it also switches when you quit.`, primary("st-app-update", "Restart to update", () => run("app.update"))]
        : [result, check("st-check-app")];
    const c = u.core;
    const core = c.managed
      ? [`Managed by ${c.managed}: update it there.`, null]
      : c.updating
        ? ["Updating\u2026 your terminals keep running.", null]
        : c.error
          ? [`The update failed: ${c.error}`, primary("st-core-retry", "Try again", () => run("app.update_core"))]
          : c.ready
            ? [`${c.ready} is ready. Your terminals keep running through it.`, primary("st-core-update", "Update herdr-core", () => run("app.update_core"))]
            : u.checks
              ? [result, check("st-check-core")]
              : ["Not checked: a build from source looks for no updates.", null];
    return v_flex()
      .w_full()
      .child(this.heading(t, "Herdr"))
      .child(this.row(t, `Herdr ${u.app.version}`, app[0], h_flex().gap(8).flex_none()
        .child(this.button(t, "st-whats-new", "What's new", () => { this.dismiss(); run("app.whats_new"); }))
        .when(Boolean(app[1]), (el) => el.child(app[1]))))
      .child(this.row(t, `herdr-core ${c.version ?? ""}`, core[0], core[1] ?? div()))
      .child(customizationUpdateRow(this, t))
      .child(div().pt(12).text_size(12.5).line_height("18px").text_color(t.dim).child("Herdr looks for both every hour and tells you in the corner. herdr-core runs your terminals, so they keep running through its updates."));
  }


  // Privacy --------------------------------------------------------------

  // A report as it goes out, one line per line of JSON.
  report(t, id, title, about, report) {
    const lines = JSON.stringify(report, null, 2).split("\n");
    return v_flex()
      .w_full()
      .pt(M.sectionInset)
      .gap(4)
      .child(div().text_size(13.5).text_color(t.foreground).child(title))
      .when(Boolean(about), (el) => el.child(div().text_size(12.5).text_color(t.dim).child(about)))
      .child(
        v_flex()
          .id(id)
          .mt(4)
          .w_full()
          .p(10)
          .rounded(8)
          .border_1()
          .border_color(t.border)
          .bg(t.background)
          .children(lines.map((l) => div().font_family(DEFAULT_FONT).text_size(12).line_height("17px").text_color(t.muted).whitespace_nowrap().child(l || " "))),
      );
  }

  privacy(t) {
    const s = telemetry();
    const on = s ? s.setting : this.person.telemetry !== false;
    const at = (secs) => new Date(secs * 1000).toLocaleString();
    const why = s?.off_because ? `Off for now: ${s.off_because} is set where Herdr started.` : null;
    const body = v_flex()
      .w_full()
      .child(this.heading(t, "Usage data"))
      .child(
        this.row(
          t,
          "Share anonymous usage data",
          why ?? "Once a day: which agents and features you use, how many spaces and tabs, your system and Herdr's version. Never what's in your terminals, never names of files, folders or projects.",
          this.toggle(t, "st-telemetry", on, (_e, cx) =>
            this.change((p) => {
              if (on) p.telemetry = false;
              else delete p.telemetry;
            }, cx),
          ),
        ),
      )
      .child(
        this.row(
          t,
          "What we send",
          s && !s.sends ? "This build never sends: it's built from source. You can still see what a release would send." : "Exactly what leaves your computer, word for word.",
          this.button(t, "st-telemetry-show", this.showData ? "Hide" : "Show", (_e, cx) => {
            this.showData = !this.showData;
            cx.notify();
          }).w(64),
          !this.showData,
        ),
      );
    if (!this.showData) return body;
    if (!s?.enabled) return body.child(div().pt(14).text_size(13).text_color(t.dim).child("Nothing is collected or sent while it's off."));
    return body
      .children(s.queued.map((r, i) => this.report(t, `st-tq-${i}`, `Waiting to send: ${r.day}`, "Sent as is, soon.", r)))
      .when(Boolean(s.draft), (el) => el.child(this.report(t, "st-td", "Today so far", "A draft: it changes until the day ends (UTC), then goes out once.", s.draft)))
      .when(Boolean(s.last_sent), (el) => el.child(this.report(t, "st-tl", `Last sent: ${s.last_sent.report.day}`, `Sent ${at(s.last_sent.at)}.`, s.last_sent.report)));
  }

  // ----------------------------------------------------------------------

  render(cx) {
    const sections=SECTIONS.filter(sectionAvailable);
    if(!sections.some(s=>s.id===this.section)) {this.section='plugins';this.settingsHostOpen=false;}
    const t = theme();
    const subpage = this.section === 'look' && this.lookPage ? `look-${this.lookPage}`
      : this.section === 'plugins' && pluginTextOpen(this) ? `plugin-text-${this.pluginTextPage.plugin}-${this.pluginTextPage.key}`
      : this.section === 'plugins' && this.pluginTarget ? `plugin-${this.pluginTarget}` : null;
    const bodyId = this.section === 'look' && this.lookPage ? `st-body-${this.lookPage}` : 'st-body';
    const u = updates();
    const waiting = Boolean(u.app.ready || (u.core.ready && !u.core.managed) || customizationUpdateAvailable());
    const nav = v_flex()
      .flex_none()
      .w(SETTINGS_NAV_WIDTH)
      .p(12)
      .gap(U.rowGap)
      .bg(t.chrome)
      .border_r(1)
      .border_color(t.border)
      .children(
        sections.map((s) => {
          const on = s.id === this.section;
          return h_flex()
            .id(`st-s-${s.id}`)
            .gap(U.gap)
            .px(8)
            .h(U.field)
            .items_center()
            .rounded(U.radius)
            .cursor_pointer()
            .bg(on ? t.selected : "#00000000")
            .hover((st) => st.bg(itemHover(t, on)))
            .on_click((_e, cx) => {
              if(!sectionAvailable(s))return;
              cancelProfileDrag(this);cancelTerminalDrag(this);
              this.selectSection(s.id);
              this.pluginTarget = null; this.pluginTextFrom = null;
              this.pluginConfirm=null;this.pluginChoice=null;
              this.lookPage = null;
              this.permissionPickerOpen = false;
              this.picking = null;
              this.machineEdit = null;
              this.settingsHostOpen = false;
              this.usageHostOpen = false;
              this.profileHostOpen = false;
              this.profileShellOpen = false;
              this.handle.focus();
              if (s.id === "machines") cx.spawn(async (cx) => { await this.loadMachines(); cx.notify(); });
              if (s.id === 'updates') refreshCustomizationUpdates(this, cx);
              if (s.id === 'core') reloadPermissions(this, cx);
              if (s.id === 'profiles' && !this.profileEdit) reloadProfiles(this, cx);
              if (s.id === 'terminals' && !this.terminalEdit) reloadTerminals(this, cx);
              if (s.id === 'plugins') { followSettingsMachine(this); reloadPlugins(this, cx); }
              cx.notify();
            })
            .child(slot(svg(I(s.icon)).size(U.icon).text_color(on ? t.foreground : t.muted)))
            .child(div().flex_1().text_size(U.font).text_color(on ? t.foreground : t.muted).child(s.title))
            .when(s.id === "updates" && waiting, (el) => el.child(div().w(7).h(7).rounded(4).bg(t.accent)));
        }),
      );
    return dialogSurface(t, v_flex())
      .id("settings")
      .track_focus(this.handle)
      .w_full()
      .h(620)
      .min_h(0)
      .overflow_hidden()
      .on_key_down((e, cx) => {
        const k = e.key;
        if (k === 'escape' && this.profileDrag) { cancelProfileDrag(this, cx); cx.stop_propagation(); return; }
        if (k === 'escape' && this.terminalDrag) { cancelTerminalDrag(this, cx); cx.stop_propagation(); return; }
        if (this.section === 'terminals' && this.terminalEdit) {
          if (k === 'escape') { cancelTerminalEdit(this, cx); cx.stop_propagation(); }
          return;
        }
        if (this.section === 'profiles' && this.profileEdit) {
          if (k === 'escape') { cancelProfileEdit(this, cx); cx.stop_propagation(); }
          return;
        }
        if (this.machineEdit) {
          if (k === "escape") this.machineEdit = null;
          else return;
          this.handle.focus();
          cx.stop_propagation();
          cx.notify();
          return;
        }
        if (k === "escape") {
          if (this.picking) this.picking = null;
          else if (this.section === 'plugins' && pluginTextOpen(this)) this.closePluginPage(cx);
          else if (this.section === 'look' && this.lookPage) this.lookPage = null;
          else if (this.section === 'plugins' && this.pluginTarget) this.backToPlugins(cx);
          else return this.dismiss();
          this.handle.focus();
        } else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(dialogHeader(t, "Settings", () => this.dismiss(), this.headerTools(t)).gap(4)
        .when((this.section === 'look' && Boolean(this.lookPage)) || (this.section === 'plugins' && (Boolean(this.pluginTarget) || pluginTextOpen(this))), el => el.child(
          (this.section === 'plugins' && pluginTextOpen(this) ? settingsBackButton(this, t, {id:'st-plugin-text-back',parent:this.pluginTextFrom==='profiles'?'Profiles':'Plugins',onBack:cx=>this.closePluginPage(cx)})
            : this.section === 'plugins' ? settingsBackButton(this, t, {id:'st-plugin-back',parent:'Plugins',onBack:cx=>this.backToPlugins(cx)})
            : lookBackButton(this, t)).absolute().top(8)
            .left(SETTINGS_NAV_WIDTH + DIALOG_SCROLL.inset + SETTINGS_CONTENT_INSET - LOOK_BACK_LABEL_INSET))))
      .child(h_flex().w_full().flex_1().min_h(0)
      .child(nav.h_full().child(div().flex_1()).child(this.button(t, "st-feedback", "Send feedback", () => { this.dismiss(); run("app.feedback"); })))
      .child(
        // Shared modal edge/rail spacing, with content padding kept inside.
        v_flex().id('st-content').flex_1().min_w(0).min_h(0).h_full()
          .child(this.section==='profiles'?profilesSurface(this,t,cx):div().relative().flex_1().min_w(0).min_h(0).h_full()
          .child(dialogScrollFrame(div()).id('st-scroll-frame').absolute().inset_0()
          .child(
            div()
              .id(bodyId)
              .size_full()
              .overflow_y_scroll()
              .track_scroll(settingsPageScroll(this, subpage))
              // Padding inside, not on the scroll area: there it counts as
              // content and a page that fits still shows a bar.
              .child(
                dialogScrollBody(div())
                  .pl(SETTINGS_CONTENT_INSET)
                  .py(12)
                  .child(
                    this.section === "look"
                        ? this.look(t, cx)
                      : this.section === "keyboard"
                        ? this.keyboard(t)
                      : this.section === "machines"
                        ? this.machines(t)
                      : this.section === 'core'
                        ? corePage(this, t)
                      : this.section === 'spaces'
                        ? spacesPage(this, t)
                      : this.section === 'terminals'
                        ? terminalsPage(this, t, cx)
                      : renderPluginSettings(this.section,this,t) ?? (this.section === 'plugins'
                        ? pluginTextOpen(this) ? pluginTextPage(this, t) : pluginsPage(this, t)
                      : this.section === "alerts"
                        ? this.alerts(t)
                        : this.section === "privacy"
                          ? this.privacy(t)
                          : this.updates(t)),
                  ),
              ),
          )
          .child(dialogScrollbar(Scrollbar.vertical(bodyId), { mode: 'always' }))))
          .when((this.section==='core'&&coreHasChanges(this))||(this.section==='plugins'&&pluginTextOpen(this)&&pluginTextChanged(this))||(this.section==='profiles'&&Boolean(this.profileEdit))||(this.section==='terminals'&&Boolean(this.terminalEdit)),el=>el.child(
            modalFooter(t,h_flex()).id('st-editor-footer').justify_end().bg(t.background)
              .child(this.section==='core'?coreEditorActions(this,t):this.section==='plugins'?pluginTextActions(this,t):this.section==='profiles'?profileEditorActions(this,t):terminalEditorActions(this,t)))),
      ))
      .when(this.section==='plugins'&&Boolean(this.pluginConfirm)&&pluginIsEnabled(this.pluginConfirm.plugin),el=>el.child(pluginConfirmation(this,t)));
  }
}
