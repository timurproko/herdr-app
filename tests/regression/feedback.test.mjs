import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Entirely synthetic: never opens a picker, reads the clipboard, or sends feedback.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function element(kind = 'div') {
  const node = { kind, kids: [], style: {}, events: {} };
  let proxy;
  proxy = new Proxy(node, { get(o, key) {
    if (key in o) return o[key];
    if (key === 'then') return undefined;
    if (key === 'when') return (yes, fn) => yes ? fn(proxy) : proxy;
    if (key === 'child') return child => { if (child != null) o.kids.push(child); return proxy; };
    if (key === 'children') return children => { o.kids.push(...children.filter(x => x != null)); return proxy; };
    if (key === 'hover') return fn => { o.hover = element('hover'); fn(o.hover); return proxy; };
    if (String(key).startsWith('on_')) return (...args) => { o.events[key] = args.at(-1); return proxy; };
    return (...args) => { o.style[key] = args; return proxy; };
  } });
  return proxy;
}
function nodes(node, out = []) { if (node && typeof node === 'object') { out.push(node); for (const kid of node.kids ?? []) nodes(kid, out); } return out; }
const text = node => nodes(node).flatMap(n => n.kids.filter(k => typeof k === 'string')).join('\n');
const byId = (view, id) => nodes(view).find(n => n.style.id?.[0] === id);
let stateCreations = 0, selectionFocusEvents = 0;
function state(options = {}) {
  stateCreations++;
  let value = options.value ?? '';
  const events = {};
  return { options, events, value: () => value, set_value: v => { value = v; }, focus() {}, on(name, fn) { events[name] = fn; } };
}
let draftRaw = null, draftWrites = [], skin = true, props = {}, available = true, sendError = null, attachError = null, pickerCalls = 0, pasteCalls = 0, clearCalls = 0, notifications = 0, stopped = 0;
const draftReads = [], jobs = [], sends = [], attached = [], closed = [];
const cx = { notify: () => notifications++, stop_propagation() { stopped++; }, focus_handle: () => ({}), spawn: fn => jobs.push(fn) };
const t = { background:'#181818', surface:'#1e1e1e', popover:'#202020', raised:'#222222', border:'#282828', input:'#444444', foreground:'#fafafa', muted:'#a3a3a3', dim:'#888888', hover:'#303030', blocked:'#ee5555', accent:'#66aaff', solid:'#eeeeee', solid_foreground:'#111111' };
const kit = { View: class {}, div: () => element(), svg: asset => element('svg').asset(asset), image: asset => element('image').asset(asset) };
const base = { v_flex: () => element('vflex'), h_flex: () => element('hflex'), InputState: { new: state }, TextareaState: { new: state }, Input: { new: s => element('input').state(s) }, Textarea: { new: s => element('textarea').state(s) }, Toggle: { new: id => element('toggle').id(id) }, Popover: {} };
const api = {
  theme: () => t, props: () => props, closeOverlay: id => closed.push(id),
  feedbackPreview: (message, email, images) => ({ available, body: { v:1, message, email:email || null, images } }),
  appHome: () => "C:\fixture\herdr-app\\",
  readTextFile: async file => { draftReads.push(file); return draftRaw; },
  writeTextFile: async (file, text, expected) => { draftWrites.push({ file, text, expected }); return null; },
  feedbackClearImages: () => clearCalls++,
  feedbackPasteImage: () => { pasteCalls++; return { path:'fixture-paste.png' }; },
  feedbackPickImages: async () => { pickerCalls++; return [{ path:'fixture-picked.png' }]; },
  feedbackAttachImages: paths => { attached.push(paths); if (attachError) throw Error(attachError); return paths.map(p => p === 'invalid.txt' ? { error:'Choose an image.' } : { path:`fixture-converted-${p}` }); },
  sendFeedback: async (body, images) => { sends.push({ body, images:[...images] }); return sendError; },
};
const context = vm.createContext({ console });
const synthetic = (name, values) => new vm.SyntheticModule(Object.keys(values), function () { for (const [k,v] of Object.entries(values)) this.setExport(k,v); }, { context, identifier:name });
const cache = new Map();
async function load(file) {
  if (cache.has(file)) return cache.get(file);
  const mod = new vm.SourceTextModule(fs.readFileSync(file,'utf8'), { context, identifier:file }); cache.set(file,mod);
  await mod.link(specifier => {
    if (specifier === 'gpui-kit') return synthetic(specifier,kit);
    if (specifier === 'gpui-base') return synthetic(specifier,base);
    if (specifier === './host.js') return synthetic(specifier,api);
    if (specifier === './custom-look.js') return synthetic(specifier,{ isCustom:() => skin, liveTheme:() => t, ensureNativeSelection:() => selectionFocusEvents++ });
    if (specifier === './feedback-ui.js') return load(path.join(root,'frame-patches/feedback/feedback-ui.js'));
    if (specifier === './custom-ui.js') return load(path.join(root,'lib/ui.js'));
    if (specifier === './custom-modal-layout.js') return load(path.join(root,'lib/modal-layout.js'));
    throw Error(`Unexpected import: ${specifier}`);
  });
  return mod;
}
const mod = await load(path.join(root,'frame-patches/feedback/main.js')); await mod.evaluate();
// The one-time draft load is spawned on init; keep it apart from the send/pick jobs.
const fresh = () => { const form = new mod.namespace.default(); const before = jobs.length; form.init({},cx); form.draftJob = jobs.splice(before, 1)[0]; return form; };
const form = fresh();
let view = form.render(cx);
assert.equal(view.style.h[0],500);
assert.equal(text(byId(view,'dialog-title')),'Send feedback');
assert.equal(view.style.rounded[0],8);assert.ok(view.style.overflow_hidden);assert.equal(view.style.border_1,undefined,'Native host remains the only outer border');
assert.equal(view.style.text_color,undefined,'No inherited foreground refinement over native selection painting');
for(const id of ['feedback-email-field','feedback-message-field','feedback-email','feedback-message']) {
  const node=byId(view,id);assert.equal(node.style.text_color,undefined);assert.equal(node.events.on_mouse_down,undefined);assert.equal(node.events.on_mouse_move,undefined,'Native editor owns caret and selection gestures');
}
assert.equal(byId(view,'feedback-message').style.h[0],128,'Native multiline leaf has a definite paint/hitbox height, not only flex constraints');
assert.equal(byId(view,'feedback-message').style.text_size,undefined,'Use native editor text/selection painting');
form.message.events.focus({},cx);form.email.events.focus({},cx);assert.equal(selectionFocusEvents,3,'Native high-contrast token is enabled before editor creation and on both fields focusing');
assert.equal(byId(view,'feedback-email-section').kids[0].style.text_color[0],t.foreground);assert.equal(byId(view,'feedback-message-section').kids[0].style.text_color[0],t.foreground);
assert.equal(byId(view,'feedback-preview-help'),undefined,'Diagnostic details collapse with the JSON preview');
assert.equal(form.email.options.placeholder,'you@example.com (optional)');
assert.equal(clearCalls,1);
const sections = byId(view,'feedback-body').kids.map(n => n.style.id?.[0]);
assert.deepEqual(sections,['feedback-email-section','feedback-message-section','feedback-attachments','feedback-preview']);
assert.equal(byId(view,'feedback-email-field').style.h[0],32);
assert.equal(byId(view,'feedback-message-field').style.h[0],168);
assert.equal(byId(view,'feedback-drop-zone'),undefined,'No permanent drop block');
const attachmentsHelp = byId(view,'feedback-attachments-help');
assert.equal(text(attachmentsHelp),'Drag or add images to attach them.');
assert.equal(text(byId(view,'feedback-add')),'Add image');
assert.ok(nodes(byId(view,'feedback-add')).some(n => n.kind === 'svg' && n.style.asset?.[0] === 'mods/custom-workspace-chrome/plus.svg'),'Keep the plus icon on Add image');
assert.equal(attachmentsHelp.style.text_color[0],t.muted);
assert.equal(attachmentsHelp.style.h,undefined,'Helper text reserves no drop-block space');
assert.equal(typeof view.events.on_drop,'function','Dialog still accepts file drops');
assert.equal(typeof byId(view,'feedback-attachments').events.on_drop,'function','Attachment area also accepts drops');
assert.equal(byId(view,'feedback-json'),undefined,'JSON is collapsed by default');
assert.equal(byId(view,'feedback-preview-toggle').style.pressed[0],false);
assert.ok(byId(view,'feedback-preview-toggle').style.justify_start,'Disclosure aligns with the form, overriding native centered Toggle styling');
assert.ok(byId(view,'feedback-preview-trigger').style.tooltip[0].includes('No logs or install ID'));
assert.equal(byId(view,'feedback-preview-toggle').style.tooltip,undefined,'Native Toggle needs a plain wrapper to own hover/tooltips');
assert.equal(byId(view,'feedback-count').kids[0],'0 / 4000');
assert.ok(nodes(byId(view,'feedback-message-field')).includes(byId(view,'feedback-count')),'Counter belongs inside the field');
assert.ok(byId(view,'feedback-message-field').kids.at(-1).style.justify_end,'Counter occupies a reserved bottom-right rail, not editable text space');
for (const verbose of ['Your message (up to','Email: only if','What we send: exactly']) assert.ok(!text(view).includes(verbose));
assert.equal(byId(view,'feedback-send').style.disabled[0],true);
form.message.set_value('Hello 🙂');form.email.set_value('fixture@example.invalid');
const beforeChange = notifications;form.message.events.change({},cx);assert.ok(notifications > beforeChange);
view = form.render(cx);assert.equal(byId(view,'feedback-count').kids[0],'7 / 4000','Count uses Unicode code points and updates on change');
assert.equal(byId(view,'feedback-send').style.disabled[0],false);
const created = stateCreations;
byId(view,'feedback-preview-toggle').events.on_change(true,cx);view = form.render(cx);
const previewHelp = byId(view,'feedback-preview-help');
assert.ok(text(previewHelp).includes('help diagnose issues'),'Expanded preview explains why diagnostic JSON is included');
assert.equal(previewHelp.style.text_color[0],t.muted);
assert.equal(attachmentsHelp.style.text_size[0],previewHelp.style.text_size[0]);
assert.equal(attachmentsHelp.style.line_height[0],previewHelp.style.line_height[0]);
assert.equal(byId(view,'feedback-json').style.h[0],160);assert.ok(byId(view,'feedback-json-scroll').style.overflow_y_scrollbar);assert.equal(byId(view,'feedback-json-scroll').style.ml[0],8);assert.equal(byId(view,'feedback-json-scroll').style.mr[0],0);assert.equal(byId(view,'feedback-scroll').style.ml[0],8);assert.equal(byId(view,'feedback-scroll').style.mr[0],0);assert.equal(byId(view,'feedback-scroll').style.my[0],8);assert.equal(byId(view,'feedback-scroll').style.p,undefined,'Padding belongs to the inner stack, not the viewport');
assert.ok(text(byId(view,'feedback-json')).includes('fixture@example.invalid'));
assert.equal(view.style.h[0],500,'Expanding JSON does not resize the dialog');
form.message.set_value('Updated draft');form.message.events.change({},cx);view = form.render(cx);assert.ok(text(byId(view,'feedback-json')).includes('Updated draft'));
byId(view,'feedback-preview-toggle').events.on_change(false,cx);view = form.render(cx);
assert.equal(byId(view,'feedback-preview-help'),undefined,'Collapsing hides the explanatory text as well as the JSON');
assert.ok(byId(view,'feedback-attachments-help'),'Attachment instructions remain independent of the JSON disclosure');
assert.equal(byId(view,'feedback-json'),undefined);assert.equal(form.message.value(),'Updated draft');assert.equal(stateCreations,created,'Disclosure never recreates editors or discards drafts');
form.email.events.focus({},cx);view = form.render(cx);assert.equal(byId(view,'feedback-email-field').style.border_color[0],t.input);
form.message.set_value('x'.repeat(4001));view = form.render(cx);assert.equal(byId(view,'feedback-count').style.text_color[0],t.blocked);assert.equal(byId(view,'feedback-send').style.disabled[0],true);
byId(view,'feedback-send').events.on_click({},cx);assert.equal(sends.length,0);assert.equal(form.message.value().length,4001,'Over-limit text is not silently truncated');
form.message.set_value('A useful report');
view = form.render(cx);byId(view,'feedback-add').events.on_click({},cx);await jobs.shift()(cx);assert.equal(pickerCalls,1);assert.equal(form.shots[0],'fixture-picked.png');
form.message.events.paste_other({},cx);assert.equal(pasteCalls,1);
view = form.render(cx);view.events.on_drop({ paths:['a','b','c'] },cx);assert.equal(attached.at(-1).length,1,'Native conversion receives only the remaining screenshot slots');assert.equal(form.shots.length,3);
view = form.render(cx);assert.equal(byId(view,'feedback-shot-count').kids[0],'3/3');assert.equal(byId(view,'feedback-add').style.disabled[0],true);assert.equal(nodes(view).filter(n=>n.style.id?.[0]==='feedback-add').length,1,'One attachment action, not duplicate buttons');
form.message.events.paste_other({},cx);assert.equal(pasteCalls,1,'No clipboard call after the limit');assert.equal(form.error,null,'The counter and disabled action explain the limit without a warning');
byId(view,'shot-x-0').events.on_click({},cx);assert.equal(form.shots.length,2);view = form.render(cx);assert.equal(byId(view,'feedback-shot-count').kids[0],'2/3');
available = false;view = form.render(cx);assert.ok(text(view).includes('unavailable in source builds'));assert.equal(byId(view,'feedback-send').style.disabled[0],true);available = true;
view = form.render(cx);byId(view,'feedback-send').events.on_click({},cx);assert.equal(form.sending,true);assert.equal(jobs.length,1);view = form.render(cx);assert.equal(byId(view,'feedback-send').style.disabled[0],true);
byId(view,'feedback-send').events.on_click({},cx);assert.equal(jobs.length,1,'No duplicate in-flight send');await jobs.shift()(cx);
assert.equal(sends.length,1);assert.equal(sends[0].body.message,'A useful report');assert.equal(sends[0].body.email,'fixture@example.invalid');assert.equal(sends[0].images.length,2);assert.equal(form.sent,true);
view = form.render(cx);assert.equal(byId(view,'feedback-send'),undefined);assert.equal(byId(view,'feedback-email'),undefined);
const success=byId(view,'feedback-success');assert.ok(success);assert.ok(success.style.items_center);assert.ok(success.style.text_center);
const successBody=byId(view,'feedback-body');assert.ok(successBody.style.items_center);assert.ok(successBody.style.justify_center);assert.ok(successBody.style.overflow_hidden);
assert.equal(success.kids[0].kind,'svg');assert.equal(success.kids[0].style.asset[0],'mods/custom-workspace-chrome/circle-check.svg');assert.equal(success.kids[0].style.size[0],24);assert.equal(success.kids[0].style.text_color[0],t.dim);
assert.equal(text(byId(view,'dialog-title')),'Feedback sent','Success belongs in the main dialog title');
assert.equal(success.kids.length,2,'Success content contains only the icon and thank-you text');
assert.equal(text(successBody),'Thanks for helping us improve Herdr.','Keep the original thank-you sentence without repeating Feedback sent');
assert.equal(byId(view,'feedback-thanks').style.text_color[0],t.muted,'The thank-you line stays muted, not white');
assert.notEqual(byId(view,'feedback-thanks').style.text_color[0],t.foreground);
assert.equal(view.style.h[0],500,'Success preserves the draggable window footprint and footer');assert.ok(text(byId(view,'feedback-cancel')).includes('Done'));
byId(view,'feedback-cancel').events.on_click({},cx);assert.equal(closed.length,1);
props = { from:'agent', message:'Fixture agent draft' };const drafted = fresh();assert.equal(drafted.message.value(),'Fixture agent draft');assert.ok(text(drafted.render(cx)).includes('review before sending'));
sendError = 'Fixture failure';drafted.send({ message:'Fixture agent draft' },cx);await jobs.shift()(cx);assert.equal(drafted.error,'Fixture failure');assert.equal(drafted.sent,false);
assert.equal(byId(drafted.render(cx),'feedback-success'),undefined,'Failure must not show success');
assert.equal(text(byId(drafted.render(cx),'dialog-title')),'Send feedback','Failure retains the form title');
drafted.sent=true;assert.ok(!text(drafted.render(cx)).includes('Agent draft · review before sending'),'Sent state no longer shows the draft-review banner');
props = {};
const dropped = fresh();dropped.message.set_value('Keep my draft');dropped.email.set_value('drop@example.invalid');
view = dropped.render(cx);
const stoppedBeforeDrop = stopped;
byId(view,'feedback-attachments').events.on_drop({paths:['first.png','second.jpg']},cx);
assert.equal(stopped,stoppedBeforeDrop+1,'Consume the drop rather than forwarding it to underlying terminals');
assert.equal(dropped.shots.length,2);assert.equal(dropped.message.value(),'Keep my draft');assert.equal(dropped.email.value(),'drop@example.invalid');
view = dropped.render(cx);
const attachmentIds = view => byId(view,'feedback-attachments').kids.map(n => n.style.id?.[0]).filter(Boolean);
assert.equal(attachmentIds(view).join(','),'feedback-attachments-help,feedback-thumbnails','Images appear below the compact description');
assert.equal(byId(view,'feedback-drop-zone'),undefined);
byId(view,'feedback-attachments').events.on_drop({paths:['third.webp','fourth.png']},cx);
assert.equal(dropped.shots.length,3);assert.equal(attached.at(-1).length,1);assert.equal(dropped.error,null,'An oversized drop attaches available slots without a redundant limit warning');
view = dropped.render(cx);assert.equal(byId(view,'feedback-drop-zone'),undefined,'No block appears at the attachment limit');
assert.equal(attachmentIds(view).join(','),'feedback-attachments-help,feedback-thumbnails');
const fullCalls = attached.length;byId(view,'feedback-attachments').events.on_drop({paths:['extra.png']},cx);assert.equal(attached.length,fullCalls);
dropped.add([{path:'overflow-picker.png'}]);assert.equal(dropped.shots.length,3);assert.equal(dropped.error,null,'Picker overflow also stays quiet');
assert.ok(!text(dropped.render(cx)).includes('Up to 3 screenshots.'));assert.equal(byId(view,'feedback-add').style.tooltip,undefined);
byId(view,'shot-x-0').events.on_click({},cx);view = dropped.render(cx);
assert.equal(attachmentIds(view).join(','),'feedback-attachments-help,feedback-thumbnails');
byId(view,'feedback-attachments').events.on_drop({paths:['invalid.txt']},cx);assert.equal(dropped.error,'Choose an image.');assert.equal(dropped.shots.length,2);
attachError = 'Image conversion failed';view.events.on_drop({paths:['broken.png']},cx);assert.equal(dropped.error,attachError);assert.equal(dropped.shots.length,2);attachError = null;
const blockedCalls = attached.length;
dropped.sending = true;view = dropped.render(cx);byId(view,'feedback-attachments').events.on_drop({paths:['busy.png']},cx);
dropped.sending = false;dropped.sent = true;dropped.render(cx).events.on_drop({paths:['sent.png']},cx);
assert.equal(attached.length,blockedCalls,'Drops never change an in-flight or completed report');
dropped.sent = false;view = dropped.render(cx);view.events.on_drop({paths:[]},cx);assert.equal(attached.length,blockedCalls,'Empty drops are ignored');
assert.equal(dropped.message.value(),'Keep my draft');assert.equal(dropped.email.value(),'drop@example.invalid');
skin = false;const stock = fresh();view = stock.render(cx);assert.equal(view.style.h[0],650);assert.equal(stock.email.options.placeholder,'Email (optional)');assert.ok(text(view).includes('Your message (up to 4000'));assert.ok(text(view).includes('What we send: exactly this JSON'));assert.equal(byId(view,'feedback-preview-toggle'),undefined,'Other layouts retain stock form presentation');
stock.shots = ['a.png','b.png','c.png'];stock.message.events.paste_other({},cx);assert.equal(stock.error,'Up to 3 screenshots.','Other layouts retain stock limit feedback');
console.log('PASS: clean scoped Feedback form, live count, collapsed/live JSON, preserved drafts, attachment limits and mocked native send flow (no real feedback sent)');

