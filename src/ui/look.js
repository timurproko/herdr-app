// Shared live look projection; never close/recreate an open dialog to restyle it.
import { shared, setShared, settings, theme as scopedTheme, themes, run, window as appWindow, appHome, readTextFile } from "./host.js";
import { set_theme } from "gpui-base";

import { CUSTOM, isCustomLayout } from './identity.js';
export const isCustom = (name = shared("layout")) => isCustomLayout(name);

export function liveTheme() {
  const base = scopedTheme(), person = settings();
  let appearance = person.appearance;
  if (appearance !== "light" && appearance !== "dark") {
    try { appearance = window.appearance(); } catch { appearance = "dark"; }
  }
  const name = isCustom() ? shared("custom.applied-theme") ?? CUSTOM.theme
    : appearance === "light" ? person.theme_light : person.theme_dark;
  // Overlay scopes may retain the palette captured when they opened. Resolve
  // the active look from the live catalog instead, preserving extra host tokens.
  const current = themes().find(t => t.name.toLowerCase() === String(name ?? "").toLowerCase());
  return current ? { ...base, ...current.colors } : base;
}

// Enrich the muted theme selection with 25% accent: related to primary buttons,
// but still subdued enough for ordinary field text. Host theme colors are #rrggbb.
function nativeSelectionColor(look) {
  return "#" + [1, 3, 5].map(i => Math.round(
    parseInt(look.selection.slice(i, i + 2), 16) * 0.75
    + parseInt(look.accent.slice(i, i + 2), 16) * 0.25,
  ).toString(16).padStart(2, "0")).join("");
}

// Resolve it live even in older overlays; terminal colors and saved themes stay untouched.
export function ensureNativeSelection(cx) {
  if (!isCustom() || typeof cx?.theme !== "function") return false;
  const base = cx.theme(), selection = nativeSelectionColor(liveTheme());
  if (base.colors.selection === selection) return false;
  set_theme({ appearance: base.appearance, tokens: {
    colors: { ...base.colors, selection }, spacing: base.spacing, radius: base.radius,
  } });
  return true;
}

export function refreshLook(owner, cx) {
  owner.lookRefresh?.cancel();
  owner.lookRefresh = cx.timer.after(80, cx => {
    owner.lookRefresh = null;
    ensureNativeSelection(cx);
    window.refresh();
  });
}

export function watchSettingsLayout(owner, cx) {
  let previous = shared("layout");
  cx.timer.every(120, cx => {
    const current = shared("layout");
    if (current === previous) return;
    previous = current;
    refreshLook(owner, cx);
  });
}

// Only the active brand instance calls this on layout entry, never the footer.
export function enterCustom(owner, cx) {
  if (!isCustom() || !appWindow()?.active) return;
  cx.spawn(async cx => {
    try {
      const raw = await readTextFile(`${appHome()}/themes/custom-palette.json`);
      const metadata = await readTextFile(`${appHome()}/.customizations/palette.json`);
      const saved = metadata === null ? null : JSON.parse(metadata);
      if (!isCustom()) return;
      const owned = raw !== null && saved?.customization?.version === 1 && (raw === saved.theme || raw === saved.previous)
        && themes().some(t => t.name === "custom-palette");
      setShared("custom.applied-theme", owned ? "custom-palette" : "Custom");
      if (owned) run("app.theme", { name: "custom-palette" });
      refreshLook(owner, cx);
    } catch { /* Closing a window or a personal file conflict must not interrupt switching. */ }
  });
}
