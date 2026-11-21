import { View, div, image, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextareaState, Textarea, Toggle } from "gpui-base";
import { theme, props, closeOverlay, feedbackPreview, feedbackPasteImage, feedbackPickImages, feedbackAttachImages, feedbackClearImages, sendFeedback, appHome, readTextFile, writeTextFile } from "./host.js";

import { U, dialogHeader, field as uiField, button as uiButton, textButton, chevron, dialogScrollArea, dialogScrollBody } from "./custom-ui.js";
import { isCustom, liveTheme, ensureNativeSelection } from "./custom-look.js";

import { modalFooter } from './custom-modal-layout.js';

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

export default class Feedback extends View {
  init(_props, cx) {
    ensureNativeSelection(cx);
    this.message = TextareaState.new({ value: props()?.message ?? "", placeholder: "What happened? What did you expect?", rows: 4 });
    this.email = InputState.new({ placeholder: isCustom() ? "you@example.com (optional)" : "Email (optional)" });
    this.previewExpanded = false;
    this.messageFocused = true; this.emailFocused = false;
    this.message.on("focus", (_e, cx) => { this.messageFocused = true; ensureNativeSelection(cx); cx.notify(); });
    this.message.on("blur", (_e, cx) => { this.messageFocused = false; cx.notify(); });
    this.email.on("focus", (_e, cx) => { this.emailFocused = true; ensureNativeSelection(cx); cx.notify(); });
    this.email.on("blur", (_e, cx) => { this.emailFocused = false; cx.notify(); });
    this.message.on("change", (_e, cx) => { this.error = null; cx.notify(); });
    this.email.on("change", (_e, cx) => { this.error = null; cx.notify(); });
    // A paste with no text: a screenshot, if the clipboard holds one.
    this.message.on("paste_other", (_e, cx) => {
      if (this.shots.length < MAX_SHOTS) this.add([feedbackPasteImage()].filter(Boolean));
      else if (!isCustom()) this.error = "Up to 3 screenshots.";
      cx.notify();
    });
    feedbackClearImages();
    this.shots = [];
    this.sending = false;
    this.sent = false;
    this.error = null;
    this.handle = cx.focus_handle();
    this.message.focus();
    this.loadDraft(cx);
  }

  loadDraft(cx) {
    let file;
    try { file = `${String(appHome()).replace(/[\\/]+$/, "")}/${DRAFT_FILE}`; } catch { return; }
    cx.spawn(async (cx) => {
      try {
        const raw = await readTextFile(file);
        const draft = raw && parseDraft(raw);
        if (!draft) return;
        // Consume first: a draft fills one dialog only.
        await writeTextFile(file, JSON.stringify({ version: 1, consumed: true }) + "\n", raw);
        if (draft.message && !this.message.value().trim()) this.message.set_value(draft.message);
        if (draft.email && !this.email.value().trim()) this.email.set_value(draft.email);
        if (draft.images.length && !this.sent) this.add(feedbackAttachImages(draft.images.slice(0, MAX_SHOTS - this.shots.length)));
      } catch (e) { this.error = `Draft: ${String(e.message ?? e)}`; }
      cx.notify();
    });
  }

  close() { closeOverlay(props()?.overlay); }

  /** Takes `{ path }`s up to the limit; the first `{ error }` is shown. */
  add(results) {
    this.error = null;
    for (const r of results) {
      if (r.error) this.error = r.error;
      else if (this.shots.length < MAX_SHOTS) this.shots.push(r.path);
      else if (!isCustom()) this.error = "Up to 3 screenshots.";
    }
  }

  dropImages(e, cx) {
    cx.stop_propagation();
    if (this.sending || this.sent || !e.paths?.length) return;
    const remaining = MAX_SHOTS - this.shots.length;
    try {
      if (remaining > 0) {
        this.add(feedbackAttachImages(e.paths.slice(0, remaining)));
        if (e.paths.length > remaining && !this.error && !isCustom()) this.error = "Up to 3 screenshots.";
      } else if (!isCustom()) this.error = "Up to 3 screenshots.";
    } catch (error) { this.error = String(error.message ?? error); }
    cx.notify();
  }

  pick(cx) {
    cx.spawn(async (cx) => {
      try { this.add(await feedbackPickImages()); }
      catch (e) { this.error = String(e.message ?? e); }
      cx.notify();
    });
  }

