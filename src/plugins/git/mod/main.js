// Custom: GitHub pull requests for the repository under the focused folder.
import { View, div, svg, PathBuilder } from 'gpui-kit';
import { v_flex, h_flex } from 'gpui-base';
import { U, headerTools, reveal, subtleActionFill, refreshButton } from './ui.js';
import { exec, hc, theme, run, layout, openOverlay, closeOverlay, props, notify, nextCommand, window, settings } from './host.js';
import { location } from './location.js';
import { AgentLinks } from './agent-links.js';
import { AggregatePulls } from './aggregate.js';
import { GitWebhooks } from './webhooks.js';
import { GitNotices } from './notices.js';
import { PinSwap, PIN_SWAP_MS } from './pin-swap.js';
import { panelPin } from './panel-pin.js';
import { openSettings } from './settings-dialog.js';
import { headerTool, contextMenu, tag, panelMessage } from './panel-kit.js';
import { changePanel } from './panel-state.js';
import { sidebarPanelEnabled } from './plugins.js';
import { sidebarTitle } from './sidebar-title.js';
import { pullListArgs, REPO_ARGS, countArgs, parseCounts, parsePullPage, agentPullNumber, pullRow, pullError, PR_FIELDS, PR_PAGE_SIZE } from './pulls.js';

const VIEWS = ['open', 'closed'];
const VIEW_KEY = 'custom.git.view';
const LOCAL_CONTEXT_TTL = 10000; // shell branch/footer only, never a GitHub poll
const CI_SWEEP_MS = 2400;
const CI_SWEEP_WIDTH = 96;
const ciPending = pr => ['open','draft'].includes(pr?.state) && pr.checks?.pending > 0;
function find(node, id) { return node?.id === id ? node : (node?.children ?? []).map(c => find(c, id)).find(Boolean); }
// Repository data survives agent/tab changes in the same machine and folder.
const folderKey = ({cwd,on}) => JSON.stringify([cwd,on]);
const key = () => folderKey(location());
const agentKey = target => JSON.stringify(target);

export default class Changes extends View {
  init(_props, cx) {
    const menu = props()?.pullMenu;
    if (menu) {
      this.pullMenu = menu;
      this.menuHandle = cx.focus_handle();
      this.menuHandle.focus();
      return;
    }
    this.headerHovered = false;
    this.agentLinks = new AgentLinks(() => sidebarPanelEnabled('changes'));
    let view = null;
    try { view = localStorage.getItem(VIEW_KEY); } catch {}
    this.view = VIEWS.includes(view) ? view : 'open';
    // Old installations may have remembered the retired Changes tab.
    if (view !== this.view) try { localStorage.setItem(VIEW_KEY, this.view); } catch {}
    this.resetRepository();
    this.refresh(cx);
    cx.timer.every(LOCAL_CONTEXT_TTL, cx => {
      if (this.shown()) this.refresh(cx);
    });
  }

  close() {
    this.aggregate?.stop();this.webhooks?.stop();this.notices?.stop();
    this.rootRequest=null;this.pullRequest=null;this.relatedRequest=null;
  }

  resetRepository() {
    this.ciRevision=(this.ciRevision??0)+1;
    // Native size callbacks fire on size changes, not data resets. Keep the
    // controller's geometry for these same element IDs across repository loads.
    this.pinMotion ??= new PinSwap(); this.pinMotion.cancel();
    this.pullPresentation = null; this.agentPress = null;
    this.root = null; this.repo = null; this.counts = null; this.branch = null; this.agentPull = null;
    this.pulls = { open: null, closed: null }; this.pullsAt = { open: 0, closed: 0 };
    this.pages = {open:{cursor:null,hasMore:false,expanded:false},closed:{cursor:null,hasMore:false,expanded:false}};
    this.pageError = null; this.loadingState = null; this.appending = false; this.scrollMotion = null;
    this.selection = null; this.agentRequest = null; this.agentResolved = null;
    this.pinKey = null; this.pinRevealed = true;
    this.relatedKey = null; this.relatedPull = null; this.relatedRequest = null;
    this.webhooks?.stop(); this.webhookDirty = false; this.ciSweep = null;
    this.pullError = null; this.pullLoading = false; this.pullRequest = null;
  }

