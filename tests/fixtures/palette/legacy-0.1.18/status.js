// Custom status bar: selected-terminal metadata, explicit previews and isolated Claude switching.
import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { U, slot, hotkey, menuSurface } from "./ui.js";
import { terminals, theme, run, exec, keys, nextCommand, shared, setShared, appHome, notify, props, openOverlay, closeOverlay } from "./host.js";
import { statusLocation } from "./location.js";
import { previewLink, previewEndpoint, previewName, previewOpenRequests } from "./preview-link.js";
import { ClaudeAccount } from "./claude-account.js";
import { StatusReveal } from "./status-reveal.js";

export default class WorkspaceStatus extends View {
  init(_props, cx) {
    if (props()?.preview_context) {
      this.menuProps = props();
      this.menuIndex = this.menuProps.items.findIndex(item => item.enabled);
      this.menuHandle = cx.focus_handle?.();
      this.menuHandle?.focus();
      return;
    }
    this.claudeAccount = new ClaudeAccount();
    this.claudeAccount.init(cx);
    this.previewOwner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cx.timer.every(5000, cx => { this.refreshBranch(cx); this.claudeAccount.tick(cx); });
    // Only touch our local lease files. Never read terminals on a timer or from render/init.
    cx.timer.every(15000, cx => this.keepPreviewAlive(cx));
    // A page a tool just published (crew show) opens by itself, here, where the person is.
    cx.timer.every(2000, cx => this.openRequestedPreviews(cx));
    // Copy from a queued mod command, outside the originating key dispatch.
    // The native key-bound copy action otherwise forwards Ctrl+C when selection is empty.
    cx.spawn(async cx => {
      for (;;) {
        const command = await nextCommand();
        if (command === "copy") run("terminal.copy");
        else if (command === "inspect-copy") setShared("custom.clipboard.binding", keys().find(k => k.section === "terminal" && k.keys === "ctrl-c")?.action ?? null);
        else if (command === "refresh-previews") this.discoverPreview(cx);
        else if (command.startsWith("preview-menu-")) this.handlePreviewMenu(command, cx);
        cx.notify();
      }
    });
  }
  refreshBranch(cx, target = statusLocation()) {
    // Known folders show their last branch at once (undefined: never read yet), and
    // the read below only replaces it when it changed. Switch first, even while an
    // older read is in flight, so the bar never waits on the previous folder.
    const cache = this.branchCache ??= new Map();
    if (this.branchContext !== target.key) {
      this.branch = cache.has(target.key) ? cache.get(target.key) : undefined;
      this.branchContext = target.key;
    }
    if (this.branchLoading) return; // Its completion reads the latest location.
    if (!target.cwd) return;
    this.branchLoading = true;
    cx.spawn(async cx => {
      let branch = null;
      try {
        const result = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "symbolic-ref", "--quiet", "--short", "HEAD"], {cwd:target.cwd, on:target.on, timeout:3000});
        const text = result.stdout.trim();
        if (result.code === 0 && text && text.length <= 1024 && !/[\x00-\x1f\x7f]/.test(text)) branch = text;
      } catch { /* Not a repo, detached HEAD, offline host or missing Git: hide. */ }
      finally {
        this.branchLoading = false;
        cache.delete(target.key); cache.set(target.key, branch);
        if (cache.size > 200) cache.delete(cache.keys().next().value);
        if (statusLocation().key === target.key) this.branch = branch;
        else this.refreshBranch(cx);
        cx.notify();
      }
    });
  }

  previewCommand(command, args = []) {
    const timeout = command === "reconnect" ? 30000 : command === "open" ? 25000 : command === "scan" ? 7000 : 6000;
    return exec("node", [`${appHome()}/mods/custom-workspace-status/previews.cjs`, command, appHome(), this.previewOwner, ...args], {timeout});
  }
  keepPreviewAlive(cx) {
    if (!this.previewHasTunnel || this.previewLeaseLoading) return;
    this.previewLeaseLoading = true;
    cx.spawn(async () => {
      try { await this.previewCommand("keepalive"); }
      catch { /* The worker expires safely if the app can no longer renew its lease. */ }
      finally { this.previewLeaseLoading = false; }
    });
  }
  discoverPreview(cx, target = statusLocation()) {
    // Explicit user action only. Screen-only reads never send scroll input to the agent.
    if (!target.terminal || this.previewLoading || this.previewOpening || this.previewClosing) return;
    this.previewLoading = true;
    cx.notify();
    cx.spawn(async cx => {
      try {
        const result = await this.previewCommand("scan", [target.terminal]);
        if (result.code !== 0) throw new Error(result.stderr || "Cannot read the current screen");
        const link = previewLink(JSON.parse(result.stdout).links?.[0]?.url);
        if (!link) {
          notify({title: "No localhost URL on this screen", body: "Show the URL, then right-click the status bar and choose Read screen again.", level: "info"});
          return;
        }
        // Core metadata is persistent and streamed live: subsequent renders need no reads at all.
        const saved = await exec("hc", ["label", target.terminal, `custom.preview.url=${link.url}`], {timeout: 5000});
        if (saved.code !== 0) throw new Error(saved.stderr || "Cannot remember the preview URL");
      } catch (error) {
        notify({title: "Could not find preview", body: String(error.message).slice(0, 1400), level: "error"});
      } finally { this.previewLoading = false; cx.notify(); }
    });
  }
  // Live label data only (no process, no Core query). One request at a time; it is recorded
  // as handled before the browser opens, so it is opened once, by one status bar.
  openRequestedPreviews(cx) {
    if (this.previewOpening || this.previewClosing) return;
    const handled = shared("custom.preview.opened") ?? {};
    const [request] = previewOpenRequests(terminals(), handled, Date.now());
    if (!request) return;
    setShared("custom.preview.opened", Object.fromEntries(Object.entries({ ...handled, [request.address]: request.stamp }).slice(-50)));
    this.openPreview(cx, request.link, request.machine);
  }
  dropPreviewConnections(machine, link) {
    const endpoint = previewEndpoint(machine, link.url);
    for (const key of this.previewConnections?.keys() ?? []) {
      const [on, url] = JSON.parse(key);
      if (previewEndpoint(on, url) === endpoint) this.previewConnections.delete(key);
    }
  }
  openPreview(cx, link, machine, reconnect = false) {
    if (this.previewOpening || this.previewClosing) return;
    const connectionKey = JSON.stringify([machine ?? null, link.url]);
    const cached = this.previewConnections?.get(connectionKey);
    if (cached && !reconnect) {
      // Established previews open immediately: no processes, core queries, or SSH setup.
      try { cx.open_url(cached); }
      catch (error) { notify({title: "Could not open browser", body: String(error.message), level: "error"}); }
      return;
    }
    if (reconnect) this.dropPreviewConnections(machine, link);
    this.previewOpening = connectionKey;
    cx.notify();
    cx.spawn(async cx => {
      try {
        const result = await this.previewCommand(reconnect ? "reconnect" : "open", [machine ?? "", link.url]);
        if (result.code !== 0) throw new Error(result.stderr || "Cannot start SSH preview");
        const url = JSON.parse(result.stdout).url;
        cx.open_url(url);
        if (machine) this.previewHasTunnel = true;
        this.previewConnections ??= new Map();
        this.previewConnections.set(connectionKey, url);
      } catch (error) {
        this.previewConnections?.delete(connectionKey);
        notify({title: "Could not open preview", body: String(error.message).slice(0, 1400), level: "error"});
      } finally { this.previewOpening = null; cx.notify(); }
    });
  }
  closePreview(cx, target, link) {
    if (!target.terminal || !link || this.previewOpening || this.previewLoading || this.previewClosing) return;
    const current = previewLink(terminals().find(t => t.address === target.terminal)?.labels?.["custom.preview.url"]);
    if (current?.url !== link.url) return; // A stale menu must not erase a newly published URL.
    this.previewClosing = JSON.stringify([target.on ?? null, link.url]);
    this.dropPreviewConnections(target.on, link);
    cx.notify();
    cx.spawn(async cx => {
      try {
        const stopped = await this.previewCommand("disconnect", [target.on ?? "", link.url]);
        if (stopped.code !== 0) throw new Error(stopped.stderr || "Cannot close preview tunnel");
        this.previewHasTunnel = Array.from(this.previewConnections?.keys() ?? []).some(key => Boolean(JSON.parse(key)[0]));
        const latest = previewLink(terminals().find(t => t.address === target.terminal)?.labels?.["custom.preview.url"]);
        if (latest?.url !== link.url) return;
        const saved = await exec("hc", ["label", target.terminal, "custom.preview.url="], {timeout: 5000});
        if (saved.code !== 0) throw new Error(saved.stderr || "Cannot remove preview URL");
      } catch (error) {
        notify({title: "Could not close preview", body: String(error.message).slice(0, 1400), level: "error"});
      } finally { this.previewClosing = null; cx.notify(); }
    });
  }
  showPreviewMenu(target, link, itemOnly = false) {
    const request = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const busy = Boolean(this.previewOpening || this.previewLoading || this.previewClosing);
    const rows = itemOnly
      ? [{action: "close", label: "Close", icon: "mods/custom-workspace-chrome/x.svg", enabled: Boolean(link) && !busy}]
      : [{action: "read", label: "Read screen", icon: "mods/custom-workspace-status/preview.svg", enabled: Boolean(target.terminal) && !busy},
         {action: "reconnect", label: "Reconnect", icon: "mods/custom-files/refresh.svg", enabled: Boolean(link) && !busy}];
    const items = rows.map(row => ({...row, command: `preview-menu-${request}-${row.action}`}));
    this.previewMenuRequest = {target: {...target}, link, items};
    openOverlay({mod: "custom-workspace-status", kind: "popup", frame: "none", width: 200, props: {preview_context: true, items}});
  }
  handlePreviewMenu(command, cx) {
    const request = this.previewMenuRequest;
    const item = request?.items.find(item => item.command === command && item.enabled);
    if (!item) return;
    this.previewMenuRequest = null;
    if (item.action === "read") this.discoverPreview(cx, request.target);
    else if (item.action === "reconnect" && request.link) this.openPreview(cx, request.link, request.target.on, true);
    else if (item.action === "close") this.closePreview(cx, request.target, request.link);
  }
  choosePreviewMenu(item) {
    if (!item?.enabled) return;
    closeOverlay(this.menuProps.overlay);
    run(`custom-workspace-status.${item.command}`);
  }
  renderPreviewMenu() {
    const t = theme(), items = this.menuProps.items;
    return menuSurface(t).w_full().flex().flex_col()
      .when(Boolean(this.menuHandle), el => el.track_focus(this.menuHandle))
      .on_key_down((event, cx) => {
        if (event.key === "escape") closeOverlay(this.menuProps.overlay);
        else if (event.key === "enter") this.choosePreviewMenu(items[this.menuIndex]);
        else if (event.key === "up" || event.key === "down") {
          const enabled = items.map((item, index) => item.enabled ? index : -1).filter(index => index >= 0);
          if (enabled.length) this.menuIndex = enabled[(enabled.indexOf(this.menuIndex) + (event.key === "up" ? enabled.length - 1 : 1)) % enabled.length];
          cx.notify();
        } else return;
        cx.stop_propagation();
      })
      .child(div().id("preview-menu-heading").px(8).pt(6).pb(8).text_size(U.meta).text_color(t.dim).child("Localhost"))
      .children(items.map((item, index) => h_flex().id(`preview-menu-${item.action}`).h(U.control).px(8).gap(8).items_center().rounded(U.radius)
        .role("button").accessibility_label(item.label).disabled(!item.enabled).text_color(t.foreground)
        .when(!item.enabled, el => el.opacity(0.4))
        .when(item.enabled && index === this.menuIndex, el => el.bg(t.hover))
        .when(item.enabled, el => el.cursor_pointer().hover(el => el.bg(t.hover)))
        .on_hover((hovered, cx) => { if (hovered && item.enabled) { this.menuIndex = index; cx.notify(); } })
        .on_click((_event, cx) => { cx.stop_propagation(); this.choosePreviewMenu(item); })
        .child(slot(svg(item.icon).size(U.smallIcon))).child(item.label)));
  }
  async close() {
    // Best effort on normal close; workers also expire after 45 seconds without a lease.
    if (this.previewOwner && this.previewHasTunnel) await this.previewCommand("release").catch(() => {});
  }

  // The palette key as actually bound, not a hardcoded one; without a
  // binding the hint stays useful ("commands") instead of lying.
  hint(t) {
    const b = keys().find((k) => k.section === "global" && k.action === "app.palette");
    const key = hotkey(b?.keys);
    return key ? `${key}  commands` : "commands";
  }

  render(cx) {
    if (this.menuProps) return this.renderPreviewMenu();
    const t = theme();
    const target = statusLocation();
    const record = target.terminal ? terminals().find(t => t.address === target.terminal) : null;
    const link = previewLink(record?.labels?.["custom.preview.url"]);
    const previews = link ? [link] : [];
    // A page a tool published under a name (crew show: "Lavish") is shown by that name.
    const previewTitle = link ? previewName(record?.labels?.["custom.preview.label"]) ?? link.label : null;
    const connectionKey = link ? JSON.stringify([target.on ?? null, link.url]) : null;
    const connected = link && this.previewConnections?.has(connectionKey);
    if (this.branchContext !== target.key) this.refreshBranch(cx, target);
    const current = this.branchContext === target.key;
    const branch = current ? this.branch : null;
    // A folder's first branch read: nothing is drawn for it (no placeholder value),
    // and the items to its right wait for it, so they reveal once, after it.
    const branchReading = current && branch === undefined && Boolean(target.cwd);
    const machine = target.on;
    const claudeAccount = this.claudeAccount?.render(target, t, cx);
    // Branch artwork has a smaller ink box: 16px optically matches the 14px device glyphs.
    const label = (icon, text) => h_flex().id(`status-${icon}`).gap(4).items_center().child(slot(svg(`mods/custom-workspace-chrome/${icon}.svg`).size(icon === "branch" ? U.icon : U.smallIcon))).child(text);
    // Status items, left to right. StatusReveal gives every entry the same behavior:
    // only what changed or moved hides, then reveals in order, softly, once settled.
    const items = [
      { id: "machine", value: machine ?? null, element: label(machine ? "server" : "monitor", machine ?? "This computer") },
      branchReading ? { id: "branch", loading: true } : branch && { id: "branch", value: branch, element: label("branch", branch) },
      claudeAccount && { id: "claude", value: this.claudeAccount.shownText ?? null, element: div().id("status-claude").flex().items_center().child(claudeAccount) },
      ...previews.map((link, index) => ({ id: `preview-${index}`, value: link.url, element: div().id(`preview-${index}`).h(U.control).px(8).mx(-8).flex().gap(4).items_center().rounded(U.radius)
        .role("button").accessibility_label(`Open ${previewTitle}${machine ? ` on ${machine} through SSH` : ""}`)
        .tooltip(`${machine ? `${machine} → SSH → this computer\n` : ""}${link.url}`)
        .cursor_pointer().text_color(t.muted).hover(el => el.bg(t.hover))
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); this.showPreviewMenu(target, link, true); })
        .on_click((_e, cx) => { cx.stop_propagation(); this.openPreview(cx, link, machine); })
        .child(slot(svg(`mods/custom-workspace-status/${connected ? "arrow-up-right" : "preview"}.svg`).size(U.smallIcon)))
        .child(this.previewOpening === connectionKey ? "Connecting…" : this.previewClosing === connectionKey ? "Closing…" : previewTitle) })),
    ];
    const reveal = this.reveal ??= new StatusReveal();
    const bar = h_flex().id("workspace-status").size_full().px(U.gutter).gap(16).items_center().bg(t.chrome).border_t(1).border_color(t.border).text_size(U.meta).text_color(t.muted)
      .on_mouse_down("right", (_event, cx) => { cx.stop_propagation(); this.showPreviewMenu(target, link); })
      .children(reveal.items(items))
      .child(div().flex_1())
      .child(div().id("palette").h(U.control).px(8).flex().items_center().rounded(U.radius)
        .role("button").accessibility_label("Open command palette").cursor_pointer().text_color(t.dim)
        .hover(el => el.bg(t.hover))
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => { cx.stop_propagation(); run("app.palette"); }).child(this.hint(t)));
    reveal.settle(cx);
    return bar;
  }
}
