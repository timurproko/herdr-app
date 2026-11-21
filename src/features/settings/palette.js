// Pure design-system palette logic. No file writes, host APIs or global state.
export const THEME_NAME = "custom-palette";
export const DEFAULT_PALETTE = Object.freeze({
  accent: "#c4c4c4", background: "#181818", sidebar: "#141414", surface: "#1e1e1e",
  border: "#282828", foreground: "#fafafa", muted: "#a3a3a3",
});
export function hex(value) {
  const s = String(value ?? "").trim();
  if (/^#[0-9a-f]{3}$/i.test(s)) return "#" + [...s.slice(1)].map(c => c + c).join("").toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
  throw new Error("Use a hex color such as #8b5cf6 or #85f");
}
const rgb = color => [1, 3, 5].map(i => parseInt(hex(color).slice(i, i + 2), 16));
const color = channels => "#" + channels.map(c => Math.round(c).toString(16).padStart(2, "0")).join("");
export function mix(a, b, amount) { const x = rgb(a), y = rgb(b); return color(x.map((v, i) => v * (1 - amount) + y[i] * amount)); }
function luminance(c) {
  const v = rgb(c).map(x => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
}
export function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
export function ink(background) { return contrast(background, "#ffffff") >= contrast(background, "#000000") ? "#ffffff" : "#000000"; }
function readable(accent, surfaces) {
  if (surfaces.every(bg => contrast(accent, bg) >= 4.5)) return accent;
  const target = ink(surfaces[0]);
  for (let i = 1; i <= 100; i++) { const c = mix(accent, target, i / 100); if (surfaces.every(bg => contrast(c, bg) >= 4.5)) return c; }
  // Foreground/surface validation below makes this unreachable for a valid palette.
  throw new Error("These surfaces need incompatible accent contrast; choose closer surface colors");
}
export function normalize(values) {
  const p = {};
  for (const name of Object.keys(DEFAULT_PALETTE)) {
    try { p[name] = hex(values[name]); } catch { throw new Error(`${name}: use #RRGGBB or #RGB`); }
  }
  for (const role of ["background", "sidebar", "surface"]) {
    if (contrast(p.foreground, p[role]) < 4.5) throw new Error(`Text must contrast at least 4.5:1 against ${role}`);
    if (contrast(p.muted, p[role]) < 3) throw new Error(`Secondary text must contrast at least 3:1 against ${role}`);
  }
  return p;
}
// Keep saved brightness/custom contrast choices, but remove the old green hue.
// A small accent wash then colors the entire UI without becoming a bright theme.
export function tint(surface, accent, amount) {
  const [r, g, b] = rgb(surface), level = r * 0.2126 + g * 0.7152 + b * 0.0722;
  return mix(color([level, level, level]), accent, amount);
}
export function buildTheme(base, values) {
  if (!base || !Array.isArray(base.ansi) || base.ansi.length !== 16) throw new Error("The bundled Custom theme is unavailable");
  const saved = normalize(values);
  const p = normalize({ ...saved,
    background: tint(saved.background, saved.accent, 0.06),
    sidebar: tint(saved.sidebar, saved.accent, 0.05),
    surface: tint(saved.surface, saved.accent, 0.07),
    border: tint(saved.border, saved.accent, 0.12),
    muted: tint(saved.muted, saved.accent, 0),
  });
  const accent = readable(p.accent, [p.background, p.sidebar, p.surface]);
  const selection = mix(mix(p.background, p.foreground, 0.14), p.accent, 0.12);
  return {
    ...base, background: p.background, foreground: p.foreground, cursor: p.foreground, selection,
    colors: {
      ...base.colors, background: p.background, canvas: p.background, chrome: p.sidebar,
      surface: p.surface, raised: p.surface, popover: p.surface,
      foreground: p.foreground, muted: p.muted, dim: p.muted,
      border: p.border, input: mix(p.border, p.foreground, 0.14),
      hover: mix(mix(p.sidebar, p.foreground, 0.05), p.accent, 0.04),
      selected: mix(mix(p.sidebar, p.foreground, 0.1), p.accent, 0.1), selection,
      accent, accent_foreground: ink(accent), solid: p.accent, solid_foreground: ink(p.accent),
    },
    customization: { version: 1, palette: saved },
  };
}
