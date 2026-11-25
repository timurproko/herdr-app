// Custom: GitHub pull requests for the repository under the focused folder.
import { View, div, svg, PathBuilder } from 'gpui-kit';
import { v_flex, h_flex } from 'gpui-base';
import * as base from 'gpui-base';
import { TaskReveal } from './task-reveal.js';
import { RowPresentations } from './row-presentation.js';
import { SidebarScrollState } from './sidebar-scroll.js';
import { topFade, bottomFade } from './scroll-fade.js';
import { U, headerTools, reveal, subtleActionFill, refreshButton, sidebarSectionHeader } from './ui.js';
import { exec, hc, theme, run, layout, openOverlay, closeOverlay, props, notify, nextCommand, window, settings } from './host.js';
import { location } from './location.js';
import { AgentLinks } from './agent-links.js';
import { AggregatePulls } from './aggregate.js';
import { GitWebhooks } from './webhooks.js';
import { GitNotices } from './notices.js';
import * as host from './host.js';
import { EnrollmentPicker } from './enrollment-picker.js';
import { labelColors } from './label-colors.js';
import { PinSwap, PIN_SWAP_MS } from './pin-swap.js';
import { panelPin } from './panel-pin.js';
import { openSettings } from './settings-dialog.js';
import { headerTool, contextMenu, panelMessage } from './panel-kit.js';
import { changePanel } from './panel-state.js';
import { sidebarPanelEnabled } from './plugins.js';
import { sidebarTitle } from './sidebar-title.js';
import { pullListArgs, REPO_ARGS, countArgs, parseCounts, parsePullPage, agentPullNumber, pullRow, pullError, PR_FIELDS, PR_PAGE_SIZE, repositoryRead, repositoryFailure, pendingChecksArgs, parsePendingChecks, refreshPullFacts, pullStateArgs, parsePullStates, pullPayload, pullRetryAfter, ChecksFallback, PullFactsOrder, CHECKS_BATCH_SIZE, STATE_BATCH_SIZE } from './pulls.js';

