// Custom: GitHub pull requests for the repository under the focused folder.
import { View, div, svg, PathBuilder } from 'gpui-kit';
import { v_flex, h_flex } from 'gpui-base';
import * as base from 'gpui-base';
import { TaskReveal } from './task-reveal.js';
import { RowPresentations } from './row-presentation.js';
import { SidebarScrollState } from './sidebar-scroll.js';
import { topFade, bottomFade } from './scroll-fade.js';
import { U, headerTools, reveal, subtleActionFill, refreshButton, sidebarSectionHeader, sidebarNumericSlot } from './ui.js';
import { exec, hc, theme, run, layout, openOverlay, closeOverlay, props, notify, nextCommand, window, settings } from './host.js';
import { location } from './location.js';
import { AgentLinks } from './agent-links.js';
import { AggregatePulls } from './aggregate.js';
import { Publication } from './presentations.js';
import { GitWebhooks } from './webhooks.js';
import { GitNotices } from './notices.js';
import * as host from './host.js';
import { EnrollmentPicker } from './enrollment-picker.js';
import { labelColors } from './label-colors.js';
import { PinSwap, PIN_SWAP_MS } from './pin-swap.js';
import { panelPin } from './panel-pin.js';
import { openSettings } from './settings-dialog.js';
import { headerTool, contextMenu } from './panel-kit.js';
import { changePanel } from './panel-state.js';
import { sidebarPanelEnabled } from './plugins.js';
import { sidebarTitle } from './sidebar-title.js';
import { stageLabels, REPO_ARGS, countArgs, parseCounts, agentPullNumber, pullError, PR_PAGE_SIZE, gitReads, repositoryRead, repositoryFailure, quietRead, retryRead, readPullPage, readTargetPulls, rememberPull, retimePull, pendingChecksArgs, parsePendingChecks, refreshPullFacts, pullStateArgs, parsePullStates, pullPayload, pullRetryAfter, ChecksFallback, PullFactsOrder, CHECKS_BATCH_SIZE, stateBatches, needsChecks } from './pulls.js';

const VIEWS = ['open', 'closed'];
const VIEW_KEY = 'custom.git.view';
const FOLDED_REPOS_KEY = 'custom.git.task-repositories.folded';
const LOCAL_CONTEXT_TTL = 10000; // shell branch/footer only, never a GitHub poll
const BREATHE_MS = 2400;
// The panel's 1px border plus this padding matches Spaces' 8px outer gutter.
const LIST_INSET = 7;
const TEXT_CACHE_LIMIT = 512;
const STAGE_CONTROL_OFFSET = 50; // 6px inset + title/byline and their gaps.
function find(node, id) { return node?.id === id ? node : (node?.children ?? []).map(c => find(c, id)).find(Boolean); }
// Repository data survives agent/tab changes in the same machine and folder.
const folderKey = ({cwd,on}) => JSON.stringify([cwd,on]);
const key = () => folderKey(location());
const agentKey = target => JSON.stringify(target);
const ROOT_INTERRUPTED='Repository read interrupted; refresh to retry';

export default class Changes extends View {
  init(_props, cx) {
    const menu = props()?.pullMenu;
    if (menu) {
      this.pullMenu = menu;
      this.menuHandle = cx.focus_handle();
      this.menuHandle.focus();
      return;
    }
    this.enableReadDiagnostics();
    // Focus outlives render; the host forbids allocating handles in renderAggregate.
    this.enrollmentFocus = cx.focus_handle();
    this.headerHovered = false;
    this.agentLinks = new AgentLinks(() => this.shown());
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

  enableReadDiagnostics() {
    // GitReads invokes this best-effort sink only after yielding. Evidence is
    // local runtime state, never a preference or read/action authorization.
    gitReads(exec).onDiagnostic=record=>{
      const key='custom.git.read-diagnostics',state=host.shared(key);
      const entries={...(state?.version===1?state.entries:{})},prior=entries[record.key];
      if(prior && (prior.startedAt>record.startedAt || prior.startedAt===record.startedAt && prior.attempt>record.attempt))return;
      entries[record.key]=record;
      const bounded=Object.entries(entries).sort((a,b)=>b[1].at-a[1].at).slice(0,128);
      host.setShared(key,{version:1,entries:Object.fromEntries(bounded)});
    };
  }

  close() {
    this.renderClosed=true;this.renderAttempt=null;this.agentPresentation=null;
    this.checksFallback?.stop();this.factOrder?.reset();
    this.enrollmentPicker?.stop();this.aggregate?.stop();this.webhooks?.stop();this.notices?.stop();
    this.rootRequest=null;this.pullRequest=null;this.relatedRequest=null;
    for(const metrics of this.ordinaryScroll?.values()??[])metrics.handle?.release();
    for(const handle of this.retiredOrdinaryHandles??[])handle.release();
    for(const window of this.taskWindows?.values()??[])window.handle?.release();
    for(const handle of this.retiredTaskHandles??[])handle.release();
  }

  readEpoch() {try{return host.shared('custom.git.presentation-generation')??0;}catch{return 0;}}
  repositoryOnline() {if(!this.on)return true;try{return host.machines().some(m=>m.name===this.on && m.layout==='ready');}catch{return false;}}

  // A restored root belongs to the cached presentation, not this destination.
  entryRootPending() {return this.entryVerify && (this.loading || !this.entryRootReady);}

  rememberRepository() {
    const memory=this.aggregate?.presentations;
    if(!memory || !this.repo || !this.root || this.context?.startsWith('tasks:') || this.repositoryGeneration!==this.aggregate.presentationGeneration)return;
    const value=this.repositoryPublication?.value;
    if(!value)return;
    const id=JSON.stringify(['repository',this.on??null,this.repo.name.toLowerCase()]);
    memory.set(id,value);memory.rememberFolder(this.entryCwd??this.root,this.on,this.repo.name);
  }

  repositorySnapshot() {
    return {repository:true,on:this.on??null,root:this.root,repo:{...this.repo},seed:Boolean(this.entrySeed),seedTabs:{...this.seedTabs},
      pulls:Object.fromEntries(VIEWS.map(state=>[state,this.pulls[state]?[...this.pulls[state]]:null])),counts:this.counts?{...this.counts}:null,
      source:this.entrySource??null,pages:Object.fromEntries(VIEWS.map(state=>[state,{...this.pages[state]}])),pullDepth:{...this.pullDepth},pullsAt:{...this.pullsAt}};
  }

  commitRepository() {
    this.repositoryPublication??=new Publication();
    if(this.repo && VIEWS.some(state=>this.pulls[state]!==null))this.repositoryPublication.commit(this.repositorySnapshot());
  }

  sourceCurrent(source) {
    if(!source?.parent)return false;
    const context=this.aggregate?.currentContext?.({presentation:true,space:source.parent});
    return context?.scope===source.scope && (context.machine??null)===(source.machine??null)
      && (context.presentationGeneration??0)===(source.providerGeneration??0);
  }

  restoreRepository(target,name) {
    const saved=this.aggregate?.presentations?.repository?.(target.on,name,source=>this.sourceCurrent(source));
    if(!saved)return;
    this.root??=saved.root??null;this.repo={...saved.repo};this.counts=saved.counts?{...saved.counts}:null;
    this.pulls=Object.fromEntries(VIEWS.map(state=>[state,saved.pulls[state]?.map(pr=>retimePull(pr))??null]));
    if(saved.pages)this.pages=Object.fromEntries(VIEWS.map(state=>[state,{...saved.pages[state]}]));
    if(saved.pullDepth)this.pullDepth={...saved.pullDepth};
    this.pullsAt={...saved.pullsAt??{open:0,closed:0}};
    this.entrySeed=Boolean(saved.seed);this.seedTabs={...saved.seedTabs??{open:Boolean(saved.seed),closed:Boolean(saved.seed)}};this.entrySource=saved.source??null;this.entryRefreshing=true;this.entryVerify=true;
    this.repositoryPublication=new Publication(this.repositorySnapshot());
  }

  resetRepository({preserveRootRetry=false}={}) {
    const retryingRoot=preserveRootRetry&&this.orphanReadRetries?.has('root');
    this.orphanReadRetries=new Set(retryingRoot?['root']:[]);this.rootRetryAuthorized=false;
    this.checksFallback?.stop();this.fallbackRequest=null;this.readWake=null;this.manualRead=null;
    this.factOrder ??= new PullFactsOrder();this.factOrder.reset();
    this.ciRevision=(this.ciRevision??0)+1;
    // Native size callbacks fire on size changes, not data resets. Keep the
    // controller's geometry for these same element IDs across repository loads.
    this.pinMotion ??= new PinSwap(); this.pinMotion.cancel();
    this.pullPresentation = null; this.agentPress = null;
    this.repositoryPublication=new Publication();this.entrySeed=false;this.seedTabs={open:false,closed:false};this.entrySource=null;this.entryRefreshing=false;this.entryAttempted=false;this.entryRootReady=false;this.entryVerify=false;
    this.root = null; this.repo = null; this.counts = null; this.branch = null; this.agentPull = null;
    this.pulls = { open: null, closed: null }; this.pullsAt = { open: 0, closed: 0 };this.pullDepth={open:0,closed:0};
    this.pages = {open:{cursor:null,hasMore:false,expanded:false},closed:{cursor:null,hasMore:false,expanded:false}};
    this.pageError = null; this.loadingState = null; this.appending = false; this.scrollMotion = null;
    this.selection = null; this.agentRequest = null; this.agentResolved = null;
    this.pinKey = null; this.pinRevealed = true;
    this.relatedKey = null; this.relatedPull = null; this.relatedRequest = null;this.relatedRetry=null;
    this.webhooks?.stop(); this.webhookDirty = false;
    this.pullErrors={open:null,closed:null};this.pullError = null; this.pullLoading = false; this.pullRequest = null;
  }

  recoverReadTasks() {
    // Native task cancellation/deadline can skip JS finally. A completed Task
    // must not leave a permanent busy latch. Healthy in-flight reads are untouched.
    let retired=false;
    for(const [kind,request,busy]of [['root',this.rootRequest,this.loading],['page',this.pullRequest,this.pullLoading]]) {
      if(!busy || !request?.task?.is_done?.())continue;
      retired=true;
      this.orphanReadRetries??=new Set();const repeated=this.orphanReadRetries.has(kind);this.orphanReadRetries.add(kind);
      if(kind==='root'){this.rootRequest=null;this.loading=false;this.entryRootReady=false;this.error=repeated?ROOT_INTERRUPTED:null;}
      else {const state=request.state??this.loadingState??this.view;this.pullRequest=null;this.pullLoading=false;this.loadingState=null;this.appending=false;this.setPullError(state,repeated?'Pull request read interrupted; refresh to retry':null);}
      this.entryRefreshing=!repeated;this.entryAttempted=false;
    }
    if(retired)gitReads(exec).retireObsolete();
  }

  refresh(cx, notify = true) {
    if (!sidebarPanelEnabled('changes')) return;
    this.recoverReadTasks();
    if (this.syncAggregate(cx)) return;
    const target = location(), { cwd, on } = target, context = folderKey(target);
    if (context !== this.context) {
      // Invalidate before the busy guard: an old machine's slow request must
      // neither keep its repo visible nor block resolving the new location.
      const swap = this.pinMotion?.current;
      const retained = swap && swap.target === target.terminal && swap.folder === context && swap.repo === this.repo?.name;
      this.rememberRepository();
      this.context = context; this.on = on; this.error = null;this.orphanReadRetries?.clear();this.rootRetryAuthorized=false;
      this.entryCwd=cwd;this.repositoryGeneration=this.aggregate?.presentationGeneration;
      this.sectionEntry=Boolean(target.space);
      this.rootRequest = null; this.loading = false;
      if (retained) {
        // The clicked link already verified this destination's repository.
        // Retain rows across its worktree/folder refresh, but invalidate every
        // old-folder request before accepting any new terminal or Git result.
        // This is the same retained native list, not a new scroll owner.
        if(this.ordinaryScrollScope===swap.context)this.ordinaryScrollScope=context;
        this.pinMotion.rebase(context); this.root = null;this.factOrder.reset();
        this.selection = null; this.agentRequest = null; this.agentResolved = null;
        this.pullRequest = null; this.pullLoading = false;
        this.relatedRequest = null; this.relatedKey = null; this.webhookDirty = false;
      } else {
        this.resetRepository();
        const name=this.agentLinks?.cachedRepository?.(target)??this.aggregate?.presentations?.name?.(cwd,on);
        this.restoreRepository(target,name);
      }
    }
    if(this.error===ROOT_INTERRUPTED&&!this.rootRetryAuthorized)return;
    if (!cwd || this.loading || !this.repositoryOnline() || this.repositoryPublication?.value && !this.shown()) return;
    // A UI refresh permits one root attempt, independently of GitHub rate credit.
    this.rootRetryAuthorized=false;
    const request = this.rootRequest = {},epoch=this.readEpoch();
    const current = () => this.readEpoch()===epoch && this.repositoryOnline() && sidebarPanelEnabled('changes') && this.rootRequest === request && this.context === context && key() === context;
    this.loading = true;
    if (notify) cx.notify();
    request.task=cx.spawn(async cx => {
      await Promise.resolve(); // spawn may begin inline during render
      if (!current()) return;
      let completed=false;
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
        if (!root || (root !== this.root && !retained && !this.entryRefreshing)) {
          if(!root) {this.aggregate?.presentations?.folders?.delete(folderKey(target));this.agentLinks?.forgetRepository?.(target);}
          this.resetRepository({preserveRootRetry:true});
        }
        this.root = root;this.entryRootReady=Boolean(root);
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
        completed=!root || !this.error;
      } catch {
        if (current()) this.error = 'Could not read repository; refresh to retry';
      } finally { if (this.rootRequest === request) {this.loading = false;if(completed)this.orphanReadRetries?.delete('root');} cx.notify(); }
    });
  }

