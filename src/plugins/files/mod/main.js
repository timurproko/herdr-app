// Custom skin: presentation-only clone of Herdr App 0.1.13's files.
// A lazy file browser for the focused pane's folder, with bounded read-only previews.
import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState } from "gpui-base";
import { U, slot, headerTools, reveal, subtleActionFill, refreshButton } from "./ui.js";
import { spaces, panes, terminals, focused, home, exec, readTextFile, writeTextFile, notify, theme, window, run, props, openOverlay, closeOverlay, nextCommand, layout } from "./host.js";
import { fileIconAsset } from './file-icons.js';
import { fullFilePath, fileHeader, publishFileHeader, fileReloadStamp, finishFileReload } from './file-header.js';
import { previewFont } from './preview-font.js';
import { location } from './location.js';
import { runPluginHook, sidebarPanelEnabled } from './plugins.js';
import { sidebarTitle } from './sidebar-title.js';
import { panelPin } from './panel-pin.js';
import { changePanel } from './panel-state.js';
import { deleteEntry } from './delete-entry.js';
import { headerTool, contextMenu, confirmDialog, panelMessage } from './panel-kit.js';
// Match the other panels: normalize separators/trailing slashes and compare
// Windows paths without case sensitivity. Remote homes come from that terminal.
function folderName(root, on) {
  if (!root) return "";
  const normalize = path => path.replace(/\\/g, "/").replace(/\/+$/, "") || "/";
  const address = focused()?.terminal;
  const terminal = terminals().find(t => t.address === address);
  const machine = address?.includes("/") ? address.split("/")[0] : null;
  const reportedHome = machine === (on ?? null) ? terminal?.labels?.["custom.home"] : null;
  const userHome = reportedHome || (!on ? home() : null);
  const path = normalize(root);
  const windows = /^[A-Za-z]:|^\/\//.test(path);
  const equal = (a, b) => windows ? a.toLowerCase() === b.toLowerCase() : a === b;
  if (userHome && equal(path, normalize(userHome))) return "~";
  return path.split("/").pop() || path;
}
const LANG = { ts: "js", tsx: "js", mts: "js", cts: "js", jsx: "js", mjs: "js", toml: "yaml", jsonc: "json", svelte: "html", vue: "html" };
const PER_FOLDER = 500, TOTAL = 5000;
// Automatic re-reads skip anything read more recently than this.
const FRESH_MS = 4000, REREAD_MS = 1000;
const parentOf = path => path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
// Listings belong to a machine/folder, not the selected agent or tab.
const folderKey = ({cwd,on}) => JSON.stringify([cwd,on]);
const filePathKey = path => {
  if (typeof path !== 'string') return null;
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
  return /^(?:[a-z]:\/|\/\/)/i.test(normalized) ? normalized.toLowerCase() : normalized;
};
function visibleFiles(node) {
  if (!node || node.hidden) return false;
  if (node.id === 'files' || (node.content?.mod === 'custom-files' && !node.content?.props?.fileViewer)) return true;
  const children = node.children ?? [];
  if (node.type === 'stack') return visibleFiles(children.find(child => !child.hidden && child.id === node.active) ?? children.find(child => !child.hidden));
  return children.some(visibleFiles);
}

