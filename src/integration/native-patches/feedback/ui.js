import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex, Input, Textarea, Toggle } from "gpui-base";
import { props, theme as nativeTheme, feedbackAttachImages, appHome, readTextFile, writeTextFile } from "./host.js";
import { U, dialogHeader, field as uiField, button as uiButton, textButton, chevron, dialogScrollArea, dialogScrollBody } from "./custom-ui.js";
import { isCustom, liveTheme, ensureNativeSelection } from "./custom-look.js";
import { modalFooter } from "./custom-modal-layout.js";
const MAX_SHOTS = 3;
// One-time draft from scripts/feedback-draft.mjs: email and screenshots, which
// app.feedback can't carry. Only a fresh, unconsumed draft is used; sending stays manual.
const DRAFT_FILE = ".customizations/feedback-draft.json";
const DRAFT_MAX_AGE_MS = 120000;

export function parseDraft(raw, now = Date.now()) {
  let draft;
  try { draft = JSON.parse(raw); } catch { return null; }
  if (!draft || draft.version !== 1 || draft.consumed || typeof draft.created !== "number") return null;
  if (now - draft.created > DRAFT_MAX_AGE_MS || draft.created - now > 5000) return null;
  return {
    message: typeof draft.message === "string" ? draft.message : "",
    email: typeof draft.email === "string" ? draft.email.trim() : "",
    images: Array.isArray(draft.images) ? draft.images.filter(p => typeof p === "string" && p).slice(0, MAX_SHOTS) : [],
  };
}


export const active = isCustom;
export function beforeInit(cx) { if (active()) ensureNativeSelection(cx); }
export const theme = native => active() ? liveTheme() : native;
export function init(cx) {
  this.view = view; this.viewer = viewer; this.previewExpanded = false;
  this.messageFocused = true; this.emailFocused = false;
  if (active()) {
    for (const [input,key] of [[this.message,'messageFocused'],[this.email,'emailFocused']]) {
      input.on('focus',(_e,cx)=>{this[key]=true;ensureNativeSelection(cx);cx.notify();});
      input.on('blur',(_e,cx)=>{this[key]=false;cx.notify();});
    }
  }
  loadDraft.call(this,cx);
}
export const overLimit = form => active() && [...form.message.value()].length > 4000;
export const unavailable = t => div().flex_none().px(16).pt(12).text_size(U.meta).text_color(t.blocked).child('Feedback is unavailable in source builds.');
export const draftNotice = t => div().flex_none().text_size(U.meta).text_color(t.muted).child('Agent draft · review before sending');
export const header = (form,t) => dialogHeader(t,form.sent?'Feedback sent':'Send feedback',()=>form.close());
const caption = (t,s) => div().text_size(U.font).line_height('18px').font_medium().text_color(t.foreground).child(s);
const inputFrame = (t,el,focused) => el.w_full().h(U.field).flex_none().px(U.gutter).rounded(U.radius).border_1().border_color(focused?t.input:t.border).bg(t.surface);
export function messageField(form,t,leaf) {
  const count=[...form.message.value()].length;
  return v_flex().id('feedback-message-section').w_full().flex_none().gap(6).child(caption(t,'Message'))
    .child(inputFrame(t,v_flex(),form.messageFocused).id('feedback-message-field').pr(0).h(168).pt(10).pb(6).gap(4)
      .child(leaf.id('feedback-message').w_full().h(128).flex_none().accessibility_label('Message'))
      .child(h_flex().flex_none().h(18).pr(U.gutter).justify_end().items_center().child(div().id('feedback-count').text_size(11).text_color(count>4000?t.blocked:t.dim).tooltip('Characters · maximum 4000').child(`${count} / 4000`))));
}
export function emailField(form,t,leaf) {
  return v_flex().id('feedback-email-section').w_full().flex_none().gap(6).child(caption(t,'Email'))
    .child(inputFrame(t,h_flex(),form.emailFocused).id('feedback-email-field').items_center().child(leaf.id('feedback-email').w_full().h_full().accessibility_label('Email')));
}
export function attachments(form,t,nativeDrop = null) {
  return v_flex().id('feedback-attachments').w_full().flex_none().gap(8).on_drop((e,cx)=>dropImages.call(form,e,cx,nativeDrop?()=>nativeDrop(e,cx):null))
    .child(h_flex().w_full().items_center().gap(8).child(caption(t,'Attachments'))
      .child(div().id('feedback-shot-count').text_size(11).text_color(t.dim).child(`${form.shots.length}/${MAX_SHOTS}`)).child(div().flex_1())
      .child(textButton(t,'feedback-add','Add image','mods/custom-workspace-chrome/plus.svg',(_e,cx)=>{if(!form.sending&&!form.sent&&form.shots.length<MAX_SHOTS)form.pick(cx);},{enabled:form.shots.length<MAX_SHOTS&&!form.sending&&!form.sent})))
    .child(div().id('feedback-attachments-help').text_size(U.meta).line_height('18px').text_color(t.muted).child('Drag or add images to attach them.'))
    .when(form.shots.length>0,el=>el.child(form.shots_row(t,false).id('feedback-thumbnails')));
}
export function preview(form,t,native) {
  return v_flex().id('feedback-preview').w_full().flex_none().gap(4)
    .child(h_flex().id('feedback-preview-trigger').w_full().tooltip('The exact JSON sent with your screenshots. No logs or install ID.')
      .child(Toggle.new('feedback-preview-toggle').pressed(form.previewExpanded).h(U.control).w_full().flex().items_center().justify_start().gap(6).rounded(U.radius).text_color(t.foreground).cursor_pointer()
        .accessibility_label(form.previewExpanded?'Collapse JSON preview':'Expand JSON preview').hover(el=>el.bg(t.hover))
        .on_change((open,cx)=>{cx.stop_propagation();form.previewExpanded=open;cx.notify();}).child(chevron(t,form.previewExpanded)).child('JSON preview')))
    .when(form.previewExpanded,el=>el.child(div().id('feedback-preview-help').text_size(U.meta).line_height('18px').text_color(t.muted).child('App details help diagnose issues. Preview exactly what will be sent.'))
      .child(v_flex().id('feedback-json').w_full().h(160).flex_none().rounded(U.radius).border_1().border_color(t.border).bg(t.surface)
        .child(dialogScrollArea(v_flex()).id('feedback-json-scroll').flex_1().child(dialogScrollBody(native).p(0)))));
}
export const success = t => v_flex().id('feedback-success').w_full().min_w(0).px(24).gap(U.gap).items_center().text_center()
  .child(svg('mods/custom-workspace-chrome/circle-check.svg').size(24).flex_none().text_color(t.dim))
  .child(div().id('feedback-thanks').max_w(360).text_size(U.meta).line_height('18px').text_color(t.muted).child('Thanks for helping us improve Herdr.'));