  shots_row(t, showAdd = true) {
    const skin = isCustom();
    const thumb = (path, i) => div().id(`shot-${i}`).relative().h(72).rounded(6).overflow_hidden().border_1().border_color(t.border)
      .when(skin, e => e.cursor_pointer().tooltip("View").on_click((_e, cx) => this.view(i, cx)))
      .child(image(path).h(72))
      .child(div().id(`shot-x-${i}`).absolute().top(4).right(4).size(20).rounded(10).bg(t.raised).text_color(t.foreground)
        .flex().items_center().justify_center().text_size(12).cursor_pointer()
        .when(skin, e => e.size(U.insetControl).rounded(U.insetRadius).bg(t.surface).hover(s => s.bg(t.hover)))
        .on_click((_e, cx) => { cx.stop_propagation(); this.shots.splice(i, 1); this.viewing = null; this.error = null; cx.notify(); })
        .child(skin ? svg("mods/custom-pane/close.svg").size(U.smallIcon) : "×"));
    return h_flex().w_full().gap(8).items_center()
      .children(this.shots.map(thumb))
      .when(showAdd && this.shots.length < MAX_SHOTS, (el) => el.child(skin ? textButton(t, "feedback-add", "Add image", "mods/custom-workspace-chrome/plus.svg", (_e, cx) => this.pick(cx), { enabled: !this.sending && !this.sent }) : this.button(t, "feedback-add", "Add screenshot", (_e, cx) => this.pick(cx))));
  }

  view(i, cx) { this.viewing = i >= 0 && i < this.shots.length ? i : null; cx.notify(); }