export async function directory(path, on) {
  const windowsDirectory = async () => {
    // Windows PowerShell otherwise uses the console code page; exec decodes UTF-8.
    // Links keep directory attributes even when dangling; check their target.
    // Other reparse points (OneDrive's folders) have no LinkType and are folders.
    // PowerShell reads curly single quotes as quotes too, so they're doubled like '.
    // Probe just one child, including hidden/.git entries; unreadable stays unknown.
    const r = await exec("powershell", ["-NoProfile", "-Command", "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); & { param($p) @(Get-ChildItem -LiteralPath $p -Force -ErrorAction Stop | Where-Object Name -ne '.git' | Select-Object -First 501 | ForEach-Object { $d=($_.PSIsContainer -and (-not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -or -not $_.LinkType -or ($_.Target -and [IO.Directory]::Exists(([IO.Path]::Combine([IO.Path]::GetDirectoryName($_.FullName), $_.Target[0])))))); $content=$null; if ($d) { $it=$null; try { $it=[IO.Directory]::EnumerateFileSystemEntries($_.FullName).GetEnumerator(); $content=$it.MoveNext() } catch {} finally { if ($it -is [IDisposable]) { $it.Dispose() } } }; @{ name=$_.Name; dir=$d; hasContent=$content } }) | ConvertTo-Json -Compress } '" + path.replace(/['‘’‚‛]/g, "$&$&") + "'"], { on });
    if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
    const result = JSON.parse(r.stdout || "[]");
    return Array.isArray(result) ? result : [result];
  };
  if ((!on && window()?.platform === "windows") || /^[A-Za-z]:[\\/]|^\\\\/.test(path)) return windowsDirectory();
  const script = 'n=0; for p in "$1"/* "$1"/.[!.]* "$1"/..?*; do [ -e "$p" ] || [ -L "$p" ] || continue; name=${p##*/}; [ "$name" = .git ] && continue; if [ -d "$p" ]; then kind=d; if [ -r "$p" ] && [ -x "$p" ]; then kind=d0; for child in "$p"/* "$p"/.[!.]* "$p"/..?*; do [ -e "$child" ] || [ -L "$child" ] || continue; kind=d1; break; done; fi; else kind=f; fi; printf "%s\\0%s\\0" "$kind" "$name"; n=$((n+1)); [ "$n" -gt 500 ] && break; done; test -d "$1"';
  let r;
  try { r = await exec("sh", ["-c", script, "files", path], { on }); }
  catch (e) {
    if (on && String(e).includes("cannot start sh: program not found")) return windowsDirectory();
    throw e;
  }
  if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
  const fields = r.stdout.split("\0"), out = [];
  for (let i = 0; i + 1 < fields.length; i += 2) out.push({ name: fields[i + 1], dir: fields[i].startsWith("d"), hasContent: fields[i] === "d1" ? true : fields[i] === "d0" ? false : null });
  return out;
}

// Several folders in one request: one PowerShell or sh process (one SSH round trip
// for a remote space) instead of one per folder. Answers in the order asked, each
// { entries } or { error }; a single folder goes through directory() unchanged.
export async function directories(paths, on) {
  if (paths.length < 2) {
    return Promise.all(paths.map(path => directory(path, on).then(entries => ({ entries }), e => ({ error: String(e?.message ?? e) }))));
  }
  const windowsDirectories = async () => {
    // Same listing as directory()'s, per folder, with failures kept per folder.
    const list = "@(Get-ChildItem -LiteralPath $p -Force -ErrorAction Stop | Where-Object Name -ne '.git' | Select-Object -First 501 | ForEach-Object { $d=($_.PSIsContainer -and (-not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -or -not $_.LinkType -or ($_.Target -and [IO.Directory]::Exists(([IO.Path]::Combine([IO.Path]::GetDirectoryName($_.FullName), $_.Target[0])))))); $content=$null; if ($d) { $it=$null; try { $it=[IO.Directory]::EnumerateFileSystemEntries($_.FullName).GetEnumerator(); $content=$it.MoveNext() } catch {} finally { if ($it -is [IDisposable]) { $it.Dispose() } } }; @{ name=$_.Name; dir=$d; hasContent=$content } })";
    const r = await exec("powershell", ["-NoProfile", "-Command", `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); & { ConvertTo-Json -Compress -Depth 5 -InputObject @(foreach ($p in $args) { try { @{ entries = ${list} } } catch { @{ error = $_.Exception.Message } } }) } ${paths.map(psQuote).join(" ")}`], { on });
    if (r.code !== 0) throw new Error(r.stderr || "Cannot list these folders");
    const result = JSON.parse(r.stdout || "[]");
    return paths.map((_, i) => {
      const item = result[i];
      if (!item || item.error != null) return { error: item?.error || "Cannot list this folder" };
      return { entries: Array.isArray(item.entries) ? item.entries : item.entries ? [item.entries] : [] };
    });
  };
  if ((!on && window()?.platform === "windows") || paths.some(path => /^[A-Za-z]:[\\/]|^\\\\/.test(path))) return windowsDirectories();
  // Each folder starts with an "@" record (ok or missing), then directory()'s kind/name pairs.
  const script = 'for d in "$@"; do if [ -d "$d" ]; then printf "@\\0ok\\0"; else printf "@\\0missing\\0"; continue; fi; n=0; for p in "$d"/* "$d"/.[!.]* "$d"/..?*; do [ -e "$p" ] || [ -L "$p" ] || continue; name=${p##*/}; [ "$name" = .git ] && continue; if [ -d "$p" ]; then kind=d; if [ -r "$p" ] && [ -x "$p" ]; then kind=d0; for child in "$p"/* "$p"/.[!.]* "$p"/..?*; do [ -e "$child" ] || [ -L "$child" ] || continue; kind=d1; break; done; fi; else kind=f; fi; printf "%s\\0%s\\0" "$kind" "$name"; n=$((n+1)); [ "$n" -gt 500 ] && break; done; done';
  let r;
  try { r = await exec("sh", ["-c", script, "files", ...paths], { on }); }
  catch (e) {
    if (on && String(e).includes("cannot start sh: program not found")) return windowsDirectories();
    throw e;
  }
  if (r.code !== 0) throw new Error(r.stderr || "Cannot list these folders");
  const fields = r.stdout.split("\0"), out = [];
  for (let i = 0; i + 1 < fields.length; i += 2) {
    if (fields[i] === "@") { out.push(fields[i + 1] === "ok" ? { entries: [] } : { error: "Cannot list this folder" }); continue; }
    out.at(-1)?.entries?.push({ name: fields[i + 1], dir: fields[i].startsWith("d"), hasContent: fields[i] === "d1" ? true : fields[i] === "d0" ? false : null });
  }
  return paths.map((_, i) => out[i] ?? { error: "Cannot list this folder" });
}

// PowerShell reads curly single quotes as quotes too, so they're doubled like '.
const psQuote = text => "'" + text.replace(/['‘’‚‛]/g, "$&$&") + "'";
// Hands a local path to whatever this machine opens that file type with.
async function openLocally(path) {
  const platform = window()?.platform;
  const r = platform === "windows" || /^[A-Za-z]:[\\/]/.test(path)
    // No associated app: show Windows' own "How do you want to open this file?" picker.
    ? await exec("powershell", ["-NoProfile", "-Command",
      `$p = ${psQuote(path.replace(/\//g, "\\"))}; try { Invoke-Item -LiteralPath $p -ErrorAction Stop } ` +
      `catch { Start-Process rundll32.exe -ArgumentList ('shell32.dll,OpenAs_RunDLL ' + $p) }`])
    : await exec(platform === "macos" ? "open" : "xdg-open", [path]);
  if (r.code !== 0) throw new Error(r.stderr || `Exit code ${r.code}`);
}
// A file on another machine is copied to a local cache first (a copy: edits stay local).
async function localCopy(root, relative, on) {
  const text = await readTextFile(`${root}/${relative}`, { on });
  if (text === null) throw new Error(`The file is no longer on ${on}`);
  if (text.includes("\0")) throw new Error("Binary files on another machine cannot be opened here");
  let hash = 0;
  for (const c of `${root}/${relative}`) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const dir = `${home().replace(/[\\/]+$/, "")}/.cache/herdr-remote-files/${on.replace(/[^\w.-]/g, "_")}/${hash.toString(36)}`;
  const made = window()?.platform === "windows"
    ? await exec("powershell", ["-NoProfile", "-Command", `[IO.Directory]::CreateDirectory(${psQuote(dir)}) | Out-Null`])
    : await exec("mkdir", ["-p", dir]);
  if (made.code !== 0) throw new Error(made.stderr || "Cannot create the local copy folder");
  const target = `${dir}/${relative.split(/[\\/]/).pop()}`;
  await writeTextFile(target, text, await readTextFile(target));
  return target;
}

export default class Files extends View {
  init(_props, cx) {
    const p = props();
    this.headerHovered = false;
    if (p?.fileDelete) {
      this.fileDelete = p.fileDelete;
      this.deleteHandle = cx.focus_handle();
      this.deleteHandle.focus();
      return;
    }
    if (p?.fileMenu) {
      this.fileMenu = p.fileMenu;
      this.menuHandle = cx.focus_handle?.();
      this.menuHandle?.focus();
      return;
    }
    this.viewer = p?.fileViewer === true;
    if (this.viewer) {
      if (typeof p.fileRoot !== 'string' || typeof p.fileRelative !== 'string' || !p.fileRelative) {
        this.fileError = 'No file selected'; return;
      }
      this.previewFontKey = JSON.stringify([previewFont(), sidebarPanelEnabled('files')]);
      // App-wide shared changes do not invalidate retained mod-pane snapshots.
      // Invalidate this owner when its font preference or the Files plugin switch changes; no file IO.
      cx.timer.every(100, cx => {
        const key = JSON.stringify([previewFont(), sidebarPanelEnabled('files')]);
        if (key === this.previewFontKey) return;
        this.previewFontKey = key; cx.notify();
      });
      this.root = p.fileRoot; this.on = p.fileMachine ?? null;
      this.context = { key: 'fixed-file-viewer', cwd: this.root, on: this.on };
      this.viewerPath = p.fileRelative;
      this.viewerSpace = p.fileSpace ?? null;
      this.viewerFullPath = fullFilePath(this.root, this.viewerPath);
      this.reloadSeen = fileReloadStamp(this.viewerSpace, this.viewerFullPath);
      this.show(this.viewerPath, cx);
      return;
    }
    this.saved = new Map(); this.loadedAt = new Map();
    this.entries = new Map(); this.folders = new Set(); this.pending = new Set(); this.marks = {};
    this.sync(cx);
  }

  shown() {
    if (!sidebarPanelEnabled('files')) return false;
    const root = layout();
    return root?.id ? visibleFiles(root) : true;
  }

  sync(cx, notify = true) {
    const shown = this.shown(), opening = shown && !this.panelShown;
    this.panelShown = shown;
    if (!shown) return;
    // A newly opened panel gets a fresh read, even if a hidden read is pending.
    if (opening && this.loading) { this.context = {...this.context}; this.loading = false; }
    const place = location(this.context);
    if (opening || folderKey(place) !== this.context?.key) this.refresh(cx, notify);
    else Object.assign(this.context, place); // Keep file-opening space metadata current without invalidating reads.
  }

  current(context) {
    return this.context === context && (this.viewer || (this.shown() && folderKey(location(this.context)) === context.key));
  }

  async loadFolder(path, context) { return this.loadFolders([path], context); }

  // Reads the folders in one request, keeps every listing that came back, then
  // reports the first failure (as one folder's read always did).
  async loadFolders(paths, context) {
    const { on, cwd: root } = context;
    const results = await directories(paths.map(path => path ? `${root}/${path}` : root), on);
    let failure = null;
    paths.forEach((path, i) => {
      if (results[i]?.error != null) failure ??= results[i].error;
      else this.applyEntries(path, results[i].entries, context);
    });
    if (failure != null) throw new Error(failure);
  }

  applyEntries(path, entries, context) {
    if (!this.current(context) || (path && !this.folders.has(path))) return;
    const used = [...this.entries.entries()].filter(([p]) => p !== path).reduce((n, [, e]) => n + e.length, 0);
    this.entries.set(path, entries.slice(0, Math.max(0, Math.min(PER_FOLDER, TOTAL - used))).sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name)));
    this.loadedAt?.set(path, Date.now());
    if (entries.length > PER_FOLDER || used + entries.length > TOTAL) this.limited = true;
  }

  async loadMarks(context) {
    const { cwd, on } = context;
    this.marksAt = Date.now();
    const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on }).catch(() => null);
    if (!this.current(context)) return;
    const marks = {};
    if (top?.code === 0) {
      // Keep status read-only: no optional index locks or fsmonitor process.
      const status = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"], { cwd, on }).catch(() => null);
      if (status?.code === 0) for (const entry of status.stdout.split("\0").filter(Boolean).slice(0, TOTAL)) {
        const xy = entry.slice(0, 2);
        marks[`${top.stdout.trim()}/${entry.slice(3)}`] = xy === "??" || xy.includes("A") ? "A" : xy.includes("U") ? "U" : xy.includes("D") ? "D" : "M";
      }
    }
    if (this.current(context)) this.marks = marks;
  }

  // Re-reads only the named folders that are still shown and weren't read just now,
  // then the git marks when they are older than marksAge. All folders in one request.
  async reread(paths, context, { age = REREAD_MS, marksAge = FRESH_MS } = {}) {
    const now = Date.now();
    const due = [...new Set(paths)].filter(path => (!path || this.folders.has(path)) && !this.pending.has(path) && now - (this.loadedAt.get(path) ?? 0) >= age);
    if (due.length && this.current(context)) {
      due.forEach(path => this.pending.add(path));
      try { await this.loadFolders(due, context); }
      finally { if (this.context === context) due.forEach(path => this.pending.delete(path)); }
    }
    if (this.current(context) && Date.now() - (this.marksAt ?? 0) >= marksAge) await this.loadMarks(context);
  }

  rereadSoon(paths, cx, options) {
    const context = this.context;
    if (!context?.cwd || this.loading) return;
    cx.spawn(async cx => {
      try { await this.reread(paths, context, options); }
      catch (e) { if (this.current(context)) this.error = String(e); }
      finally { cx.notify(); }
    });
  }

  // Coming back to the panel: everything shown that is more than a few seconds old.
  freshen(cx) {
    const now = Date.now();
    if (this.file || now - (this.freshenedAt ?? 0) < FRESH_MS) return;
    this.freshenedAt = now;
    this.rereadSoon(["", ...this.folders], cx, { age: FRESH_MS });
  }

  refresh(cx, notify = true, manual = false) {
    if (!this.shown()) return;
    const place = location(this.context), { cwd, on } = place, next = folderKey(place);
    if (next !== this.context?.key) {
      if (this.context) this.saved.set(folderKey(this.context), { folders: this.folders, file: this.file });
      const saved = this.saved.get(folderKey(place));
      this.context = { ...place, key: next }; this.root = cwd; this.on = on; this.entries = new Map(); this.folders = new Set(saved?.folders);
      this.pending = new Set(); this.loadedAt = new Map(); this.marksAt = 0; this.marks = {}; this.show(null); this.error = null; this.limited = false;
      this.loading = false; this.refreshing = false;
      if (saved?.file) this.show(saved.file, cx);
    }
    if (!cwd || this.loading) return;
    const context = this.context;
    this.loading = true;
    // Opening/context reads stay quiet; only an explicit Refresh click animates.
    this.refreshing = manual;
    this.limited = false;
    if (notify) cx.notify();
    cx.spawn(async cx => {
      try {
        if (!this.current(context)) return;
        await this.loadFolders(["", ...this.folders], context);
        if (!this.current(context)) return;
        await this.loadMarks(context);
        if (!this.current(context)) return;
        this.error = null;
      } catch (e) { if (this.current(context)) this.error = String(e); }
      finally { if (this.context === context) { this.loading = false; this.refreshing = false; } cx.notify(); }
    });
  }

  toggle(path, cx) {
    if (this.folders.has(path)) {
      for (const folder of [...this.folders]) if (folder === path || folder.startsWith(path + "/")) {
        this.folders.delete(folder);
        this.entries.delete(folder);
      }
      // What sits beside the collapsed folder may have changed too.
      this.rereadSoon([parentOf(path)], cx);
    } else {
      this.folders.add(path);
      if (this.entries.has(path)) this.rereadSoon([path], cx);
      else if (!this.pending.has(path)) {
        const context = this.context;
        this.pending.add(path);
        cx.spawn(async cx => {
          try {
            await this.loadFolder(path, context);
            if (this.current(context) && Date.now() - (this.marksAt ?? 0) >= FRESH_MS) await this.loadMarks(context);
          }
          catch (e) { if (this.current(context)) this.error = String(e); }
          finally { if (this.context === context) this.pending.delete(path); cx.notify(); }
        });
      }
    }
    cx.notify();
  }

  show(path, cx) {
    this.code?.release(); this.code = null;
    this.file = path; this.fileError = null;
    if (!path || !cx) return;
    const context = this.context, root = this.root, on = this.on;
    const reloadStamp = this.viewer ? fileReloadStamp(this.viewerSpace, fullFilePath(root, path)) : null;
    const reloadSpace = this.viewerSpace;
    cx.spawn(async cx => {
      try {
        const text = await readTextFile(`${root}/${path}`, { on });
        if (this.file !== path || !this.current(context)) return;
        if (text === null) { this.fileError = "This file is no longer available"; return; }
        if (text.includes("\0")) { this.fileError = "Binary file · no text preview"; return; }
        const t = theme(), ext = path.includes(".") ? path.split(".").pop() : "txt", font = previewFont();
        const options = { language: LANG[ext] ?? ext, readonly: true,
          syntax: { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 } };
        this.code = EditorState.new({ ...options,
          value: text.length > 400000 ? text.slice(0, 400000) + "\n… (file truncated)" : text,
          font_family: font.family, font_size: font.size });
      } catch { if (this.file === path && this.current(context)) this.fileError = "Cannot preview this file (binary, too large, or unreadable)"; }
      finally {
        if (this.viewer) finishFileReload(reloadSpace, fullFilePath(root, path), reloadStamp);
        cx.notify();
      }
    });
  }

  previewEditor() {
    const font = previewFont();
    // Native Editor applies live refinements to retained state, rather than
    // recreating it or rereading the file when the font changes.
    return v_flex().id('file-preview-editor').flex_1().min_w(0).min_h(0).pl(U.gap)
      .child(Editor.new(this.code).font_family(font.family).text_size(font.size).flex_1().min_h(0));
  }

  async openExternally(path, root = this.root, on = this.on, dir = false) {
    try {
      // An enabled plugin (VS Code Remote) may open it instead.
      if (await runPluginHook('files.open', { on: on ?? null, root, path, dir, fullPath: fullFilePath(root, path) })) return;
      // A local folder opens in the file manager; another machine's folder has no local copy.
      if (dir && on) throw new Error(`Folders on ${on} open in VS Code: turn on VS Code Remote in Settings > Plugins.`);
      await openLocally(on ? await localCopy(root, path, on) : fullFilePath(root, path));
    }
    catch (e) { notify({ title: dir ? "Could not open folder" : "Could not open file", body: String(e?.message ?? e).slice(0, 1400), level: "error" }); }
  }

  // A file or folder row's right-click menu: Herdr's pointer popup (another copy of this
  // mod) places it at the cursor, the same way the other context menus open.
  showFileMenu(path, cx, dir = false) {
    if (!this.root || !sidebarPanelEnabled('files')) return;
    this.menuTarget = { root: this.root, on: this.on ?? null, path, dir,
      token: `${Date.now()}-${this.menuSequence = (this.menuSequence ?? 0) + 1}`, expires: Date.now() + 300000 };
    // Only this panel owns the short-lived target and starts destructive work.
    // Dialog/popup copies may close without cancelling the operation's feedback.
    if (!this.listening) {
      this.listening = true;
      cx.spawn(async cx => {
        for (;;) {
          const command = await nextCommand();
          this.fileMenuCommand(command, cx);
        }
      });
    }
    openOverlay({ mod: 'custom-files', kind: 'popup', frame: 'none', width: 180, height: 3 * U.row + 12 + 9,
      props: { fileMenu: { ...this.menuTarget } } });
  }

  fileMenuCommand(command, cx) {
    const target = this.menuTarget;
    if (!target || !sidebarPanelEnabled('files')) return;
    if (Date.now() > target.expires) {
      if (command === `delete-confirmed:${target.token}`) {
        this.menuTarget = null;
        notify({ title: 'Confirmation expired', body: 'Nothing was moved. Right-click the item again.', level: 'warning' });
      }
      return;
    }
    if (command === 'open-external') {
      this.menuTarget = null;
      this.openExternally(target.path, target.root, target.on, target.dir);
    } else if (command === `delete-confirmed:${target.token}`) {
      this.menuTarget = null; // Single use: double clicks/Enter cannot delete twice.
      cx.spawn(async cx => {
        try {
          await deleteEntry(target);
          this.deleted(target, cx);
          notify({ title: target.dir ? 'Folder successfully deleted' : 'File successfully deleted', body: target.path.split('/').pop(), level: 'success' });
        } catch (e) {
          notify({ title: 'Could not move to recycle bin', body: `${target.on ?? 'This computer'} · ${fullFilePath(target.root, target.path)}\n${String(e?.message ?? e).slice(0, 1200)}\nNo permanent-delete fallback was used. Check the original folder and recycle bin before retrying.`, level: 'error' });
        }
      });
    }
  }

  deleted(target, cx) {
    if (this.viewer || this.fileMenu || this.fileDelete || !this.context ||
        folderKey(this.context) !== folderKey({ cwd: target.root, on: target.on }) || !this.current(this.context)) return;
    // Invalidate pre-delete reads so a late listing cannot resurrect the row.
    this.context = { ...this.context }; this.loading = false; this.pending = new Set();
    for (const folder of [...this.folders]) if (folder === target.path || folder.startsWith(target.path + '/')) {
      this.folders.delete(folder); this.entries.delete(folder); this.loadedAt.delete(folder);
    }
    const parent = parentOf(target.path), name = target.path.split('/').pop();
    this.entries.set(parent, (this.entries.get(parent) ?? []).filter(entry => entry.name !== name));
    this.refresh(cx);
  }

  cancelDelete() {
    if (this.deleteFinished) return;
    this.deleteFinished = true;
    closeOverlay(props()?.overlay);
  }

  confirmDelete() {
    if (this.deleteFinished) return;
    this.deleteFinished = true;
    run(`custom-files.delete-confirmed:${this.fileDelete.token}`);
    closeOverlay(props()?.overlay);
  }

  renderDeleteConfirmation(t) {
    const target = this.fileDelete;
    return confirmDialog(t, { id: 'file-delete', title: target.dir ? 'Delete folder?' : 'Delete file?', focus: this.deleteHandle,
      body: target.dir ? 'Deleting this folder moves it and its contents to the recycle bin.' : 'Deleting this file moves it to the recycle bin.',
      subject: target.path.split('/').pop(), confirm: 'Delete', onCancel: () => this.cancelDelete(), onConfirm: () => this.confirmDelete() }).id('file-delete-confirmation');
  }

  renderFileMenu(t) {
    const overlay = props()?.overlay;
    // Closing the popup ends this copy and its tasks, so the Files panel that
    // opened the menu does the work (it remembers which file was right-clicked).
    const { root, path } = this.fileMenu;
    const items = [
      { id: 'open', label: 'Open...', icon: 'arrow-up-right', run: () => run('custom-files.open-external') },
      { id: 'copy-path', label: 'Copy path', icon: 'copy', run: cx => {
        const full = fullFilePath(root, path);
        cx.write_to_clipboard(full);
        notify({ title: 'Path copied', body: full, level: 'success', timeout: 3000 });
      } },
      { id: 'delete', label: 'Delete...', icon: 'trash', run: () => openOverlay({
        mod: 'custom-files', kind: 'dialog', modal: true, frame: 'none', width: 460,
        props: { fileDelete: { ...this.fileMenu } },
      }) }];
    const choose = (item, cx) => { closeOverlay(overlay); item.run(cx); };
    return contextMenu(t, { id: 'file-context-menu', prefix: 'file-context', focus: this.menuHandle, state: this,
      items: items.map(item => ({ ...item, icon: `mods/custom-files/${item.icon}.svg`, separator: item.id === 'copy-path' })),
      onChoose: choose, onClose: () => closeOverlay(overlay) });
  }

  openFile(path) {
    if (!this.root || !this.current(this.context)) return;
    const destination = spaces().find(s => s.active), space = destination?.id;
    if (!space) return;
    const fullPath = fullFilePath(this.root, path), identity = filePathKey(fullPath);
    // A held remote tree may be used from a space on another machine. Public
    // pane metadata cannot prove an existing viewer there has this source route.
    const allPanes = panes(), tabs = (destination.machine ?? null) === (this.on ?? null) ? destination.tabs ?? [] : [];
    const matches = tabs.flatMap(tab => {
      if (filePathKey(fileHeader(tab.id, tab.name)) !== identity) return [];
      const viewers = allPanes.filter(p => p.tab === tab.id && p.mod === 'custom-files');
      // Public pane metadata does not expose individual viewer props. A tab
      // with several file panes is ambiguous; never focus the wrong file.
      return viewers.length === 1 ? [{tab,pane:viewers[0]}] : [];
    });
    const existing = matches.find(match => match.tab.active) ?? matches[0];
    const pendingKey = JSON.stringify([space,this.on ?? null,identity]);
    this.openingFiles ??= new Map();
    for (const [key, until] of this.openingFiles) if (until <= Date.now()) this.openingFiles.delete(key);
    if (existing) {
      this.openingFiles.delete(pendingKey);
      // Native pane.focus also selects/unsettles its tab, retaining the viewer
      // and its scroll position instead of rebuilding or rereading the file.
      run('pane.focus', {pane:existing.pane.pane});
      return;
    }
    // run() queues tab creation; the native snapshot may not acknowledge it
    // before another click. A short lease suppresses duplicates, never replays
    // an open, and permits an explicit retry if creation did not succeed.
    if (this.openingFiles.has(pendingKey)) return;
    this.openingFiles.set(pendingKey, Date.now() + 3000);
    try {
      run('tab.new', { name: fullPath, space, folder: this.root,
        mod: 'custom-files', props: { fileViewer: true, fileRoot: this.root,
          fileRelative: path, fileMachine: this.on ?? null, fileSpace: space } });
    } catch (e) { this.openingFiles.delete(pendingKey); throw e; }
  }

  renderViewer(t, cx) {
    // File tabs are part of the Files plugin; while it is off, no file content is shown.
    if (!sidebarPanelEnabled('files')) return div().id('file-viewer').size_full().p(16).bg(t.background)
      .text_size(U.meta).text_color(t.muted).child('Files plugin is off. Turn it on in Settings > Plugins to view files.');
    // New tabs store the full path natively; legacy basename tabs publish a
    // transient header only while that exact file tab is active. Never rename it.
    const all = spaces(), own = panes();
    const space = all.find(s => s.id === this.viewerSpace) ?? all.find(s => s.active);
    let changed = false;
    if (space && this.viewerFullPath) {
      for (const tab of space.tabs) {
        const match = tab.name === this.viewerFullPath || (!this.viewerSpace && space.active && tab.active && tab.name === this.viewerPath.split(/[\\/]/).pop());
        if (match && own.some(p => p.tab === tab.id && p.mod === 'custom-files')) {
          changed = publishFileHeader(tab.id, this.viewerFullPath) || changed;
          if (!this.viewerSpace) this.viewerSpace = space.id;
        }
      }
      const stamp = fileReloadStamp(this.viewerSpace, this.viewerFullPath);
      if (stamp !== this.reloadSeen) { this.reloadSeen = stamp; this.show(this.viewerPath, cx); }
    }
    if (changed) cx.spawn(async cx => { await cx.sleep(0); globalThis.window.refresh(); });
    return v_flex().id('file-viewer').size_full().min_h(0).bg(t.background).text_color(t.foreground)
      .child(this.code ? this.previewEditor() : panelMessage(t,'file-viewer-loading',{loading:!this.fileError,text:this.fileError ?? 'Loading…'}));
  }

  rows(prefix, depth, out, t) {
    if (out.length >= TOTAL || depth > 40) return out;
    for (const entry of this.entries.get(prefix) ?? []) {
      if (out.length >= TOTAL) break;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name, open = this.folders.has(path), mark = this.marks[`${this.root}/${path}`];
      out.push(h_flex().id(`file-${path}`).h(U.row).flex_none().pl(8 + depth * 16).pr(8).gap(U.gap).items_center().rounded(U.radius).cursor_pointer().hover(s => s.bg(t.hover))
        .tooltip(entry.name)
        .on_click((_e, cx) => entry.dir ? this.toggle(path, cx) : this.openFile(path))
        .on_mouse_down('right', (_e, cx) => { cx.stop_propagation(); this.showFileMenu(path, cx, entry.dir); })
        .child(entry.dir ? svg(`mods/custom-files/chevron-${open ? "down" : "right"}.svg`).size(12).flex_none().text_color(t.dim) : div().w(12).flex_none())
        .child(slot(entry.dir ? svg(`mods/custom-files/${entry.hasContent === true ? 'folder-filled' : 'folder'}.svg`).size(U.smallIcon).text_color(t.muted)
          : image(fileIconAsset(entry.name)).size(U.icon)))
        .child(div().flex_1().min_w(0).truncate().child(entry.name))
        .when(Boolean(mark), el => el.child(div().text_size(11).text_color(mark === "A" ? t.ansi2 : mark === "D" || mark === "U" ? t.ansi1 : t.blocked).child(mark))));
      if (entry.dir && open) this.rows(path, depth + 1, out, t);
    }
    return out;
  }

  render(cx) {
    if (this.fileDelete) return this.renderDeleteConfirmation(theme());
    if (this.fileMenu) return this.renderFileMenu(theme());
    if (this.viewer) return this.renderViewer(theme(), cx);
    this.sync(cx, false);
    if (!sidebarPanelEnabled('files')) return div();
    const t = theme();
    return v_flex().id("files").size_full().min_h(0).rounded(8).overflow_hidden().bg(t.background).border_1().border_color(t.input).text_color(t.foreground).text_size(U.font)
      .on_hover((hovered, cx) => { if (hovered) this.freshen(cx); })
      .child(h_flex().id('files-header').relative().bg(t.surface).h(U.section).flex_none().pl(4).pr(U.gutter).gap(U.gap).items_center().border_b(1).border_color(t.border)
        .on_hover((hovered,cx)=>{this.headerHovered=hovered;cx.notify();})
        .child(sidebarTitle(t, 'files', 'files-title'))
        .when(Boolean(this.file), el => el.child(div().id("files-back").w(20).cursor_pointer().text_color(t.muted).on_click((_e, cx) => { this.show(null); cx.notify(); }).child("←")))
        .child(h_flex().id('files-folder-slot').flex_1().min_w(0).pr(U.insetControl * 3 + 8 + 16 - U.gutter).items_center()
          .child(div().id('files-folder').min_w(0).max_w_full().flex_shrink(1).truncate().text_size(U.meta).text_color(t.dim)
            .tooltip(this.root??'No folder').child(this.file ?? folderName(this.root, this.on))))
        .child(reveal(headerTools(h_flex()).id('files-actions').bg(t.surface),this.headerHovered)
          .child(refreshButton(t, { id: 'files-refresh', icon: 'mods/custom-files/refresh.svg', label: 'Refresh files', owner: this, scope: this.context?.key,
            busy: Boolean(this.loading), spinning: Boolean(this.refreshing), enabled: this.headerHovered, size: U.insetControl, iconSize: U.tinyIcon, radius: U.insetRadius,
            color: t.dim, hover: subtleActionFill(t), onClick: (_e,cx) => this.refresh(cx, true, true) }))
          .child(panelPin(t,{id:'files-pin',enabled:this.headerHovered}))
          .child(headerTool(t,{id:'files-close',icon:'mods/custom-pane/close.svg',label:'Close file explorer',enabled:this.headerHovered,onClick:()=>changePanel({open:false})}))))
      .when(!this.file, el => el.child(v_flex().id("files-tree").flex_1().min_h(0).gap(U.rowGap).overflow_y_scrollbar().p(4).children(this.rows("", 0, [], t))
        .when(Boolean(this.error) || !this.entries.get("")?.length, el => el.child(panelMessage(t,'files-empty',{loading:!this.error&&Boolean(this.loading),text:this.error||(this.loading?'Loading…':this.root?'No files':'No folder')})))
        .when(this.limited, el => el.child(div().p(8).text_size(11).text_color(t.dim).child("File list limited to 500 entries per folder and 5,000 total")))))
      .when(Boolean(this.file), el => el.child(this.code ? this.previewEditor() : panelMessage(t,'files-file-loading',{loading:!this.fileError,text:this.fileError||'Loading…'})));
  }
}