export const body = (form,node) => dialogScrollArea(v_flex()).id('feedback-scroll').flex_1().when(form.sent,el=>el.overflow_hidden())
  .child(dialogScrollBody(node).flex_none().gap(12).when(form.sent,el=>el.size_full().px(8).overflow_hidden().items_center().justify_center()));
export const footer = (t,node) => modalFooter(t,node).id('feedback-actions').gap(8).justify_end();
export function root(form,t,node) {
  return node.h(500).rounded(U.dialogRadius).overflow_hidden().bg(t.background).text_size(U.font);
}
export function viewerRoot(form,t) {
  return v_flex().id('feedback').track_focus(form.handle).w_full().min_h(0).h(500).rounded(U.dialogRadius).overflow_hidden().bg(t.background).text_size(U.font)
    .on_key_down((e,cx)=>{if(e.key==='escape'){form.view(-1,cx);cx.stop_propagation();}})
    .child(header(form,t)).child(viewer.call(form,t)).child(footer(t,h_flex()).child(button.call(form,t,'feedback-cancel','Cancel',()=>form.close())));
}

export function loadDraft(cx) {
    let file;
    try { file = `${String(appHome()).replace(/[\\/]+$/, "")}/${DRAFT_FILE}`; } catch { return; }
    cx.spawn(async (cx) => {
      try {
        const raw = await readTextFile(file);
        const draft = raw && parseDraft(raw);
        if (!draft) return;
        // Consume first: a draft fills one dialog only.
        await writeTextFile(file, JSON.stringify({ version: 1, consumed: true }) + "\n", raw);
        if (this.sending || this.sent) return;
        if (draft.message && !this.message.value().trim()) this.message.set_value(draft.message);
        if (draft.email && !this.email.value().trim()) this.email.set_value(draft.email);
        if (draft.images.length && !this.sent) this.add(feedbackAttachImages(draft.images.slice(0, MAX_SHOTS - this.shots.length)));
      } catch (e) { this.error = `Draft: ${String(e.message ?? e)}`; }
      cx.notify();
    });
  }