// One-time draft (scripts/feedback-draft.mjs): email + screenshots app.feedback can't carry.
{
  skin = true; props = { from:'agent', message:'From props' };
  const now = Date.now(), raw = JSON.stringify({ version:1, created:now, message:'From draft', email:'me@example.invalid', images:['a.png','b.png','c.png','d.png'] });
  assert.equal(mod.namespace.parseDraft(raw, now + 121000), null, 'Stale drafts are ignored');
  assert.equal(mod.namespace.parseDraft(JSON.stringify({ version:1, consumed:true }), now), null, 'Consumed drafts are ignored');
  assert.equal(mod.namespace.parseDraft('not json', now), null);
  assert.equal(mod.namespace.parseDraft(raw, now).images.length, 3, 'At most 3 images');
  const sentBefore = sends.length; draftRaw = raw; draftReads.length = 0; draftWrites.length = 0; attached.length = 0;
  const form = fresh(); assert.ok(form.draftJob, 'Draft load is spawned on open'); await form.draftJob(cx);
  assert.equal(draftReads[0], 'C:\fixture\herdr-app/.customizations/feedback-draft.json');
  assert.equal(draftWrites.length, 1); assert.equal(draftWrites[0].expected, raw, 'Consumed with a compare-and-swap write');
  assert.ok(JSON.parse(draftWrites[0].text).consumed);
  assert.equal(form.message.value(), 'From props', 'The app.feedback message wins over the draft');
  assert.equal(form.email.value(), 'me@example.invalid');
  assert.equal(JSON.stringify(attached.at(-1)), JSON.stringify(['a.png','b.png','c.png'])); assert.equal(form.shots.length, 3); assert.equal(sends.length, sentBefore, 'Loading a draft never sends');
  props = {}; draftRaw = raw; const empty = fresh(); await empty.draftJob(cx); assert.equal(empty.message.value(), 'From draft');
  draftRaw = null; draftWrites.length = 0; const none = fresh(); await none.draftJob(cx); assert.equal(draftWrites.length, 0); assert.equal(none.email.value(), ''); assert.equal(none.error, null);
  console.log('PASS: feedback draft loads email/images once, ignores stale or consumed drafts, never sends');
}

