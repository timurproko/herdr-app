import { div, svg } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { exec, appHome, shared, setShared, openOverlay, machines } from './host.js';
import { U, control, dropdown, menuSurface, description, activity, startRefreshFeedback } from './ui.js';
import { sectionStack, editorActionButton } from './modal-layout.js';

const MODE_WIDTH = 170;
// Survives closing/reopening Settings, but never crosses machines or failures.
// Cached facts are display-only while a new check runs; actions stay disabled.
const snapshots = new Map();
function skeleton(t, id, width, height = 9) {
  return div().id(id).w(width).h(height).flex_none().rounded(height > 10 ? 10 : 3).bg(t.hover)
    .loop('opacity', { from: 0.35, to: 0.75, period: 1400, easing: 'ease-in-out' });
}
const key = machine => `custom.core-relaunch:${JSON.stringify(machine ?? null)}`;
const machineOf = owner => owner.profileMachine ?? null;
// The machine picker's grey dot: a remote machine whose connection isn't ready. Cached
// facts are stale then, so the page says so and offers no actions.
const offline = owner => { const machine = machineOf(owner);return machine !== null && machines().find(m => m.name === machine)?.layout !== 'ready'; };
const pending = owner => shared(key(machineOf(owner)));
const infoOf = owner => owner.terminalPermissions?.get(machineOf(owner))?.result;
const modeLabel = mode => mode === 'administrator' ? 'Administrator' : 'Standard user';
// A running core's verified token is authoritative, not its next-start policy. Except
// before this user signs in: an SSH reconnect may have started core elevated, and the
// sign-in task replaces it with its own mode, so that mode is the one the person sees.
const presignin = info => info?.supported && info.desktop === false && info.remember === true && ['standard', 'administrator'].includes(info.autostartMode);
const baseMode = info => presignin(info) ? info.autostartMode : info?.running === true && typeof info.elevated === 'boolean' ? info.elevated ? 'administrator' : 'standard'
  : ['standard', 'administrator'].includes(info?.savedMode) ? info.savedMode : 'standard';
