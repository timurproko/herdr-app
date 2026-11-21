// Skin-owned preview preferences, independent of native terminal/UI settings.
import { shared, setShared, settings } from './host.js';
export const PREVIEW_FONT_KEY = 'custom.preview-font';
const family = value => typeof value === 'string' && value.trim() && value.length <= 200 ? value : null;
const size = value => typeof value === 'number' && Number.isFinite(value) ? Math.max(8, Math.min(32, Math.round(value))) : 12;
export function previewFontPreference() {
  const saved = shared(PREVIEW_FONT_KEY);
  return { size: size(saved?.size), family: family(saved?.family) };
}
export function previewFont() {
  const saved = previewFontPreference();
  return { size: saved.size, family: saved.family ?? settings().font_family };
}
export function setPreviewFont(patch) {
  const saved = shared(PREVIEW_FONT_KEY);
  const next = saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...saved } : {};
  if (Object.prototype.hasOwnProperty.call(patch, 'size')) next.size = size(patch.size);
  if (Object.prototype.hasOwnProperty.call(patch, 'family')) {
    const value = family(patch.family);
    if (value === null) delete next.family; else next.family = value;
  }
  setShared(PREVIEW_FONT_KEY, next);
}
export function adjustPreviewFontSize(delta) {
  setPreviewFont({ size: previewFontPreference().size + delta });
}