  /** One screenshot, large, in place of the form; Back, Esc or a click on it returns. */
  viewer(t) {
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

  button(t, id, label, action, primary = false, disabled = false) {
    if (isCustom()) return uiButton(t, id, label, action, { primary, enabled: !disabled }).w(76);
    return div().id(id).px(14).py(7).rounded(7).border_1().border_color(t.border)
      .bg(primary && !disabled ? t.accent : t.raised)
      .text_color(primary && !disabled ? t.accent_foreground : t.muted)
      .cursor_pointer().on_click((e, cx) => { if (!disabled) action(e, cx); }).child(label);
  }

  renderSkin(cx, preview) {
    const t = liveTheme();
    const message = this.message.value();
    const count = [...message].length;
    const disabled = !preview.available || this.sending || !message.trim() || count > 4000;
    const viewing = !this.sent && this.viewing != null && this.viewing < this.shots.length;
    const caption = text => div().text_size(U.font).line_height("18px").font_medium().text_color(t.foreground).child(text);
    // Chrome must not supply a text-color refinement to native selection painting.
    const inputFrame = (el, focused) => el.w_full().h(U.field).flex_none().px(U.gutter)
      .rounded(U.radius).border_1().border_color(focused ? t.input : t.border).bg(t.surface);
    return v_flex().id("feedback").track_focus(this.handle).w_full().min_h(0).h(500)
      .rounded(U.dialogRadius).overflow_hidden().bg(t.background).text_size(U.font)
      .on_drop((e, cx) => this.dropImages(e, cx))
      .on_key_down((e, cx) => { if (e.key === "escape") { if (viewing) this.view(-1, cx); else this.close(); cx.stop_propagation(); } })
      .child(dialogHeader(t, this.sent ? "Feedback sent" : "Send feedback", () => this.close()))
      .when(!preview.available, el => el.child(div().flex_none().px(16).pt(12).text_size(U.meta).text_color(t.blocked).child("Feedback is unavailable in source builds.")))
      .when(viewing, el => el.child(this.viewer(t)))
      .when(!viewing, el => el.child(dialogScrollArea(v_flex()).id('feedback-scroll').flex_1()
        .when(this.sent, el => el.overflow_hidden())
        .child(dialogScrollBody(v_flex()).id("feedback-body").flex_none().gap(12)
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .when(!this.sent && props()?.from === "agent", el => el.child(div().flex_none().text_size(U.meta).text_color(t.muted).child("Agent draft · review before sending")))
        .when(this.sent, el => el.size_full().px(8).overflow_hidden().items_center().justify_center()
          .child(v_flex().id("feedback-success").w_full().min_w(0).px(24).gap(U.gap).items_center().text_center()
            .child(svg("mods/custom-workspace-chrome/circle-check.svg").size(24).flex_none().text_color(t.dim))
            .child(div().id("feedback-thanks").max_w(360).text_size(U.meta).line_height("18px").text_color(t.muted).child("Thanks for helping us improve Herdr."))))
        .when(!this.sent, el => el
          .child(v_flex().id("feedback-email-section").w_full().flex_none().gap(6)
            .child(caption("Email"))
            .child(inputFrame(h_flex(), this.emailFocused).id("feedback-email-field").items_center()
              .child(Input.new(this.email).id("feedback-email").w_full().h_full().accessibility_label("Email"))))
          .child(v_flex().id("feedback-message-section").w_full().flex_none().gap(6)
            .child(caption("Message"))
            // No right padding: the textarea's own scrollbar sits on the field's edge (DIALOG_SCROLL.rightInset 0).
            .child(inputFrame(v_flex(), this.messageFocused).id("feedback-message-field").pr(0).h(168).pt(10).pb(6).gap(4)
              .child(Textarea.new(this.message).id("feedback-message").w_full().h(128).flex_none().accessibility_label("Message"))
              // Reserved space inside the field, not an overlay on text/caret/scrollbar.
              .child(h_flex().flex_none().h(18).pr(U.gutter).justify_end().items_center()
                .child(div().id("feedback-count").text_size(11).text_color(count > 4000 ? t.blocked : t.dim)
                  .tooltip("Characters · maximum 4000").child(`${count} / 4000`)))))
          .child(v_flex().id("feedback-attachments").w_full().flex_none().gap(8)
            .on_drop((e, cx) => this.dropImages(e, cx))
            .child(h_flex().w_full().items_center().gap(8)
              .child(caption("Attachments"))
              .child(div().id("feedback-shot-count").text_size(11).text_color(t.dim).child(`${this.shots.length}/${MAX_SHOTS}`))
              .child(div().flex_1())
              .child(textButton(t, "feedback-add", "Add image", "mods/custom-workspace-chrome/plus.svg", (_e, cx) => this.pick(cx),
                { enabled: this.shots.length < MAX_SHOTS && !this.sending && !this.sent })))
            .child(div().id("feedback-attachments-help").text_size(U.meta).line_height("18px").text_color(t.muted)
              .child("Drag or add images to attach them."))
            .when(this.shots.length > 0, el => el.child(this.shots_row(t, false).id("feedback-thumbnails"))))
          .child(v_flex().id("feedback-preview").w_full().flex_none().gap(4)
            .child(h_flex().id("feedback-preview-trigger").w_full()
              .tooltip("The exact JSON sent with your screenshots. No logs or install ID.")
              .child(Toggle.new("feedback-preview-toggle").pressed(this.previewExpanded)
                .h(U.control).w_full().flex().items_center().justify_start().gap(6).rounded(U.radius).text_color(t.foreground).cursor_pointer()
                .accessibility_label(this.previewExpanded ? "Collapse JSON preview" : "Expand JSON preview")
                .hover(el => el.bg(t.hover))
                .on_change((open, cx) => { cx.stop_propagation(); this.previewExpanded = open; cx.notify(); })
                .child(chevron(t, this.previewExpanded)).child("JSON preview")))
            .when(this.previewExpanded, el => el.child(div().id("feedback-preview-help").text_size(U.meta).line_height("18px").text_color(t.muted)
              .child("App details help diagnose issues. Preview exactly what will be sent.")))
            .when(this.previewExpanded, el => el.child(v_flex().id("feedback-json").w_full().h(160).flex_none()
              .rounded(U.radius).border_1().border_color(t.border).bg(t.surface)
              .child(dialogScrollArea(v_flex()).id('feedback-json-scroll').flex_1()
                .child(dialogScrollBody(v_flex()).pl(0).py(0)
                  .children(JSON.stringify(preview.body, null, 2).split("\n").map(line => div().flex_none().text_size(11).line_height("15px").text_color(t.dim).child(line))))))))))))
      .when(Boolean(this.error), el => el.child(div().flex_none().px(16).pb(12).text_size(U.meta).text_color(t.blocked).child(this.error)))
      .child(modalFooter(t,h_flex()).id("feedback-actions").gap(8).justify_end()
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .child(this.button(t, "feedback-cancel", this.sent ? "Done" : "Cancel", () => this.close()))
        .when(!this.sent, el => el.child(this.button(t, "feedback-send", this.sending ? "Sending…" : "Send", (_e, cx) => this.send(preview.body, cx), true, disabled))));
  }

  send(body, cx) {
    if (this.sending || this.sent) return;
    this.sending = true;
    this.error = null;
    cx.notify();
    cx.spawn(async (cx) => {
      try { this.error = await sendFeedback(body, this.shots); this.sent = !this.error; }
      catch (e) { this.error = String(e.message ?? e); }
      this.sending = false;
      cx.notify();
    });
  }

  render(cx) {
    const skin = isCustom();
    const t = skin ? liveTheme() : theme();
    const preview = feedbackPreview(this.message.value(), this.email.value(), this.shots.length);
    const body = preview.body;
    if (skin) return this.renderSkin(cx, preview);
    const disabled = !preview.available || this.sending || !this.message.value().trim();
    const label = (text) => div().text_size(13).text_color(t.muted).child(text);
    const field = (el, focused = false) => skin ? uiField(t, el, focused).w_full() : el.w_full().p(10).rounded(7).border_1().border_color(t.border).bg(t.background).text_color(t.foreground).text_size(14);
    return v_flex().id("feedback").track_focus(this.handle).w_full().min_h(0).h(650).bg(t.popover)
      .when(skin, el => el.bg(t.background).text_size(U.font).text_color(t.foreground))
      .on_drop((e, cx) => {
        if (this.sending || this.sent) return;
        if (this.shots.length >= MAX_SHOTS) this.error = "Up to 3 screenshots.";
        else this.add(feedbackAttachImages(e.paths.slice(0, MAX_SHOTS - this.shots.length)));
        cx.notify();
      })
      .on_key_down((e, cx) => { if (e.key === "escape") { this.close(); cx.stop_propagation(); } })
      // The title drags the window; everything below keeps its presses (selecting text).
      .child(skin ? dialogHeader(t, "Send feedback", () => this.close()) : div().flex_none().px(24).py(18).cursor_grab().text_size(19).font_semibold().text_color(t.foreground).child("Send feedback"))
      .when(!preview.available, (el) => el.child(div().flex_none().px(24).pb(12).text_size(13).text_color(t.accent).child("This build was made from source and doesn't send feedback. Use a release build.")))
      .child(v_flex().id("feedback-body").on_mouse_down("left", (_e, cx) => cx.stop_propagation()).flex_1().flex_shrink(1).min_h(0).overflow_y_scrollbar().px(24).gap(10)
        .when(skin, el => el.p(16).gap(12))
        .when(props()?.from === "agent", (el) => el.child(div().p(10).rounded(7).bg(t.raised).text_color(t.accent).text_size(14).child("Drafted by an agent: read it before sending")))
        .when(this.sent, (el) => el.child(div().py(20).text_size(16).text_color(t.foreground).child("Sent. Thanks for helping us improve Herdr.")))
        .when(!this.sent, (el) => el
          .child(label("Your message (up to 4000 characters). Paste or drop screenshots, up to 3."))
          .child(field(Textarea.new(this.message), this.messageFocused).h(130).when(skin, el => el.py(10)))
          .child(this.shots_row(t))
          .child(label("Email: only if you want a reply"))
          .child(field(Input.new(this.email), this.emailFocused).h(skin ? U.field : 40))
          .child(label("What we send: exactly this JSON, plus the screenshots above. No logs or install ID."))
          .child(v_flex().w_full().p(10).rounded(7).border_1().border_color(t.border).bg(t.background)
            .children(JSON.stringify(body, null, 2).split("\n").map((line) => div().text_size(11).line_height("15px").text_color(t.dim).child(line))))))
      .when(Boolean(this.error), (el) => el.child(div().flex_none().px(24).pt(10).text_size(13).text_color(t.accent).child(this.error)))
      .child(h_flex().flex_none().px(24).py(16).gap(10).justify_end().on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .when(skin, el => el.px(16).gap(8).border_t(1).border_color(t.border))
        .child(this.button(t, "feedback-cancel", this.sent ? "Done" : "Cancel", () => this.close()))
        .when(!this.sent, (el) => el.child(this.button(t, "feedback-send", this.sending ? "Sending…" : "Send", (_e, cx) => this.send(body, cx), true, disabled))));
  }
}