const active = owner => { const job = pending(owner);return Boolean(owner.permissionApplying || (job && !['complete', 'failed'].includes(job.state))); };
async function bridge(machine, request, timeout = 45000, reconnectOnComplete = false) {
  const reply = await exec('node', [`${appHome()}/mods/custom-settings/core-control.cjs`, JSON.stringify({ machine: machine ?? null, request, reconnectOnComplete })], { on: null, timeout });
  let value;
  try { value = JSON.parse(reply.stdout); } catch { throw Error('Core management did not reply. Refresh before retrying.'); }
  if (value.error || reply.code !== 0) { const error = Error(value.error || 'Core management failed.');error.rejected = value.rejected === true;throw error; }
  return value;
}
export function initPermissions(owner, cx) {
  owner.permissionFocus = cx.focus_handle();owner.permissionDrafts = new Map();owner.permissionPolls = new Set();
  cx.timer.every(2500, cx => { if (owner.section === 'core') pollPermissionRelaunch(owner, cx); });
  if (owner.section === 'core') reloadPermissions(owner, cx);
}
export function reloadPermissions(owner, cx) {
  startRefreshFeedback(owner,'st-core-refresh',JSON.stringify(['core',owner.profileMachine]),cx,true);
  const machine = machineOf(owner);
  owner.terminalPermissions ??= new Map();
  if (owner.terminalPermissions.get(machine)?.loading) return;
  const entry = { loading: true, result: owner.terminalPermissions.get(machine)?.result ?? snapshots.get(machine) ?? null, error: null };owner.terminalPermissions.set(machine, entry);
  cx.spawn(async cx => {
    try {
      const result = await bridge(machine, { action: 'inspect' });
      if (typeof result.platform !== 'string' || ![true, false, null].includes(result.running) || ![true, false, null].includes(result.elevated)) throw Error('Invalid core status.');
      const d = owner.permissionDrafts?.get(machine), previous = entry.result;
      if (d && previous && d.mode === baseMode(previous) && d.remember === (previous.remember === true)) owner.permissionDrafts.delete(machine);
      entry.result = result;snapshots.set(machine, result);
    } catch (error) { snapshots.delete(machine);entry.result = null;entry.error = error.message; }
    finally { entry.loading = false; }
    cx.notify();
  });
  pollPermissionRelaunch(owner, cx, true);
}
export function pollPermissionRelaunch(owner, cx, force = false) {
  const machine = machineOf(owner), job = shared(key(machine));
  if (!job || ['complete', 'failed'].includes(job.state) || owner.permissionApplying || owner.permissionPolls?.has(machine)) return;
  const age = Date.now() - job.started;
  if (!force && (age < 2000 || job.state === 'unknown')) return;
  if (!force && age > 300000) { setShared(key(machine), { ...job, state: 'unknown', message: 'Result unknown. Refresh before trying again.' });return; }
  owner.permissionPolls ??= new Set();owner.permissionPolls.add(machine);
  cx.spawn(async cx => {
    try {
      const result = await bridge(machine, { action: 'status', request: job.request, session: job.session }, 45000, ['start', 'apply'].includes(job.operation));
      if (shared(key(machine))?.request !== job.request) return;
      if (result.request !== job.request || !['queued', 'restarting', 'complete', 'failed', 'unknown'].includes(result.state)) throw Error('Invalid operation result.');
      if (result.state !== 'unknown') setShared(key(machine), { ...job, ...result });
      if (['complete', 'failed'].includes(result.state) && machine === machineOf(owner)) reloadPermissions(owner, cx);
    } catch { /* SSH may briefly disappear during a machine/core restart. */ }
    finally { owner.permissionPolls.delete(machine); }
    cx.notify();
  });
}
function draft(owner, info = infoOf(owner)) {
  owner.permissionDrafts ??= new Map();const machine = machineOf(owner);
  if (!owner.permissionDrafts.has(machine)) owner.permissionDrafts.set(machine, { mode: baseMode(info), remember: info?.remember === true });
  return owner.permissionDrafts.get(machine);
}
export function coreHasChanges(owner) {
  const info = infoOf(owner);if (!info?.supported) return false;
  const d = draft(owner, info);return d.mode !== baseMode(info) || d.remember !== (info.remember === true);
}
export function coreNeedsRelaunch(owner) {
  const info = infoOf(owner);return info?.running === true && typeof info.elevated === 'boolean' && draft(owner, info).mode !== (info.elevated ? 'administrator' : 'standard');
}
export function coreChangeNotice(owner, t) {
  const job = pending(owner);
  const label = active(owner) ? job?.operation === 'autostart' ? 'Applying' : job?.operation === 'stop' ? 'Stopping' : job?.operation === 'start' ? 'Starting' : 'Restarting'
    : coreHasChanges(owner) ? coreNeedsRelaunch(owner) ? 'Apply restarts core with all agents.' : 'Unapplied changes' : '';
  return div().id('st-core-change-notice').flex_1().min_w(0).text_size(U.meta).text_color(t.muted).child(label);
}
export function coreAction(owner, operation, cx) {
  const machine = machineOf(owner), info = infoOf(owner), entry = owner.terminalPermissions?.get(machine);
  if (!info?.supported || entry?.loading || active(owner) || offline(owner) || owner.profileEdit || owner.terminalEdit) return;
  if (!['start', 'stop', 'apply'].includes(operation)) return;
  const relaunch = operation === 'apply' && coreNeedsRelaunch(owner);
  if ((operation !== 'apply' || relaunch) && !info.desktop) return;
  if (operation === 'start' && (info.running !== false || coreHasChanges(owner))) return;
  if (operation === 'stop' && (info.running !== true || typeof info.elevated !== 'boolean')) return;
  if (operation === 'apply' && (!coreHasChanges(owner) || (info.running === true && typeof info.elevated !== 'boolean'))) return;
  const d = { ...draft(owner, info) };
  const request = `core-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  const mode = operation === 'stop' ? info.elevated ? 'administrator' : 'standard' : operation === 'start' ? baseMode(info) : d.mode;
  let job = { request: operation === 'apply' ? `${request}-settings` : request, mode, operation: operation === 'apply' ? 'autostart' : operation, session: info.session, started: Date.now(), state: 'preparing' };
  setShared(key(machine), job);owner.permissionApplying = true;owner.permissionPickerOpen = false;owner.settingsHostOpen = false;cx.notify();
  cx.spawn(async cx => {
    try {
      if (operation === 'apply') {
        const reply = await bridge(machine, { action: 'autostart', mode, remember: d.remember, request: job.request, session: info.session }, 300000);
        if (shared(key(machine))?.request !== job.request) return;
        if (!reply.configured || reply.request !== job.request) throw Error('Settings were not acknowledged. Refresh before retrying.');
        if (relaunch) {
          // Use the existing verified relaunch worker; no manual Stop/Start cycle.
          // Separate IDs keep save and relaunch acknowledgements unambiguous.
          job = { ...job, request, operation: 'apply', state: 'preparing' };
          setShared(key(machine), job);cx.notify();
        } else {
          setShared(key(machine), { ...job, state: 'complete' });
          owner.permissionDrafts.delete(machine);
        }
      }
      if (job.operation !== 'autostart') {
        const reply = await bridge(machine, { action: job.operation, mode, request: job.request, session: info.session }, 300000);
        if (shared(key(machine))?.request !== job.request) return;
        if (!reply.queued || reply.request !== job.request) throw Error('Action was not acknowledged. Refresh before retrying.');
        setShared(key(machine), { ...job, state: 'queued' });
      }
    } catch (error) {
      if (shared(key(machine))?.request === job.request) setShared(key(machine), { ...job, state: error.rejected ? 'failed' : 'unknown', message: error.message });
    } finally { owner.permissionApplying = false; }
    if (job.operation === 'autostart' && machine === machineOf(owner)) reloadPermissions(owner, cx);
    cx.notify();
  });
}
function modePicker(owner, t, enabled) {
  const machine = machineOf(owner), info = infoOf(owner), d = info?.supported ? draft(owner) : null;
  const unknown = info?.running === true && typeof info.elevated !== 'boolean';
  enabled = enabled && !unknown;
  const trigger = control(t, h_flex()).id('st-permission-mode').w(MODE_WIDTH).px(U.gutter).gap(8).items_center().disabled(!enabled)
    .when(enabled, e => e.cursor_pointer()).when(!enabled, e => e.opacity(0.4))
    .child(div().flex_1().min_w(0).child(d && !unknown ? modeLabel(d.mode) : owner.terminalPermissions?.get(machine)?.loading ? skeleton(t, 'st-core-permission-loading', 88) : 'Unavailable')).child(svg('mods/custom-workspace-chrome/chevron-down.svg').size(U.smallIcon));
  if (!enabled) return trigger;
  const menu = menuSurface(t, v_flex()).id('st-permission-mode-menu').w(MODE_WIDTH).children(['standard', 'administrator'].map(mode =>
    div().id(`st-permission-mode-${mode}`).h(U.row).px(8).rounded(U.radius).flex().items_center().cursor_pointer().hover(e => e.bg(t.hover))
      .on_click((_e, cx) => { if (machine !== machineOf(owner) || active(owner)) return;d.mode = mode;owner.permissionPickerOpen = false;cx.notify(); }).child(modeLabel(mode))));
  return dropdown('st-permission-mode-popup', trigger, menu, { open: owner.permissionPickerOpen, focus: owner.permissionFocus,
    onOpen: (open, cx) => { owner.permissionPickerOpen = open;cx.notify(); } });
}
export function coreEditorActions(owner, t) {
  const info = infoOf(owner);
  const enabled = coreHasChanges(owner) && !active(owner) && !offline(owner) && !owner.terminalPermissions?.get(machineOf(owner))?.loading
    && (info?.running !== true || typeof info.elevated === 'boolean') && (!coreNeedsRelaunch(owner) || info?.desktop);
  return h_flex().w_full().h(U.field).gap(8).items_center()
    .child(coreChangeNotice(owner, t))
    .when(coreHasChanges(owner), e => e
      .child(editorActionButton(owner.button(t, 'st-core-discard', 'Discard', (_e, cx) => { if (!enabled) return;owner.permissionDrafts.delete(machineOf(owner));cx.notify(); }, { enabled })))
      .child(editorActionButton(owner.button(t, 'st-core-apply', 'Apply', (_e, cx) => coreAction(owner, 'apply', cx), { enabled }))));
}
export function corePage(owner, t) {
  const machine = machineOf(owner), entry = owner.terminalPermissions?.get(machine), info = entry?.result, job = pending(owner);
  const away = offline(owner);
  const editing = Boolean(owner.profileEdit || owner.terminalEdit), enabled = Boolean(info?.supported && !entry.loading && !active(owner) && !editing && !away);
  const transition = !away && active(owner) && ['start', 'stop', 'apply'].includes(job?.operation);
  const checking = Boolean(entry?.loading);
  const status = away ? 'Unreachable' : transition ? job.operation === 'stop' ? 'Stopping' : job.operation === 'start' ? 'Starting' : 'Restarting'
    : info?.running === false ? 'Stopped' : info?.running === true ? info.desktop === false ? 'Running (logged out)' : 'Running' : 'Unknown';
  const cold = checking && !info && !away;
  const bulb = transition ? activity(t.working) : div().size(U.statusSize).flex_none().rounded_full().bg(!away && info?.running === true ? t.done : t.dim);
  const statusInfo = h_flex().id('st-core-status-info').gap(U.gap).items_center()
    .tooltip(away ? `${machine} is not connected.` : checking ? info ? 'Last checked status; refreshing…' : 'Loading core status…' : `Core process: ${status}`)
    .when(cold, e => e.child(skeleton(t, 'st-terminal-permissions', 66).accessibility_label('Loading core status')))
    .when(!cold, e => e.child(bulb.id('st-core-status-bulb'))
      .child(div().id('st-terminal-permissions').text_size(U.font).text_color(t.foreground).child(status)));
  const ready = Boolean(info?.supported), d = ready ? draft(owner, info) : null;
  const stop = info?.running === true;
  const canPower = enabled && info.desktop && (stop ? typeof info.elevated === 'boolean' : info.running === false && !coreHasChanges(owner));
  const power = owner.button(t, 'st-core-power', stop ? 'Stop' : info?.running === false ? 'Start' : cold ? skeleton(t, 'st-core-power-loading', 26) : 'Unknown', (_e, cx) => coreAction(owner, stop ? 'stop' : 'start', cx), { enabled: canPower }).w(76).when(cold, e => e.accessibility_label('Loading core controls'))
    .tooltip(stop ? 'Ends running commands and agents. Attached clients may start core again.' : coreHasChanges(owner) ? 'Apply changes first.' : 'Requires this user to be signed in on that machine.');
  const autostart = ready ? owner.toggle(t, 'st-permission-remember', d.remember, (_e, cx) => { if (!enabled) return;d.remember = !d.remember;cx.notify(); })
    : h_flex().h(U.field).items_center().child(skeleton(t, 'st-permission-remember', 36, 20).accessibility_label('Loading autostart setting'));
  // Restarting the whole machine asks first, in its own dialog (custom-confirm), which
  // sends the restart through this page's bridge. Needs a reachable Windows machine.
  const canReboot = Boolean(info?.platform === 'win32' && !checking && !active(owner) && !editing && !away);
  const label = machine ?? 'this computer';
  const reboot = owner.button(t, 'st-core-reboot', 'Reboot', () => {
    if (!canReboot) return;
    openOverlay({ mod: 'custom-confirm', kind: 'dialog', modal: true, frame: 'none', width: 420, props: { action: 'reboot', machine, label } });
  }, { enabled: canReboot }).w(76).tooltip(`Restart ${label}`);
  // Five permanent rows: initial checks and refreshes never collapse the form.
  // Unknown controls are placeholders, not guessed default preferences.
  const page = sectionStack(v_flex()).id('st-core-page').child(owner.heading(t, 'Core', 'Manage the selected machine’s runtime.'))
    .child(owner.row(t, 'Status', null, statusInfo).id('st-core-status-row'))
    .child(owner.row(t, 'Permissions', null, modePicker(owner, t, enabled)))
    .child(owner.row(t, 'Start at Windows sign-in', d?.remember && d.mode === 'administrator' ? 'Runs elevated without another UAC prompt.' : 'Starts after you sign in on this machine.',
      div().disabled(!enabled).when(!enabled, e => e.opacity(0.4)).tooltip('No password is stored. SSH startup before sign-in is not covered.').child(autostart)))
    .child(owner.row(t, 'Herdr Core', !away && info?.supported && !info.desktop ? 'Sign in on this machine to enable Start and Stop.'
      : stop ? 'Stops Herdr Core, ending its running commands and agents.' : 'Starts Herdr Core with the applied permissions.', power).id('st-core-control-row'));
  // Page-wide notes sit below a closing line, like Updates' note, not under the last row.
  const notes = [];
  if (info?.autostartConflict) notes.push(description(t, 'A conflicting startup task must be resolved on this machine.'));
  if (info && !info.supported) notes.push(description(t, 'Core management currently supports Windows with a per-user core installation.'));
  const error = entry?.error || info?.problem || (job && ['failed', 'unknown'].includes(job.state) ? job.message || 'Result unknown. Refresh before retrying.' : null);
  if (error) notes.push(description(t, error).id('st-permission-result').text_color(t.blocked));
  page.child(owner.row(t, 'Restart machine', 'Restarts Windows on this machine, after you confirm.', reboot, notes.length === 0).id('st-core-reboot-row'));
  if (notes.length) page.child(v_flex().id('st-core-notes').pt(12).gap(8).children(notes));
  return page;
}