// The message textarea's scrollbar sits on the field's right edge; the counter keeps the gutter.
{
  skin = true; props = {}; draftRaw = null;
  const form = fresh(); const view = form.render(cx);
  assert.equal(byId(view,'feedback-message-field').style.pr[0], 0, 'No right inset before the textarea scrollbar');
  assert.equal(byId(view,'feedback-count').style.id[0], 'feedback-count');
  const counterRow = nodes(byId(view,'feedback-message-field')).find(n => n.kids.includes(byId(view,'feedback-count')));
  assert.equal(counterRow.style.pr[0], 12, 'Counter stays aligned with the gutter');
  console.log('PASS: message textarea scrollbar is flush with the field edge');
}

// Screenshots open large in the dialog from the attachments and the preview.
{
  skin = true; props = {}; draftRaw = null;
  const form = fresh(); form.message.set_value('hi'); form.shots = ['one.png','two.png'];
  let view = form.render(cx);
  assert.equal(byId(view,'feedback-viewer'), undefined);
  byId(view,'shot-1').events.on_click({},cx); view = form.render(cx);
  assert.ok(byId(view,'feedback-viewer'), 'Clicking an attachment opens the viewer');
  assert.equal(byId(view,'feedback-scroll'), undefined, 'Viewer replaces the form body');
  assert.ok(text(byId(view,'feedback-viewer-count')).includes('Screenshot 2 of 2'));
  assert.ok(nodes(byId(view,'feedback-viewer-image')).some(n => n.kind === 'image' && n.style.asset?.[0] === 'two.png'));
  byId(view,'feedback-viewer-prev').events.on_click({},cx); view = form.render(cx);
  assert.ok(text(byId(view,'feedback-viewer-count')).includes('Screenshot 1 of 2'));
  view.events.on_key_down({ key:'escape' },cx); view = form.render(cx);
  assert.equal(byId(view,'feedback-viewer'), undefined, 'Esc goes back to the form, not closing the dialog');
  assert.equal(form.message.value(), 'hi', 'Draft kept');
  byId(view,'shot-0').events.on_click({},cx); view = form.render(cx);
  byId(view,'feedback-viewer-close').events.on_click({},cx); view = form.render(cx);
  assert.equal(byId(view,'feedback-viewer'), undefined, 'Close returns to the form');
  assert.ok(text(byId(view,'feedback-preview-toggle')).includes('JSON preview'), 'JSON preview unchanged');
  const removedBefore = form.shots.length; byId(view,'shot-x-0').events.on_click({},cx);
  assert.equal(form.shots.length, removedBefore - 1); assert.equal(form.viewing, null, 'Removing never opens the viewer');
  console.log('PASS: screenshots open large from the attachments; count left, Close right, Esc/prev/next');
}

// Viewer bar order: count on the left, Close last on the right.
{
  skin = true; props = {}; draftRaw = null;
  const form = fresh(); form.shots = ['only.png']; form.view(0, cx);
  const bar = byId(form.render(cx),'feedback-viewer-bar');
  const ids = bar.kids.map(k => k.style.id?.[0]).filter(Boolean);
  assert.equal(ids[0], 'feedback-viewer-count'); assert.equal(ids.at(-1), 'feedback-viewer-close');
  assert.ok(text(bar).includes('Screenshot 1 of 1')); assert.ok(text(bar).includes('Close'));
  assert.equal(byId(bar,'feedback-viewer-prev'), undefined, 'No Previous/Next for one screenshot');
  console.log('PASS: viewer bar shows "Screenshot 1 of 1" left and Close right');
}
