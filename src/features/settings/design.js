import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { appHome, readTextFile, writeTextFile, run, themes, shared, setShared, settings } from "./host.js";
import { U, control, slot, dropdown, menuSurface, dropdownPlacement } from "./ui.js";
import { DEFAULT_PALETTE, THEME_NAME, buildTheme, hex } from "./palette.js";
import { initColorPicker, customColorControl } from "./color-picker.js";
import { isCustom, refreshLook } from "./look.js";

export const ACCENTS = [
  ["Neutral", "#c4c4c4"], ["Green", "#20744a"], ["Blue", "#3b82f6"], ["Purple", "#8b5cf6"],
  ["Amber", "#f59e0b"], ["Rose", "#f43f5e"], ["Orange", "#f97316"],
  ["Teal", "#14b8a6"], ["Lime", "#84cc16"], ["Custom", null],
];
export function setAccentOpen(owner, open, cx) {
  const d = owner.design;
  d.open = open; d.keyboard = false;
  if (open) {
    d.placement = dropdownPlacement(d.bounds, 308, globalThis.window.viewport_size().height, settings().zoom);
    d.index = d.custom ? ACCENTS.length - 1 : Math.max(0, ACCENTS.findIndex(([, c]) => c === d.palette.accent));
    d.listFocus.focus();
  } else d.trigger.focus();
  cx.notify();
}
const file = () => `${appHome()}/themes/${THEME_NAME}.json`;
const metadataFile = () => `${appHome()}/.customizations/palette.json`;
function ownedPalette(raw, metadataRaw) {
  if (raw === null) return { ...DEFAULT_PALETTE };
  const legacy = JSON.parse(raw).customization;
  if (legacy?.version === 1) return { ...DEFAULT_PALETTE, ...legacy.palette };
  const meta = metadataRaw === null ? null : JSON.parse(metadataRaw);
  if (meta?.customization?.version === 1) {
    if (raw === meta.theme) return { ...DEFAULT_PALETTE, ...meta.customization.palette };
    if (raw === meta.previous) return { ...DEFAULT_PALETTE, ...meta.previous_palette };
  }
  throw new Error("Refusing to overwrite a personal theme not created by this skin");
}
export function initDesign(owner, cx) {
  const d = owner.design = { palette: { ...DEFAULT_PALETTE }, ready: false, busy: false, open: false,
    index: 0, keyboard: false, next: null, error: null, base: null, custom: false, customColor: null, trigger: cx.focus_handle(), listFocus: cx.focus_handle() };
  initColorPicker(owner, cx, (value, cx) => chooseAccent(owner, value, cx, { custom: true, keepPicker: true }));
  cx.spawn(async cx => {
    try {
      const base = await readTextFile(`${appHome()}/themes/Custom.json`);
      if (base === null) throw new Error("Reinstall the skin to restore themes/Custom.json");
      d.base = JSON.parse(base);
      const raw = await readTextFile(file());
      const metadataRaw = await readTextFile(metadataFile());
      d.palette = ownedPalette(raw, metadataRaw);
      if (d.palette.accent === "#c4c9c6") d.palette.accent = "#c4c4c4";
      const record = metadataRaw === null ? null : JSON.parse(metadataRaw);
      const meta = record ? (raw === record.theme ? record.customization : record.previous_customization) : JSON.parse(raw ?? "null")?.customization;
      d.custom = meta?.custom_accent === true || !ACCENTS.some(([, color]) => color === d.palette.accent);
      try { d.customColor = meta?.custom_color ? hex(meta.custom_color) : d.custom ? d.palette.accent : null; } catch { d.customColor = d.custom ? d.palette.accent : null; }
      buildTheme(d.base, d.palette);
      d.ready = true;
    } catch (error) { d.error = String(error.message ?? error); }
    cx.notify();
  });
}
export function chooseAccent(owner, value, cx, { custom = false, keepPicker = false } = {}) {
  const d = owner.design;
  if (!d.ready) return;
  if (value === null) { custom = true; value = d.customColor ?? d.palette.accent; }
  try { value = hex(value); } catch (error) { d.error = error.message; cx.notify(); return; }
  if (!isCustom()) { d.error = "Switch to Custom before changing its accent"; cx.notify(); return; }
  d.custom = custom || !ACCENTS.some(([, color]) => color === value);
  if (d.custom) d.customColor = value;
  if (!keepPicker) { d.color.open = false; d.color.drag = false; d.trigger.focus(); }
  d.palette = { ...d.palette, accent: value }; d.next = { value, custom: d.custom, customColor: d.customColor }; d.open = false; d.error = null;
  cx.notify();
  if (d.busy) return;
  d.busy = true;
  // Serialize changes; a quick second selection is saved after the in-flight one.
  cx.spawn(async cx => {
    try {
      while (d.next !== null) {
        const selected = d.next; d.next = null;
        const result = buildTheme(d.base, { ...d.palette, accent: selected.value });
        const raw = await readTextFile(file()), metadataRaw = await readTextFile(metadataFile());
        const previousPalette = ownedPalette(raw, metadataRaw);
        const previousRecord = metadataRaw === null ? null : JSON.parse(metadataRaw);
        if (previousRecord !== null && previousRecord.customization?.version !== 1) throw new Error("Refusing to overwrite personal palette metadata");
        if (!isCustom()) throw new Error("Switch back to Custom to change its accent");
        // Herdr rejects unknown theme fields. Ownership/palette data belongs in a
        // sidecar, never inside the native theme. Record both CAS states first so
        // an interrupted two-file save can be safely resumed on the next choice.
        const { customization, ...nativeTheme } = result;
        const text = JSON.stringify(nativeTheme, null, 2) + "\n";
        const previousMode = previousRecord ? (raw === previousRecord.theme ? previousRecord.customization : previousRecord.previous_customization) : JSON.parse(raw ?? "null")?.customization;
        const metadata = { customization: { ...customization, custom_accent: selected.custom, custom_color: selected.customColor }, theme: text, previous: raw, previous_palette: previousPalette,
          previous_customization: previousMode ?? { version: 1, palette: previousPalette } };
        await writeTextFile(metadataFile(), JSON.stringify(metadata, null, 2) + "\n", metadataRaw);
        await writeTextFile(file(), text, raw);
        for (let i = 0; i < 40 && !themes().some(t => t.name === THEME_NAME); i++) await cx.sleep(50);
        if (!themes().some(t => t.name === THEME_NAME)) throw new Error("Herdr could not load the generated theme");
        if (!isCustom()) throw new Error("Accent saved for Custom; another layout was not changed");
        setShared("custom.applied-theme", THEME_NAME);
        run("app.theme", { name: THEME_NAME });
        refreshLook(owner, cx);
      }
    } catch (error) { d.error = String(error.message ?? error); d.next = null; }
    finally { d.busy = false; cx.notify(); }
  });
}
export function accentControl(owner, t, cx) {
  const d = owner.design;
  const body = v_flex().w(d.custom ? 240 : 200).flex_none();
  if (!d.ready) return body.child(div().text_size(U.font).text_color(d.error ? t.blocked : t.muted).child(d.error || "Loading theme…"));
  const current = d.custom ? null : ACCENTS.find(([, color]) => color === d.palette.accent);
  const trigger = control(t, h_flex()).id("ds-accent").w(200).px(U.gutter).gap(8).items_center().cursor_pointer()
    .border_color(d.open ? t.input : t.border).hover(s => s.bg(t.hover))
    .on_mouse_move(e => { d.bounds = e.bounds; }).on_mouse_down("left", e => { d.bounds = e.bounds; })
    .track_focus(d.trigger).role("combo_box").accessibility_label("Accent color")
    .on_key_down((e, cx) => {
      if (["down", "up", "enter"].includes(e.key)) { cx.stop_propagation(); setAccentOpen(owner, true, cx); }
    })
    .when(!d.custom, e => e.child(div().size(14).rounded(4).bg(d.palette.accent)))
    .child(div().flex_1().child(current?.[0] ?? "Custom"))
    .child(slot(svg("mods/custom-workspace-chrome/chevron-down.svg").size(U.smallIcon).text_color(t.muted)));
  const list = menuSurface(t, v_flex()).id("ds-accent-list").w(200).gap(U.rowGap).max_h(d.placement?.height ?? 308).overflow_y_scrollbar()
    .track_focus(d.listFocus).on_key_down((e, cx) => {
      if (e.key === "down") d.index = (d.index + 1) % ACCENTS.length;
      else if (e.key === "up") d.index = (d.index + ACCENTS.length - 1) % ACCENTS.length;
      else if (e.key === "enter") chooseAccent(owner, ACCENTS[d.index][1], cx);
      else if (e.key === "escape") { d.open = false; d.trigger.focus(); }
      else return;
      d.keyboard = true; cx.stop_propagation(); cx.notify();
    }).children(ACCENTS.map(([name, value], i) => h_flex().id(`ds-accent-${name.toLowerCase()}`).h(U.row).flex_none().px(8).gap(8).items_center().rounded(U.radius)
      .role("list_box_option").when(i === d.index, e => e.aria_active_descendant())
      .when(d.keyboard && i === d.index, e => e.bg(t.hover))
      .on_hover((hovered, cx) => { if (hovered && d.keyboard) { d.keyboard = false; cx.notify(); } })
      .hover(e => e.bg(t.hover)).cursor_pointer()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); chooseAccent(owner, value, cx); })
      .child(div().size(14).rounded(4).bg(value ?? d.customColor ?? d.palette.accent)).child(div().flex_1().child(name))
      .when(value === null ? d.custom : !d.custom && value === d.palette.accent, e => e.child(svg("mods/custom-workspace-chrome/check.svg").size(14).text_color(t.muted)))));
  const picker = dropdown("ds-accent-select", trigger, list, {
    open: d.open, focus: d.listFocus, above: d.placement?.above, triggerHeight: d.placement?.triggerHeight, onOpen: (open, cx) => setAccentOpen(owner, open, cx),
  });
  return body.child(h_flex().gap(8).items_center().when(d.custom, e => e.child(customColorControl(owner, t))).child(picker))
    .when(Boolean(d.error), e => e.child(div().pt(12).text_size(U.meta).text_color(t.blocked).child(d.error)));
}