  refresh(cx, notify = true) {
    if (!sidebarPanelEnabled('changes')) return;
    if (this.syncAggregate(cx)) return;
    const target = location(), { cwd, on } = target, context = folderKey(target);
    if (context !== this.context) {
      // Invalidate before the busy guard: an old machine's slow request must
      // neither keep its repo visible nor block resolving the new location.
      const swap = this.pinMotion?.current;
      const retained = swap && swap.target === target.terminal && swap.folder === context && swap.repo === this.repo?.name;
      this.context = context; this.on = on; this.error = null;
      this.rootRequest = null; this.loading = false;
      if (retained) {
        // The clicked link already verified this destination's repository.
        // Retain rows across its worktree/folder refresh, but invalidate every
        // old-folder request before accepting any new terminal or Git result.
        this.pinMotion.rebase(context); this.root = null;
        this.selection = null; this.agentRequest = null; this.agentResolved = null;
        this.pullRequest = null; this.pullLoading = false;
        this.relatedRequest = null; this.relatedKey = null; this.webhookDirty = false;
      } else this.resetRepository();
    }
    if (!cwd || this.loading) return;
    const request = this.rootRequest = {};
    const current = () => sidebarPanelEnabled('changes') && this.rootRequest === request && this.context === context && key() === context;
    this.loading = true;
    if (notify) cx.notify();
    cx.spawn(async cx => {
      try {
        const top = await exec('git', ['rev-parse', '--show-toplevel'], { cwd, on, timeout: 15000 });
        if (!current()) return;
        const root = top.code === 0 ? top.stdout.trim() : null;
        const retained = root && this.pinMotion?.current?.context === context && this.pinMotion.current.repo === this.repo?.name;
        if (!root || (root !== this.root && !retained)) this.resetRepository();
        this.root = root;
        this.error = root ? null : 'Not a git repository';
        if (root) {
          // Resolve in the terminal's live folder/worktree, not the space's
          // launch folder. Detached HEAD has no related branch to highlight.
          const head = await exec('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd, on, timeout: 15000 }).catch(() => null);
          if (!current()) return;
          this.branch = head?.code === 0 ? head.stdout.trim() || null : null;
          this.syncAgent(cx, true);
        }
      } catch (e) { if (current()) { this.resetRepository(); this.error = String(e); } }
      finally { if (this.rootRequest === request) this.loading = false; cx.notify(); }
    });
  }

  syncAggregate(cx) {
    this.aggregate ??= new AggregatePulls({shown:()=>this.shown(),onUpdate:view=>this.startCISweep(view)});
    if(!this.aggregate.sync(cx)) return false;
    const scope=`tasks:${this.aggregate.context.scope}`;
    if(this.context!==scope) {
      this.resetRepository();this.rootRequest=null;this.loading=false;this.context=scope;
    }
    this.syncTaskWebhooks(cx);
    return true;
  }

  // Only the session PR is agent-specific. Never discard repository rows,
  // pagination or in-flight GitHub requests just because focus moved.
  syncAgent(cx, force = false) {
    if (!sidebarPanelEnabled('changes')) return;
    const target = location(), selection = agentKey(target), context = this.context;
    if (!this.root || key() !== context || (!force && selection === this.selection)) return;
    // A periodic read of the same agent must not invalidate its resolved pin
    // or discard the targeted refresh that the same timer just started.
    if (selection !== this.selection) this.agentResolved = null;
    this.selection = selection;
    const request = this.agentRequest = {};
    if (!['a1','claude-code'].includes(target.app) || !target.terminal) { this.agentPull = null; this.agentResolved = selection; return; }
    // Keep the existing pin until the new footer resolves: identical PRs must
    // not briefly drop into the list and jump back up on every agent switch.
    cx.spawn(async cx => {
      try {
        const screen = await hc(['read', target.terminal, '--json', '--lines', '0']).catch(() => null);
        if (!sidebarPanelEnabled('changes') || this.agentRequest !== request || this.context !== context || key() !== context || agentKey(location()) !== selection) return;
        this.agentPull = screen?.code === 0 ? agentPullNumber(screen.stdout, target.app) : null;
        this.agentResolved = selection;
      } finally { cx.notify(); }
    });
  }

  setView(view, cx) {
    if (!VIEWS.includes(view) || view === this.view) return;
    this.pinMotion?.cancel();
    this.view = view;
    try { localStorage.setItem(VIEW_KEY, view); } catch {}
    cx.notify();
  }

  // Only a shown Git panel talks to GitHub; a hidden stack child stays quiet.
  shown() {
    if (!sidebarPanelEnabled('changes')) return false;
    const root = layout(), panel = find(root, 'panel'), body = find(root, 'panel-body');
    return Boolean(panel && !panel.hidden && (!body || body.active === 'changes'));
  }

  pullsDue(state) {
    return Boolean(this.root && !this.pullLoading && this.pulls[state] === null && !this.pullsAt[state]);
  }

  loadPulls(state, cx, force = false, notify = true, append = false) {
    if (!sidebarPanelEnabled('changes') || !VIEWS.includes(state) || !this.root || this.pullLoading || key() !== this.context || (!force && !this.pullsDue(state))) return;
    const after = append ? this.pages[state].cursor : null;
    if (append && (!this.pages[state].hasMore || !after || state !== this.view || !this.shown())) return;
    const root = this.root, on = this.on, context = this.context;
    const request = this.pullRequest = {};
    const current = () => sidebarPanelEnabled('changes') && this.pullRequest === request && this.root === root && this.context === context && key() === context;
    this.pullLoading = true; this.loadingState = state; this.appending = append; this.pageError = null;
    if (notify) cx.notify();
    cx.spawn(async cx => {
      try {
        const gh = args => exec('gh', args, { cwd: root, on, timeout: 30000 });
        if (!this.repo) {
          const r = await gh(REPO_ARGS);
          if (!current()) return;
          if (r.code !== 0) throw new Error(pullError('', r.stderr));
          const repo = JSON.parse(r.stdout || '{}');
          if (!repo?.nameWithOwner) throw new Error('No GitHub repository');
          if (!current()) return;
          this.repo = { name: repo.nameWithOwner, owner: repo.owner?.login ?? repo.nameWithOwner.split('/')[0], url: repo.url ?? `https://github.com/${repo.nameWithOwner}` };
        }
        const list = await gh(pullListArgs(state, this.repo.name, after));
        if (list.code !== 0) throw new Error(pullError('', list.stderr));
        if (!current()) return;
        const page = parsePullPage(list.stdout);
        const rows = page.pulls.map(pr => pullRow(pr, this.repo.owner));
        const existing = append ? this.pulls[state] ?? [] : [];
        const seen = new Set(existing.map(pr => pr.number));
        this.pulls[state] = [...existing, ...rows.filter(pr => !seen.has(pr.number))];
        this.ciRevision=(this.ciRevision??0)+1;
        this.pages[state] = {cursor:page.cursor,hasMore:page.hasMore && page.cursor !== after,expanded:append};
        this.counts = {...this.counts,[state]:page.total};
        this.pullsAt[state] = Date.now(); this.pullError = null;
        // All list and webhook reads share pullRequest/pullLoading: one writer.
        if (append) return;
        this.relatedKey = null;
        const counts = await gh(countArgs(this.repo.name)).catch(() => null);
        if (!current()) return;
        if (counts?.code === 0) this.counts = parseCounts(counts.stdout) ?? this.counts;
      } catch (e) {
        if (current()) {
          if (append) this.pageError = {state,message:pullError(e)};
          else { this.pullError = pullError(e); this.pullsAt[state] = Date.now(); }
        }
      } finally {
        if (this.pullRequest === request) { this.pullLoading = false; this.loadingState = null; this.appending = false; }
        this.flushWebhook(cx);
        cx.notify();
      }
    });
  }

  // Keep an explicitly linked PR pinnable even when it is older than page 1.
  // This one targeted lookup does not load earlier list pages or alter cursors.
  loadRelatedPull(cx) {
    const number = this.agentPull ?? location().pullNumber;
    if (!this.repo || !number || !this.shown()) return;
    const scope = JSON.stringify([this.context,this.repo.name,number]);
    if (this.relatedKey === scope) return;
    this.relatedKey = scope; this.relatedPull = null; this.relatedRequest = null;
    const known = [...(this.pulls.open ?? []), ...(this.pulls.closed ?? [])].find(pr => pr.number === number);
    if (known) { this.relatedPull = known; return; }
    const context = this.context, repo = this.repo, root = this.root, on = this.on;
    const request = this.relatedRequest = {};
    const current = () => sidebarPanelEnabled('changes') && this.relatedRequest === request && this.relatedKey === scope && this.context === context
      && key() === context && (this.agentPull ?? location().pullNumber) === number;
    cx.spawn(async cx => {
      try {
        const result = await exec('gh', ['pr','view',String(number),'--repo',repo.name,'--json',PR_FIELDS], {cwd:root,on,timeout:30000});
        if (!current() || result.code !== 0) return;
        const pr = JSON.parse(result.stdout);
        if (pr.number === number) {this.relatedPull = pullRow(pr,repo.owner);this.ciRevision=(this.ciRevision??0)+1;}
      } catch {} finally { cx.notify(); }
    });
  }

  syncTaskWebhooks(cx) {
    this.webhooks ??= new GitWebhooks();
    const aggregate=this.aggregate,scope=aggregate.context.scope;
    const repositories=[...new Set([...aggregate.entries.values()].map(e=>e.link.repo))].sort();
    this.webhooks.sync(cx,{enabled:this.shown() && repositories.length>0,scope:JSON.stringify(['tasks',scope,repositories]),repositories,
      onChange:(event,view)=> {
        if(!this.shown() || aggregate.currentContext()?.scope!==scope || this.context!==`tasks:${scope}`)return;
        aggregate.invalidate(event?.repository??null);aggregate.pump(view);this.startCISweep(view);
      }});
    if(!this.shown())this.ciSweep=null;
  }

  syncWebhooks(cx) {
    this.webhooks ??= new GitWebhooks();
    const shown = this.shown();
    if (shown && this.webhookShown === false && this.repo) this.webhookDirty = true;
    this.webhookShown = shown;
    this.webhooks.sync(cx, {enabled:shown && Boolean(this.repo),scope:JSON.stringify([this.context,this.repo?.name]),repository:this.repo?.name,
      onChange:(event,cx) => this.queueWebhook(event,cx)});
    if (!this.shown()) this.ciSweep = null;
    this.flushWebhook(cx);
  }

  queueWebhook(event, cx) {
    if (!this.shown() || key() !== this.context) { this.webhooks?.stop(); return; }
    if (!this.repo || (event && event.repository.toLowerCase() !== this.repo.name.toLowerCase())) return;
    this.webhookDirty = true;
    this.flushWebhook(cx);
  }

  // Coalesce bursts behind one request. Re-read every loaded page, not just the
  // selected PR, preserving expanded lists/cursors and handling newly opened PRs.
  // Reconnection/opening performs the same catch-up; no periodic GitHub requests.
  flushWebhook(cx) {
    if (!this.webhookDirty || !this.repo || !this.root || this.pullLoading || !this.shown() || key() !== this.context) return;
    this.webhookDirty = false;
    const root=this.root,on=this.on,repo=this.repo,context=this.context;
    const request=this.pullRequest={};this.pullLoading=true;
    const current=()=>this.pullRequest===request && this.context===context && key()===context && this.repo===repo && this.shown();
    cx.spawn(async cx=>{
      await Promise.resolve(); // request feedback must not notify synchronously from render
      try {
        if(!current())return;
        this.startCISweep(cx);
        const gh=async args=>{
          if(!current())throw Error('Obsolete request');
          const r=await exec('gh',args,{cwd:root,on,timeout:30000});
          if(!current())throw Error('Obsolete request');
          if(r.code!==0)throw Error(pullError('',r.stderr));
          return r.stdout;
        };
        const updates={};
        for(const state of VIEWS) {
          if(this.pulls[state]===null)continue;
          const depth=Math.max(1,Math.ceil(this.pulls[state].length/PR_PAGE_SIZE));
          let after=null,page,rows=[];
          for(let i=0;i<depth;i++) {
            page=parsePullPage(await gh(pullListArgs(state,repo.name,after)));
            rows.push(...page.pulls.map(pr=>pullRow(pr,repo.owner)));
            if(!page.hasMore || page.cursor===after)break;
            after=page.cursor;
          }
          const seen=new Set();rows=rows.filter(pr=>!seen.has(pr.number) && seen.add(pr.number));
          updates[state]={rows,page};
        }
        const number=this.agentPull ?? location().pullNumber;
        let related=number ? Object.values(updates).flatMap(u=>u.rows).find(pr=>pr.number===number) : null;
        if(number && !related) {
          const data=JSON.parse(await gh(['pr','view',String(number),'--repo',repo.name,'--json',PR_FIELDS]));
          if(data.number===number)related=pullRow(data,repo.owner);
        }
        const counts=parseCounts(await gh(countArgs(repo.name)));
        if(!current())return;
        for(const [state,{rows,page}] of Object.entries(updates)) {
          this.pulls[state]=rows;this.pullsAt[state]=Date.now();
          this.pages[state]={...this.pages[state],cursor:page.cursor,hasMore:page.hasMore};
        }
        if((this.agentPull ?? location().pullNumber)===number) this.relatedPull=related ?? null;
        this.counts=counts ?? this.counts;this.pullError=null;this.ciRevision=(this.ciRevision??0)+1;
        this.startCISweep(cx);
      } catch(e) { if(current())this.pullError=pullError(e); }
      finally {
        if(this.pullRequest===request)this.pullLoading=false;
        this.flushWebhook(cx);cx.notify();
      }
    });
  }

  // CI auto-fix delivery is owned by each Core-side monitor, never this panel.

  // One native pass for an event-driven read when ANY loaded PR has running CI.
  startCISweep(cx) {
    const rows=this.aggregate?.context ? this.aggregate.rows('open') : [...(this.pulls.open ?? []),this.relatedPull];
    if (!this.shown() || this.ciSweep || !rows.some(ciPending)) return;
    const sweep = this.ciSweep = {id:this.ciSweepSerial = (this.ciSweepSerial ?? 0) + 1,
      context:this.context,phase:'arm',width:this.pinMotion?.bodySize?.width ?? 320};
    cx.timer.after(CI_SWEEP_MS + 100, cx => {
      if (this.ciSweep !== sweep) return;
      this.ciSweep = null; cx.notify();
    });
    cx.notify();
  }

  armCISweep(sweep, cx) {
    if (this.ciSweep !== sweep || sweep.phase !== 'arm') return;
    sweep.phase = 'armed';
    // Let the offscreen starting position lay out before changing the target.
    cx.timer.after(16, cx => {
      if (this.ciSweep !== sweep) return;
      sweep.phase = 'moving'; cx.notify();
    });
  }

  morePulls(state, cx) { this.loadPulls(state, cx, true, true, true); }

  contentMotion(event, kind, state) {
    if (!event.bounds || !event.position) return;
    this.scrollMotion = {kind,state,context:this.context,x:event.position.x,y:event.position.y,
      bottom:event.bounds.y + event.bounds.height,delta:event.delta?.y ?? 0};
  }

  scrollMotionAt(event, kind, state, cx) {
    if (kind === 'wheel' && this.pinMotion?.current) { this.pinMotion.cancel(); cx.notify(); return; }
    const motion = this.scrollMotion;
    if (!motion || !event.bounds || !event.position || motion.kind !== kind || motion.state !== state
      || motion.context !== this.context || motion.x !== event.position.x || motion.y !== event.position.y) return;
    this.scrollMotion = null;
    if (kind === 'wheel' && motion.delta >= 0) return;
    const remaining = motion.bottom + (kind === 'wheel' ? motion.delta : 0) - event.bounds.y - event.bounds.height;
    if (remaining <= 120 && this.pageError?.state !== state) this.morePulls(state, cx);
  }

  // Always this computer's browser, even for a space on another machine.
  openUrl(url) {
    if (!/^https:\/\/github\.com\/[^\s"']+$/.test(url ?? '')) return;
    const platform = window()?.platform;
    const [cmd, args] = platform === 'windows' ? ['cmd', ['/c', 'start', '', url]]
      : platform === 'macos' ? ['open', [url]] : ['xdg-open', [url]];
    exec(cmd, args, { timeout: 15000 }).catch(() => {});
  }
  openPull(pr) { this.openUrl(pr?.url); }

  showPullMenu(pr, cx, header = false) {
    if (!pr?.url) return;
    const base = header ? /^https:\/\/github\.com\/[^/]+\/[^/?#]+/.exec(pr.url)?.[0] : null;
    if (header && !base) return;
    const menu = {url:pr.url,...(header ? {header:true,repo:pr.repo ?? base.slice('https://github.com/'.length),codeUrl:base,actionsUrl:`${base}/actions`} : {})};
    // The panel owns browser work: closing the popup ends its async tasks.
    this.menuTarget = {open:menu.url,code:menu.codeUrl,actions:menu.actionsUrl};
    if (!this.listening) {
      this.listening = true;
      cx.spawn(async () => {
        for (;;) {
          const command = await nextCommand(), targets = this.menuTarget;
          const url = command === 'open-external' ? targets?.open : command === 'open-code' ? targets?.code : command === 'open-actions' ? targets?.actions : null;
          if (!url) continue;
          this.menuTarget = null;
          this.openUrl(url);
        }
      });
    }
    // Capture the clicked PR/repository, never a later selection.
    openOverlay({ mod: 'custom-changes', kind: 'popup', frame: 'none', width: header ? 240 : 180, height: header ? 3 * U.row + 24 + 8 : 2 * U.row + 12 + 9,
      props: { pullMenu: menu } });
  }

  renderPullMenu(t) {
    const overlay = props()?.overlay, url = this.pullMenu.url;
    const items = this.pullMenu.header ? [
      {id:'code',label:'Code...',icon:'code',run:()=>run('custom-changes.open-code')},
      {id:'pulls',label:'Pull requests...',icon:'git-pull-request',run:()=>run('custom-changes.open-external')},
      {id:'actions',label:'Actions...',icon:'circle-play',run:()=>run('custom-changes.open-actions')},
    ] : [
      { id: 'open', label: 'Open...', icon: 'arrow-up-right', run: () => run('custom-changes.open-external') },
      { id: 'copy-path', label: 'Copy path', icon: 'copy', run: cx => {
        cx.write_to_clipboard(url);
        notify({ title: 'Path copied', body: url, level: 'success', timeout: 3000 });
      } }];
    const choose = (item, cx) => { item.run(cx); closeOverlay(overlay); };
    return contextMenu(t, { id: this.pullMenu.header ? 'git-header-context-menu' : 'git-context-menu', prefix: 'git-context', headingId: 'git-header-context-title',
      heading: this.pullMenu.header ? this.pullMenu.repo ?? 'Repository' : null, focus: this.menuHandle, state: this,
      items: items.map(item => ({ ...item, icon: `mods/custom-changes/${item.icon}.svg`, separator: item.id === 'copy-path' })),
      onChoose: choose, onClose: () => closeOverlay(overlay) });
  }

  segment(t, id, label, count, on, onClick) {
    return h_flex().id(id).h(U.control).px(8).gap(6).flex_none().items_center().rounded(U.radius).cursor_pointer()
      .role('button').accessibility_label(label)
      .text_size(U.meta).text_color(on ? t.foreground : t.muted).when(on, el => el.font_semibold())
      .hover(s => s.bg(t.hover)).on_click((_e, cx) => onClick(cx))
      .child(label)
      .when(count != null, el => el.child(div().min_w(18).px(5).h(16).flex().items_center().justify_center().rounded_full()
        .bg(on ? t.selected : t.raised).text_size(10).font_medium().text_color(on ? t.foreground : t.muted).child(String(count))));
  }

  pullIcon(t, pr) {
    if (pr.mergeConflict && ['open','draft'].includes(pr.state)) return div().size(U.icon).flex_none()
      .tooltip('Merge conflicts').accessibility_label('Merge conflicts')
      .child(svg('mods/custom-changes/merge-conflict.svg').size(U.icon).text_color(t.ansi1));
    const asset = pr.state === 'merged' ? 'git-merge' : pr.state === 'closed' ? 'git-pull-request-closed' : 'git-pull-request';
    const color = pr.state === 'merged' ? t.ansi5 : pr.state === 'closed' ? t.ansi1 : pr.state === 'draft' ? t.dim : t.ansi2;
    return svg(`mods/custom-changes/${asset}.svg`).size(U.icon).flex_none().text_color(color);
  }

  agentButton(t, pr, interactive = true) {
    if(pr.key) {
      const target=this.aggregate?.target(pr),scope=this.aggregate?.context?.scope;
      return target ? div().id(`pr-agent-${pr.key}`).size(U.insetControl).flex_none().flex().items_center().justify_center()
        .rounded(U.insetRadius).text_color(t.foreground).cursor_pointer().role('button').accessibility_label(`Open related agent for ${pr.repo} #${pr.number}`)
        .hover(s=>s.bg(subtleActionFill(t))).on_mouse_down('left',(_e,cx)=>cx.stop_propagation())
        .on_click((_e,cx)=>{cx.stop_propagation();this.aggregate.focus(pr,target,scope);})
        .child(svg('icons/agent.svg').size(U.icon)) : null;
    }
    const agent = this.agentLinks?.related(pr, this.repo?.name, location().terminal);
    if (!agent) return null;
    // A separate foreground robot, like the Agents sidebar. Its usual 24px
    // target fits around the title line without changing the PR icon or height.
    const repo = this.repo?.name, context = this.context;
    return div().w(U.insetControl).h(20).flex_none().relative()
      .child(div().id(`${interactive ? '' : 'swap-'}pr-agent-${pr.number}`).absolute().left(0).top((20 - U.insetControl) / 2)
        .size(U.insetControl).flex().items_center().justify_center().rounded(U.insetRadius)
        .text_color(t.foreground)
        .when(interactive, el => el.role('button').accessibility_label(`Open related agent for pull request #${pr.number}`).cursor_pointer()
          .hover(s => s.bg(subtleActionFill(t)))
          .on_mouse_down('left', (event, cx) => {
            cx.stop_propagation(); this.agentPress = {number:pr.number,position:event.position,bounds:event.bounds,at:Date.now()};
          })
          .on_click((_e, cx) => {
            cx.stop_propagation();
            const press = this.agentPress; this.agentPress = null;
            if (this.context !== context || key() !== context || this.repo?.name !== repo) return;
            const current = this.agentLinks.related(pr, repo, location().terminal);
            if (current?.key !== agent.key) return;
            // Capture presentation only. Focus changes immediately; the new
            // footer/selection must resolve before any row starts moving.
            if (press?.number === pr.number && Date.now() - press.at < 2000
              && this.pinMotion?.start(this.pullPresentation, pr, press,
                {source:location().terminal,target:current.address,folder:folderKey(current),repo},cx)) cx.notify();
            run('agent.focus', {terminal:current.address});
          }))
        .child(svg('icons/agent.svg').size(U.icon).flex_none().text_color(t.foreground)));
  }

  taskRing(t, done, total) {
    const size = U.tinyIcon, c = size / 2, r = c - 1, fraction = Math.min(0.999, Math.max(0, done / total));
    this.rings ??= new Map();
    const ring = this.rings.get('ring') ?? PathBuilder.stroke(2).move_to(c, c - r).arc_to(r, r, 0, false, true, c, c + r).arc_to(r, r, 0, false, true, c, c - r).build();
    this.rings.set('ring', ring);
    const key = fraction.toFixed(3);
    let arc = this.rings.get(key);
    if (!arc && fraction > 0) {
      const a = fraction * 2 * Math.PI;
      arc = PathBuilder.stroke(2).move_to(c, c - r).arc_to(r, r, 0, fraction > 0.5, true, c + r * Math.sin(a), c - r * Math.cos(a)).build();
      this.rings.set(key, arc);
    }
    return div().size(size).flex_none().relative()
      .child(globalThis.window.paint_path(ring, t.raised).absolute().inset_0().size_full())
      .when(Boolean(arc), el => el.child(globalThis.window.paint_path(arc, t.ansi5).absolute().inset_0().size_full()));
  }

  taskIcon(t, task) {
    if (task.done === 0) return svg('mods/custom-changes/checklist.svg').size(U.tinyIcon).text_color(t.muted);
    if (task.done === task.total) return svg('mods/custom-changes/circle-check.svg').size(U.tinyIcon).text_color(t.ansi5);
    return this.taskRing(t, task.done, task.total);
  }

  pullRow(t, pr, ghost = false) {
    const prefix = ghost ? 'swap-' : '', rowId = pr.key ?? pr.number;
    const agentButton = this.agentButton(t, pr, !ghost);
    const dot = () => div().text_color(t.dim).child('·');
    const checkColor = pr.checks?.state === 'success' ? t.ansi2 : pr.checks?.state === 'failure' ? t.ansi1 : t.ansi3;
    const checkIcon = pr.checks?.state === 'success' ? svg('mods/custom-workspace-chrome/check.svg').size(U.tinyIcon).text_color(checkColor)
      : pr.checks?.state === 'failure' ? svg('mods/custom-workspace-chrome/x.svg').size(U.tinyIcon).text_color(checkColor)
      : div().size(8).flex_none().rounded_full().bg(checkColor);
    return h_flex().id(`${prefix}pr-${rowId}`).w_full().flex_none().px(8).py(6).gap(U.gap).items_start().rounded(U.radius)
      .when(!ghost, el => el.cursor_pointer().role('button').accessibility_label(`Open pull request #${pr.number} on GitHub`)
        .hover(s => s.bg(t.hover)).on_click(() => this.openPull(pr))
        .on_mouse_down('right', (_event, cx) => { cx.stop_propagation(); this.showPullMenu(pr, cx); })
        .when(!pr.key, el=>el.on_size_change(size => this.pinMotion?.measureRow(pr.number,size,settings().zoom))
          .on_mouse_move(event => this.pinMotion?.rowPointer(pr.number,event))))
      .child(div().h(20).flex_none().flex().items_center().child(this.pullIcon(t, pr)))
      .child(v_flex().flex_1().min_w(0).gap(3)
        .child(h_flex().w_full().min_w(0).gap(4).items_center()
          .child(div().id(`${prefix}pr-title-${rowId}`).flex_1().min_w(0).truncate().text_size(U.font).font_semibold().text_color(t.foreground).child(pr.title))
          .when(Boolean(agentButton), el => el.child(agentButton)))
        .child(h_flex().id(`${prefix}pr-meta-${rowId}`).w_full().min_w(0).flex_wrap().gap_x(6).gap_y(2).items_center().text_size(11).text_color(t.muted)
          .child(div().child(pr.meta))
          .when(pr.owner, el => el.child(tag(t, `${prefix}pr-owner-${rowId}`, 'Owner', { compact: true })))
          .when(Boolean(pr.tasks), el => el.child(dot()).child(h_flex().gap(4).items_center()
            .child(this.taskIcon(t, pr.tasks)).child(div().child(pr.tasks.label))))
          .when(Boolean(pr.checks), el => el.child(dot()).child(h_flex().gap(4).items_center()
            .child(checkIcon).child(div().underline().child(pr.checks.label))))
          .when(pr.review === 'approved', el => el.child(dot()).child(div().text_color(t.ansi2).child('Approved')))
          .when(pr.review === 'changes', el => el.child(dot()).child(div().text_color(t.ansi1).child('Changes requested')))));
  }

  swapOverlay(t, swap) {
    return div().id(`pin-swap-${swap.id}`).absolute().inset_0().overflow_hidden()
      .on_mouse_down('left', (_e,cx) => cx.stop_propagation()).on_click((_e,cx) => cx.stop_propagation())
      .on_scroll_wheel((_e,cx) => { this.pinMotion.cancel(); cx.notify(); cx.stop_propagation(); })
      .on_size_change((_size,cx) => this.pinMotion.arm(swap,cx))
      .children([...swap.cards].reverse().map(card => div().id(`pin-swap-${swap.id}-${card.pr.number}`).absolute().left(4).right(4)
        .top(swap.phase === 'moving' ? card.to : card.from)
        .transition('top',{duration:PIN_SWAP_MS,easing:'ease-in-out'})
        .bg(t.background).rounded(U.radius).shadow_sm().child(this.pullRow(t,card.pr,true))));
  }

  pullSelection() {
    const state = this.view, list = this.pulls[state], pullNumber = this.agentPull ?? location().pullNumber;
    const related = this.relatedPull && this.relatedPull.number === pullNumber && (state === 'open'
      ? ['open','draft'].includes(this.relatedPull.state) : ['closed','merged'].includes(this.relatedPull.state)) ? this.relatedPull : null;
    const liveRows = related && list && !list.some(pr => pr.number === related.number) ? [...list,related] : list ?? [];
    const active = liveRows.find(pr => pullNumber != null
      ? pr.number === pullNumber : Boolean(this.branch && pr.headRefName === this.branch));
    return {liveRows,active};
  }

  renderPulls(t) {
    const state = this.view, list = this.pulls[state], {liveRows,active} = this.pullSelection();
    this.pinMotion?.active(this.context,state);
    this.pinMotion?.resolve(location().terminal,active?.number,this.agentResolved === agentKey(location()));
    const retained = this.pinMotion?.current;
    const rows = retained?.snapshot.rows ?? liveRows, pinned = retained ? retained.snapshot.pinned : active;
    this.pullPresentation = {context:this.context,state,rows,pinned};
    const swap = retained && retained.phase !== 'waiting' ? retained : null;
    const settled = this.pinMotion?.settled(this.context,state,pinned?.number);
    const pinKey = JSON.stringify([this.context,state,pinned?.number ?? null]);
    if (pinKey !== this.pinKey) {
      this.pinRevealed = this.pinKey == null || !pinned || Boolean(retained) || settled;
      this.pinKey = pinKey;
    }
    const remaining = rows.filter(pr => pr !== pinned);
    const empty = this.pullError || (!this.root ? (this.error || (this.loading ? 'Loading…' : 'No folder'))
      : list === null ? 'Loading…' : `No ${state} pull requests`);
    return v_flex().id('pulls-body').relative().flex_1().min_h(0).overflow_hidden()
      .on_size_change((size, cx) => {
        const before = this.pinMotion?.bodySize?.width;
        this.pinMotion?.measureBody(size,settings().zoom);
        if (this.pinMotion?.bodySize?.width !== before) cx.notify();
      })
      .on_mouse_move(event => this.pinMotion?.bodyPointer(event))
      .when(Boolean(pinned), el => el
        .child(v_flex().id('active-pull').relative().flex_none().p(4)
          .child(div().id('active-pull-rail').absolute().left(0).top(0).bottom(0).w(2).bg(t.accent))
          .child(v_flex().id(`active-pull-content-${pinned.number}`).w_full()
            .opacity(this.pinRevealed ? 1 : 0.75).transition('opacity', {duration:120,easing:'ease-out'})
            .on_size_change((_size, cx) => {
              if (this.pinKey === pinKey && !this.pinRevealed) { this.pinRevealed = true; cx.notify(); }
            })
            .child(this.pullRow(t, pinned).when(Boolean(swap), el => el.invisible()))))
        .child(div().id('active-pull-divider').h(1).flex_none().bg(t.border)))
      .child(v_flex().id('pulls-scroll-frame').flex_1().min_h(0).overflow_hidden()
        .on_scroll_wheel((event, cx) => this.scrollMotionAt(event, 'wheel', state, cx))
        .on_mouse_move((event, cx) => this.scrollMotionAt(event, 'move', state, cx))
        .child(v_flex().id(`pulls-list-${state}`).flex_1().min_h(0).overflow_y_scrollbar().p(4)
          .child(v_flex().id('pulls-content').w_full().flex_none().gap(U.rowGap)
            .on_scroll_wheel(event => this.contentMotion(event, 'wheel', state))
            .on_mouse_move(event => this.contentMotion(event, 'move', state))
            .children(remaining.map(pr => this.pullRow(t, pr)
              .when(Boolean(swap?.cards.some(card => card.pr.number === pr.number)), el => el.invisible())))
            .when(!rows.length, el => el.child(panelMessage(t, 'git-empty', { text: empty, loading: empty === 'Loading…', rowInset: 2 })))
            .when(Boolean(list?.length) && Boolean(this.pullError), el => el.child(div().px(8).py(4).text_size(11).text_color(t.ansi1).child(this.pullError)))
            .when(this.pageError?.state === state, el => el.child(div().px(8).py(4).text_size(11).text_color(t.ansi1).child(this.pageError.message)))
            .when(Boolean(this.pages[state]?.hasMore), el => el.child(div().id('pulls-more').p(8).text_size(11).text_color(t.dim)
              .role('button').accessibility_label('Load 10 more pull requests').disabled(this.pullLoading)
              .when(!this.pullLoading, el => el.cursor_pointer().hover(s => s.bg(t.hover)))
              .on_click((_event, cx) => { if (!this.pullLoading) this.morePulls(state, cx); })
              .child(this.pullLoading && this.loadingState === state ? 'Loading…' : this.pageError?.state === state ? 'Retry loading more' : 'Load 10 more'))))))
      .when(Boolean(swap), el => el.child(this.swapOverlay(t,swap)));
  }

  sweepLayer(t,sweep) {
    return div().id(`git-ci-track-${sweep.id}`).absolute().left(0).right(0).top(0).h(1).overflow_hidden()
      .on_size_change((size,cx)=>{if(size.width>0)sweep.width=size.width;this.armCISweep(sweep,cx);})
      .child(div().id('git-ci-line').absolute().top(0).h(1).w(CI_SWEEP_WIDTH).rounded_full().bg(t.accent).opacity(0.75)
        .left(sweep.phase==='moving'?sweep.width:-CI_SWEEP_WIDTH).transition('left',{duration:CI_SWEEP_MS,easing:'ease-in-out'}));
  }

  renderAggregate(cx,t) {
    const aggregate=this.aggregate,counts=aggregate.counts(),scope=aggregate.context.scope;
    const repositories=[...new Set([...aggregate.entries.values()].map(e=>e.link.repo))].sort();
    this.notices ??= new GitNotices();
    const notices=new Map(repositories.map(repo=>[repo,this.notices.sync(cx,{enabled:this.shown(),repository:repo})]));
    const setup=repositories.length ? [...notices.values()].includes('setup') : this.notices.sync(cx,{enabled:this.shown(),repository:null})==='setup';
    const sweep=this.shown() && this.ciSweep?.context===this.context ? this.ciSweep : null;
    return v_flex().id('changes').relative().size_full().min_h(0).rounded(8).overflow_hidden().bg(t.background).border_1().border_color(t.input).text_color(t.foreground).text_size(U.font)
      .child(h_flex().id('changes-header').relative().bg(t.surface).h(U.section).flex_none().pl(4).pr(U.gutter).gap(U.gap).items_center().border_b(1).border_color(t.border)
        .on_hover((hovered,view)=>{this.headerHovered=hovered;view.notify();})
        .child(sidebarTitle(t,'changes','git-title'))
        .child(div().flex_1().min_w(0).truncate().text_size(U.meta).text_color(t.dim).child('Recorded task PRs'))
        .child(reveal(headerTools(h_flex()).id('git-actions').bg(t.surface),this.headerHovered)
          .child(refreshButton(t,{id:'git-refresh',icon:'mods/custom-changes/refresh.svg',label:'Refresh',busy:aggregate.busy,spinning:aggregate.busy,
            owner:this,scope:this.context,enabled:this.headerHovered,size:U.insetControl,iconSize:U.tinyIcon,radius:U.insetRadius,color:t.dim,hover:subtleActionFill(t),
            onClick:(_e,view)=>{if(aggregate.context?.scope===scope && !aggregate.busy) {this.webhooks?.retryNow();this.notices?.retryNow();aggregate.refresh(view);}}}))
          .child(panelPin(t,{id:'git-pin',enabled:this.headerHovered}))
          .child(headerTool(t,{id:'git-close',icon:'mods/custom-pane/close.svg',label:'Close Git panel',enabled:this.headerHovered,onClick:()=>changePanel({open:false})}))))
      .child(h_flex().id('git-views').h(40).flex_none().px(4).gap(2).items_center().border_b(1).border_color(t.border)
        .child(this.segment(t,'git-view-open','Open',counts.open,this.view==='open',view=>this.setView('open',view)))
        .child(this.segment(t,'git-view-closed','Closed',counts.closed,this.view==='closed',view=>this.setView('closed',view))))
      .when(aggregate.context.incomplete,el=>el.child(div().id('git-task-incomplete').flex_none().px(12).py(6).text_size(U.meta).text_color(t.dim)
        .child('Recorded PRs · possibly incomplete until tasks report')))
      .child(v_flex().id('task-pulls-scroll').flex_1().min_h(0).overflow_y_scrollbar().p(4)
        .children(repositories.map(repo=>v_flex().id(`task-repo-${repo}`).w_full().flex_none().gap(U.rowGap)
          .child(div().px(8).py(6).text_size(U.meta).text_color(t.muted).child(repo))
          .children(aggregate.rows(this.view).filter(pr=>pr.repo===repo).map(pr=>this.pullRow(t,pr)))
          .children([...aggregate.entries.values()].filter(e=>e.link.repo===repo && e.error).map(e=>div().id(`task-error-${e.link.key}`).px(8).py(4).text_size(U.meta).text_color(t.ansi1).child(e.error)))
          .when(notices.get(repo)==='repository',el=>el.child(this.liveCIInfo(t,'repository',repo)))))
        .when(!aggregate.rows(this.view).length,el=>el.child(panelMessage(t,'git-task-empty',{text:aggregate.busy?'Loading…':`No recorded ${this.view} task pull requests`,loading:aggregate.busy,rowInset:2}))))
      .when(setup,el=>el.child(this.liveCIInfo(t)))
      .when(Boolean(sweep),el=>el.child(this.sweepLayer(t,sweep).top(U.section)));
  }

  liveCIInfo(t,kind='setup',capturedRepository=null) {
    const text=kind==='repository'?'Add this repo in':'Set up Git in';
    const repository=kind==='repository' ? capturedRepository ?? this.repo?.name ?? null : null;
    const id=capturedRepository ? `git-live-ci-${capturedRepository}` : 'git-live-ci';
    return div().id(`${id}-footer`).flex_none().p(4).border_t(1).border_color(t.border)
      .child(h_flex().id(`${id}-info`).w_full().px(8).py(6).gap(U.gap).items_start().rounded(U.radius).bg(t.raised)
        .accessibility_label(`${text} Settings`)
        .child(div().h(20).flex_none().flex().items_center()
          .child(svg('mods/custom-changes/info.svg').id(`${id}-icon`).size(U.icon).flex_none().text_color(t.accent)))
        .child(h_flex().id(`${id}-title`).flex_1().min_w(0).flex_wrap().items_center().gap_x(3).text_size(U.meta).font_normal().text_color(t.dim)
            .child(div().child(text))
            .child(div().id(`${id}-settings`).text_color(t.accent).underline().cursor_pointer().role('button')
              .accessibility_label('Open Git plugin settings').hover(s => s.text_color(t.foreground))
              .on_click((_event, cx) => {
                cx.stop_propagation();
                if (!sidebarPanelEnabled('changes')) return;
                openSettings({section:'plugins',plugin:'git',
                  ...(repository?{pluginSection:'repository',pluginSearch:repository}:{})});
              }).child('Settings'))));
  }

  render(cx) {
    if (!sidebarPanelEnabled('changes')) {
      this.webhooks?.stop();this.notices?.stop();this.aggregate?.stop();
      this.resetRepository(); this.rootRequest = null; this.loading = false; this.context = null;
      return div();
    }
    if (this.pullMenu) return this.renderPullMenu(theme());
    if (this.syncAggregate(cx)) return this.renderAggregate(cx,theme());
    if (key() !== this.context) this.refresh(cx, false);
    this.syncAgent(cx);
    if (this.shown() && this.pullsDue(this.view)) this.loadPulls(this.view, cx, false, false);
    this.loadRelatedPull(cx);
    this.syncWebhooks(cx);
    if (this.repo && this.shown()) this.agentLinks?.refresh(cx);
    if (!this.shown()) this.pinMotion?.cancel();
    this.notices??=new GitNotices();
    const notice=this.notices.sync(cx,{enabled:this.shown(),repository:this.repo?.name,
      pending:Boolean(this.loading||(this.root&&!this.repo&&!this.pullError))});
    const t = theme(), busy = Boolean(this.loading || this.pullLoading);
    const pullsUrl = this.repo?.url ? `${this.repo.url.replace(/\/$/, '')}/pulls` : null;
    const canOpenPulls = Boolean(this.root && pullsUrl), linkScope = this.context, repoName = this.repo?.name;
    const toolCount = 2 + Number(Boolean(this.root));
    const sweep = this.shown() && this.ciSweep?.context === this.context ? this.ciSweep : null;
    return v_flex().id('changes').size_full().min_h(0).rounded(8).overflow_hidden().bg(t.background).border_1().border_color(t.input).text_color(t.foreground).text_size(U.font)
      .child(h_flex().id('changes-header').relative().bg(t.surface).h(U.section).flex_none().pl(4).pr(U.gutter).gap(U.gap).items_center().border_b(1).border_color(t.border)
        .on_hover((hovered, cx) => { this.headerHovered = hovered; cx.notify(); })
        .on_mouse_down('right', (_event, cx) => {
          cx.stop_propagation();
          if (canOpenPulls && this.root && this.context === linkScope && key() === linkScope) this.showPullMenu({url:pullsUrl,repo:repoName},cx,true);
        })
        .child(sidebarTitle(t, 'changes', 'git-title'))
        .child(h_flex().id('git-repo-slot').flex_1().min_w(0).pr(U.insetControl * toolCount + 4 * (toolCount - 1) + 16 - U.gutter).items_center()
          .when(Boolean(this.root && this.repo?.url && this.repo?.name), el=>el.child(div().id('git-repo-name').min_w(0).max_w_full().flex_shrink(1).truncate()
            .text_size(U.meta).text_color(t.dim).tooltip(this.repo.url).child(this.repo.name.split('/').at(-1)))))
        .child(reveal(headerTools(h_flex()).id('git-actions').bg(t.surface), this.headerHovered)
          .when(Boolean(this.root), el => el.child(refreshButton(t, { id: 'git-refresh', icon: 'mods/custom-changes/refresh.svg', label: 'Refresh', busy, spinning: Boolean(this.root), owner: this, scope: this.context,
            enabled: this.headerHovered && Boolean(this.root), size: U.insetControl, iconSize: U.tinyIcon, radius: U.insetRadius, color: t.dim, hover: subtleActionFill(t),
            onClick: (_e, cx) => {
              if (!this.root || this.loading || this.pullLoading) return;
              this.webhooks?.retryNow();this.notices?.retryNow();
              this.refresh(cx); this.loadPulls(this.view, cx, true);
            } })))
          .child(panelPin(t,{id:'git-pin',enabled:this.headerHovered}))
          .child(headerTool(t, { id: 'git-close', icon: 'mods/custom-pane/close.svg', label: 'Close Git panel', enabled: this.headerHovered, onClick: () => changePanel({open:false}) }))))
      .child(v_flex().id('git-panel-body').relative().flex_1().min_h(0)
      .child(h_flex().id('git-views').h(40).flex_none().px(4).gap(2).items_center().border_b(1).border_color(t.border)
        .child(this.segment(t, 'git-view-open', 'Open', this.counts?.open ?? this.pulls.open?.length ?? null, this.view === 'open', cx => this.setView('open', cx)))
        .child(this.segment(t, 'git-view-closed', 'Closed', this.counts?.closed ?? null, this.view === 'closed', cx => this.setView('closed', cx))))
      .child(this.renderPulls(t))
      .when(Boolean(notice), el => el.child(this.liveCIInfo(t,notice)))
      .when(Boolean(sweep), el => el.child(this.sweepLayer(t,sweep))));
  }
}
