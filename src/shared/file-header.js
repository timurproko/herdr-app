// In-memory presentation/reload bridge between a file mod and its native pane header.
// No file contents, commands, credentials or persistent personal preferences.
export function fullFilePath(root, relative) {
  const separator = root.includes('\\') ? '\\' : '/';
  return root.replace(/[\\/]+$/, '') + separator + relative.replace(/[\\/]/g, separator);
}
const headerKey = tab => `custom.file.header:${tab}`;
const routeKey = pane => `custom.file.viewer-route:${pane}`;
// Only acknowledged creation binds a native pane to its immutable read route.
// A space's machine, tab name or path alone cannot prove a viewer's machine.
export function fileViewerRoute(pane) {
  try {
    const value = JSON.parse(sessionStorage.getItem(routeKey(pane)) ?? 'null');
    return typeof value?.path === 'string' && (value.machine === null || typeof value.machine === 'string') ? value : null;
  } catch { return null; }
}
export function publishFileViewerRoute(pane,path,machine) {
  try { sessionStorage.setItem(routeKey(pane),JSON.stringify({path,machine:machine ?? null})); return true; } catch { return false; }
}
const reloadKey = (space, path) => `custom.file.reload:${JSON.stringify([space, path])}`;
export function fileHeader(tab, fallback) {
  return sessionStorage.getItem(headerKey(tab)) || fallback;
}
export function publishFileHeader(tab, path) {
  if (fileHeader(tab, null) === path) return false;
  sessionStorage.setItem(headerKey(tab), path); return true;
}
export function fileReloadStamp(space, path) {
  return sessionStorage.getItem(reloadKey(space, path));
}
export function fileReloadPending(space, path) {
  return sessionStorage.getItem(`${reloadKey(space, path)}:pending`) != null;
}
export function finishFileReload(space, path, stamp) {
  const key = `${reloadKey(space, path)}:pending`;
  if (stamp == null || sessionStorage.getItem(key) !== stamp) return;
  sessionStorage.removeItem(key);
  globalThis.window.refresh();
}
export function requestFileReload(space, path) {
  if (fileReloadPending(space, path)) return;
  const stamp = String(Number(fileReloadStamp(space, path) ?? 0) + 1);
  sessionStorage.setItem(reloadKey(space, path), stamp);
  sessionStorage.setItem(`${reloadKey(space, path)}:pending`, stamp);
  globalThis.window.refresh();
}