const VIEWS = ['open', 'closed'];
const VIEW_KEY = 'custom.git.view';
const FOLDED_REPOS_KEY = 'custom.git.task-repositories.folded';
const LOCAL_CONTEXT_TTL = 10000; // shell branch/footer only, never a GitHub poll
const CI_SWEEP_MS = 2400;
const CI_SWEEP_WIDTH = 96;
// The panel's 1px border plus this padding matches Spaces' 8px outer gutter.
const LIST_INSET = 7;
const TEXT_CACHE_LIMIT = 512;
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
    // Focus outlives render; the host forbids allocating handles in renderAggregate.
    this.enrollmentFocus = cx.focus_handle();
    this.headerHovered = false;
    this.agentLinks = new AgentLinks(() => sidebarPanelEnabled('changes'));
    let view = null;
    try { view = localStorage.getItem(VIEW_KEY); } catch {}
    this.view = VIEWS.includes(view) ? view : 'open';
    this.foldedRepositories = new Set();
    try {
      const folded = JSON.parse(localStorage.getItem(FOLDED_REPOS_KEY) ?? '[]');
      if (Array.isArray(folded)) this.foldedRepositories = new Set(folded.filter(repo => typeof repo === 'string').map(repo => repo.toLowerCase()));
    } catch {}
    // Old installations may have remembered the retired Changes tab.
    if (view !== this.view) try { localStorage.setItem(VIEW_KEY, this.view); } catch {}
    this.resetRepository();
    this.refresh(cx);
    cx.timer.every(LOCAL_CONTEXT_TTL, cx => {
      if (this.shown()) this.refresh(cx);
    });
  }

  close() {
    this.checksFallback?.stop();this.factOrder?.reset();
    this.enrollmentPicker?.stop();this.aggregate?.stop();this.webhooks?.stop();this.notices?.stop();
    this.rootRequest=null;this.pullRequest=null;this.relatedRequest=null;
    for(const metrics of this.ordinaryScroll?.values()??[])metrics.handle?.release();
    for(const handle of this.retiredOrdinaryHandles??[])handle.release();
    for(const window of this.taskWindows?.values()??[])window.handle?.release();
    for(const handle of this.retiredTaskHandles??[])handle.release();
  }

  resetRepository() {
    this.checksFallback?.stop();this.fallbackRequest=null;
    this.factOrder ??= new PullFactsOrder();this.factOrder.reset();
    this.ciRevision=(this.ciRevision??0)+1;
    // Native size callbacks fire on size changes, not data resets. Keep the
    // controller's geometry for these same element IDs across repository loads.
    this.pinMotion ??= new PinSwap(); this.pinMotion.cancel();
    this.pullPresentation = null; this.agentPress = null;
    this.root = null; this.repo = null; this.counts = null; this.branch = null; this.agentPull = null;
    this.pulls = { open: null, closed: null }; this.pullsAt = { open: 0, closed: 0 };this.pullDepth={open:0,closed:0};
    this.pages = {open:{cursor:null,hasMore:false,expanded:false},closed:{cursor:null,hasMore:false,expanded:false}};
    this.pageError = null; this.loadingState = null; this.appending = false; this.scrollMotion = null;
    this.selection = null; this.agentRequest = null; this.agentResolved = null;
    this.pinKey = null; this.pinRevealed = true;
    this.relatedKey = null; this.relatedPull = null; this.relatedRequest = null;this.relatedRetry=null;
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
        this.pinMotion.rebase(context); this.root = null;this.factOrder.reset();
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
      await Promise.resolve(); // spawn may begin inline during render
      if (!current()) return;
      try {
        const top = await exec('git', ['rev-parse', '--show-toplevel'], { cwd, on, timeout: 15000 });
        if (!current()) return;
        const abnormal = top.timed_out || top.timedOut || top.signal || top.code < 0 || top.code >= 0x80000000;
        const root = !abnormal && top.code === 0 ? top.stdout.trim() : null;
        const absent = !abnormal && top.code === 128 && /(?:^|\n)fatal: not a git repository(?:[ (:]|$)/i.test(top.stderr ?? '');
        // A timeout, failed spawn or unreadable mount is not proof that a known
        // repository disappeared. Retain its rows until we have a real result.
        if (!root && !absent) throw Error('Could not read repository; refresh to retry');
        const retained = root && this.pinMotion?.current?.context === context && this.pinMotion.current.repo === this.repo?.name;
        if (!root || (root !== this.root && !retained)) this.resetRepository();
        this.root = root;
        this.error = root ? null : 'Not a git repository';
        if (root) {
          // Resolve in the terminal's live folder/worktree, not the space's
          // launch folder. Detached HEAD has no related branch to highlight.
          const head = await exec('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd, on, timeout: 15000 }).catch(() => null);
          if (!current()) return;
          if (head && !head.timed_out && !head.timedOut && !head.signal && [0,1].includes(head.code)) {
            this.branch = head.code === 0 ? head.stdout.trim() || null : null;
          } else this.error = 'Could not read branch; refresh to retry';
          this.syncAgent(cx, true);
        }
      } catch {
        if (current()) this.error = 'Could not read repository; refresh to retry';
      } finally { if (this.rootRequest === request) this.loading = false; cx.notify(); }
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
        const screen = await Promise.resolve().then(()=>hc(['read', target.terminal, '--json', '--lines', '0'])).catch(() => null);
        if (!sidebarPanelEnabled('changes') || this.agentRequest !== request || this.context !== context || key() !== context || agentKey(location()) !== selection) return;
        this.agentPull = screen?.code === 0 ? agentPullNumber(screen.stdout, target.app) : null;
        this.agentResolved = selection;
      } finally { cx.notify(); }
    });
  }

  setView(view, cx) {
    if (!VIEWS.includes(view) || view === this.view) return;
    this.pinMotion?.cancel();this.enrollmentPicker?.stop();
    if(this.context?.startsWith('tasks:')){
      this.taskSelectionEpoch=(this.taskSelectionEpoch??0)+1;
      const selected=this.selectedTaskWindow;if(selected){selected.correction=null;selected.anchorMarker=null;selected.scheduledCorrection=null;}
    }
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
    const request = this.pullRequest = {},read=this.factOrder.begin();
    let repo=this.repo,repository=repo?.name;
    const current = () => sidebarPanelEnabled('changes') && this.pullRequest === request && this.root === root && this.context === context && key() === context && this.repo===repo && this.repo?.name===repository;
    this.pullLoading = true; this.loadingState = state; this.appending = append; this.pageError = null;
    if (notify) cx.notify();
    cx.spawn(async cx => {
      try {
        const gh = args => repositoryRead(exec, args, repository, { cwd: root, on, timeout: 30000 });
        if (!repo) {
          const r = await gh(REPO_ARGS);
          if (!current()) return;
          if (r.code !== 0 || r.timed_out || r.timedOut || r.signal) throw new Error(pullError(r));
          const value = JSON.parse(r.stdout || '{}');
          if (!value?.nameWithOwner) throw new Error('No GitHub repository');
          if (!current()) return;
          repo=this.repo={ name: value.nameWithOwner, owner: value.owner?.login ?? value.nameWithOwner.split('/')[0], url: value.url ?? `https://github.com/${value.nameWithOwner}` };
        }
        repository=repo.name;
        const list = await gh(pullListArgs(state, repository, after));
        // A refused obsolete read is not permission to start another request,
        // especially an account probe on the previous machine/repository.
        if (!current()) return;
        if (list.code !== 0 || list.timed_out || list.timedOut || list.signal) {
          if(!this.shown())return;
          throw Object.assign(new Error(),await repositoryFailure(exec,list,repository,{cwd:root,on}));
        }
        const page = parsePullPage(list.stdout);
        const rows = page.pulls.map(pr => this.publishPull(pullRow(pr,this.repo.owner),read).value).filter(Boolean);
        const incoming=new Map(rows.map(pr=>[pr.number,pr]));
        const existing = (append ? this.pulls[state] ?? [] : []).map(pr=>incoming.get(pr.number)??pr);
        const seen = new Set(existing.map(pr => pr.number));
        this.pulls[state] = [...existing, ...rows.filter(pr => !seen.has(pr.number))];
        this.pullDepth[state]=append?(this.pullDepth[state]||1)+1:1;
        this.reconcilePulls(rows);
        this.ciRevision=(this.ciRevision??0)+1;
        this.pages[state] = {cursor:page.cursor,hasMore:page.hasMore && page.cursor !== after,expanded:append};
        this.counts = page.counts ?? {...this.counts,[state]:page.total};
        this.pullsAt[state] = Date.now(); this.pullError = null;
        // All list and webhook reads share pullRequest/pullLoading: one writer.
        if (append) return;
        this.relatedKey = null;this.relatedRetry=null;
        // Real pages include both totals in the same GraphQL request, avoiding
        // another Node/gh launch. Retain compatibility with partial responses.
        const counts = page.counts ? null : await gh(countArgs(repository)).catch(() => null);
        if (!current()) return;
        this.counts = page.counts ?? (counts?.code===0?parseCounts(counts.stdout):null) ?? this.counts;
      } catch (e) {
        if (current()) {
          if (append) this.pageError = {state,message:pullError(e)};
          else { this.pullError = pullError(e); this.pullsAt[state] = Date.now(); }
        }
      } finally {
        await Promise.resolve(); // even a synchronous transport throw must yield
        if (this.pullRequest === request) { this.pullLoading = false; this.loadingState = null; this.appending = false; }
        this.flushWebhook(cx);
        cx.notify();
      }
    });
  }

  publishPull(pr,read,repo=this.repo?.name) {
    return this.factOrder.publish(read,`${repo.toLowerCase()}#${pr.number}`,()=>pr);
  }

  // A narrow read can change tabs without clearing the loaded pages or pin.
  // Preserve unaffected order; insert moved rows by the list's created-at order.
  reconcilePulls(values) {
    const updates=new Map(values.filter(Boolean).map(pr=>[pr.number,pr])),moved=new Map();
    const group=pr=>['open','draft'].includes(pr.state)?'open':'closed';
    for(const state of VIEWS)for(const old of this.pulls[state]??[]) {
      const pr=updates.get(old.number)??old;
      if(group(pr)!==state)moved.set(pr.number,pr);
    }
    for(const state of VIEWS) {
      const old=this.pulls[state];if(!old)continue;
      this.pullDepth[state]=Math.max(this.pullDepth[state]??0,Math.ceil(old.length/PR_PAGE_SIZE));
      const rows=old.map(pr=>updates.get(pr.number)??pr).filter(pr=>group(pr)===state);
      const seen=new Set(rows.map(pr=>pr.number));
      for(const pr of moved.values())if(group(pr)===state && !seen.has(pr.number)) {
        const index=rows.findIndex(row=>(Date.parse(row.createdAt)||row.number)<(Date.parse(pr.createdAt)||pr.number));
        rows.splice(index<0?rows.length:index,0,pr);seen.add(pr.number);
      }
      this.pulls[state]=rows;
    }
    if(this.relatedPull && updates.has(this.relatedPull.number))this.relatedPull=updates.get(this.relatedPull.number);
    // State changes can remove a cursor boundary. Renew expanded snapshots under
    // the existing lease, retaining the exact loaded depth even after removals.
    if(moved.size && VIEWS.some(state=>this.pages[state].hasMore))this.webhookDirty=true;
    return moved.size>0;
  }

  // Keep an explicitly linked PR pinnable even when it is older than page 1.
  // This one targeted lookup does not load earlier list pages or alter cursors.
  loadRelatedPull(cx) {
    const number = this.agentPull ?? location().pullNumber;
    // Related reads use the same lease as list, event and fallback snapshots.
    // Do not cache a selection that has not actually acquired the queue.
    if (!this.repo || !number || !this.shown() || this.pullLoading) return;
    const scope = JSON.stringify([this.context,this.repo.name,number]);
    if (this.relatedKey === scope || (this.relatedRetry?.scope===scope && this.relatedRetry.until>Date.now())) return;
    this.relatedKey = scope; this.relatedRequest = null;
    // Manual page-one refresh may need to re-read the older active PR. Keep its
    // pin mounted while that same-number replacement is pending or fails.
    if (this.relatedPull?.number !== number) this.relatedPull = null;
    const known = [...(this.pulls.open ?? []), ...(this.pulls.closed ?? [])].find(pr => pr.number === number);
    if (known) { this.relatedPull = known; return; }
    const context = this.context, repo = this.repo, root = this.root, on = this.on;
    const request = this.pullRequest = this.relatedRequest = {},read=this.factOrder.begin();
    this.pullLoading=true;
    const current = () => sidebarPanelEnabled('changes') && this.pullRequest===request && this.relatedRequest === request && this.relatedKey === scope && this.context === context
      && key() === context && this.shown() && (this.agentPull ?? location().pullNumber) === number;
    cx.spawn(async cx => {
      let accepted=false;
      try {
        await Promise.resolve();if(!current())return;
        const result = await exec('gh', ['pr','view',String(number),'--repo',repo.name,'--json',PR_FIELDS], {cwd:root,on,timeout:30000});
        if (!current() || result.code !== 0 || result.timed_out || result.timedOut || result.signal) return;
        const pr = JSON.parse(result.stdout);
        if (pr.number === number) {
          const published=this.publishPull(pullRow(pr,repo.owner),read,repo.name);accepted=published.accepted;
          if(published.value) {
            const previous=this.relatedPull;
            this.relatedPull=published.value;
            const moved=this.reconcilePulls([published.value]);
            if(moved || (previous && ['open','draft'].includes(previous.state)!==['open','draft'].includes(published.value.state)))this.webhookDirty=true;
          }
          if(accepted)this.ciRevision=(this.ciRevision??0)+1;
        }
      } catch {} finally {
        if(this.relatedRequest===request) {
          this.relatedRequest=null;
          if(!accepted && this.relatedKey===scope) {
            this.relatedKey=null;
            // A released cache key permits retry, not a render-driven hot loop.
            const retry=this.relatedRetry={scope,until:Date.now()+LOCAL_CONTEXT_TTL};
            cx.timer?.after(LOCAL_CONTEXT_TTL,view=>{
              if(this.relatedRetry!==retry)return;
              this.relatedRetry=null;if(this.shown())view.notify();
            });
          }
        }
        if(this.pullRequest===request)this.pullLoading=false;
        await Promise.resolve();this.flushWebhook(cx);cx.notify();
      }
    });
  }

  fallbackSnapshot() {
    const aggregate=this.aggregate,task=this.context?.startsWith('tasks:');
    const on=task?aggregate?.context?.machine:this.on;
    let online=!on;
    if(on)try {online=host.machines().some(m=>m.name===on && m.layout==='ready');}catch {}
    const enabled=this.shown() && online && (task
      ? !aggregate?.context?.stale && aggregate?.currentContext()?.scope===aggregate?.context?.scope
      : key()===this.context && Boolean(this.root && this.repo));
    const uncovered=name=>Boolean(this.notices?.active && this.notices.members?.get(name.toLowerCase())!==true);
    if(task) {
      const repositories=aggregate?.repositories()??[],rows=aggregate?.rows(this.view)??[];
      const sections=repositories.map(repo=>({repo,rows:rows.filter(pr=>pr.repo===repo),error:aggregate.readNotice(repo,this.view)})).filter(section=>section.rows.length || section.error);
      const paging=this.taskSections(sections,aggregate.context.scope);
      // The native host cannot reliably notify viewport motion. Safety covers
      // the entire revealed unfolded batch, never guessed pixel intersections.
      const shownRows=paging.revealedRows;
      return {enabled,scope:JSON.stringify([this.context,on,this.view,this.taskSelectionEpoch,paging.window.generation]),repositories:repositories.map(name=>({name,uncovered:uncovered(name),rows:shownRows.filter(pr=>pr.repo===name)}))};
    }
    const selection=this.pullSelection();
    return {enabled,scope:JSON.stringify([this.context,on,this.view,this.repo?.name]),repositories:this.repo?[{name:this.repo.name,uncovered:uncovered(this.repo.name),rows:[...selection.liveRows,...(selection.active?[selection.active]:[])]}]:[]};
  }

  syncChecksFallback(cx) {
    this.checksFallback ??= new ChecksFallback({snapshot:()=>this.fallbackSnapshot(),read:(repo,view,current)=>this.readPendingChecks(repo,view,current)});
    this.checksFallback.sync(cx);
  }

  async readPendingChecks(repo,cx,current) {
    const aggregate=this.context?.startsWith('tasks:')?this.aggregate:null;
    if(this.pullLoading || this.relatedRequest || aggregate?.busy)return {busy:true};
    const numbers=[...new Set(repo.rows.map(pr=>pr.number))],root=this.root,on=aggregate?aggregate.context.machine:this.on;
    const request=this.fallbackRequest={},order=aggregate?aggregate.factOrder:this.factOrder,read=order.begin();
    if(aggregate)aggregate.fallbackBusy=true;
    else {this.pullLoading=true;this.pullRequest=request;}
    let retryAfter=0,rateLimited=false;
    try {
      if(!current())return;
      const updates=new Map(),previous=new Map(repo.rows.map(pr=>[pr.number,pr]));let counts=null;
      const gh=async args=>{
        if(!current())throw Error('Obsolete safety read');
        const result=await repositoryRead(exec,args,repo.name,{...(root?{cwd:root}:{}),on,timeout:30000});
        if(!current())throw Error('Obsolete safety read');
        retryAfter=Math.max(retryAfter,pullRetryAfter(result));
        if(result.code!==0 || result.timed_out || result.timedOut || result.signal) {
          rateLimited=/rate.?limit|secondary.*limit|abuse|\b429\b/i.test(`${pullPayload(result.stdout)}\n${result.stderr??''}`) || /^HTTP[^\n]*\b429\b/im.test(result.stdout??'');
          throw Object.assign(new Error(),await repositoryFailure(exec,result,repo.name,{...(root?{cwd:root}:{}),on}));
        }
        return pullPayload(result.stdout);
      };
      for(let at=0;at<numbers.length;at+=STATE_BATCH_SIZE) {
        if(!current())return;
        const batch=numbers.slice(at,at+STATE_BATCH_SIZE),stdout=await gh(pullStateArgs(batch,repo.name,!aggregate && at===0));
        for(const [number,value] of parsePullStates(stdout,batch))updates.set(number,value);
        if(!aggregate && at===0) {
          counts=parseCounts(stdout);
          if(!Number.isInteger(counts?.open) || !Number.isInteger(counts?.closed))throw Error('Incomplete pull request counts');
        }
      }
      const changed=[];
      for(const [number,value]of updates) {
        const old=order.published.get(`${repo.name.toLowerCase()}#${number}`)?.value??previous.get(number);
        value.checks=value.checkSummary==null?null:old?.checks??null;
        if(value.checkSummary!=null && (old?.checksKnown!==true || (old?.headRefOid??null)!==(value.headRefOid??null) || (old?.checkSummary??old?.checks?.state??null)!==value.checkSummary))changed.push(number);
      }
      for(let at=0;at<changed.length;at+=CHECKS_BATCH_SIZE) {
        if(!current())return;
        const batch=changed.slice(at,at+CHECKS_BATCH_SIZE),details=parsePendingChecks(await gh(pendingChecksArgs(batch,repo.name)),batch);
        for(const [number,value]of details) {
          const probe=updates.get(number);
          if((probe.headRefOid??null)!==(value.headRefOid??null) || probe.state!==value.state || probe.isDraft!==value.isDraft)throw Error('Pull request changed during safety read');
          probe.checks=value.checks;
        }
      }
      if(!current())return;
      // Commit only a complete selection. Failed chunks retain every old row.
      let accepted=true;
      const update=pr=>{
        if(!updates.has(pr?.number))return pr;
        const published=order.publish(read,`${repo.name.toLowerCase()}#${pr.number}`,previous=>refreshPullFacts(previous??pr,updates.get(pr.number)));
        accepted=accepted && published.accepted;return published.value??pr;
      };
      if(aggregate) {
        for(const entry of aggregate.entries.values())if(entry.link.repo===repo.name && entry.pr) {
          entry.pr=update(entry.pr);
          const at=Date.parse(entry.pr.mergedAt??entry.pr.closedAt??'');
          entry.completedAt=at<=Date.now()?at:NaN;
        }
      } else {
        const refreshed=[...new Map([...VIEWS.flatMap(state=>this.pulls[state]??[]),...(this.relatedPull?[this.relatedPull]:[])].map(pr=>[pr.number,pr])).values()].map(update);
        this.reconcilePulls(refreshed);
        if(accepted)this.counts=counts;
      }
      this.ciRevision=(this.ciRevision??0)+1;
      return {failed:false};
    } catch(error) {
      return {failed:true,rateLimited:rateLimited || /rate.?limit|secondary.*limit|abuse|429/i.test(String(error)),retryAfter};
    } finally {
      if(this.fallbackRequest===request)this.fallbackRequest=null;
      if(aggregate) {aggregate.fallbackBusy=false;aggregate.pump(cx);cx.notify();}
      else if(this.pullRequest===request) {this.pullLoading=false;this.flushWebhook(cx);cx.notify();}
    }
  }

  syncTaskWebhooks(cx) {
    this.webhooks ??= new GitWebhooks();
    const aggregate=this.aggregate,scope=aggregate.context.scope;
    const repositories=[...new Set([...aggregate.entries.values()].map(e=>e.link.repo))].sort();
    this.webhooks.sync(cx,{enabled:this.shown() && !aggregate.context.stale && repositories.length>0,scope:JSON.stringify(['tasks',scope,repositories]),repositories,
      isCurrent:()=>this.shown() && !aggregate.context.stale && aggregate.currentContext()?.scope===scope && this.context===`tasks:${scope}`,
      onChange:(event,view)=> {
        if(!this.shown() || aggregate.currentContext()?.scope!==scope || this.context!==`tasks:${scope}`)return;
        aggregate.invalidate(event?.repository??null);aggregate.pump(view);this.startCISweep(view);
      }});
    if(!this.shown() || aggregate.context.stale)this.ciSweep=null;
  }

  syncWebhooks(cx) {
    this.webhooks ??= new GitWebhooks();
    const shown = this.shown(), context=this.context, repo=this.repo;
    if (shown && this.webhookShown === false && this.repo) this.webhookDirty = true;
    this.webhookShown = shown;
    this.webhooks.sync(cx, {enabled:shown && Boolean(this.repo),scope:JSON.stringify([this.context,this.repo?.name]),repository:this.repo?.name,
      isCurrent:()=>this.shown() && this.context===context && key()===context && this.repo===repo,
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
    // Related/older reads cannot overlap this snapshot's queue lease.
    const root=this.root,on=this.on,repo=this.repo,context=this.context;
    const request=this.pullRequest={},read=this.factOrder.begin();this.pullLoading=true;
    const current=()=>this.pullRequest===request && this.context===context && key()===context && this.repo===repo && this.shown();
    cx.spawn(async cx=>{
      await Promise.resolve(); // request feedback must not notify synchronously from render
      try {
        if(!current())return;
        this.startCISweep(cx);
        const gh=async args=>{
          if(!current())throw Error('Obsolete request');
          const r=await repositoryRead(exec,args,repo.name,{cwd:root,on,timeout:30000});
          if(!current())throw Error('Obsolete request');
          if(r.code!==0 || r.timed_out || r.timedOut || r.signal)throw Object.assign(new Error(),await repositoryFailure(exec,r,repo.name,{cwd:root,on}));
          return r.stdout;
        };
        const updates={};
        for(const state of VIEWS) {
          if(this.pulls[state]===null)continue;
          const depth=Math.max(1,this.pullDepth[state]??0,Math.ceil(this.pulls[state].length/PR_PAGE_SIZE));
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
        const counts=Object.values(updates).map(update=>update.page.counts).find(Boolean) ?? parseCounts(await gh(countArgs(repo.name)));
        if(!current())return;
        for(const [state,{rows,page}] of Object.entries(updates)) {
          this.pulls[state]=rows.map(pr=>this.publishPull(pr,read,repo.name).value).filter(Boolean);this.pullsAt[state]=Date.now();
          this.pages[state]={...this.pages[state],cursor:page.cursor,hasMore:page.hasMore};
        }
        if((this.agentPull ?? location().pullNumber)===number) {
          const published=related?this.publishPull(related,read,repo.name):null;
          this.relatedPull=published?.value??null;
          this.relatedKey=published?.accepted?JSON.stringify([context,repo.name,number]):null;
        }
        this.reconcilePulls([...VIEWS.flatMap(state=>this.pulls[state]??[]),...(this.relatedPull?[this.relatedPull]:[])]);
        this.counts=counts ?? this.counts;this.pullError=null;this.ciRevision=(this.ciRevision??0)+1;
        this.startCISweep(cx);
      } catch(e) { if(current()) {this.pullError=pullError(e);this.relatedKey=null;this.relatedRetry=null;} }
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
    const value = count ?? 0, text = value > 999 ? '999+' : String(value);
    const tooltip = count == null ? 'Count loading; showing 0' : value > 999 ? String(value) : null;
    return h_flex().id(id).h(U.control).px(8).gap(6).flex_none().items_center().rounded(U.radius).cursor_pointer()
      .role('button').accessibility_label(`${label}: ${count ?? 0}${count == null ? ' (loading)' : ''}`)
      .text_size(U.meta).text_color(on ? t.foreground : t.muted).when(on, el => el.font_semibold())
      .hover(s => s.bg(t.hover)).on_click((_e, cx) => onClick(cx))
      .child(div().id(`${id}-label`).flex_none().child(label))
      .child(div().id(`${id}-count-slot`).w(32).h(16).flex_none().flex().items_center()
        .child(div().id(`${id}-count`).w(32).min_w(32).max_w(32).flex_none().px(4).h(16).flex().items_center().justify_center().rounded_full()
          .bg(on ? t.selected : t.raised).text_size(10).font_medium().text_color(on ? t.foreground : t.muted)
          .when(Boolean(tooltip), el => el.tooltip(tooltip))
          .child(div().min_w(0).truncate().child(text))));
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
      return target ? div().id(`${interactive ? '' : 'swap-'}pr-agent-${pr.key}`).absolute().left(0).top((20-U.insetControl)/2)
        .size(U.insetControl).flex_none().flex().items_center().justify_center().rounded(U.insetRadius).text_color(t.foreground)
        .when(interactive, el=>el.cursor_pointer().role('button').accessibility_label(`Open related agent for ${pr.repo} #${pr.number}`)
          .hover(s=>s.bg(subtleActionFill(t))).on_mouse_down('left',(_e,cx)=>cx.stop_propagation())
          .on_click((_e,cx)=>{cx.stop_propagation();this.aggregate.focus(pr,target,scope);}))
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

  // Centre optically on the 11px lowercase text, not the line box/icons.
  // Relative positioning keeps the 3px layout slot and 6px gaps unchanged;
  // the 1.5 logical-pixel drop scales with native app zoom.
  metaSeparator(t) {
    return div().size(3).flex_none().relative().top(1.5).rounded_full().bg(t.muted);
  }

  labelPill(t, label, id) {
    this.rowPresentations ??= new RowPresentations();
    const {background,foreground,border} = this.rowPresentations.labelStyle(t,label.color,labelColors);
    // Border-box: 4px padding + 1px border preserves the original 5px inset.
    return h_flex().id(id).flex_none().min_w(0).max_w_full().h(18).px(4).border_1().border_color(border).rounded_full()
      .items_center().overflow_hidden().bg(background).text_color(foreground).tooltip(label.name)
      .child(div().min_w(0).overflow_hidden().whitespace_nowrap().child(label.name));
  }

  // Natural-width runs, with an optional right-anchored final group. Native
  // probes measure both sides together; only whole-line overflow shortens text.
  // Keep geometry by native element ID (not PR-data revision): unchanged sizes
  // need not be reported again by the host after a refresh or context switch.
  pullLine(t, id, items, clipOrder = []) {
    this.pullLineSizes ??= new Map();
    const sizes = this.pullLineSizes.get(id) ?? {};
    this.pullTextWidths ??= new Map();
    this.pullTextPending ??= new Set();
    this.pullTextRequests ??= new Map();
    const zoom = settings().zoom > 0 ? settings().zoom : 1;
    const context = this.context;
    const textKey = (item, short) => `${zoom}\0${item.kind}\0${short ? item.compactKey : item.measureKey}`;
    const keyed = this.context?.startsWith('tasks:') && items.every(item => item.measureKey != null);
    for (const item of items) for (const short of [false, ...(item.compact ? [true] : [])]) {
      const name = `${item.kind}-${short ? 'compact' : 'full'}`;
      if (keyed) sizes[name] = this.pullTextWidths.get(textKey(item, short));
    }
    const measure = (name, size, cx) => {
      if (this.context !== context || !this.shown() || !Number.isFinite(size.width) || (settings().zoom > 0 ? settings().zoom : 1) !== zoom) return;
      const width = size.width / zoom;
      if (Math.abs((sizes[name] ?? -1) - width) < 0.01) return;
      sizes[name] = width; this.pullLineSizes.set(id, sizes); cx.notify();
    };
    this.rowPresentations ??= new RowPresentations();
    const {widths,ready,compact,visible}=this.rowPresentations.layout(id,sizes,items,clipOrder);
    const line = h_flex().id(id).w_full().min_w(0).h(18).flex_none().gap(6).items_center()
      .overflow_hidden().line_height('18px').text_size(11).text_color(t.muted)
      .on_size_change((size, cx) => measure('available', size, cx))
      .children(visible.flatMap((index, at) => {
        const item=items[index];
        const node = item.render(compact.has(item.kind), false).flex_none()
          .when(ready && clipOrder.includes(item.kind), el => el.w(widths[index]));
        // The flexible slot owns only the free space, never the task/check
        // cells. There is one normal gap, but no dot, before assigned labels.
        if (item.trailing) return [h_flex().id(`${id}-right`).flex_1().min_w(0).h(18).justify_end().overflow_hidden().child(node)];
        return at ? [this.metaSeparator(t), node] : [node];
      }));
    // These absolute invisible children are outside the visible run, so their
    // text never adds a line, gap, hover target or horizontal reservation.
    const pending = items.flatMap(item => [false, ...(item.compact ? [true] : [])].flatMap(short => {
        const key = keyed ? textKey(item, short) : null;
        if (key && (this.pullTextWidths.has(key) || this.pullTextPending.has(key))) return [];
        let measurement;
        if (key) {
          this.pullTextPending.add(key);
          measurement=this.pullTextRequests.get(key);
          if (measurement == null) {
            measurement=this.pullTextSequence=(this.pullTextSequence??0)+1;
            this.pullTextRequests.set(key,measurement);
            if (this.pullTextRequests.size>TEXT_CACHE_LIMIT) this.pullTextRequests.delete(this.pullTextRequests.keys().next().value);
          }
        }
        return [h_flex().absolute().left(0).top(0).child(item.render(short, true).flex_none()
          .id(`${id}-probe-${item.kind}-${short ? 'compact' : 'full'}${key ? `-measure-${measurement}` : ''}`)
          .on_size_change((size, cx) => {
            if (this.context !== context || !this.shown() || !Number.isFinite(size.width) || (settings().zoom > 0 ? settings().zoom : 1) !== zoom) return;
            if (key) {
              if (this.pullTextRequests.get(key)!==measurement) return;
              this.pullTextRequests.delete(key);
              this.pullTextWidths.set(key, size.width / zoom);
              if (this.pullTextWidths.size > TEXT_CACHE_LIMIT) this.pullTextWidths.delete(this.pullTextWidths.keys().next().value);
            }
            measure(`${item.kind}-${short ? 'compact' : 'full'}`, size, cx);
          }))];
      }));
    const probes = pending.length ? div().id(`${id}-probes`).absolute().left(0).top(0).w(0).h(0).overflow_hidden().invisible()
      .text_size(11).line_height('18px').children(pending) : null;
    return {line, probes};
  }

  // Keep the innermost component if the native VM aborts before JS can catch.
  renderPart(component, build) {
    const previous=this.renderComponent;this.renderComponent=component;
    try { return build(); }
    catch(error) {
      if(this.reportedRenderError!==error) {
        this.reportedRenderError=error;
        console.error('[custom-changes] render failed',JSON.stringify({component,view:this.view,error:String(error?.message??error),stack:error?.stack??null}));
      }
      throw error; // Preserve the host's last-good-frame fallback.
    } finally { this.renderComponent=previous; }
  }

  pullRow(t, pr, ghost = false) {
    return this.renderPart(`pull-row:${pr.key??pr.number}`,()=>this.renderPullRow(t,pr,ghost));
  }

  renderPullRow(t, pr, ghost = false) {
    const prefix = ghost ? 'swap-' : '', rowId = pr.key ?? pr.number;
    const agentButton = this.agentButton(t, pr, !ghost);
    // Cache presentation by immutable fact identity; never retain native rows:
    // their event callbacks belong to the current native snapshot build.
    this.rowPresentations ??= new RowPresentations();
    const {facts:presentation,id:groupId}=this.rowPresentations.get(pr,this.context?.startsWith('tasks:')?3:Infinity,ghost);
    const {labels,labelNames}=presentation;
    const text = (kind, value, tooltip, probe) => div().id(groupId(kind, probe)).min_w(0).h(18)
      .overflow_hidden().whitespace_nowrap().tooltip(tooltip).child(value);
    const byline = this.pullLine(t, `${prefix}pr-byline-${rowId}`, [
      {kind:'number', measureKey:presentation.number, render:(_short, probe) => text('number', presentation.number, pr.meta ?? '', probe)},
      ...(pr.login ? [{kind:'author', measureKey:pr.login, render:(_short, probe) => text('author', pr.login, pr.meta ?? '', probe)}] : []),
      ...(pr.when ? [{kind:'time', measureKey:pr.when, compactKey:pr.compactWhen, compact:true, render:(short, probe) => text('time', short ? pr.compactWhen : pr.when, pr.meta ?? '', probe)}] : []),
    ], ['author']);
    byline.line.tooltip(pr.meta ?? '');
    const meta = this.pullLine(t, `${prefix}pr-meta-${rowId}`, [
      ...(pr.tasks ? [{kind:'tasks', measureKey:pr.tasks.label, compactKey:presentation.taskFraction, compact:true, render:(short, probe) => h_flex().id(groupId('tasks', probe)).min_w(0).h(18).gap(4).items_center()
        .tooltip(pr.tasks.label).child((probe ? div().size(U.tinyIcon) : this.taskIcon(t, pr.tasks)).flex_none())
        .child(div().flex_none().whitespace_nowrap().child(short ? presentation.taskFraction : pr.tasks.label))}] : []),
      ...(pr.checks ? [{kind:'checks', measureKey:pr.checks.label, render:(_short, probe) => {
        const color = pr.checks.state === 'success' ? t.ansi2 : pr.checks.state === 'failure' ? t.ansi1 : t.ansi3;
        const icon = pr.checks.state === 'success' ? svg('mods/custom-workspace-chrome/check.svg').size(U.tinyIcon).text_color(color)
          : pr.checks.state === 'failure' ? svg('mods/custom-workspace-chrome/x.svg').size(U.tinyIcon).text_color(color)
          : div().size(8).rounded_full().bg(color);
        return h_flex().id(groupId('checks', probe)).h(18).gap(4).items_center().tooltip(pr.checks.label)
          .child(div().id(groupId('check-icon', probe)).size(U.tinyIcon).flex_none().flex().items_center().justify_center().child(icon.flex_none()))
          .child(div().flex_none().whitespace_nowrap().underline().child(pr.checks.label));
      }}] : []),
      ...(pr.review ? [{kind:'review', measureKey:pr.review, render:(_short, probe) => text('review', presentation.review, presentation.review, probe).text_color(pr.review === 'approved' ? t.ansi2 : t.ansi1)}] : []),
      ...(labels.length ? [{kind:'labels', trailing:true, measureKey:presentation.labelKey, render:(_short, probe) => h_flex().id(groupId('labels', probe)).min_w(0).h(18).gap(4).items_center().justify_end().overflow_hidden()
        .tooltip(labelNames)
        .children(labels.map((label, index) => this.labelPill(t, label, `${groupId('label', probe)}-${index}`)))}] : []),
    ], ['review', 'labels']);
    meta.line.tooltip(presentation.tooltip);
    // Spaces' row padding (8) minus its trailing pill margin (5) leaves 3px inside the highlight.
    return h_flex().id(`${prefix}pr-${rowId}`).relative().w_full().h(74).flex_none().pl(8).pr(3).py(6).gap(U.gap).items_start().rounded(U.radius)
      .when(!ghost, el => el.cursor_pointer().role('button').accessibility_label(presentation.accessibility)
        .hover(s => s.bg(t.hover)).on_click(() => this.openPull(pr))
        .on_mouse_down('right', (_event, cx) => { cx.stop_propagation(); this.showPullMenu(pr, cx); })
        .when(!pr.key, el=>el.on_size_change(size => this.pinMotion?.measureRow(pr.number,size,settings().zoom))
          .on_mouse_move(event => this.pinMotion?.rowPointer(pr.number,event))))
      .child(div().id(`${prefix}pr-state-slot-${rowId}`).w(U.icon).h(20).flex_none().flex().items_center().child(this.pullIcon(t, pr)))
      .child(v_flex().flex_1().min_w(0).gap(3)
        .child(h_flex().id(`${prefix}pr-title-line-${rowId}`).w_full().min_w(0).h(20).flex_none().gap(4).items_center().line_height('20px')
          .child(div().id(`${prefix}pr-title-${rowId}`).flex_1().min_w(0).h(20).truncate().text_size(U.font).font_semibold().text_color(t.foreground).tooltip(pr.title).child(pr.title))
          .child(div().id(`${prefix}pr-agent-slot-${rowId}`).w(U.insetControl).h(20).flex_none().relative()
            .when(Boolean(agentButton), el => el.child(agentButton))))
        .child(byline.line).child(meta.line))
      .when(Boolean(byline.probes),el=>el.child(byline.probes))
      .when(Boolean(meta.probes),el=>el.child(meta.probes));
  }

  swapOverlay(t, swap) {
    return div().id(`pin-swap-${swap.id}`).absolute().inset_0().overflow_hidden()
      .on_mouse_down('left', (_e,cx) => cx.stop_propagation()).on_click((_e,cx) => cx.stop_propagation())
      .on_scroll_wheel((_e,cx) => { this.pinMotion.cancel(); cx.notify(); cx.stop_propagation(); })
      .on_size_change((_size,cx) => this.pinMotion.arm(swap,cx))
      .children([...swap.cards].reverse().map(card => div().id(`pin-swap-${swap.id}-${card.pr.number}`).absolute().left(LIST_INSET).right(LIST_INSET)
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

  ordinaryScrollState(state) {
    if(!this.ordinaryScroll || this.ordinaryScrollScope!==this.context) {
      this.retiredOrdinaryHandles??=[];for(const old of this.ordinaryScroll?.values()??[])if(old.handle)this.retiredOrdinaryHandles.push(old.handle);
      this.ordinaryScrollScope=this.context;this.ordinaryScroll=new Map();
    }
    let metrics=this.ordinaryScroll.get(state);
    if(!metrics) {
      metrics=new SidebarScrollState();this.ordinaryScroll.set(state,metrics);
    }
    if(this.selectedOrdinaryMetrics!==metrics) {
      this.selectedOrdinaryMetrics=metrics;
      metrics.measurement=this.ordinaryMeasureSequence=(this.ordinaryMeasureSequence??0)+1;
    }
    const zoom=settings().zoom>0?settings().zoom:1;
    const scale=metrics.zoom?zoom/metrics.zoom:1;
    if(metrics.zoom&&metrics.zoom!==zoom)metrics.awaitZoom=true;
    // This physical frame survives tab/context changes. Its unchanged native
    // dimensions will not be emitted again for a newly created tab state.
    metrics.setMetrics({offset:metrics.offset*scale,content:metrics.content*scale,
      viewport:this.ordinaryViewportHeight??metrics.viewport});
    metrics.zoom=zoom;
    return metrics;
  }

  sampleNativeScroll(metrics,handle,zoom) {
    if(metrics.awaitZoom||!handle?.offset||!handle?.viewport_size||!handle?.content_size)return false;
    try{
      const offset=handle.offset()?.y,viewport=handle.viewport_size()?.height,content=handle.content_size()?.height;
      if(!Number.isFinite(offset)||!Number.isFinite(viewport)||!Number.isFinite(content)||viewport<=0)return false;
      metrics.setMetrics({offset:offset*zoom,viewport:viewport*zoom,content:content*zoom});return true;
    }catch{return false;}
  }

  ordinaryHandle(metrics,cx) {
    for(const old of this.retiredOrdinaryHandles??[])old.release();this.retiredOrdinaryHandles=[];
    if(!metrics.handle&&base.ScrollHandle){metrics.handle=base.ScrollHandle.new();cx.notify();}
  }

  ordinaryMotion(metrics,cx) {
    if(!this.shown()||this.ordinaryScroll?.get(this.view)!==metrics)return;
    if(this.sampleNativeScroll(metrics,metrics.handle,metrics.zoom))metrics.update(cx);
  }

  measureOrdinaryViewport(size,cx) {
    if(!Number.isFinite(size.height))return;
    this.ordinaryViewportHeight=Math.max(0,size.height);
    const metrics=this.ordinaryScroll?.get(this.view);if(metrics){this.ordinaryHandle(metrics,cx);metrics.measure('viewport',size,cx);}
  }

  renderPulls(t) {
    const state = this.view, list = this.pulls[state], {liveRows,active} = this.pullSelection();
    const metrics=this.ordinaryScrollState(state), zoom=metrics.zoom, measurement=metrics.measurement;
    this.sampleNativeScroll(metrics,metrics.handle,zoom);
    this.pinMotion?.rebaseZoom?.(zoom);
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
      this.pinKey = pinKey;this.pinRevealSequence=(this.pinRevealSequence??0)+1;
    }
    const remaining = rows.filter(pr => pr !== pinned);
    const empty = this.error || this.pullError || (!this.root ? (this.loading ? 'Loading…' : 'No folder')
      : list === null ? 'Loading…' : `No ${state} pull requests`);
    return v_flex().id('pulls-body').relative().flex_1().min_h(0).overflow_hidden()
      .on_size_change((size, cx) => {
        const before = this.pinMotion?.bodySize?.width;
        this.pinMotion?.measureBody(size,settings().zoom);
        if (this.pinMotion?.bodySize?.width !== before) cx.notify();
      })
      .on_mouse_move(event => this.pinMotion?.bodyPointer(event))
      .when(Boolean(pinned), el => el
        .child(v_flex().id('active-pull').relative().flex_none().py(4).px(LIST_INSET)
          .child(div().id('active-pull-rail').absolute().left(0).top(0).bottom(0).w(2).bg(t.accent))
          .child(v_flex().id(`active-pull-content-${pinned.number}-${this.pinRevealSequence}`).w_full()
            .opacity(this.pinRevealed ? 1 : 0.75).transition('opacity', {duration:120,easing:'ease-out'})
            .on_size_change((_size, cx) => {
              if (this.pinKey === pinKey && !this.pinRevealed) { this.pinRevealed = true; cx.notify(); }
            })
            .child(this.pullRow(t, pinned).when(Boolean(swap), el => el.invisible()))))
        .child(div().id('active-pull-divider').h(1).flex_none().bg(t.border)))
      .child(v_flex().id('pulls-scroll-frame').relative().flex_1().min_h(0).overflow_hidden()
        .on_size_change((size,cx)=>this.measureOrdinaryViewport(size,cx))
        .on_scroll_wheel((event, cx) => {this.scrollMotionAt(event, 'wheel', state, cx);metrics.viewportMotion(event,'wheel',cx);this.ordinaryMotion(metrics,cx);})
        .on_mouse_move((event, cx) => {this.scrollMotionAt(event, 'move', state, cx);metrics.viewportMotion(event,'move',cx);this.ordinaryMotion(metrics,cx);})
        .child(v_flex().id(`pulls-list-${state}`).flex_1().min_h(0).overflow_y_scrollbar()
          .when(Boolean(metrics.handle),el=>el.track_scroll(metrics.handle))
          .child(v_flex().id(`pulls-content-${metrics.measurement}-${zoom}`).w_full().flex_none().gap(U.rowGap).py(4).px(LIST_INSET)
            .on_size_change((size,cx)=>{
              if(this.ordinaryScroll?.get(this.view)!==metrics || metrics.measurement!==measurement || (settings().zoom>0?settings().zoom:1)!==zoom)return;
              metrics.awaitZoom=false;this.ordinaryHandle(metrics,cx);metrics.measure('content',size,cx);
            })
            .on_scroll_wheel(event => {this.contentMotion(event, 'wheel', state);metrics.contentMotion(event,'wheel');})
            .on_mouse_move(event => {this.contentMotion(event, 'move', state);metrics.contentMotion(event,'move');})
            .children(remaining.map(pr => this.pullRow(t, pr)
              .when(Boolean(swap?.cards.some(card => card.pr.number === pr.number)), el => el.invisible())))
            .when(!rows.length, el => el.child(panelMessage(t, 'git-empty', { text: empty, loading: empty === 'Loading…', rowInset: 2 })))
            .when(Boolean(rows.length) && Boolean(this.error || this.pullError), el => el.child(div().id('git-read-error').px(8).py(4).text_size(11).text_color(t.ansi1).child(this.error || this.pullError)))
            .when(this.pageError?.state === state, el => el.child(div().px(8).py(4).text_size(11).text_color(t.ansi1).child(this.pageError.message)))
            .when(Boolean(this.pages[state]?.hasMore), el => el.child(div().id('pulls-more').p(8).text_size(11).text_color(t.dim)
              .role('button').accessibility_label('Load 10 more pull requests').disabled(this.pullLoading)
              .when(!this.pullLoading, el => el.cursor_pointer().hover(s => s.bg(t.hover)))
              .on_click((_event, cx) => { if (!this.pullLoading) this.morePulls(state, cx); })
              .child(this.pullLoading && this.loadingState === state ? 'Loading…' : this.pageError?.state === state ? 'Retry loading more' : 'Load 10 more')))))
        .when(metrics.moreAbove,el=>el.child(topFade(metrics,'pulls-list',t.background,{left:LIST_INSET,right:LIST_INSET})))
        .when(metrics.moreBelow,el=>el.child(bottomFade(metrics,'pulls-list',t.background,{left:LIST_INSET,right:LIST_INSET}))))
      .when(Boolean(swap), el => el.child(this.swapOverlay(t,swap)));
  }

  sweepLayer(t,sweep) {
    return div().id(`git-ci-track-${sweep.id}`).absolute().left(0).right(0).top(0).h(1).overflow_hidden()
      .on_size_change((size,cx)=>{if(size.width>0)sweep.width=size.width;this.armCISweep(sweep,cx);})
      .child(div().id('git-ci-line').absolute().top(0).h(1).w(CI_SWEEP_WIDTH).rounded_full().bg(t.accent).opacity(0.75)
        .left(sweep.phase==='moving'?sweep.width:-CI_SWEEP_WIDTH).transition('left',{duration:CI_SWEEP_MS,easing:'ease-in-out'}));
  }

  enrollmentPresentation() {
    const aggregate=this.aggregate,context=aggregate?.currentContext({presentation:true});
    if(!this.shown() || !context || context.stale || context.scope!==aggregate.context?.scope)return null;
    const notice=this.notices?.presentation(aggregate.repositories());
    if(!notice)return null;
    return {choices:notice.choices,key:JSON.stringify([context.scope,location(),this.view,notice.key])};
  }

  repositoryNameLabel(repo,scope) {
    this.repositoryNameSizes ??= new Map();
    const id=`task-repo-name-${scope}-${repo}`;
    let sizes=this.repositoryNameSizes.get(id);
    if(!sizes) {
      sizes={measurement:this.repositoryNameMeasureSequence=(this.repositoryNameMeasureSequence??0)+1};
      this.repositoryNameSizes.set(id,sizes);
    }
    const zoom=settings().zoom>0?settings().zoom:1;
    const overflowing=()=>Number.isFinite(sizes.available)&&Number.isFinite(sizes.intrinsic)&&sizes.intrinsic>sizes.available+0.5;
    const measure=(kind,size,cx)=>{
      if(!this.shown() || (settings().zoom>0?settings().zoom:1)!==zoom || this.repositoryNameSizes.get(id)!==sizes || this.aggregate?.currentContext({presentation:true})?.scope!==scope || !this.aggregate.repositories().includes(repo) || !Number.isFinite(size.width))return;
      const before=overflowing();sizes[kind]=size.width;this.repositoryNameSizes.set(id,sizes);
      if(before!==overflowing())cx.notify();
    };
    // A non-shrinking invisible flex child measures the same text's natural width.
    // Its absolute clipped parent cannot reserve width or add a line to the header.
    return div().id(id).flex_1().min_w(0).relative().overflow_hidden()
      .when(overflowing(),el=>el.tooltip(repo))
      .child(div().id(`${id}-available-${sizes.measurement}`).w_full().truncate().child(repo)
        .on_size_change((size,cx)=>measure('available',size,cx)))
      .child(div().absolute().left(0).top(0).flex().invisible()
        .child(div().id(`${id}-probe-${sizes.measurement}`).flex_none().whitespace_nowrap().child(repo)
          .on_size_change((size,cx)=>measure('intrinsic',size,cx))));
  }

  repositorySection(t, {repo, items}, scope, window) {
    const aggregate = this.aggregate, folded = this.foldedRepositories.has(repo);
    const header=items.find(item=>item.header), body=items.filter(item=>!item.header);
    return v_flex().id(`task-repo-${repo}`).w_full().flex_none()
      .when(Boolean(header),section=>section.child(div().flex_none().h(header.height+header.gap).child(sidebarSectionHeader(t, {id:`task-repo-header-${repo}`, label:repo, open:!folded, trailingSize:U.insetControl, trailingInset:3, children:[
        this.repositoryNameLabel(repo,scope),
      ]}).cursor_pointer().hover(s => s.bg(t.selected))
        .on_click((_e, cx) => {
          cx.stop_propagation();
          if (!this.shown() || aggregate.currentContext({presentation:true})?.scope !== scope || ![...aggregate.entries.values()].some(e => e.link.repo === repo)) return;
          this.foldedRepositories.has(repo) ? this.foldedRepositories.delete(repo) : this.foldedRepositories.add(repo);
          try { localStorage.setItem(FOLDED_REPOS_KEY, JSON.stringify([...this.foldedRepositories])); } catch {}
          cx.notify();
        }))))
      .when(!folded && body.length>0, el => el.child(v_flex().id(`task-repo-body-${repo}`).flex_none()
        .children(body.map(item=>div().id(`task-item-${item.key}`).flex_none().h(item.height+item.gap)
          .child(item.row ? this.pullRow(t,item.row) : this.renderPart(`repository-notice:${repo}`,()=>div().id(`task-error-${repo}`).flex_none().w_full()
            .child(div().id(`task-notice-measure-${window.measurement}-${encodeURIComponent(item.measureKey)}`).flex_none().w_full().px(8).py(4).text_size(U.meta).text_color(t.ansi1).child(item.error)
            .on_size_change((size,cx)=>{
              if(!this.taskWindowCurrent(window,scope) || !window.items.some(current=>current.measureKey===item.measureKey) || !Number.isFinite(size.height))return;
              const height=size.height/window.zoom;
              if(window.noticeHeights.get(item.measureKey)===height)return;
              window.noticeHeights.set(item.measureKey,height);cx.notify();
            }))))))));
  }

  taskSections(sections, scope) {
    const key=`${scope}\0${this.view}`;
    if(this.taskWindowScope!==scope) {
      this.retiredTaskHandles=[...(this.retiredTaskHandles??[]),...[...(this.taskWindows?.values()??[])].flatMap(window=>window.handle?[window.handle]:[])];
      this.taskWindows=new Map();this.taskWindowScope=scope;
    }
    let window=this.taskWindows.get(key);
    if(!window) {
      window=new TaskReveal();window.key=key;window.metrics=new SidebarScrollState();
      window.measurement=this.taskMeasureSequence=(this.taskMeasureSequence??0)+1;
      this.taskWindows.set(key,window);
    }
    if(this.selectedTaskWindow!==window) {
      this.selectedTaskWindow=window;this.taskSelectionEpoch=(this.taskSelectionEpoch??0)+1;
      window.correction=null;window.anchorMarker=null;window.scheduledCorrection=null;
    }
    const zoom=settings().zoom||1;
    if(window.zoom && window.zoom!==zoom) {
      window.metrics.awaitZoom=true;
      // Retained native scrolling is logical-pixel based; paired event bounds
      // are window pixels. Rebase cached metrics before new zoom callbacks.
      window.metrics.setMetrics({offset:window.offset*zoom,content:window.contentHeight*zoom});
      // The frame is measured in physical pixels and can stay exactly the
      // same size during zoom. Do not rescale a measurement that will not fire.
      window.viewport=window.metrics.viewport/zoom;
    }
    window.zoom=zoom;
    if(this.sampleNativeScroll(window.metrics,window.handle,zoom))window.observe(window.metrics.offset/zoom,window.metrics.viewport/zoom,true);
    window.project(sections,this.foldedRepositories,U.control,U.rowGap,`${zoom}:${window.width??0}`);
    const range=window.range(),visible=[];
    for(const item of range.items) {
      let section=visible.at(-1);
      if(section?.repo!==item.repo) {section={repo:item.repo,items:[],rows:[]};visible.push(section);}
      section.items.push(item);if(item.row)section.rows.push(item.row);
    }
    return {...range,sections:visible,window,key};
  }

  taskWindowCurrent(window,scope) {
    return this.shown() && this.aggregate?.currentContext({presentation:true})?.scope===scope
      && this.taskWindows?.get(`${scope}\0${this.view}`)===window;
  }

  taskMeasure(window,scope,which,size,cx,zoom=window.zoom) {
    if(!this.taskWindowCurrent(window,scope) || (which==='content' && window.zoom!==zoom))return;
    // Handles are created after layout, never in render; they retain the same
    // native list's position across appends and same-home refreshes.
    if(!window.handle && base.ScrollHandle) {window.handle=base.ScrollHandle.new();cx.notify();}
    if(which==='viewport' && window.width!==size.width) {window.width=size.width;cx.notify();}
    if(which==='content')window.metrics.awaitZoom=false;
    window.metrics.measure(which,size,cx);
    this.sampleNativeScroll(window.metrics,window.handle,window.zoom);
    window.observe(window.metrics.offset/window.zoom,window.metrics.viewport/window.zoom,true);
    this.tryTaskReveal(window,cx);
  }

  tryTaskReveal(window,cx,ahead=0,onlyFit=false) {
    const metrics=window.metrics,serial=window.renderSerial??0,expected=window.contentHeight*window.zoom;
    if(window.revealedSerial===serial || !window.more || window.atCap || metrics.viewport<=0 || metrics.content<=0)return false;
    // Do not append repeatedly against the previous batch's native layout.
    if(Math.abs(metrics.content-expected)>2 && !(metrics.content<=metrics.viewport+1&&expected<=metrics.viewport+1))return false;
    if(onlyFit?metrics.content>metrics.viewport+1:metrics.max-metrics.offset>120+ahead)return false;
    if(!window.revealMore())return false;
    window.revealedSerial=serial;cx.notify();return true;
  }

  scheduleTaskLayout(window,scope,cx) {
    const epoch=this.taskSelectionEpoch,key=[window.measurement,window.generation,window.limit,window.metrics.viewport,epoch].join(':');
    if(window.layoutCheck===key)return;window.layoutCheck=key;
    cx.spawn(async cx=>{
      await Promise.resolve();
      if(!this.taskWindowCurrent(window,scope)||this.taskSelectionEpoch!==epoch||window.layoutCheck!==key)return;
      cx.timer?.after(16,view=>{
        if(!this.taskWindowCurrent(window,scope)||this.taskSelectionEpoch!==epoch||window.layoutCheck!==key)return;
        this.sampleNativeScroll(window.metrics,window.handle,window.zoom);
        window.observe(window.metrics.offset/window.zoom,window.metrics.viewport/window.zoom,true);
        window.metrics.update(view);this.tryTaskReveal(window,view,0,true);
      });
    });
  }

  taskViewportMotion(window,scope,event,kind,cx) {
    if(!this.taskWindowCurrent(window,scope))return;
    const native=this.sampleNativeScroll(window.metrics,window.handle,window.zoom);
    if(!native)window.metrics.viewportMotion(event,kind,cx);else window.metrics.update(cx);
    window.anchorMarker=null;
    window.observe(window.metrics.offset/window.zoom,window.metrics.viewport/window.zoom);
    const ahead=native&&kind==='wheel'?Math.max(0,-(event.delta?.y??0)):0;
    this.tryTaskReveal(window,cx,ahead);
  }

  nextTaskChunk(window,scope,cx) {
    if(!this.taskWindowCurrent(window,scope) || !window.canTurn)return;
    window.handle?.release();window.handle=null;window.anchorMarker=null;window.nextChunk();
    window.measurement=this.taskMeasureSequence=(this.taskMeasureSequence??0)+1;
    window.metrics.setMetrics({offset:0,content:window.contentHeight*window.zoom});
    cx.notify();
  }

  applyTaskAnchor(window,scope,cx) {
    if(this.retiredTaskHandles?.length) {
      const retired=this.retiredTaskHandles;this.retiredTaskHandles=[];
      cx.spawn(async()=>{await Promise.resolve();for(const handle of retired)handle.release();});
    }
    const correction=window.correction;
    if(!correction || !window.handle || window.scheduledCorrection===correction)return;
    window.scheduledCorrection=correction;const epoch=this.taskSelectionEpoch;
    cx.spawn(async cx=>{
      await Promise.resolve();
      if(!this.taskWindowCurrent(window,scope) || this.taskSelectionEpoch!==epoch || window.correction!==correction)return;
      window.handle.scroll_to_item(1);
      window.anchorMarker=correction;window.correction=null;
      window.metrics.setMetrics({offset:correction.to*window.zoom,content:window.contentHeight*window.zoom});
      window.metrics.update(cx,true); // scroll_to_item queues layout, never a repaint.
    });
  }

  renderAggregate(cx,t) {
    // Dedupe only within this snapshot; unacknowledged probes retry next frame.
    this.pullTextPending = new Set();
    if (this.pullTextScope!==this.context) {this.pullTextRequests=new Map();this.pullTextScope=this.context;}
    const aggregate=this.aggregate,counts=aggregate.counts(),scope=aggregate.context.scope;
    const hasInventory=[...aggregate.entries.values()].some(e=>e.pr),verifying=aggregate.context.stale && !hasInventory;
    const verificationHint='Fleet status is unverified; actions are paused until fresh verification' + (aggregate.context.verification
      ? `\n${aggregate.context.verification.reason} at ${new Date(aggregate.context.verification.at).toISOString()} (generation ${aggregate.context.verification.generation})` : '');
    // Membership is cross-tab: enrollment and updates must retain hidden sections.
    const repositories=aggregate.repositories(), rows=aggregate.rows(this.view);
    const sections=repositories.map(repo=>({repo,rows:rows.filter(pr=>pr.repo===repo),error:aggregate.readNotice(repo,this.view)}))
      .filter(section=>section.rows.length || section.error);
    if(this.repositoryNameSizes){
      const ids=new Set(repositories.map(repo=>`task-repo-name-${scope}-${repo}`));
      for(const id of this.repositoryNameSizes.keys())if(!ids.has(id))this.repositoryNameSizes.delete(id);
    }
    const paging=this.taskSections(sections,scope), taskWindow=paging.window, taskZoom=taskWindow.zoom;
    taskWindow.renderSerial=(taskWindow.renderSerial??0)+1;
    this.applyTaskAnchor(taskWindow,scope,cx);
    this.scheduleTaskLayout(taskWindow,scope,cx);
    const anchor=taskWindow.correction??taskWindow.anchorMarker;
    this.notices ??= new GitNotices();
    const notices=new Map(repositories.map(repo=>[repo,this.notices.sync(cx,{enabled:this.shown() && !aggregate.context.stale,repository:repo})]));
    const setup=repositories.length ? [...notices.values()].includes('setup') : this.notices.sync(cx,{enabled:this.shown() && !aggregate.context.stale,repository:null})==='setup';
    this.enrollmentPicker ??= new EnrollmentPicker({focus:this.enrollmentFocus,current:()=>this.enrollmentPresentation(),
      onChoose:repository=>openSettings({section:'plugins',plugin:'git',pluginSection:'repository',pluginSearch:repository})});
    const enrollment=this.enrollmentPicker.render(t,setup?null:this.enrollmentPresentation());
    this.syncChecksFallback(cx);
    const sweep=!aggregate.context.stale && this.shown() && this.ciSweep?.context===this.context ? this.ciSweep : null;
    return v_flex().id('changes').relative().size_full().min_h(0).rounded(8).overflow_hidden().bg(t.background).border_1().border_color(t.input).text_color(t.foreground).text_size(U.font)
      .child(h_flex().id('changes-header').relative().bg(t.surface).h(U.section).flex_none().pl(4).pr(U.gutter).gap(U.gap).items_center().border_b(1).border_color(t.border)
        .on_hover((hovered,view)=>{this.headerHovered=hovered;view.notify();})
        .child(sidebarTitle(t,'changes','git-title'))
        .when(aggregate.context.stale && hasInventory, el=>el.child(div().id('git-task-stale').flex_none().text_size(U.meta).text_color(t.dim)
          .child('Stale').tooltip(verificationHint)))
        .child(reveal(headerTools(h_flex()).id('git-actions').bg(t.surface),this.headerHovered)
          .child(refreshButton(t,{id:'git-refresh',icon:'mods/custom-changes/refresh.svg',label:'Refresh',busy:aggregate.busy,spinning:aggregate.busy,
            owner:this,scope:this.context,enabled:this.headerHovered,size:U.insetControl,iconSize:U.tinyIcon,radius:U.insetRadius,color:t.dim,hover:subtleActionFill(t),
            onClick:(_e,view)=>{if(aggregate.context?.scope===scope && !aggregate.busy) {this.webhooks?.retryNow();this.notices?.retryNow();aggregate.refresh(view);}}}))
          .child(panelPin(t,{id:'git-pin',enabled:this.headerHovered}))
          .child(headerTool(t,{id:'git-close',icon:'mods/custom-pane/close.svg',label:'Close Git panel',enabled:this.headerHovered,onClick:()=>changePanel({open:false})}))))
      .child(h_flex().id('git-views').h(40).flex_none().px(4).gap(2).items_center().border_b(1).border_color(t.border)
        .child(this.segment(t,'git-view-open','Open',counts.open,this.view==='open',view=>this.setView('open',view)))
        .child(this.segment(t,'git-view-closed','Closed',counts.closed,this.view==='closed',view=>this.setView('closed',view))))
      .child(v_flex().id('task-pulls-scroll').relative().flex_1().min_h(0).overflow_hidden()
        .child(v_flex().id(`task-pulls-frame-${scope}-${this.view}-${taskWindow.measurement}`).relative().flex_1().min_h(0).overflow_hidden()
          .on_size_change((size,cx)=>this.taskMeasure(taskWindow,scope,'viewport',size,cx))
          .on_scroll_wheel((event,cx)=>this.taskViewportMotion(taskWindow,scope,event,'wheel',cx))
          .on_mouse_move((event,cx)=>this.taskViewportMotion(taskWindow,scope,event,'move',cx))
          .child(v_flex().id(`task-pulls-list-${scope}-${this.view}${taskWindow.chunk?`-${taskWindow.chunk}`:''}`).flex_1().min_h(0).overflow_y_scrollbar()
            .when(Boolean(taskWindow.handle),el=>el.track_scroll(taskWindow.handle))
            .child(v_flex().id(`task-pulls-content-${taskWindow.measurement}-${taskWindow.zoom}`).w_full().flex_none().py(4).px(LIST_INSET)
              .on_size_change((size,cx)=>this.taskMeasure(taskWindow,scope,'content',size,cx,taskZoom))
              .on_scroll_wheel(event=>taskWindow.metrics.contentMotion(event,'wheel'))
              .on_mouse_move(event=>taskWindow.metrics.contentMotion(event,'move'))
              .children(paging.sections.map(section => this.renderPart(`repository-section:${section.repo}`,()=>this.repositorySection(t, section, scope,taskWindow))))
              .when(taskWindow.canTurn,el=>el.child(div().id('task-pulls-more').h(28).flex_none().px(8).text_size(U.meta).text_color(t.dim).cursor_pointer().role('button')
                .accessibility_label(taskWindow.more?'Show more task pull requests':'Show first task pull requests again')
                .tooltip(taskWindow.more?'Show the next mounted batch':'Return to the first mounted batch')
                .on_click((_event,cx)=>this.nextTaskChunk(taskWindow,scope,cx)).child('Show more')))
              .when(!sections.length,el=>el.child(panelMessage(t,'git-task-empty',{text:verifying || aggregate.busy?'Loading':`No ${this.view} pull requests`,loading:verifying || aggregate.busy,rowInset:2})
                .when(verifying,message=>message.tooltip(verificationHint)))))
            .when(Boolean(anchor),el=>el.child(div().id('task-pulls-anchor').absolute().left(0).w(1).h(1)
              .top(anchor.to+(anchor.to>anchor.from?taskWindow.viewport-1:0)))))
          .when(taskWindow.metrics.moreAbove,el=>el.child(topFade(taskWindow.metrics,'task-pulls-list',t.background,{left:LIST_INSET,right:LIST_INSET})))
          .when(taskWindow.metrics.moreBelow,el=>el.child(bottomFade(taskWindow.metrics,'task-pulls-list',t.background,{left:LIST_INSET,right:LIST_INSET})))))
      .when(setup,el=>el.child(this.liveCIInfo(t)))
      .when(Boolean(enrollment),el=>el.child(enrollment))
      .when(Boolean(sweep),el=>el.child(this.sweepLayer(t,sweep).top(U.section)));
  }

  liveCIInfo(t,kind='setup',capturedRepository=null) {
    const text=kind==='repository'?'Add this repo in':'Set up Git in';
    const repository=kind==='repository' ? capturedRepository ?? this.repo?.name ?? null : null;
    const id=capturedRepository ? `git-live-ci-${capturedRepository}` : 'git-live-ci';
    return div().id(`${id}-footer`).flex_none().py(4).px(LIST_INSET).border_t(1).border_color(t.border)
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
    this.pullTextPending = new Set();
    // QuickJS's deadline interrupt is deliberately uncatchable. A surviving
    // marker on the next attempt is evidence of an aborted frame, not its cause.
    if(this.renderAttempt) console.error('[custom-changes] previous render did not complete',JSON.stringify({component:this.renderComponent??'panel',view:this.view,error:'Native interruption or aborted render; consult the host error banner/log for the exact error'}));
    this.renderAttempt=true;this.reportedRenderError=null;
    try {
      const tree=this.renderPart('panel',()=>this.renderPanel(cx));
      this.renderAttempt=false;
      return tree;
    } catch(error) { this.renderAttempt=false;throw error; }
  }

  renderPanel(cx) {
    if (!sidebarPanelEnabled('changes')) {
      this.enrollmentPicker?.stop();this.webhooks?.stop();this.notices?.stop();this.aggregate?.stop();
      this.resetRepository(); this.rootRequest = null; this.loading = false; this.context = null;
      return div();
    }
    if (this.pullMenu) return this.renderPullMenu(theme());
    if (this.renderPart('coordinator-context',()=>this.syncAggregate(cx))) return this.renderPart('coordinator',()=>this.renderAggregate(cx,theme()));
    this.enrollmentPicker?.stop();
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
    this.syncChecksFallback(cx);
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