export function dropImages(e,cx,native = null) {
    cx.stop_propagation();
    if (this.sending || this.sent || !e.paths?.length) return;
    const remaining = MAX_SHOTS - this.shots.length;
    try {
      if (native) return native();
      if (remaining > 0) {
        this.add(feedbackAttachImages(e.paths.slice(0, remaining)));
        if (e.paths.length > remaining && !this.error && !isCustom()) this.error = "Up to 3 screenshots.";
      } else if (!isCustom()) this.error = "Up to 3 screenshots.";
    } catch (error) { this.error = String(error.message ?? error); }
    cx.notify();
  }

export function shots_row(t,showAdd = true,remove = null) {
    const skin = isCustom();
    const thumb = (path, i) => div().id(`shot-${i}`).relative().h(72).rounded(6).overflow_hidden().border_1().border_color(t.border)
      .when(skin, e => e.cursor_pointer().tooltip("View").on_click((_e, cx) => this.view(i, cx)))
      .child(image(path).h(72))
      .child(div().id(`shot-x-${i}`).absolute().top(4).right(4).size(20).rounded(10).bg(t.raised).text_color(t.foreground)
        .flex().items_center().justify_center().text_size(12).cursor_pointer()
        .when(skin, e => e.size(U.insetControl).rounded(U.insetRadius).bg(t.surface).hover(s => s.bg(t.hover)))
        .on_click((_e, cx) => { cx.stop_propagation(); if (this.sending || this.sent) return; if (remove) remove(path,i,_e,cx); else { this.shots.splice(i, 1); this.error = null; cx.notify(); } this.viewing = null; })
        .child(skin ? svg("mods/custom-pane/close.svg").size(U.smallIcon) : "×"));
    return h_flex().w_full().gap(8).items_center()
      .children(this.shots.map(thumb))
      .when(showAdd && this.shots.length < MAX_SHOTS, (el) => el.child(skin ? textButton(t, "feedback-add", "Add image", "mods/custom-workspace-chrome/plus.svg", (_e, cx) => this.pick(cx), { enabled: !this.sending && !this.sent }) : this.button(t, "feedback-add", "Add screenshot", (_e, cx) => this.pick(cx))));
  }

export function view(i,cx) { this.viewing = i >= 0 && i < this.shots.length ? i : null; cx.notify(); }

export function viewer(t) {
    const i = this.viewing, n = this.shots.length;
    const nav = (id, label, to) => textButton(t, id, label, null, (_e, cx) => this.view(to, cx), { enabled: to >= 0 && to < n });
    return v_flex().id("feedback-viewer").flex_1().min_h(0).w_full().p(U.gutter).gap(8)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(h_flex().id("feedback-viewer-bar").w_full().flex_none().items_center().gap(8)
        .child(div().id("feedback-viewer-count").text_size(U.meta).text_color(t.muted).child(`Screenshot ${i + 1} of ${n}`))
        .child(div().flex_1())
        .when(n > 1, el => el.child(nav("feedback-viewer-prev", "Previous", i - 1)).child(nav("feedback-viewer-next", "Next", i + 1)))
        .child(textButton(t, "feedback-viewer-close", "Close", null, (_e, cx) => this.view(-1, cx))))
      .child(h_flex().id("feedback-viewer-frame").flex_1().min_h(0).w_full().items_center().justify_center().overflow_hidden()
        .rounded(U.radius).border_1().border_color(t.border).bg(t.surface)
        .child(div().id("feedback-viewer-image").cursor_pointer().on_click((_e, cx) => this.view(-1, cx))
          .child(image(this.shots[i]).h(330))));
  }

export function button(t,id,label,action,primary = false,disabled = false) {
    if (isCustom()) return uiButton(t, id, label, action, { primary, enabled: !disabled }).w(76);
    return div().id(id).px(14).py(7).rounded(7).border_1().border_color(t.border)
      .bg(primary && !disabled ? t.accent : t.raised)
      .text_color(primary && !disabled ? t.accent_foreground : t.muted)
      .cursor_pointer().on_click((e, cx) => { if (!disabled) action(e, cx); }).child(label);
  }
