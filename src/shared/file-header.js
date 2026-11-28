// In-memory presentation/reload bridge between a file mod and its native pane header.
// No file contents, commands, credentials or persistent personal preferences.
export function fullFilePath(root, relative) {
  const separator = root.includes('\\') ? '\\' : '/';
  return root.replace(/[\\/]+$/, '') + separator + relative.replace(/[\\/]/g, separator);
}
const headerKey = tab => `custom.file.header:${tab}`;
const routeKey = pane => `custom.file.viewer-route:${pane}`;
// Queued creations retain their captured route until a later native snapshot
// acknowledges a unique new tab/pane. Space machine/path alone is not evidence.
export function fileViewerRoute(pane) {
  try {
    const value = JSON.parse(sessionStorage.getItem(routeKey(pane)) ?? 'null');
    return typeof value?.path === 'string' && (value.machine === null || typeof value.machine === 'string') ? value : null;
  } catch { return null; }
}
export function publishFileViewerRoute(pane,path,machine) {
  try { sessionStorage.setItem(routeKey(pane),JSON.stringify({path,machine:machine ?? null})); return true; } catch { return false; }
}
const opensKey = 'custom.file.viewer-opens';
function viewerOpens() {
  try { return JSON.parse(sessionStorage.getItem(opensKey) ?? 'null') ?? {sequence:0,requests:{}}; } catch { return null; }
}
function saveViewerOpens(value) {
  try { sessionStorage.setItem(opensKey,JSON.stringify(value)); return true; } catch { return false; }
}
export function beginFileViewerOpen(space,path,machine,tabs) {
  const pending = viewerOpens();
  if (!pending || pending.blocked) return null;
  // Never evict an uncertain route then attribute its late pane to another
  // request. At capacity, suspend new attribution for this app session only.
  if (Object.keys(pending.requests).length >= 128 || tabs.length > 4096) {
    saveViewerOpens({...pending,blocked:true});return null;
  }
  const token = String(++pending.sequence);
  pending.requests[token] = {space,path,machine:machine ?? null,before:tabs.map(tab=>tab.id)};
  return saveViewerOpens(pending) ? token : null;
}
export function cancelFileViewerOpen(token) {
  const pending = viewerOpens();
  if (pending && token != null) { delete pending.requests[token];saveViewerOpens(pending); }
}
// Called from file-open events, never render or a timer. The existing creation
// retry lease is independent: expiring it must not discard unresolved provenance.
export function acknowledgeFileViewers(groups,panes,keyOf) {
  const pending = viewerOpens();
  if (!pending || pending.blocked) return;
  const requests = Object.entries(pending.requests).map(([token,request])=>({token,request,candidates:
    (groups.find(space=>space.id===request.space)?.tabs ?? []).flatMap(tab=>{
      if (request.before.includes(tab.id) || keyOf(fileHeader(tab.id,tab.name)) !== keyOf(request.path)) return [];
      const viewers = panes.filter(p=>p.tab===tab.id && p.mod==='custom-files');
      return viewers.length===1 ? [viewers[0].pane] : [];
    })}));
  let changed = false;
  for (const {token,request,candidates} of requests) {
    if (candidates.length !== 1) continue;
    const pane = candidates[0];
    // Two outstanding routes which could own this pane are not an acknowledgement.
    if (requests.some(other=>other.candidates.includes(pane) &&
      (other.request.machine!==request.machine || keyOf(other.request.path)!==keyOf(request.path)))) continue;
    if (publishFileViewerRoute(pane,request.path,request.machine)) {
      delete pending.requests[token];changed = true;
    }
  }
  if (changed) saveViewerOpens(pending);
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