  syncAggregate(cx) {
    this.aggregate ??= new AggregatePulls({shown:()=>this.shown(),presentationEpoch:()=>host.shared('custom.git.presentation-generation')??0,
      presentationAlive:saved=>!saved.parent || Boolean(saved.machine && host.machines().some(machine=>machine.name===saved.machine && machine.layout!=='ready'))
        || host.spaces().some(space=>space.id===saved.parent && (space.machine??null)===(saved.machine??null))});
    if(!this.aggregate.sync(cx)) return false;
    const scope=`tasks:${this.aggregate.context.scope}`;
    if(this.context!==scope || this.aggregateGeneration!==this.aggregate.presentationGeneration) {
      this.rememberRepository();
      this.resetRepository();this.rootRequest=null;this.loading=false;this.context=scope;this.aggregateGeneration=this.aggregate.presentationGeneration;
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
    const labelled=this.agentLinks?.pullNumber?.(target.terminal,this.repo?.name);
    if(labelled!=null) {this.agentRequest=null;this.agentPull=labelled;this.agentResolved=selection;return;}
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
    this.view = view;this.pullError=this.pullErrors?.[view]??null;
    if(this.seedTabs?.[view]) {this.entryRefreshing=true;this.entryAttempted=false;}
    if(this.repo && this.pulls[view]!==null && !this.seedTabs?.[view])this.webhookDirty=true;
    try { localStorage.setItem(VIEW_KEY, view); } catch {}
    cx.notify();
  }

  // Only a shown Git panel talks to GitHub; a hidden stack child stays quiet.
  shown() {
    if (!sidebarPanelEnabled('changes')) return false;
    const root = layout(), panel = find(root, 'panel'), body = find(root, 'panel-body');
    return Boolean(panel && !panel.hidden && (!body || body.active === 'changes'));
  }

  setPullError(state,message) {
    this.pullErrors??={open:null,closed:null};this.pullErrors[state]=message;
    this.pullError=this.pullErrors[this.view]??null;
  }

  pullsDue(state) {
    return Boolean(!(this.readWake?.due>Date.now()) && this.root && !this.pullLoading && !this.entryRootPending() && (this.entryRefreshing && !this.entryAttempted || this.pulls[state] === null && !this.pullErrors?.[state]));
  }

  loadPulls(state, cx, force = false, notify = true, append = false) {
    if (!this.shown() || !this.repositoryOnline() || this.entryRootPending() || !VIEWS.includes(state) || !this.root || this.pullLoading || key() !== this.context || (!force && !this.pullsDue(state))) return;
    const after = append ? this.pages[state].cursor : null;
    if (append && (!this.pages[state].hasMore || !after || state !== this.view || !this.shown())) return;
    const root = this.root, on = this.on, context = this.context;
    const request = this.pullRequest = {state},read=this.factOrder.begin(),epoch=this.readEpoch();
    let repo=this.repo,repository=repo?.name;
    const current = () => this.readEpoch()===epoch && this.repositoryOnline() && sidebarPanelEnabled('changes') && this.pullRequest === request && this.root === root && this.context === context && key() === context && this.repo===repo && this.repo?.name===repository;
    this.pullLoading = true; this.loadingState = state; this.appending = append; this.pageError = null;this.entryAttempted=true;
    if (notify) cx.notify();
    request.task=cx.spawn(async cx => {
      try {
        const gh = args => repositoryRead(exec, args, repository, { cwd: root, on, timeout: 30000, current:()=>current() && this.shown(), manual:this.manualRead });
        if (!repo || this.entryVerify) {
          const r = await gh(REPO_ARGS);
          if (!current()) return;
          if (r.code !== 0 || r.timed_out || r.timedOut || r.signal) throw new Error(pullError(r));
          const value = JSON.parse(r.stdout || '{}');
          if (!value?.nameWithOwner) throw new Error('No GitHub repository');
          if (!current()) return;
          const mapped=this.agentLinks?.cachedRepository?.(location());
          if(mapped && mapped.toLowerCase()!==value.nameWithOwner.toLowerCase())this.agentLinks?.forgetRepository?.(location());
          if(repo && repo.name.toLowerCase()!==value.nameWithOwner.toLowerCase()) {
            this.pulls={open:null,closed:null};this.counts=null;this.relatedPull=null;this.pinMotion?.cancel();
            this.pages={open:{cursor:null,hasMore:false},closed:{cursor:null,hasMore:false}};this.pullDepth={open:0,closed:0};
            this.repositoryPublication=new Publication();this.entrySeed=false;
          }
          repo=this.repo={ name: value.nameWithOwner, owner: value.owner?.login ?? value.nameWithOwner.split('/')[0], url: value.url ?? `https://github.com/${value.nameWithOwner}` };
          if(!this.repositoryPublication?.value)this.restoreRepository(location(),repo.name);
          repo=this.repo;this.root=root;this.entryVerify=false;
          this.aggregate?.presentations?.rememberFolder?.(location().cwd,on,repo.name);
          cx.notify(); // Paint asynchronously adopted cache before awaiting the page.
        }
        repository=repo.name;
        const page = await readPullPage(exec,state,repository,after,{cwd:root,on,timeout:30000,current:()=>current()&&this.shown(),manual:this.manualRead});
        if (!current()) return;
        const countReply=page.counts?null:await gh(countArgs(repository)).catch(error=>{if(quietRead(error))throw error;return null;});
        if(!current())return;
        const totals=page.counts??(countReply?.code===0?parseCounts(countReply.stdout):null);
        const rows = page.rows.map(pr => this.publishPull(pr,read).value).filter(Boolean);
        const incoming=new Map(rows.map(pr=>[pr.number,pr]));
        const existing = (append ? this.pulls[state] ?? [] : []).map(pr=>incoming.get(pr.number)??pr);
        const seen = new Set(existing.map(pr => pr.number));
        this.pulls[state] = [...existing, ...rows.filter(pr => !seen.has(pr.number))];
        this.pullDepth[state]=append?(this.pullDepth[state]||1)+1:1;
        this.reconcilePulls(rows);
        this.ciRevision=(this.ciRevision??0)+1;
        this.pages[state] = {cursor:page.cursor,hasMore:page.hasMore && page.cursor !== after,expanded:append};
        this.counts = totals ?? {...this.counts,[state]:page.total ?? this.counts?.[state] ?? null};
        this.entrySeed=Boolean(this.entrySeed && !totals);this.seedTabs[state]=false;this.entryRefreshing=false;this.commitRepository();
        this.pullsAt[state] = Date.now(); this.setPullError(state,null);this.orphanReadRetries?.delete('page');
        // All list and webhook reads share pullRequest/pullLoading: one writer.
        if (append) return;
        this.relatedKey = null;this.relatedRetry=null;
        // Rows and available totals publish together, including warm seeds.
      } catch (e) {
        if (current() && this.shown()) {
          if(retryRead(this,cx,e,view=>{
            if(!this.shown() || this.context!==context)return;
            // Cooldown demand follows selection, not the refused tab. Retain
            // an already-loaded destination's depth through its normal refresh.
            if(this.view!==state && this.pulls[this.view]!==null) {this.webhookDirty=true;this.flushWebhook(view);}
            else this.loadPulls(this.view,view,true,true,append && this.view===state);
          }))return;
          const failure=await repositoryFailure(exec,e,repository,{cwd:root,on,current:()=>current()&&this.shown()});
          if(!current())return;
          if (append) this.pageError = {state,message:failure.message};
          else { this.setPullError(state,failure.message); this.pullsAt[state] = Date.now(); }
        }
      } finally {
        await Promise.resolve(); // even a synchronous transport throw must yield
        if (this.pullRequest === request) { this.pullLoading = false; this.loadingState = null; this.appending = false; this.manualRead=null;this.entryRefreshing=false; }
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
  reconcilePulls(values,previous=[]) {
    const updates=new Map(values.filter(Boolean).map(pr=>[pr.number,pr])),moved=new Map();
    const group=pr=>['open','draft'].includes(pr.state)?'open':'closed';
    for(const old of previous.filter(Boolean)) {const pr=updates.get(old.number);if(pr && group(pr)!==group(old))moved.set(pr.number,pr);}
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
    if (!this.repo || !number || !this.shown() || this.entryRootPending() || this.pullLoading) return;
    const scope = JSON.stringify([this.context,this.repo.name,number]);
    if (this.relatedKey === scope || (this.relatedRetry?.scope===scope && this.relatedRetry.until>Date.now())) return;
    this.relatedKey = scope; this.relatedRequest = null;
    // Manual page-one refresh may need to re-read the older active PR. Keep its
    // pin mounted while that same-number replacement is pending or fails.
    if (this.relatedPull?.number !== number) this.relatedPull = null;
    const known = [...(this.pulls.open ?? []), ...(this.pulls.closed ?? [])].find(pr => pr.number === number);
    if (known) { this.relatedPull = known; return; }
    const context = this.context, repo = this.repo, root = this.root, on = this.on;
    const request = this.pullRequest = this.relatedRequest = {},read=this.factOrder.begin(),epoch=this.readEpoch();
    this.pullLoading=true;
    const current = () => this.readEpoch()===epoch && this.repositoryOnline() && sidebarPanelEnabled('changes') && this.pullRequest===request && this.relatedRequest === request && this.relatedKey === scope && this.context === context
      && key() === context && this.shown() && (this.agentPull ?? location().pullNumber) === number;
    cx.spawn(async cx => {
      let accepted=false;
      try {
        await Promise.resolve();if(!current())return;
        cx.notify();
        const result = (await readTargetPulls(exec,[number],repo.name,{cwd:root,on,timeout:30000,current,manual:this.manualRead})).get(number);
        if (!current() || result.error) return;
        const pr = result.row;
        if (pr.number === number) {
          const published=this.publishPull(pr,read,repo.name);accepted=published.accepted;
          if(published.value) {
            const previous=this.relatedPull;
            this.relatedPull=published.value;
            const moved=this.reconcilePulls([published.value],[previous]);
            if(moved || (previous && ['open','draft'].includes(previous.state)!==['open','draft'].includes(published.value.state)))this.webhookDirty=true;
          }
          if(accepted)this.ciRevision=(this.ciRevision??0)+1;
        }
      } catch(error) {
        if(quietRead(error)) {this.relatedRetry={scope,until:error.retryAt};retryRead(this,cx,error,view=>{if(this.shown())this.loadRelatedPull(view);});}
      } finally {
        if(this.relatedRequest===request) {
          this.relatedRequest=null;
          if(!accepted && this.relatedKey===scope) {
            this.relatedKey=null;
            // A released cache key permits retry, not a render-driven hot loop.
            const retry=this.relatedRetry?.scope===scope && this.relatedRetry.until>Date.now() ? this.relatedRetry : (this.relatedRetry={scope,until:Date.now()+LOCAL_CONTEXT_TTL});
            cx.timer?.after(Math.max(LOCAL_CONTEXT_TTL,retry.until-Date.now()),view=>{
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

  aggregateCold() {
    const aggregate=this.aggregate;
    const warm=aggregate.hasPresentation??[...(aggregate.entries?.values()??[])].some(e=>e.pr);
    return !warm && Boolean(aggregate.context.stale || aggregate.waiting);
  }

  repositorySections() {
    const aggregate=this.aggregate,groups=new Map(aggregate.repositories().map(repo=>[repo,{repo,rows:[],error:aggregate.readNotice(repo,this.view)}]));
    for(const row of (aggregate.presentationRows?.(this.view)??aggregate.rows(this.view)))groups.get(row.repo)?.rows.push(row);
    return [...groups.values()].filter(section=>section.rows.length || section.error);
  }

  fallbackSnapshot() {
    const aggregate=this.aggregate,task=this.context?.startsWith('tasks:');
    const on=task?aggregate?.context?.machine:this.on;
    let online=!on;
    if(on)try {online=host.machines().some(m=>m.name===on && m.layout==='ready');}catch {}
    const enabled=this.shown() && online && (task
      ? !aggregate?.context?.stale && aggregate?.currentContext()?.scope===aggregate?.context?.scope
      : key()===this.context && !this.entryVerify && !this.loading && Boolean(this.root && this.repo));
    const uncovered=name=>Boolean(this.notices?.active && this.notices.members?.get(name.toLowerCase())!==true);
    if(task) {
      const repositories=aggregate?.repositories()??[],rows=aggregate?.rows(this.view)??[];
      const sections=this.repositorySections();
      const paging=this.taskSections(sections,aggregate.context.scope);
      // The native host cannot reliably notify viewport motion. Safety covers
      // the entire revealed unfolded batch, never guessed pixel intersections.
      const shownRows=paging.revealedRows;
      return {enabled,scope:JSON.stringify([this.context,on,this.view,aggregate.presentationGeneration,this.taskSelectionEpoch,paging.window.selectionGeneration]),repositories:repositories.map(name=>({name,uncovered:uncovered(name),rows:shownRows.filter(pr=>pr.repo===name)}))};
    }
    const selection=this.pullSelection();
    return {enabled,scope:JSON.stringify([this.context,on,this.view,this.repo?.name]),repositories:this.repo?[{name:this.repo.name,uncovered:uncovered(this.repo.name),rows:[...selection.liveRows,...(selection.active?[selection.active]:[])]}]:[]};
  }

  syncChecksFallback(cx) {
    this.checksFallback ??= new ChecksFallback({snapshot:()=>this.fallbackSnapshot(),read:(repo,view,current)=>this.readPendingChecks(repo,view,current)});
    this.checksFallback.sync(cx);
  }

  async readPendingChecks(repo,cx,current) {
    const admitted=current,epoch=this.readEpoch();current=()=>this.readEpoch()===epoch && admitted();
    const aggregate=this.context?.startsWith('tasks:')?this.aggregate:null;
    if(this.pullLoading || this.relatedRequest || aggregate?.busy)return {busy:true};
    const root=this.root,on=aggregate?aggregate.context.machine:this.on;
    const request=this.fallbackRequest={},order=aggregate?aggregate.factOrder:this.factOrder,read=order.begin();
    if(aggregate) {aggregate.rememberCounts();aggregate.fallbackBusy=true;}
    else {this.pullLoading=true;this.pullRequest=request;}
    cx.notify();
    let retryAfter=0,rateLimited=false;
    try {
      if(!current())return;
      const updates=new Map(),previous=new Map(repo.rows.map(pr=>[pr.number,pr]));let counts=null;
      const gh=async args=>{
        if(!current())throw Error('Obsolete safety read');
        const result=await repositoryRead(exec,args,repo.name,{...(root?{cwd:root}:{}),on,timeout:30000,current,fresh:repo.fresh});
        if(!current())throw Error('Obsolete safety read');
        retryAfter=Math.max(retryAfter,pullRetryAfter(result));
        if(result.code!==0 || result.timed_out || result.timedOut || result.signal) {
          throw Object.assign(new Error(),await repositoryFailure(exec,result,repo.name,{...(root?{cwd:root}:{}),on}));
        }
        return pullPayload(result.stdout);
      };
      let first=true;
      for(const rows of stateBatches([...previous.values()])) {
        if(!current())return;
        const batch=rows.map(pr=>pr.number),detailed=rows.filter(needsChecks).map(pr=>pr.number);
        const stdout=await gh(pullStateArgs(batch,repo.name,!aggregate && first,detailed));
        for(const [number,value] of parsePullStates(stdout,batch,detailed))updates.set(number,value);
        if(!aggregate && first) {
          counts=parseCounts(stdout);
          if(!Number.isInteger(counts?.open) || !Number.isInteger(counts?.closed))throw Error('Incomplete pull request counts');
        }
        first=false;
      }
      const changed=[];
      for(const [number,value]of updates) {
        const old=order.published.get(`${repo.name.toLowerCase()}#${number}`)?.value??previous.get(number);
        if(Object.hasOwn(value,'checks'))continue; // Pending counts arrived in the state batch.
        value.checks=value.checkSummary==null?null:old?.checks??null;
        if(value.checkSummary!=null && (old?.checksKnown!==true || (old?.headRefOid??null)!==(value.headRefOid??null) || (old?.checkSummary??old?.checks?.state??null)!==value.checkSummary))changed.push(number);
      }
      for(let at=0;at<changed.length;at+=CHECKS_BATCH_SIZE) {
        if(!current())return;
        const batch=changed.slice(at,at+CHECKS_BATCH_SIZE),details=parsePendingChecks(await gh(pendingChecksArgs(batch,repo.name)),batch);
        for(const [number,value]of details) {
          const probe=updates.get(number);
          if((probe.headRefOid??null)!==(value.headRefOid??null) || probe.state!==value.state || probe.isDraft!==value.isDraft)throw Error('Pull request changed during safety read');
          probe.checks=value.checks;probe.checksReadAt=value.checksReadAt;
        }
      }
      if(!current())return;
      // Commit only a complete selection. Failed chunks retain every old row.
      let accepted=true;
      const update=pr=>{
        if(!updates.has(pr?.number))return pr;
        const published=order.publish(read,`${repo.name.toLowerCase()}#${pr.number}`,previous=>refreshPullFacts(previous??pr,updates.get(pr.number)));
        accepted=accepted && published.accepted;
        if(published.accepted)rememberPull(exec,repo.name,published.value,{on});
        return published.value??pr;
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
      return {failed:true,rateLimited:rateLimited || error.kind==='rate',retryAt:error.retryAt,retryAfter:Math.max(retryAfter,(error.retryAt??0)-Date.now())};
    } finally {
      if(this.fallbackRequest===request)this.fallbackRequest=null;
      if(aggregate) {aggregate.fallbackBusy=false;aggregate.pump(cx);cx.notify();}
      else if(this.pullRequest===request) {this.pullLoading=false;this.commitRepository();this.flushWebhook(cx);cx.notify();}
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
        aggregate.invalidate(event?.repository??null);aggregate.pump(view);view.notify();
      }});
  }

  syncWebhooks(cx) {
    this.webhooks ??= new GitWebhooks();
    const shown = this.shown(), context=this.context, repo=this.repo;
    if (shown && this.webhookShown === false && this.repo) this.webhookDirty = true;
    this.webhookShown = shown;
    this.webhooks.sync(cx, {enabled:shown && Boolean(this.repo),scope:JSON.stringify([this.context,this.repo?.name]),repository:this.repo?.name,
      isCurrent:()=>this.shown() && this.context===context && key()===context && this.repo===repo,
      onChange:(event,cx) => this.queueWebhook(event,cx)});
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
    if (!this.repositoryOnline() || this.entryVerify || this.loading || this.readWake?.due>Date.now() || !this.webhookDirty || !this.repo || !this.root || this.pullLoading || !this.shown() || key() !== this.context) return;
    this.webhookDirty = false;
    // Related/older reads cannot overlap this snapshot's queue lease.
    const root=this.root,on=this.on,repo=this.repo,context=this.context,requestedState=this.view;
    const request=this.pullRequest={state:requestedState},read=this.factOrder.begin(),epoch=this.readEpoch();this.pullLoading=true;
    const current=()=>this.readEpoch()===epoch && this.repositoryOnline() && this.pullRequest===request && this.context===context && key()===context && this.repo===repo && this.shown();
    cx.spawn(async cx=>{
      await Promise.resolve(); // request feedback must not notify synchronously from render
      try {
        if(!current())return;
        cx.notify();
        const gh=async args=>{
          if(!current())throw Error('Obsolete request');
          const r=await repositoryRead(exec,args,repo.name,{cwd:root,on,timeout:30000,current,manual:this.manualRead});
          if(!current())throw Error('Obsolete request');
          if(r.code!==0 || r.timed_out || r.timedOut || r.signal)throw Object.assign(new Error(),await repositoryFailure(exec,r,repo.name,{cwd:root,on}));
          return r.stdout;
        };
        const updates={},previousRows=VIEWS.flatMap(state=>this.pulls[state]??[]);
        for(const state of [requestedState]) {
          if(this.pulls[state]===null)continue;
          const depth=Math.max(1,this.pullDepth[state]??0,Math.ceil(this.pulls[state].length/PR_PAGE_SIZE));
          let after=null,page,rows=[];
          for(let i=0;i<depth;i++) {
            page=await readPullPage(exec,state,repo.name,after,{cwd:root,on,timeout:30000,current,manual:this.manualRead});
            rows.push(...page.rows);
            if(!page.hasMore || page.cursor===after)break;
            after=page.cursor;
          }
          const seen=new Set();rows=rows.filter(pr=>!seen.has(pr.number) && seen.add(pr.number));
          updates[state]={rows,page};
        }
        const missing=previousRows.filter(pr=>['open','draft'].includes(pr.state) && updates.open && !updates.open.rows.some(row=>row.number===pr.number));
        const transitions=missing.length?await readTargetPulls(exec,missing.map(pr=>pr.number),repo.name,{cwd:root,on,timeout:30000,current,manual:this.manualRead}):new Map();
        for(const value of transitions.values())if(value.error)throw Object.assign(new Error(),value.error);
        const number=this.agentPull ?? location().pullNumber;
        let related=number?transitions.get(number)?.row:null;
        related??=number ? Object.values(updates).flatMap(u=>u.rows).find(pr=>pr.number===number) : null;
        if(number && !related) {
          const value=(await readTargetPulls(exec,[number],repo.name,{cwd:root,on,timeout:30000,current,manual:this.manualRead})).get(number);
          if(value.error)throw Object.assign(new Error(),value.error);
          related=value.row;
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
        this.reconcilePulls([...Object.keys(updates).flatMap(state=>this.pulls[state]??[]),...[...transitions.values()].map(value=>value.row),...(this.relatedPull?[this.relatedPull]:[])],previousRows);
        this.counts=counts ?? this.counts;this.setPullError(requestedState,null);this.ciRevision=(this.ciRevision??0)+1;
        this.entrySeed=false;this.entryRefreshing=false;this.commitRepository();
      } catch(e) { if(current()) {
        if(retryRead(this,cx,e,view=>this.flushWebhook(view)))this.webhookDirty=true;
        else {this.setPullError(requestedState,pullError(e));this.relatedKey=null;this.relatedRetry=null;}
      } }
      finally {
        if(this.pullRequest===request)this.pullLoading=false;
        this.flushWebhook(cx);cx.notify();
      }
    });
  }

  // CI auto-fix delivery is owned by each Core-side monitor, never this panel.

  // Pure projection of work, not pending CI, totals or retry history. Native
  // motion owns every frame; removing the track stops the animation.
  panelLoading() {
    if (!this.shown()) return false;
    if (this.context?.startsWith('tasks:')) {
      const aggregate=this.aggregate;
      return Boolean(aggregate?.busy || aggregate?.context?.loading
        || !aggregate?.context?.stale && aggregate?.updating);
    }
    return Boolean(this.loading || this.pullLoading || this.relatedRequest || this.fallbackRequest);
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

  showPullMenu(pr, cx) {
    if (!pr?.url) return;
    const menu = {url:pr.url};
    // The panel owns browser work: closing the popup ends its async tasks.
    this.menuTarget = {open:menu.url};
    if (!this.listening) {
      this.listening = true;
      cx.spawn(async () => {
        for (;;) {
          const command = await nextCommand(), targets = this.menuTarget;
          const url = command === 'open-external' ? targets?.open : null;
          if (!url) continue;
          this.menuTarget = null;
          this.openUrl(url);
        }
      });
    }
    // Capture the clicked PR, never a later selection.
    openOverlay({ mod: 'custom-changes', kind: 'popup', frame: 'none', width: 180, height: 2 * U.row + 12 + 9,
      props: { pullMenu: menu } });
  }

  renderPullMenu(t) {
    const overlay = props()?.overlay, url = this.pullMenu.url;
    const items = [
      { id: 'open', label: 'Open...', icon: 'arrow-up-right', run: () => run('custom-changes.open-external') },
      { id: 'copy-path', label: 'Copy path', icon: 'copy', run: cx => {
        cx.write_to_clipboard(url);
        notify({ title: 'Path copied', body: url, level: 'success', timeout: 3000 });
      } }];
    const choose = (item, cx) => { item.run(cx); closeOverlay(overlay); };
    return contextMenu(t, { id: 'git-context-menu', prefix: 'git-context', focus: this.menuHandle, state: this,
      items: items.map(item => ({ ...item, icon: `mods/custom-changes/${item.icon}.svg`, separator: item.id === 'copy-path' })),
      onChoose: choose, onClose: () => closeOverlay(overlay) });
  }

  segment(t, id, label, on, onClick) {
    return h_flex().id(id).h(U.control).px(8).flex_none().items_center().rounded(U.radius).cursor_pointer()
      .role('button').accessibility_label(label)
      .text_size(U.meta).text_color(on ? t.foreground : t.muted).when(on, el => el.font_semibold())
      .hover(s => s.bg(t.hover)).on_click((_e, cx) => onClick(cx))
      .child(div().id(`${id}-label`).flex_none().child(label));
  }

  pullIcon(t, pr) {
    if (pr.mergeConflict && ['open','draft'].includes(pr.state)) return div().size(U.icon).flex_none()
      .tooltip('Merge conflicts').accessibility_label('Merge conflicts')
      .child(svg('mods/custom-changes/merge-conflict.svg').size(U.icon).text_color(t.ansi1));
    const asset = pr.state === 'merged' ? 'git-merge' : pr.state === 'closed' ? 'git-pull-request-closed' : 'git-pull-request';
    const color = pr.state === 'merged' ? t.ansi5 : pr.state === 'closed' ? t.ansi1 : pr.state === 'draft' ? t.dim : t.ansi2;
    const stated=pr.when?.startsWith(`${pr.state} `);
    return svg(`mods/custom-changes/${asset}.svg`).size(U.icon).flex_none().text_color(color)
      .when(!stated,el=>el.tooltip(pr.state==='draft'?'Draft pull request':pr.state==='open'?'Open pull request':pr.state==='merged'?'Merged pull request':'Closed pull request'));
  }

  beginAgentMotion(pr,press,agent,cx,controlOffset=6) {
    if(!agent?.address || press?.number!==pr.number || Date.now()-press.at>=2000)return false;
    let clicked=pr,snapshot=this.pullPresentation;
    if(pr.key) {
      const window=this.selectedTaskWindow;if(!window || !agent.cwd)return false;
      const items=window.range().items;if(!items.some(item=>item.key===pr.key))return false;
      let top=4-window.offset;
      const backdrop=items.map(item=>{
        const value={...item,top,count:window.repositoryCounts?.get(item.repo)?.value};top+=item.height+item.gap;return value;
      });
      clicked={...pr,key:undefined,repo:undefined};
      snapshot={context:this.context,state:this.view,rows:[clicked],pinned:null,arrival:true,originKey:pr.key,backdrop};
    }
    const repo=pr.repo??this.repo?.name;
    if(!this.pinMotion?.start(snapshot,clicked,press,{source:location().terminal,target:agent.address,folder:folderKey(agent),repo,controlOffset,pinTop:4},cx))return false;
    if(pr.key) {
      // Only presentation is carried from the verified task PR. The destination
      // still reads its own repository inventory/counts and resolves selection.
      this.repo={name:repo,owner:repo.split('/')[0],url:`https://github.com/${repo}`};
      this.relatedPull=clicked;
    }
    cx.notify();return true;
  }

  stageDescriptor(pr) {
    // Initial ship/fix work has no managed GitHub label yet. Resolve the same
    // build-owner action without writing an inferred stage into cached facts.
    if(!pr.stage && !['open','draft'].includes(pr.state))return null;
    const stage=pr.stage??'build';
    const role=stage==='approved'?null:stage,repo=pr.repo??this.repo?.name,context=this.context;
    const scope=this.aggregate?.context?.scope;
    const target=role && pr.key?(pr.stage&&this.aggregate?.stagePresentation?this.aggregate.stagePresentation(pr,role,this.agentLinks,this.agentPresentation):this.aggregate?.stageTarget?.(pr,role,this.agentLinks,this.agentPresentation)):null;
    const agent=role?(pr.key?target?.agent:this.agentLinks?.related?.(pr,repo,location().terminal,role,undefined,this.agentPresentation)):null;
    const available=agent?.availability==='live';
    if(!pr.stage && (!available || !['ship','fix'].includes(agent?.crew?.kind)))return null;
    const round=role==='build'?agent?.crew?.round:null;
    const label=stageLabels({...pr,stage}).find(label=>label.stage);
    if(!label)return null;
    // Crew publishes the current round (starts at 1), not completed reviews.
    const caption=stage==='build'&&round>1?`Build ${round}`:label.name;
    return {stage,role,repo,context,scope,target,agent,available,round,label:{...label,name:caption}};
  }

  stageChip(t, pr, interactive = true, probe = false, descriptor = this.stageDescriptor(pr)) {
    if(!descriptor)return null;
    const {role,repo,context,scope,target,agent,available,label}=descriptor;
    const reason=!role||available?null:agent?.availability==='disconnected'?`on ${agent.on}, not connected`
      :agent?.availability==='ended'?(role==='review'?'reviewer ended without a verdict':`build agent ended${pr.checks?.state?` - CI ${pr.checks.state}`:''}`)
      :role==='review'?'reviewer unavailable':'build agent unavailable';
    const activate=(_event,cx)=>{
      cx.stop_propagation();const press=this.agentPress;this.agentPress=null;
      if(this.context!==context || !this.shown())return;
      if(!role){this.openPull(pr);return;}
      if(!available)return;
      if(pr.key) {
        const latest=this.aggregate?.entries?.get(pr.key)?.pr;
        if(!pr.stage && (!latest || !['open','draft'].includes(latest.state)))return;
        this.aggregate?.focus(pr,target,scope,this.agentLinks,current=>this.beginAgentMotion(pr,press,current.agent,cx,STAGE_CONTROL_OFFSET));return;
      }
      if(key()!==context || this.repo?.name!==repo)return;
      const current=this.agentLinks?.related?.(pr,repo,location().terminal,role);
      if(current?.key!==agent.key || current.availability!=='live')return;
      const latest=[...(this.pulls?.open??[]),...(this.pulls?.closed??[]),this.relatedPull].find(row=>row?.number===pr.number);
      if(!pr.stage && (!latest || !['open','draft'].includes(latest.state)))return;
      if(latest && latest.stage!==pr.stage)return;
      this.beginAgentMotion(pr,press,current,cx,STAGE_CONTROL_OFFSET);
      run('agent.focus',{terminal:current.address});
    };
    const color=pr.stage==='approved'?t.ansi2:role==='review'?t.ansi5:t.ansi3;
    return div().id(`${probe?'probe-':interactive?'':'swap-'}pr-stage-${pr.key??pr.number}`)
      .h(18).min_w(0).max_w_full().px(6).flex_none().flex().items_center().rounded(U.insetRadius)
      .bg(t.raised).text_color(color).text_size(U.meta).overflow_hidden()
      .child(div().h(18).min_w(0).overflow_hidden().whitespace_nowrap().child(label.name))
      .when(Boolean(!probe&&role&&!available),el=>el.opacity(0.45).cursor_default().accessibility_label(reason))
      .when(interactive,el=>el
        .on_mouse_down('left',(event,cx)=>{
          cx.stop_propagation();
          if(available)this.agentPress={number:pr.number,position:event.position,bounds:event.bounds,at:Date.now()};
        }).on_click(activate))
      .when(Boolean(interactive&&(!role||available)),el=>el.role('button').tab_index(0)
        .accessibility_label(role?`Open ${role==='review'?'reviewer':'build agent'} for ${repo} #${pr.number}`:`Open pull request #${pr.number}`)
        .on_key_down((event,cx)=>{if(['enter','space',' '].includes(event.key)){this.agentPress=null;activate(event,cx);}})
        .cursor_pointer().hover(s=>s.bg(subtleActionFill(t))).focus(s=>s.bg(subtleActionFill(t))));
  }

  agentButton(t, pr, interactive = true) {
    if(pr.key) {
      const target=this.aggregate?.target(pr,this.agentPresentation),scope=this.aggregate?.context?.scope;
      const name=target?this.agentLinks?.displayName?.(target.terminal,this.agentPresentation):null;
      return target ? div().id(`${interactive ? '' : 'swap-'}pr-agent-${pr.key}`).absolute().left(0).top((20-U.insetControl)/2)
        .size(U.insetControl).flex_none().flex().items_center().justify_center().rounded(U.insetRadius).text_color(t.foreground)
        .when(interactive, el=>el.cursor_pointer().role('button').accessibility_label(`Open related agent for ${pr.repo} #${pr.number}`)
          .hover(s=>s.bg(subtleActionFill(t))).on_mouse_down('left',(event,cx)=>{
            cx.stop_propagation();this.agentPress={number:pr.number,position:event.position,bounds:event.bounds,at:Date.now()};
          })
          .on_click((_e,cx)=>{
            cx.stop_propagation();const press=this.agentPress;this.agentPress=null;
            this.aggregate.focus(pr,target,scope,undefined,current=>this.beginAgentMotion(pr,press,this.agentLinks?.liveTarget?.(current.terminal),cx,4));
          }))
        .when(Boolean(name),el=>el.tooltip(`Open agent: ${name}`))
        .child(svg('icons/agent.svg').size(U.icon)) : null;
    }
    const agent = this.agentLinks?.related(pr, this.repo?.name, location().terminal,null,undefined,this.agentPresentation);
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
            this.beginAgentMotion(pr,press,current,cx,4);
            run('agent.focus', {terminal:current.address});
          }))
        .when(Boolean(agent.displayName),el=>el.tooltip(`Open agent: ${agent.displayName}`))
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

  // Native ink measurements put both lower lines' x-height centre 1px below
  // their line-box centre. Move only dot paint, not text, icons or layout.
  metaSeparator(t) {
    return div().size(3).flex_none().rounded_full().bg(t.muted).relative().top(1);
  }

  labelPill(t, label, id) {
    this.rowPresentations ??= new RowPresentations();
    const {background,foreground,border} = this.rowPresentations.labelStyle(t,label.color,labelColors);
    // Border-box: 4px padding + 1px border preserves the original 5px inset.
    return h_flex().id(id).flex_none().min_w(0).max_w_full().h(18).px(4).border_1().border_color(border).rounded_full()
      .items_center().overflow_hidden().bg(background).text_color(foreground)
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
    const hiddenItems=items.filter((item,index)=>item.omitted||(ready&&widths[index]===0)).map(item=>item.tooltip).filter(Boolean);
    // A stage must not inherit any popup region, even one about unrelated data.
    // Move omitted-item summaries to a surviving left-run item in such lines.
    const scoped=items.some(item=>item.scopedTooltip),summaryAt=scoped?visible.find(index=>!items[index].trailing):null;
    const line = h_flex().id(id).w_full().min_w(0).h(18).flex_none().gap(6).items_center()
      .overflow_hidden().line_height('18px').text_size(11).text_color(t.muted)
      .on_size_change((size, cx) => measure('available', size, cx))
      .children(visible.flatMap((index, at) => {
        const item=items[index];
        const hidden=compact.has(item.kind)||(ready&&widths[index]+0.01<sizes[`${item.kind}-full`])||item.omitted;
        const ownTooltip=item.info||(hidden?item.tooltip:null);
        const tooltip=index===summaryAt?[...new Set([ownTooltip,...hiddenItems].filter(Boolean))].join('\n'):ownTooltip;
        const node = item.render(compact.has(item.kind), false, tooltip).flex_none()
          .when(ready && clipOrder.includes(item.kind), el => el.w(widths[index]))
          .when(Boolean(tooltip&&!item.scopedTooltip),el=>el.tooltip(tooltip));
        // The flexible slot owns only the free space, never the task/check
        // cells. There is one normal gap, but no dot, before assigned labels.
        if (item.trailing) return [h_flex().id(`${id}-right`).flex_1().min_w(0).h(18).justify_end().overflow_hidden().child(node)];
        return at ? [this.metaSeparator(t), node] : [node];
      }));
    // These absolute invisible children are outside the visible run, so their
    // text never adds a line, gap, hover target or horizontal reservation.
    if(!scoped&&hiddenItems.length)line.tooltip(hiddenItems.join('\n'));
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
    try {return this.renderPart(`pull-row:${pr.key??pr.number}`,()=>this.renderPullRow(t,pr,ghost));}
    catch {
      // Isolate ordinary JS row failures, retaining geometry and a safe PR link.
      // QuickJS deadline interrupts are uncatchable and use the frame retry below.
      return v_flex().id(`${ghost?'swap-':''}pr-${pr.key??pr.number}`).h(74).flex_none().px(8).py(6).gap(3).rounded(U.radius)
        .when(!ghost,el=>el.cursor_pointer().on_click(()=>this.openPull(pr)))
        .child(div().h(20).truncate().text_size(U.font).child(typeof pr.title==='string'?pr.title:'Pull request'))
        .child(div().h(18).text_size(11).text_color(t.muted).child(`#${pr.number}`))
        .child(div().h(18).text_size(11).text_color(t.muted).child('Row unavailable; refresh to retry'));
    }
  }

  renderPullRow(t, pr, ghost = false) {
    const prefix = ghost ? 'swap-' : '', rowId = pr.key ?? pr.number;
    const stage=this.stageDescriptor(pr);
    const agentButton = stage?null:this.agentButton(t, pr, !ghost);
    // Cache presentation by immutable fact identity; never retain native rows:
    // their event callbacks belong to the current native snapshot build.
    this.rowPresentations ??= new RowPresentations();
    const labelsFor=row=>stageLabels(stage?{...row,stage:stage.stage}:row).map(label=>label.stage&&stage?stage.label:label);
    const {facts:presentation,id:groupId}=this.rowPresentations.get(pr,this.context?.startsWith('tasks:')?3:Infinity,ghost,labelsFor,stage?.label.name);
    const {labels,labelNames}=presentation;
    const text = (kind, value, probe) => div().id(groupId(kind, probe)).min_w(0).h(18)
      .overflow_hidden().whitespace_nowrap().child(value);
    const byline = this.pullLine(t, `${prefix}pr-byline-${rowId}`, [
      {kind:'number', measureKey:presentation.number, tooltip:presentation.number, render:(_short, probe) => text('number', presentation.number, probe)},
      ...(pr.login ? [{kind:'author', measureKey:pr.login, tooltip:pr.login, render:(_short, probe) => text('author', pr.login, probe)}] : []),
      ...(pr.when ? [{kind:'time', measureKey:pr.when, compactKey:pr.compactWhen, compact:true, tooltip:pr.when, info:presentation.timeInfo, render:(short, probe) => text('time', short ? pr.compactWhen : pr.when, probe)}] : []),
    ], ['author']);
    const meta = this.pullLine(t, `${prefix}pr-meta-${rowId}`, [
      ...(pr.tasks ? [{kind:'tasks', measureKey:pr.tasks.label, compactKey:presentation.taskFraction, compact:true, tooltip:pr.tasks.label, render:(short, probe) => h_flex().id(groupId('tasks', probe)).min_w(0).h(18).gap(4).items_center()
        .child((probe ? div().size(U.tinyIcon) : this.taskIcon(t, pr.tasks)).id(groupId('task-icon', probe)).flex_none().relative().top(1))
        .child(div().flex_none().whitespace_nowrap().child(short ? presentation.taskFraction : pr.tasks.label))}] : []),
      ...(pr.checks ? [{kind:'checks', measureKey:pr.checks.label, tooltip:pr.checks.label, info:presentation.checkInfo, render:(_short, probe) => {
        const color = pr.checks.state === 'success' ? t.ansi2 : pr.checks.state === 'failure' ? t.ansi1 : t.ansi3;
        const icon = pr.checks.state === 'success' ? svg('mods/custom-workspace-chrome/check.svg').size(U.tinyIcon).text_color(color)
          : pr.checks.state === 'failure' ? svg('mods/custom-workspace-chrome/x.svg').size(U.tinyIcon).text_color(color)
          : div().size(8).rounded_full().bg(color);
        return h_flex().id(groupId('checks', probe)).h(18).gap(4).items_center()
          .child(div().id(groupId('check-icon', probe)).size(U.tinyIcon).flex_none().relative().top(1).flex().items_center().justify_center().child(icon.flex_none()))
          .child(div().flex_none().whitespace_nowrap().underline().child(pr.checks.label));
      }}] : []),
      ...(pr.review ? [{kind:'review', measureKey:pr.review, tooltip:presentation.review, render:(_short, probe) => text('review', presentation.review, probe).text_color(pr.review === 'approved' ? t.ansi2 : t.ansi1)}] : []),
      ...(labels.length ? [{kind:'labels', trailing:true, scopedTooltip:Boolean(stage), tooltip:labelNames, omitted:presentation.omittedLabels, measureKey:presentation.labelKey, render:(_short, probe, tooltip) => h_flex().id(groupId('labels', probe)).min_w(0).h(18).gap(4).items_center().justify_end().overflow_hidden()
        .children(labels.map((label,index)=>label.stage?this.stageChip(t,pr,!ghost&&!probe,probe,stage):this.labelPill(t,label,`${groupId('label',probe)}-${index}`)
          .when(Boolean(stage&&!probe&&tooltip),el=>el.tooltip(tooltip))))}] : []),
    ], ['review', 'labels']);
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
          .when(Boolean(agentButton),el=>el.child(div().id(`${prefix}pr-agent-slot-${rowId}`).w(U.insetControl).h(20).flex_none().relative().child(agentButton))))
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

  repositoryPresentation() {
    const current={pulls:this.pulls,counts:this.counts};
    return this.repositoryPublication?.project(current,Boolean(this.pullLoading || this.entryRefreshing))??current;
  }

  pullSelection() {
    // Missing footer evidence does not veto the explicit-tab or branch fallback.
    const state = this.view, list = this.repositoryPresentation().pulls[state], pullNumber = this.agentPull ?? location().pullNumber;
    const related = this.relatedPull && this.relatedPull.number === pullNumber && (state === 'open'
      ? ['open','draft'].includes(this.relatedPull.state) : ['closed','merged'].includes(this.relatedPull.state)) ? this.relatedPull : null;
    const liveRows = related && !list?.some(pr => pr.number === related.number) ? [...(list??[]),related] : list ?? [];
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
    if(metrics.zoom&&metrics.zoom!==zoom){
      metrics.awaitZoom=true;
      metrics.measurement=this.ordinaryMeasureSequence=(this.ordinaryMeasureSequence??0)+1;
    }
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

  pullFeedback(rows = this.pinMotion?.current?.snapshot.rows ?? this.pullSelection().liveRows) {
    const list=this.repositoryPresentation().pulls[this.view];
    const text=this.error || this.pullError || (!this.root ? (this.loading || location().cwd ? 'Loading…' : 'No folder')
      : list === null ? 'Loading…' : `No ${this.view} pull requests`);
    return {text,cold:!rows.length && text==='Loading…'};
  }

  // Feedback replaces a repository header, not a PR title. Keep the same
  // 28px row and 8px inner inset; wrapping adds height below its first line.
  bodyMessage(t,id,text,{error=false}={}) {
    const lineHeight=U.font*1.5;
    return div().id(id).flex_none().w_full().px(8).py((U.control-lineHeight)/2).min_h(U.control)
      .text_size(U.meta).line_height(`${lineHeight}px`).text_color(error?t.ansi1:t.dim)
      .child(div().min_w(0).child(text));
  }

  renderPulls(t) {
    const state = this.view, selection = this.pullSelection(),liveRows=selection.liveRows;
    // Every selection path uses the resolved selected-agent PR, never click state.
    const active=selection.active;
    const metrics=this.ordinaryScrollState(state), zoom=metrics.zoom, measurement=metrics.measurement;
    this.sampleNativeScroll(metrics,metrics.handle,zoom);
    this.pinMotion?.rebaseZoom?.(zoom);
    this.pinMotion?.active(this.context,state);
    this.pinMotion?.resolve(location().terminal,selection.active?.number,this.agentResolved === agentKey(location()));
    const retained = this.pinMotion?.current;
    if(retained?.arrived)this.pinMotion.rebasePinTop?.(4);
    const rows = retained?.snapshot.rows ?? liveRows, pinned = retained ? retained.snapshot.pinned : active;
    this.pullPresentation = {context:this.context,state,rows,pinned};
    const swap = retained && retained.phase !== 'waiting' ? retained : null;
    const settled = this.pinMotion?.settled(this.context,state,pinned?.number);
    const pinKey = JSON.stringify([this.context,state,pinned?.number ?? null]);
    if (pinKey !== this.pinKey) {
      this.pinRevealed = this.pinKey == null || !pinned || Boolean(retained) || settled;
      this.pinKey = pinKey;this.pinRevealSequence=(this.pinRevealSequence??0)+1;
    }
    const sectionRepo=this.sectionEntry?this.repo?.name:null,folded=sectionRepo && this.foldedRepositories?.has(sectionRepo);
    const remaining = folded?[]:rows.filter(pr => pr !== pinned);
    const {text:empty,cold}=this.pullFeedback(rows);
    if(retained?.snapshot.arrival)return v_flex().id('pulls-body').relative().flex_1().min_h(0).overflow_hidden()
      .on_size_change((size,cx)=>{const before=this.pinMotion.bodySize?.width;this.pinMotion.measureBody(size,settings().zoom);if(before!==this.pinMotion.bodySize?.width)cx.notify();})
      .on_mouse_move(event=>this.pinMotion.bodyPointer(event))
      .on_scroll_wheel((_event,cx)=>{this.pinMotion.cancel();cx.notify();cx.stop_propagation();})
      .on_mouse_down('left',(_event,cx)=>cx.stop_propagation()).on_click((_event,cx)=>cx.stop_propagation())
      .children(retained.snapshot.backdrop.map(item=>div().id(`pin-origin-${item.key}`).absolute().left(LIST_INSET).right(LIST_INSET).top(item.top).h(item.height)
        .when(Boolean(swap&&item.key===retained.snapshot.originKey),el=>el.invisible())
        .child(item.row?this.pullRow(t,item.row,true):item.header?sidebarSectionHeader(t,{id:`pin-origin-header-${item.repo}`,label:item.repo,open:!item.folded,trailingSize:U.insetControl,trailingInset:3,children:[
          div().flex_1().min_w(0).truncate().child(item.repo),sidebarNumericSlot(t,`pin-origin-count-${item.repo}`,String(item.count??0),{gap:U.gap,trailingSize:U.insetControl}),
        ]}):div().px(8).py(4).text_size(U.meta).text_color(t.ansi1).child(item.error??''))))
      .when(Boolean(swap),el=>el.child(this.swapOverlay(t,swap)));
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
            .when(Boolean(!cold&&sectionRepo&&rows.length>(pinned?1:0)),el=>el.child(this.repositoryHeader(t,sectionRepo,this.context,rows.length-(pinned?1:0),Boolean(this.entrySeed || this.seedTabs?.[this.view]))))
            .children(remaining.map(pr => this.pullRow(t, pr)
              .when(Boolean(swap?.cards.some(card => card.pr.number === pr.number)), el => el.invisible())))
            .when(!rows.length && (!folded || cold || Boolean(this.error || this.pullError)), el => el.child(cold
              ? this.loadingMessage(t,'git-empty')
              : this.bodyMessage(t,'git-empty',empty,{error:Boolean(this.error||this.pullError)})))
            .when(!folded && Boolean(rows.length) && Boolean(this.error || this.pullError), el => el.child(div().id('git-read-error').px(8).py(4).text_size(11).text_color(t.ansi1).child(this.error || this.pullError)))
            .when(!folded && this.pageError?.state === state, el => el.child(div().px(8).py(4).text_size(11).text_color(t.ansi1).child(this.pageError.message)))
            .when(!folded && Boolean(this.pages[state]?.hasMore), el => el.child(div().id('pulls-more').p(8).text_size(11).text_color(t.dim)
              .role('button').accessibility_label('Load 10 more pull requests').disabled(this.pullLoading)
              .when(!this.pullLoading, el => el.cursor_pointer().hover(s => s.bg(t.hover)))
              .on_click((_event, cx) => { if (!this.pullLoading) this.morePulls(state, cx); })
              .child(this.pullLoading && this.loadingState === state ? 'Loading…' : this.pageError?.state === state ? 'Retry loading more' : 'Load 10 more')))))
        .when(metrics.moreAbove,el=>el.child(topFade(metrics,'pulls-list',t.background,{left:LIST_INSET,right:LIST_INSET})))
        .when(metrics.moreBelow,el=>el.child(bottomFade(metrics,'pulls-list',t.background,{left:LIST_INSET,right:LIST_INSET}))))
      .when(Boolean(swap), el => el.child(this.swapOverlay(t,swap)));
  }

  syncMotionPreference(cx) {
    const explicit=settings().reduced_motion??settings().reducedMotion;
    if(typeof explicit==='boolean'){this.motionReduced=explicit;return;}
    if(!this.shown()){this.motionObserved=false;return;}
    if(this.motionObserved)return;
    this.motionObserved=true;
    let platform;try{platform=window()?.platform;}catch{}
    if(!platform){this.motionReduced=false;return;}
    // The SDK has no OS accessibility-preference API. Read locally on show,
    // outside render; unknown/unavailable preferences fail calm (static).
    this.motionReduced=true;
    cx.spawn(async view=>{
      await Promise.resolve();if(this.renderClosed||!this.shown())return;
      const command=platform==='windows'?'powershell.exe':platform==='macos'?'defaults':'gsettings';
      const args=platform==='windows'?['-NoProfile','-NonInteractive','-Command',
        `Add-Type '[System.Runtime.InteropServices.DllImport("user32.dll")]public static extern bool SystemParametersInfo(uint a,uint b,out int c,uint d);' -Name GitMotion -Namespace Native;$enabled=0;if(![Native.GitMotion]::SystemParametersInfo(0x1042,0,[ref]$enabled,0)){exit 1};if($enabled -eq 0){'true'}else{'false'}`]
        :platform==='macos'?['read','com.apple.universalaccess','reduceMotion']:['get','org.gnome.desktop.interface','enable-animations'];
      try {
        const result=await exec(command,args,{timeout:5000});
        if(this.renderClosed||!this.shown()||!this.motionObserved)return;
        const value=result?.stdout?.trim();
        if(result?.code===0&&['true','false','0','1'].includes(value))this.motionReduced=platform==='linux'?value==='false':['true','1'].includes(value);
      }catch{}finally{if(!this.renderClosed&&this.shown())view.notify();}
    });
  }

  breathe(element) {
    return element.opacity(0.35).when(!this.motionReduced,el=>el.loop('opacity',{from:0.25,to:0.65,period:BREATHE_MS,easing:'ease-in-out'}));
  }

  loadingMessage(t,id,animated=true) {
    return h_flex().id(id).px(8).py(2).min_h(U.row+4).items_center().gap(6)
      .child(animated?this.breathe(div().size(U.statusSize).flex_none().rounded_full().bg(t.working)):div().size(U.statusSize).flex_none().rounded_full().bg(t.working))
      .child(div().text_size(U.meta).text_color(t.working).child('Loading'));
  }

  loadingLine(t) {
    return div().id('git-loading-track').absolute().left(0).right(0).top(0).h(1).overflow_hidden()
      .role('status').accessibility_label('Loading Git')
      .child(this.breathe(div().id('git-ci-line').size_full().bg(t.accent)));
  }

  enrollmentPresentation() {
    const aggregate=this.aggregate,context=aggregate?.currentContext({presentation:true});
    if(!this.shown() || !context || context.stale || context.scope!==aggregate.context?.scope)return null;
    const notice=this.notices?.presentation(aggregate.repositories());
    if(!notice)return null;
    return {choices:notice.choices,key:JSON.stringify([context.scope,location(),this.view,notice.key])};
  }

  repositoryScopeCurrent(repo,scope) {
    return this.shown() && (scope===this.context && !scope.startsWith('tasks:')
      ? this.repo?.name?.toLowerCase()===repo.toLowerCase()
      : this.aggregate?.currentContext({presentation:true})?.scope===scope && this.aggregate.repositories().includes(repo));
  }

  repositoryHeader(t,repo,scope,count,loading=false) {
    const folded=this.foldedRepositories.has(repo);
    return sidebarSectionHeader(t,{id:`task-repo-header-${repo}`,label:repo,open:!folded,trailingSize:U.insetControl,trailingInset:3,children:[
      this.repositoryNameLabel(repo,scope),
      sidebarNumericSlot(t,`task-repo-count-${repo}`,String(count),{gap:U.gap,trailingSize:U.insetControl})
        .accessibility_label(`${count} ${this.view} pull requests${loading?' (loading)':''}`)
        .when(loading,el=>el.tooltip(`Count loading; showing ${count}`)),
    ]}).cursor_pointer().hover(s=>s.bg(t.selected)).on_click((_e,cx)=>{
      cx.stop_propagation();if(!this.repositoryScopeCurrent(repo,scope))return;
      this.taskSelectionEpoch=(this.taskSelectionEpoch??0)+1;
      this.foldedRepositories.has(repo)?this.foldedRepositories.delete(repo):this.foldedRepositories.add(repo);
      try {localStorage.setItem(FOLDED_REPOS_KEY,JSON.stringify([...this.foldedRepositories]));}catch{}
      cx.notify();
    });
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
      if(!this.shown() || (settings().zoom>0?settings().zoom:1)!==zoom || this.repositoryNameSizes.get(id)!==sizes || !this.repositoryScopeCurrent(repo,scope) || !Number.isFinite(size.width))return;
      const before=overflowing();sizes[kind]=size.width;this.repositoryNameSizes.set(id,sizes);
      if(before!==overflowing())cx.notify();
    };
    // A non-shrinking invisible flex child measures the same text's natural width.
    // Its absolute clipped parent cannot reserve width or add a line to the header.
    return div().id(id).flex_1().min_w(0).relative().overflow_hidden().line_height(`${U.font*1.5}px`)
      .when(overflowing(),el=>el.tooltip(repo))
      .child(div().id(`${id}-available-${sizes.measurement}`).w_full().truncate().child(repo)
        .on_size_change((size,cx)=>measure('available',size,cx)))
      .child(div().absolute().left(0).top(0).flex().invisible()
        .child(div().id(`${id}-probe-${sizes.measurement}`).flex_none().whitespace_nowrap().child(repo)
          .on_size_change((size,cx)=>measure('intrinsic',size,cx))));
  }

  repositorySection(t, {repo, items}, scope, window) {
    const folded = !this.aggregateCold() && window.repositoryCounts.get(repo).value>0 && this.foldedRepositories.has(repo);
    const header=items.find(item=>item.header), body=items.filter(item=>!item.header);
    return v_flex().id(`task-repo-${repo}`).w_full().flex_none()
      .when(Boolean(header),section=>section.child(div().flex_none().h(header.height+header.gap)
        .child(this.repositoryHeader(t,repo,scope,window.repositoryCounts.get(repo).value,window.repositoryCounts.get(repo).loading))))
      .when(!folded && body.length>0, el => el.child(v_flex().id(`task-repo-body-${repo}`).flex_none()
        .children(body.map(item=>div().id(`task-item-${item.key}`).flex_none().h(item.height+item.gap)
          .child(item.row ? this.pullRow(t,item.row) : item.loading ? this.loadingMessage(t,`task-loading-${repo}`,false) : this.renderPart(`repository-notice:${repo}`,()=>div().id(`task-error-${repo}`).flex_none().w_full()
            .child(this.bodyMessage(t,`task-notice-measure-${window.measurement}-${encodeURIComponent(item.measureKey)}`,item.error,{error:true})
            .on_size_change((size,cx)=>{
              if(!this.taskWindowCurrent(window,scope) || !window.items.some(current=>current.measureKey===item.measureKey) || !Number.isFinite(size.height))return;
              const height=size.height/window.zoom;
              if(window.noticeHeights.get(item.measureKey)===height)return;
              window.noticeHeights.set(item.measureKey,height);cx.notify();
            }))))))));
  }

  taskSections(sections, scope) {
    const key=`${scope}\0${this.view}`;
    this.taskPresentations ??= new Map();
    const compatibleEpoch=this.taskPresentationEpoch===this.aggregate.presentationGeneration;
    if(!compatibleEpoch){this.taskPresentations.clear();this.taskPresentationEpoch=this.aggregate.presentationGeneration;}
    if(this.taskWindowScope!==scope || !compatibleEpoch) {
      for(const [id,window]of compatibleEpoch?(this.taskWindows??[]):[]) {
        const saved={};for(const field of ['start','limit','chunk','items','starts','offset','headerHeight','gap','viewport'])saved[field]=window[field];
        this.taskPresentations.delete(id);this.taskPresentations.set(id,saved);
      }
      while(this.taskPresentations.size>8 || [...this.taskPresentations.values()].reduce((sum,s)=>sum+s.items.filter(item=>item.row).length,0)>4096)this.taskPresentations.delete(this.taskPresentations.keys().next().value);
      this.retiredTaskHandles=[...(this.retiredTaskHandles??[]),...[...(this.taskWindows?.values()??[])].flatMap(window=>window.handle?[window.handle]:[])];
      this.taskWindows=new Map();this.taskWindowScope=scope;
    }
    let window=this.taskWindows.get(key);
    if(!window) {
      window=new TaskReveal();
      if(this.aggregate.entries?.size)Object.assign(window,this.taskPresentations.get(key)??{});
      if(window.offset>0)window.restoreOffset=window.offset;
      window.key=key;window.metrics=new SidebarScrollState();
      window.measurement=this.taskMeasureSequence=(this.taskMeasureSequence??0)+1;
      this.taskWindows.set(key,window);
    }
    if(this.selectedTaskWindow!==window) {
      this.selectedTaskWindow=window;this.taskSelectionEpoch=(this.taskSelectionEpoch??0)+1;
      window.correction=null;window.anchorMarker=null;window.scheduledCorrection=null;
    }
    if(window.restoreOffset){window.correction={from:0,to:window.restoreOffset};delete window.restoreOffset;}
    const zoom=settings().zoom||1;
    if(window.zoom && window.zoom!==zoom) {
      window.metrics.awaitZoom=true;
      window.zoomSequence=(window.zoomSequence??0)+1;
      // Retained native scrolling is logical-pixel based; paired event bounds
      // are window pixels. Rebase cached metrics before new zoom callbacks.
      window.metrics.setMetrics({offset:window.offset*zoom,content:window.contentHeight*zoom});
      // The frame is measured in physical pixels and can stay exactly the
      // same size during zoom. Do not rescale a measurement that will not fire.
      window.viewport=window.metrics.viewport/zoom;
    }
    window.zoom=zoom;
    if(this.sampleNativeScroll(window.metrics,window.handle,zoom))window.observe(window.metrics.offset/zoom,window.metrics.viewport/zoom,true);
    window.repositoryCounts=new Map(sections.map(section=>[section.repo,{value:section.rows.length,loading:Boolean(this.aggregate.loading?.(section.repo) || [...(this.aggregate.entries?.values()??[])].some(e=>e.link?.repo===section.repo && !e.pr && !e.missing))}]));
    window.project(sections,this.foldedRepositories,U.control,U.rowGap,`${zoom}:${window.width??0}`,this.aggregateCold());
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
    if(which==='viewport')this.pinMotion?.measureBody(size,zoom);
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
    if(kind==='move')this.pinMotion?.bodyPointer(event);
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
    const aggregate=this.aggregate,scope=aggregate.context.scope;
    const hasInventory=[...aggregate.entries.values()].some(e=>e.pr),warm=aggregate.hasPresentation??hasInventory;
    const verificationHint='Fleet status is unverified; actions are paused until fresh verification' + (aggregate.context.verification
      ? `\n${aggregate.context.verification.reason} at ${new Date(aggregate.context.verification.at).toISOString()} (generation ${aggregate.context.verification.generation})` : '');
    // Membership is cross-tab: enrollment and updates must retain hidden sections.
    const repositories=aggregate.repositories(), rows=aggregate.rows(this.view);
    const sections=this.repositorySections();
    const waiting=Boolean(aggregate.context.stale || aggregate.waiting);
    if(this.repositoryNameSizes){
      const ids=new Set(repositories.map(repo=>`task-repo-name-${scope}-${repo}`));
      for(const id of this.repositoryNameSizes.keys())if(!ids.has(id))this.repositoryNameSizes.delete(id);
    }
    const cold=this.aggregateCold();
    const paging=this.taskSections(sections,scope), taskWindow=paging.window, taskZoom=taskWindow.zoom, taskZoomSequence=taskWindow.zoomSequence??0;
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
    const loading=this.panelLoading();
    return v_flex().id('changes').relative().size_full().min_h(0).rounded(8).overflow_hidden().bg(t.background).border_1().border_color(t.input).text_color(t.foreground).text_size(U.font)
      .child(h_flex().id('changes-header').relative().bg(t.surface).h(U.section).flex_none().pl(4).pr(U.gutter).gap(U.gap).items_center().border_b(1).border_color(t.border)
        .on_hover((hovered,view)=>{this.headerHovered=hovered;view.notify();})
        .child(sidebarTitle(t,'changes','git-title'))
        .child(reveal(headerTools(h_flex()).id('git-actions').bg(t.surface),this.headerHovered)
          .child(refreshButton(t,{id:'git-refresh',icon:'mods/custom-changes/refresh.svg',label:'Refresh',busy:aggregate.busy,animate:false,
            owner:this,scope:this.context,enabled:this.headerHovered,size:U.insetControl,iconSize:U.tinyIcon,radius:U.insetRadius,color:t.dim,hover:subtleActionFill(t),
            onClick:(_e,view)=>{if(aggregate.context?.scope===scope && !aggregate.busy) {this.webhooks?.retryNow();this.notices?.retryNow();aggregate.refresh(view);}}}))
          .child(panelPin(t,{id:'git-pin',enabled:this.headerHovered}))
          .child(headerTool(t,{id:'git-close',icon:'mods/custom-pane/close.svg',label:'Close Git panel',enabled:this.headerHovered,onClick:()=>changePanel({open:false})}))))
      .child(h_flex().id('git-views').h(40).flex_none().px(4).gap(2).items_center().border_b(1).border_color(t.border)
        .child(this.segment(t,'git-view-open','Open',this.view==='open',view=>this.setView('open',view)))
        .child(this.segment(t,'git-view-closed','Closed',this.view==='closed',view=>this.setView('closed',view))))
      .when(cold,el=>el.child(div().id('git-task-waiting').flex_none().pt(4).px(LIST_INSET)
        .child(this.loadingMessage(t,sections.length?'git-task-loading':'git-task-empty')
          .when(aggregate.context.stale,message=>message.tooltip(verificationHint)))))
      .child(v_flex().id('task-pulls-scroll').relative().flex_1().min_h(0).overflow_hidden()
        .child(v_flex().id(`task-pulls-frame-${scope}-${this.view}-${taskWindow.measurement}`).relative().flex_1().min_h(0).overflow_hidden()
          .on_size_change((size,cx)=>this.taskMeasure(taskWindow,scope,'viewport',size,cx))
          .on_scroll_wheel((event,cx)=>this.taskViewportMotion(taskWindow,scope,event,'wheel',cx))
          .on_mouse_move((event,cx)=>this.taskViewportMotion(taskWindow,scope,event,'move',cx))
          .child(v_flex().id(`task-pulls-list-${scope}-${this.view}${taskWindow.chunk?`-${taskWindow.chunk}`:''}`).flex_1().min_h(0).overflow_y_scrollbar()
            .when(Boolean(taskWindow.handle),el=>el.track_scroll(taskWindow.handle))
            .child(v_flex().id(`task-pulls-content-${taskWindow.measurement}-${taskWindow.zoom}-${taskZoomSequence}`).w_full().flex_none().py(4).px(LIST_INSET)
              .on_size_change((size,cx)=>{if((taskWindow.zoomSequence??0)===taskZoomSequence)this.taskMeasure(taskWindow,scope,'content',size,cx,taskZoom);})
              .on_scroll_wheel(event=>taskWindow.metrics.contentMotion(event,'wheel'))
              .on_mouse_move(event=>taskWindow.metrics.contentMotion(event,'move'))
              .children(paging.sections.map(section => this.renderPart(`repository-section:${section.repo}`,()=>this.repositorySection(t, section, scope,taskWindow))))
              .when(taskWindow.canTurn,el=>el.child(div().id('task-pulls-more').h(28).flex_none().px(8).text_size(U.meta).text_color(t.dim).cursor_pointer().role('button')
                .accessibility_label(taskWindow.more?'Show more task pull requests':'Show first task pull requests again')
                .tooltip(taskWindow.more?'Show the next mounted batch':'Return to the first mounted batch')
                .on_click((_event,cx)=>this.nextTaskChunk(taskWindow,scope,cx)).child('Show more')))
              .when(!sections.length && (!waiting || warm),el=>el.child(this.bodyMessage(t,'git-task-empty',`No ${this.view} pull requests`))))
            .when(Boolean(anchor),el=>el.child(div().id('task-pulls-anchor').absolute().left(0).w(1).h(1)
              .top(anchor.to+(anchor.to>anchor.from?taskWindow.viewport-1:0)))))
          .when(taskWindow.metrics.moreAbove,el=>el.child(topFade(taskWindow.metrics,'task-pulls-list',t.background,{left:LIST_INSET,right:LIST_INSET})))
          .when(taskWindow.metrics.moreBelow,el=>el.child(bottomFade(taskWindow.metrics,'task-pulls-list',t.background,{left:LIST_INSET,right:LIST_INSET})))))
      .when(setup,el=>el.child(this.liveCIInfo(t)))
      .when(Boolean(enrollment),el=>el.child(enrollment))
      .when(loading && !cold,el=>el.child(this.loadingLine(t).top(U.section)));
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
    const attempt={retry:Boolean(this.renderRetryPending)};
    this.renderRetryPending=false;this.renderAttempt=attempt;this.reportedRenderError=null;
    // Register before building: an uncatchable deadline skips catch/finally.
    // A successful frame does nothing; an aborted frame gets one deferred retry,
    // never a render-time notify, frame loop or retry of read/focus side effects.
    if(!attempt.retry)cx.spawn?.(async view=>{
      await Promise.resolve();
      if(this.renderClosed || this.renderAttempt!==attempt || !this.shown())return;
      view.timer?.after(64,next=>{
        if(this.renderClosed || this.renderAttempt!==attempt || !this.shown())return;
        this.renderRetryPending=true;next.notify();
      });
    });
    try {
      // Read native identity collections once for presentation. Captured actions
      // always re-query without this frame-local snapshot before granting focus.
      this.agentPresentation=this.shown()?this.agentLinks?.presentationSnapshot?.():null;
      const tree=this.renderPart('panel',()=>this.renderPanel(cx));
      this.renderAttempt=null;this.agentPresentation=null;
      return tree;
    } catch(error) { this.renderAttempt=null;this.agentPresentation=null;throw error; }
  }

  renderPanel(cx) {
    this.recoverReadTasks();
    this.syncMotionPreference(cx);
    if (!sidebarPanelEnabled('changes')) {
      this.enrollmentPicker?.stop();this.webhooks?.stop();this.notices?.stop();this.aggregate?.stop();
      this.resetRepository(); this.rootRequest = null; this.loading = false; this.context = null;
      return div();
    }
    if (this.pullMenu) return this.renderPullMenu(theme());
    if (this.renderPart('coordinator-context',()=>this.syncAggregate(cx))) {
      const scope=this.aggregate?.context?.scope;
      if(this.shown())this.agentLinks?.refresh?.(cx,address=>{
        const context=this.aggregate?.currentContext?.();
        return Boolean(context && context.scope===scope && (context.tasks??context.links).some(task=>!task.historical && task.terminal===address));
      });
      return this.renderPart('coordinator',()=>this.renderAggregate(cx,theme()));
    }
    this.enrollmentPicker?.stop();
    const mappedRepository=this.agentLinks?.cachedRepository?.(location());
    if(this.repositoryGeneration!==undefined && this.repositoryGeneration!==this.aggregate?.presentationGeneration || (this.entrySeed || Object.values(this.seedTabs??{}).some(Boolean)) && !this.sourceCurrent(this.entrySource)
      || key()===this.context && this.repo && mappedRepository && this.repo.name.toLowerCase()!==mappedRepository.toLowerCase()) {
      this.resetRepository();this.rootRequest=null;this.loading=false;this.context=null;
    }
    if (key() !== this.context || this.entryRefreshing && !this.entryAttempted && !this.entryRootReady && !this.error && !this.loading && this.shown()) this.refresh(cx, false);
    for(const state of VIEWS)if(this.pulls[state]) {
      const old=this.pulls[state],rows=old.map(pr=>retimePull(pr));
      if(rows.some((pr,index)=>pr!==old[index]))this.pulls[state]=rows;
    }
    if(this.relatedPull)this.relatedPull=retimePull(this.relatedPull);
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
    const loading = this.panelLoading() && !this.pullFeedback().cold;
    return v_flex().id('changes').size_full().min_h(0).rounded(8).overflow_hidden().bg(t.background).border_1().border_color(t.input).text_color(t.foreground).text_size(U.font)
      .child(h_flex().id('changes-header').relative().bg(t.surface).h(U.section).flex_none().pl(4).pr(U.gutter).gap(U.gap).items_center().border_b(1).border_color(t.border)
        .on_hover((hovered, cx) => { this.headerHovered = hovered; cx.notify(); })
        .child(sidebarTitle(t, 'changes', 'git-title'))
        .child(div().flex_1())
        .child(reveal(headerTools(h_flex()).id('git-actions').bg(t.surface), this.headerHovered)
          .when(Boolean(this.root || this.repo?.name || this.error===ROOT_INTERRUPTED), el => el.child(refreshButton(t, { id: 'git-refresh', icon: 'mods/custom-changes/refresh.svg', label: 'Refresh', busy, animate: false, owner: this, scope: this.context,
            enabled: this.headerHovered && Boolean(this.root || this.error===ROOT_INTERRUPTED), size: U.insetControl, iconSize: U.tinyIcon, radius: U.insetRadius, color: t.dim, hover: subtleActionFill(t),
            onClick: (_e, cx) => {
              if ((!this.root && this.error!==ROOT_INTERRUPTED) || this.loading || this.pullLoading) return;
              this.webhooks?.retryNow();this.notices?.retryNow();
              this.rootRetryAuthorized=true;this.manualRead={remaining:1,expires:Date.now()+30000};this.readWake=null;this.agentLinks?.invalidate?.();
              // Keep demand queued while root verification blocks the read.
              if(this.entryVerify){this.entryRefreshing=true;this.entryAttempted=false;}
              this.refresh(cx); this.loadPulls(this.view, cx, true);
            } })))
          .child(panelPin(t,{id:'git-pin',enabled:this.headerHovered}))
          .child(headerTool(t, { id: 'git-close', icon: 'mods/custom-pane/close.svg', label: 'Close Git panel', enabled: this.headerHovered, onClick: () => changePanel({open:false}) }))))
      .child(v_flex().id('git-panel-body').relative().flex_1().min_h(0)
      .child(h_flex().id('git-views').h(40).flex_none().px(4).gap(2).items_center().border_b(1).border_color(t.border)
        .child(this.segment(t, 'git-view-open', 'Open', this.view === 'open', cx => this.setView('open', cx)))
        .child(this.segment(t, 'git-view-closed', 'Closed', this.view === 'closed', cx => this.setView('closed', cx))))
      .child(this.renderPulls(t))
      .when(Boolean(notice), el => el.child(this.liveCIInfo(t,notice)))
      .when(loading, el => el.child(this.loadingLine(t))));
  }
}
