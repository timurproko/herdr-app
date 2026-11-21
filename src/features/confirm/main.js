// Custom's confirmation dialogs: closing a space (or its last tab), and restarting a
// machine (props.action === 'reboot', opened from Settings › Core). Never modifies
// Herdr's shipped confirm mod.
import { View } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { props, spaces, run, closeOverlay, theme, notify, exec, appHome } from './host.js';
import { ensureSpaceStart } from './space-lifecycle.js';
import { dialogSurface, dialogHeader, dialogBody, description, button } from './ui.js';
import { confirmDialog } from './panel-kit.js';

export default class Confirm extends View {
  init(_props, cx) {
    this.finished = false;
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  cancel() {
    if (this.finished) return;
    this.finished = true;
    closeOverlay(props()?.overlay);
  }

  confirm() {
    if (this.finished) return;
    const p = props();
    this.finished = true;
    closeOverlay(p?.overlay);
    // Capture the original machine-qualified space; never fall back to focus.
    const space = typeof p?.spaceId === 'string' && spaces().find(s => s.id === p.spaceId);
    if (space) {
      if (typeof p.tabId === 'string') {
        if (space.tabs.some(t => t.id === p.tabId)) {
          if (ensureSpaceStart(space.id)) run('tab.close', { id: p.tabId, confirmed: true });
          else notify({ title: 'Could not keep this space open', body: 'Its last tab was not closed. Check the machine connection and try again.', level: 'error' });
        }
      } else run('space.close', { id: p.spaceId, confirmed: true });
    }
  }

  // Restart goes through Settings' core bridge (local, or that machine over SSH). The
  // dialog stays open until Windows accepts, so a refusal is shown, not lost.
  reboot(cx) {
    const p = props() ?? {};
    if (this.finished || this.rebooting) return;
    // Restarting any machine (this one or a remote one) takes a second, deliberate press.
    if (!this.armed) { this.armed = true;cx.notify();return; }
    this.rebooting = true;cx.notify();
    const request = `reboot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    cx.spawn(async cx => {
      let error = null;
      try {
        const reply = await exec('node', [`${appHome()}/mods/custom-settings/core-control.cjs`, JSON.stringify({ machine: p.machine ?? null, request: { action: 'reboot', request } })], { on: null, timeout: 45000 });
        let value = null;try { value = JSON.parse(reply.stdout); } catch {}
        if (!value?.rebooting) error = value?.error || 'The machine did not confirm the restart.';
      } catch (e) { error = e?.message || 'The restart request could not be sent.'; }
      this.finished = true;closeOverlay(p.overlay);
      notify(error ? { title: `Could not restart ${p.label}`, body: error, level: 'error' }
        : { title: `Restarting ${p.label}`, body: 'It will be unavailable for a minute or two.', level: 'success', timeout: 5000 });
      cx.notify();
    });
  }

  renderReboot(t, p) {
    return confirmDialog(t, { id: 'confirm-reboot', title: `Restart ${p.label}?`, focus: this.handle,
      body: 'Windows restarts in a few seconds. Terminals, agents and unsaved work on that machine end, and it stays unavailable until it starts again.',
      confirm: this.armed ? 'Really?' : 'Confirm', confirmDanger: Boolean(this.armed), confirmEnabled: !this.rebooting,
      onCancel: () => { if (!this.rebooting) this.cancel(); }, onConfirm: cx => this.reboot(cx) });
  }

  render() {
    const t = theme(), p = props() ?? {};
    if (p.action === 'reboot') return this.renderReboot(t, p);
    return dialogSurface(t, v_flex()).id('custom-confirm').overflow_hidden().track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === 'enter') this.confirm();
        else if (e.key === 'escape') this.cancel();
        else return;
        cx.stop_propagation();
      })
      .child(dialogHeader(t, p.tabId ? 'Close last tab?' : 'Close space?', () => this.cancel()))
      .child(dialogBody(v_flex()).id('confirm-description').gap(8)
        .child(description(t, p.tabId ? 'This ends the terminals and agents in this tab. The space stays open.' : 'This ends all terminals and agents in this space.'))
        .when(Boolean(p.detail), el => el.child(description(t, p.detail))))
      .child(h_flex().id('confirm-actions').p(16).gap(8).justify_end().border_t(1).border_color(t.border)
        .child(button(t, 'confirm-cancel', 'Cancel', () => this.cancel()).w(80))
        .child(button(t, 'confirm-close-space', 'Close', () => this.confirm(), { primary: true }).w(80)));
  }
}
