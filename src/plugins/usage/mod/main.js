// Standalone account quotas from installed CLI logins and official provider APIs.
import { View, div, svg } from 'gpui-kit';
import { h_flex, v_flex, Toggle, Scrollbar, HoverCard } from 'gpui-base';
import { props, closeOverlay, openOverlay, spaces, machines, layout, settings, window as appWindow } from './host.js';
import { U, DIALOG_SCROLL, slot, control, button as uiButton, dialogHeader, dialogSurface, dropdown, menuSurface, itemHover, dialogScrollFrame, dialogScrollbar, dialogScrollBody, refreshButton, startRefreshFeedback, emptyState, collapsible, collapsiblePanel, raisedHover } from './ui.js';
import { machinePicker } from './machine-picker.js';
import { tag, inlineDropdown, hintTable } from './panel-kit.js';
import { liveTheme as theme } from './look.js';
import { preferences, updatePreferences, cache, refresh, signIn, claimReset, openPrivate } from './store.js';
import { percentage, summaryWindows, windowKey, togglePin, resetInfo, sidebarUsageVisible, reportDisplayable, providerBlock, loginRequired, fetchedInfo, REFRESH_INTERVAL, REFRESH_TIMEOUT, orderKey, orderReports } from './model.js';
import { reorder } from './reorder.js';
import { pluginIsEnabled } from './plugins.js';
import { claudeSelection, selectClaude, usageOpeningContext, claudeContext, claudeView } from './accounts.js';
const I = name => `mods/custom-usage/${name}.svg`;
// Hover on the card (ui.js raisedHover); inside the open Resets panel, on that panel.
const cardHover = (t, base = t.surface) => raisedHover(t, base);
const resetsHover = (t, open) => cardHover(t, open ? collapsiblePanel(t) : t.surface);
const RESET_OUTCOME = 18; // failure feedback only; success adds no line or height
const RESET_BUTTON = 80, RESET_BUTTON_HEIGHT = 24; // Settings' row buttons (settings-kit KIT.action)
const RESET_NAME = 132; // the reset names column, so every expiry starts at one edge
const activeMachine = () => spaces().find(s=>s.active)?.machine??null;
function sidebarWidth(node=layout()) { if(node?.id==='sidebar') return node.size?.px??248;for(const c of node?.children??[]) {const n=sidebarWidth(c);if(n!==null)return n;}return null; }
export default class Usage extends View {
  init(_props,cx) {
    this.machine=props()?.usageMachine===undefined?activeMachine():props().usageMachine;this.hostOpen=false;this.accountOpen=false;this.accountOverride=null;
    // Capture before the overlay takes keyboard focus; then follow live labels
    // for this exact terminal, never another pane behind the dialog.
    this.opening=props()?.usageContext??usageOpeningContext();
    this.handle=cx.focus_handle();this.hostFocus=cx.focus_handle();this.accountFocus=cx.focus_handle();
    this.pluginWasEnabled=pluginIsEnabled('usage');
    if(this.pluginWasEnabled&&!props()?.summary) this.handle.focus();
    refresh(this.machine,cx);
    cx.timer.every(REFRESH_INTERVAL,cx=>{refresh(props()?.summary?activeMachine():this.machine,cx);cx.notify();});
  }
  close() {closeOverlay(props()?.overlay);}
  // hover: pass cardHover(t) for icons on a card (t.hover alone barely shows there).
  iconButton(t,id,icon,label,action,busy=false,spinning=busy,hover=t.hover) {
    return refreshButton(t,{id,icon,label,onClick:action,busy,spinning,hover});
  }
  refreshState(data, machine=this.machine) {
    const feedback=[...(this.refreshFeedback??[])].find(([id,value])=>value.scope===machine&&(id==='usage-refresh'||id.startsWith('usage-refresh-')));
    return {busy:Boolean(data.loading||feedback),id:data.loading?(data.reportId?`usage-refresh-${data.reportId}`:'usage-refresh'):feedback?.[0]};
  }
  requestRefresh(machine,cx,reportId) {
    // Check live state, not a rendered button's snapshot: another refresh can
    // start before the next paint. One action owns motion and the 600ms floor.
    if(!pluginIsEnabled('usage')||!preferences(machine).enabled||this.refreshState(cache(machine),machine).busy)return;
    if(!startRefreshFeedback(this,reportId?`usage-refresh-${reportId}`:'usage-refresh',machine,cx))return;
    refresh(machine,cx,{force:true,reportId});
  }
  // Every click opens the browser again (a closed tab must not block a retry);
  // the card collects again once a sign-in is saved.
  startSignIn(entry,cx) {
    const machine=this.machine,id=entry.id;
    cx.spawn(async cx=>{
      const result=await signIn(machine,entry.account?.email);
      if(result.error)return;
      // Wait out a collection already running (it may predate the new tokens).
      for(let i=0;i<300&&refresh(machine,cx,{force:true,reportId:id,signedIn:true})===false;i++)await cx.sleep(500);
      cx.notify();
    });
  }
  // Card bars slide to a new value (a reset refills them): the fill is in pixels of the
  // measured track, since only pixel widths animate. Before the first measure, percent.
  progress(t,window,remaining,id=null) {
    const value=percentage(window,remaining),tone=window.tone;
    const color=tone==='danger'?t.blocked:tone==='warning'?t.ansi3:t.done;
    const share=Math.max(0,Math.min(100,value??0)),zoom=settings()?.zoom>0?settings().zoom:1,track=id?this.trackWidths?.get(id):null;
    return div().h(4).w_full().rounded_full().bg(t.border).overflow_hidden()
      .when(Boolean(id),e=>e.id(`usage-track-${id}`).on_size_change((size,cx)=>{const width=size.width/zoom;
        if(Number.isFinite(width)&&width>0&&Math.abs(width-((this.trackWidths??=new Map()).get(id)??0))>0.5){this.trackWidths.set(id,width);cx.notify();}}))
      .when(value!==null,e=>e.child(div().when(Boolean(id),e=>e.id(`usage-fill-${id}`)).h_full().bg(color).rounded_full()
        .w(track?track*share/100:`${share}%`).when(Boolean(track),e=>e.transition('width',{duration:700,easing:'ease-out'}))));
  }
  providerIcon(entry) {
    const name=String(entry.sourceLabel??'').toLowerCase();
    return name.includes('claude')?'claude':name.includes('codex')?'codex':name.includes('copilot')?'copilot':'gauge';
  }
  // The widget's hover card: one left-aligned column per field, so the separators line up.
  // It wraps the widget's content, inside the trigger: the trigger keeps its full-width hover and click.
  summaryHint(t,content,rows) {
    // A flex wrapper, so the row inside stretches to the full width (spread pins).
    return HoverCard.new('usage-summary-hint').flex().flex_1().min_w(0).h_full().anchor('bottom_left').open_delay(400).close_delay(100).trigger(content).content(hintTable(t,rows));
  }
  summaryValue(t,choice,text) {
    const presentation=this.summaryPresentation,width=presentation.labels.get(choice.key)?.width,zoom=settings()?.zoom>0?settings().zoom:1;
    return div().id(`usage-summary-value-${choice.key}`).relative().flex_none().whitespace_nowrap()
      .text_color(choice.available?t.muted:t.dim)
      .when(!choice.available&&Number.isFinite(width),el=>el.w(width).min_w(width).max_w(width))
      .on_size_change(size=>{
        // Preserve the actual font-measured width, not an oversized numeric column.
        // No notify: this only supplies geometry for a later unavailable render.
        if(choice.available&&this.summaryPresentation===presentation&&Number.isFinite(size.width)&&size.width>0)presentation.labels.get(choice.key).width=size.width/zoom;
      })
      .when(choice.available,el=>el.child(text))
      .when(!choice.available,el=>el
        .child(div().invisible().child(choice.layoutText??'00%'))
        .child(div().absolute().inset_0().child(text)));
  }
  summary(t) {
    if(!pluginIsEnabled('usage'))return div();
    const machine=activeMachine(),p=preferences(machine);
    if(!sidebarUsageVisible(p))return div();
    const data=cache(machine),scope=JSON.stringify([machine,p.pins]);
    // Keep icons/captions and measured widths only, never cached quota values.
    // Missing reports retain the original compact icon/value pairs and alignment.
    if(this.summaryPresentation?.scope!==scope)this.summaryPresentation={scope,labels:new Map()};
    const selections=summaryWindows(data.reports,p,Date.now(),data).map(choice=>{
      let reportId=choice.entry?.id??choice.key,period;
      try{const pin=JSON.parse(choice.key);if(Array.isArray(pin)&&typeof pin[0]==='string'){reportId=pin[0];period=pin[1];}}catch{}
      const previous=this.summaryPresentation.labels.get(choice.key);
      const icon=choice.entry?this.providerIcon(choice.entry):previous?.icon??this.providerIcon({sourceLabel:reportId.split(':')[0]});
      const caption=choice.window?(choice.window.shortLabel??choice.window.label):previous?.caption??({weekly:'wk',session:'5h',monthly:'Monthly'}[period]??'');
      this.summaryPresentation.labels.set(choice.key,{...previous,icon,caption});
      const known=choice.window?percentage(choice.window,p.remaining):null;
      return {...choice,icon,caption,layoutText:known===null?null:`${Math.round(known)}%`,available:choice.available&&p.enabled&&!data.error};
    });
    if(!selections.length)return div();
    // The widget is always navigation. Routine refreshes retain good values;
    // only missing/failed/stuck pins need the attention of a --- placeholder.
    const open=(_e,cx)=>{cx.stop_propagation();if(pluginIsEnabled('usage'))openOverlay({mod:'custom-usage',kind:'dialog',frame:'none',width:680,height:560,props:{usageMachine:machine,usageContext:usageOpeningContext()}});};
    const source=entry=>{const email=this.providerIcon(entry)==='claude'?entry.account?.email??entry.account?.label:null,name=typeof email==='string'?email.split('@')[0]:'';return name?` (${name})`:'';};
    const value=choice=>choice.available?`${Math.round(percentage(choice.window,p.remaining))}%`:'---';
    const rows=selections.map(choice=>[choice.entry?.sourceLabel??'Usage',choice.window?'·':'',choice.window?.label??'','·',
      `${value(choice)} ${p.remaining?'left':'used'}`,choice.entry?source(choice.entry).trim():'']);
    const label=rows.map(row=>row.filter(Boolean).join(' ')).join('\n');
    const selected=selections[0];
    if((sidebarWidth()??248)<160) return h_flex().size_full().items_center().justify_center()
      .child(h_flex().id('usage-summary-open').size(U.control).items_center().justify_center().rounded(U.radius).text_size(U.meta).text_color(t.muted)
        .cursor_pointer().hover(e=>e.bg(t.hover)).role('button').accessibility_label(label)
        .on_mouse_down('left',(_e,cx)=>cx.stop_propagation()).on_click(open)
        .child(this.summaryHint(t,h_flex().size_full().items_center().justify_center()
          .child(selections.some(choice=>!choice.available)?'---':svg(I(selections.length===1?selected.icon:'gauge')).size(U.smallIcon)),rows)));
    const surface=h_flex().size_full().px(8).items_center();
    // pr 7 = pl 6 + the icon slot's 1px inset: the last value ends where the
    // status bar's right icon does, mirroring the first icon on the left.
    const zoom=settings()?.zoom>0?settings().zoom:1;
    const trigger=h_flex().id('usage-summary-open').w_full().h(U.control).pl(6).pr(7).gap(6).items_center().rounded(U.radius)
      // The hover card does not hand its width to the row inside, so measure the
      // trigger and size the pins row from it: it follows the sidebar's width.
      .on_size_change((size,cx)=>{const width=size.width/zoom;if(Number.isFinite(width)&&Math.abs(width-(this.summaryWidth??0))>0.5){this.summaryWidth=width;cx?.notify();}})
      .text_size(U.meta).text_color(t.muted).cursor_pointer().hover(e=>e.bg(t.hover))
      .role('button').accessibility_label(label)
      .on_mouse_down('left',(_e,cx)=>cx.stop_propagation()).on_click(open);
    if(selections.length>1) {
      // Spread across the row (four pins fit a default-width sidebar), the last
      // value flush right; tight icon-to-value pairs keep each pin readable.
      return surface.child(trigger.child(this.summaryHint(t,h_flex().id('usage-summary-groups').flex_1().w_full().min_w(0).h_full().gap(8).justify_between().items_center().overflow_hidden()
        .when(this.summaryWidth>13,e=>e.w(this.summaryWidth-13).min_w(this.summaryWidth-13))
        .children(selections.map(choice=>h_flex().id(`usage-summary-item-${choice.key}`).flex_none().gap(4).items_center()
          .child(slot(svg(I(choice.icon)).size(U.smallIcon)))
          .child(this.summaryValue(t,choice,value(choice))))),rows)));
    }
    return surface.child(trigger.child(this.summaryHint(t,h_flex().flex_1().min_w(0).h_full().gap(6).items_center()
      .child(slot(svg(I(selected.icon)).size(U.smallIcon)))
      .child(div().flex_1().min_w(0).child(this.progress(t,selected.available?selected.window:{},p.remaining)))
      .child(this.summaryValue(t,selected,value(selected)))
      .child(div().id('usage-summary-caption').flex_none().truncate().text_color(t.dim).child(selected.caption??'')),rows)));
  }
  hostPicker(t) {
    return machinePicker(t,{id:'usage-host',selected:this.machine,open:this.hostOpen,focus:this.hostFocus,
      onOpen:(open,cx)=>{this.hostOpen=open;cx.notify();},
      onSelect:(machine,cx)=>{this.machine=machine;this.hostOpen=false;this.accountOpen=false;this.accountOverride=null;refresh(machine,cx);cx.notify();}});
  }
  tag(t,id,label) { return tag(t,id,label); }
  resetCaption(t,id,reset) {
    return h_flex().id(id).flex_wrap().gap(8).items_center().text_size(U.meta).font_normal().line_height('18px').tooltip(reset.full)
      .child(div().text_color(t.muted).child(reset.relative))
      .child(div().text_color(t.dim).child('·'))
      .child(div().text_color(t.muted).child(reset.at));
  }
  codexResets(t,entry,credits) {
    const available=credits?.available;
    const label=available==null?'Not reported':`${available} available`;
    return h_flex().id(`usage-resets-${entry.id}`).gap(8).items_center()
      .child(div().flex_1().child('Resets'))
      .child(h_flex().id(`usage-resets-link-${entry.id}`).h(U.control).flex_none().items_center()
        .cursor_pointer().role('link').accessibility_label(`${label} — open ChatGPT usage settings`)
        .on_mouse_down('left',(_e,cx)=>cx.stop_propagation())
        .on_click((_e,cx)=>{cx.stop_propagation();const page='https://chatgpt.com/settings/usage?tab=overview';cx.spawn(async cx=>{if(!await openPrivate(page))cx.open_url(page);});})
        .child(div().id(`usage-resets-count-${entry.id}`).relative().child(label)
          // Both strokes share one box; hover only fills the dash gaps, never
          // switches to the font underline's different baseline or changes layout.
          .when(available>0,e=>e
            .child(div().id(`usage-resets-dashed-${entry.id}`).absolute().inset_0().border_b_1().border_dashed().border_color(t.foreground))
            .child(div().id(`usage-resets-solid-${entry.id}`).absolute().inset_0().border_b_1().border_color('#00000000')
              .hover(e=>e.border_color(t.foreground))))));
  }
  // Limit resets (Claude, Codex): a row that expands into one line per reset, each with its
  // own button. A click asks once more, then uses it for exactly this account. `page` is the
  // provider's own usage page, opened privately from the count.
  resetsBlock(t,entry,resets,page) {
    const open=(this.resetsOpen??=new Set()).has(entry.id),label=`${resets.available} available`;
    const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const date=iso=>{const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';const year=d.getFullYear()!==new Date().getFullYear()?`, ${d.getFullYear()}`:'';return `${month[d.getMonth()]} ${d.getDate()}${year}`;};
    // Closing drops any row hover: the pointer never "leaves" a row that shrinks away.
    const toggle=(_e,cx)=>{cx.stop_propagation();open?this.resetsOpen.delete(entry.id):this.resetsOpen.add(entry.id);this.resetHover=null;this.resetConfirm=null;cx.notify();};
    const outcome=this.resetOutcome?.id===entry.id&&this.resetOutcome.machine===this.machine?this.resetOutcome.text:null;
    // The count links to the provider's page (a fallback); the rest of the row, chevron
    // included, expands the list. Rows are U.control tall, so the list's height is known
    // and it slides open (ui.js collapsible).
    const count=h_flex().id(`usage-claude-resets-link-${entry.id}`).w(RESET_BUTTON).h(U.control).flex_none().items_center().justify_end()
      .cursor_pointer().role('link').accessibility_label(`${label} — open ${entry.sourceLabel??'provider'} usage settings`)
      .on_mouse_down('left',(_e,cx)=>cx.stop_propagation())
      .on_click((_e,cx)=>{cx.stop_propagation();cx.spawn(async cx=>{if(!await openPrivate(page))cx.open_url(page);});})
      .child(div().id(`usage-claude-resets-count-${entry.id}`).relative().child(label)
        .child(div().id(`usage-claude-resets-dashed-${entry.id}`).absolute().inset_0().border_b_1().border_dashed().border_color(t.foreground))
        .child(div().id(`usage-claude-resets-solid-${entry.id}`).absolute().inset_0().border_b_1().border_color('#00000000').hover(e=>e.border_color(t.foreground))));
    const lines=resets.groups.length,height=lines*U.control+(lines-1)*2+(outcome?2+RESET_OUTCOME:0);
    return collapsible(t,{id:`usage-claude-resets-${entry.id}`,title:'Resets',open,onToggle:toggle,chevron:'end',trailing:count,
      label:`Resets: ${label}. ${open?'Hide':'Show'} them`,on:t.surface,bodyInset:0,bodyHeight:height},
      ()=>v_flex().id(`usage-claude-resets-rows-${entry.id}`).gap(2)
        .children(resets.groups.map(g=>this.resetLine(t,entry,g,date,open,label)))
        .when(Boolean(outcome),e=>e.child(div().id(`usage-claude-reset-outcome-${entry.id}`).h(RESET_OUTCOME).flex_none().px(8).flex().items_center()
          .text_size(U.meta).text_color(t.muted).child(outcome))));
  }
  resetLine(t,entry,g,date,open=true,label='') {
    const key=`${entry.id}:${g.grantId}`,busy=Boolean(this.claiming),mine=this.claiming===key,confirming=this.resetConfirm===key;
    const why=g.usable?null:g.reason==='plan'?'Not included in this plan':g.needsLimit?'Available once you hit a limit':g.cooldownUntil?`Available after ${date(g.cooldownUntil)}`:'Not available right now';
    const enabled=g.usable&&!busy;
    const click=(_e,cx)=>{
      if(!enabled)return;
      if(!confirming){this.resetConfirm=key;cx.notify();cx.spawn(async cx=>{await cx.sleep(4000);if(this.resetConfirm===key){this.resetConfirm=null;cx.notify();}});return;}
      this.startClaim(entry,g,key,cx);
    };
    // Settings' row button: 80 × 24, 12px medium text; Confirm is the solid (primary) one.
    const button=uiButton(t,`usage-claude-reset-${key}`,mine?'Resetting…':confirming?'Confirm':'Reset',click,{enabled,primary:confirming&&!mine})
      .w(RESET_BUTTON).min_w(RESET_BUTTON).max_w(RESET_BUTTON).h(RESET_BUTTON_HEIGHT).min_h(RESET_BUTTON_HEIGHT).max_h(RESET_BUTTON_HEIGHT).px(6).whitespace_nowrap().text_size(12)
      .accessibility_label(`${g.name}: ${mine?'resetting':confirming?'confirm reset':'reset for free'}`)
      .when(Boolean(why),e=>e.tooltip(why))
      .on_mouse_down('left',(_e,cx)=>cx.stop_propagation());
    // One line that highlights on hover (like Settings' repository rows); the button shows
    // only then, or while it asks to confirm or is resetting. Its slot keeps its width.
    // Keep the same trailing column as the header; an invisible copy of its natural-width
    // label centres the unchanged button under the text, excluding the chevron.
    const rid=`usage-claude-reset-line-${key}`,shown=open&&(this.resetHover===rid||confirming||mine);
    return h_flex().id(rid).h(U.control).flex_none().px(8).gap(8).items_center().rounded(U.radius)
      .when(shown,e=>e.bg(resetsHover(t,true)))
      .on_hover((hovered,cx)=>{if(hovered&&open)this.resetHover=rid;else if(this.resetHover===rid)this.resetHover=null;cx.notify();})
      .child(div().w(RESET_NAME).flex_none().truncate().child(g.left>1?`${g.name} · ${g.left}`:g.name))
      .child(div().flex_1().min_w(0).truncate().text_size(U.meta).text_color(t.muted)
        .child(g.endsAt?`${g.left>1?'All expire':'Expires'} ${date(g.endsAt)}`:''))
      .child(div().id(`${rid}-slot`).w(RESET_BUTTON).h(U.control).flex_none().flex().items_center().justify_end()
        .child(div().relative().flex_none()
          .child(div().invisible().child(label))
          .when(shown,e=>e.child(div().absolute().inset_0().flex().items_center().justify_center().child(button)))))
      .child(div().size(U.control).flex_none());
  }
  // Claims, then keeps every reset button off until the card has collected again, so the
  // same reset can't be clicked twice; the bars then slide to their refilled values.
  startClaim(entry,g,key,cx) {
    const machine=this.machine;
    this.claiming=key;this.resetConfirm=null;this.resetOutcome=null;cx.notify();
    cx.spawn(async cx=>{
      const r=await claimReset(machine,{provider:this.providerIcon(entry),accountId:entry.account?.id,organizationId:entry.account?.organizationId,grantId:g.grantId});
      if(r.obsolete){this.claiming=null;cx.notify();return;}
      const text=r.error??(r.result==='reset'?null:({already_used:'That reset was already used.',not_limited:'Nothing to reset yet: use it once you hit a limit.',
        cooldown:'Resets are cooling down. Try again later.',ineligible:'This account can’t use that reset.',unavailable:'That reset isn’t available right now.',
        rate_limited:'Too many requests. Try again shortly.'}[r.result]??'The reset did not finish.'));
      this.resetOutcome=text?{id:entry.id,machine,text}:null;cx.notify();
      if(r.result){
        // A pre-reset collector may own the full loading lease. Do not drop the
        // forced read after 60s while that older request is still allowed to run.
        const attempts=Math.ceil(REFRESH_TIMEOUT/500),options={force:true,reportId:entry.id,signedIn:true,accountOnly:true,epoch:r.epoch};
        for(let i=0;i<=attempts&&refresh(machine,cx,options)===false;i++)await cx.sleep(500);
        for(let i=0;i<=attempts&&cache(machine).loading&&(cache(machine).generation??0)===r.epoch;i++)await cx.sleep(500);
      }
      this.claiming=null;cx.notify();
    });
  }
  premiumBreakdown(t,entry,usage) {
    const count=value=>typeof value==='number'&&Number.isFinite(value)?String(Number(value.toFixed(4))):'—';
    const cell=(value,heading=false)=>div().w(64).flex_none().text_right().text_size(U.meta).text_color(heading?t.dim:t.muted).child(value);
    return v_flex().id(`usage-premium-${entry.id}`).gap(6)
      .child(h_flex().gap(8).items_center().child(div().flex_1().font_medium().child('Monthly premium requests')).child(`${count(usage.used)} used`))
      .child(h_flex().gap(8).items_center().child(div().flex_1().text_size(U.meta).text_color(t.muted).child('By model')).child(cell('Used',true)).child(cell('Discounted',true)).child(cell('Billed',true)))
      .children(usage.byModel.map(row=>h_flex().gap(8).items_center()
        .child(div().flex_1().min_w(0).truncate().text_size(U.meta).text_color(t.muted).tooltip(row.model).child(row.model))
        .child(cell(count(row.used))).child(cell(count(row.discounted))).child(cell(count(row.billed)))));
  }
  accountPicker(t,entry,view) {
    const email=entry.account?.email??entry.account?.label??'Claude account';
    if(view.accounts.length<2)return div().id(`usage-account-${entry.id}`).text_size(U.meta).text_color(t.muted).child(email);
    // The panel kit's text dropdown: the email and a chevron, sized by the longest email.
    return h_flex().id(`usage-account-${entry.id}`).self_start().max_w('100%')
      .child(inlineDropdown(t,{id:'usage-claude-account',hover:cardHover(t),optionPrefix:'usage-claude-choice',text:email,label:`Claude usage account: ${email}`,
        options:view.accounts.map(e=>({id:e.id,label:e.account?.email??e.account?.label??'Claude account'})),selected:entry.id,
        open:Boolean(this.accountOpen),focus:this.accountFocus,onOpen:(open,cx)=>{this.accountOpen=open;cx.notify();},
        onSelect:(id,cx)=>{this.accountOverride=id;selectClaude(this.machine,id);this.accountOpen=false;cx.notify();}}));
  }
  // Drag a card to reorder the providers; the order is a Usage preference.
  get drag() { return reorder(this,'list'); }
  dropCard(keys,cx) {
    const next=this.drag.dropOrder(keys,cx);
    if(!next)return;
    const saved=preferences(this.machine).order;
    updatePreferences(this.machine,{order:[...next,...saved.filter(key=>!next.includes(key))]});
    cx.notify();
  }
  // The shared card reorder (reorder.js), the same as Settings › Plugins.
  draggable(t,element,key,keys) { return this.drag.card(element,key,keys,t,{id:'usage',scale:settings()?.zoom}); }
  dragPreview(t,reports) {
    const entry=reports.find(e=>orderKey(e)===this.drag.view?.id);
    return entry?this.drag.preview('usage-drag',t,{icon:svg(I(this.providerIcon(entry))).size(U.smallIcon).text_color(t.muted),label:entry.sourceLabel??'Provider'}):null;
  }
  card(t,entry,p,data,accountView=null) {
    const report=entry.report??{},live=reportDisplayable(entry,data),shown=report.status==='available'?report:entry.lastSuccessful?.report;
    const lastFetched=report.status==='available'?entry.fetchedAt:entry.lastSuccessful?.fetchedAt;
    const machine=this.machine,state=this.refreshState(data,machine),refreshId=`usage-refresh-${entry.id}`;
    const refreshEntry=(_e,cx)=>{cx.stop_propagation();this.requestRefresh(machine,cx,entry.id);};
    const retry=report.status==='error'&&report.retryAt>Date.now()?resetInfo(report.retryAt):null;
    // The provider refuses this account outright: say so, and do not offer Refresh as a fix.
    const blocked=providerBlock(report);
    // A refused refresh token: Refresh cannot help, a browser sign-in can.
    const login=!live&&!blocked&&loginRequired(entry);
    const loginEntry=(_e,cx)=>{cx.stop_propagation();this.startSignIn(entry,cx);};
    const extra=this.providerIcon(entry)==='claude'?(shown?.details??[]).find(detail=>detail.id==='extra'):null;
    const reset=!(shown?.windows??[]).some(w=>w.resetsAt)?resetInfo(shown?.resetsAt):null;
    const account=this.providerIcon(entry)==='copilot'?(entry.account?.login??entry.account?.label):(entry.account?.email??entry.account?.label);
    return v_flex().id(`usage-report-${entry.id}`).p(16).gap(12).rounded(8).border_1().border_color(t.border).bg(t.surface)
      // No right nudge: the refresh button ends at the card's content edge, in one column with
      // the pins and the Resets chevron below it.
      .child(h_flex().id(`usage-report-header-${entry.id}`).gap(8).items_center()
        .child(svg(I(this.providerIcon(entry))).size(U.icon).text_color(t.muted))
        .child(div().text_size(15).font_semibold().child(entry.sourceLabel??'Provider'))
        .when(Boolean(shown?.planLabel),e=>e.child(this.tag(t,`usage-plan-${entry.id}`,shown.planLabel)))
        .when(Boolean(extra)&&extra.value!=='Disabled',e=>e.child(this.tag(t,`usage-extra-${entry.id}`,extra.value==='Enabled'?'Extra usage':`Extra usage: ${extra.value}`).tooltip(`Extra usage: ${extra.value}`)))
        .child(div().flex_1())
        .when(!live&&Boolean(blocked),e=>e.child(div().id(`usage-blocked-${entry.id}`).h(U.control).flex().items_center().text_size(U.meta).text_color(t.muted).child('Not allowed')))
        // One button: label and icon share the hover, the icon keeps the refresh icon's spot.
        .when(login,e=>e.child(h_flex().id(`usage-login-${entry.id}`).h(U.control).pl(8).items_center().rounded(U.radius).text_size(U.meta).text_color(t.muted)
          .role('button').accessibility_label(`Login required: sign in to ${entry.sourceLabel??'provider'} in the browser`)
          .cursor_pointer().hover(e=>e.bg(t.hover).text_color(t.foreground))
          .on_mouse_down('left',(_e,cx)=>cx.stop_propagation()).on_click(loginEntry)
          .child('Login required')
          .child(div().size(U.control).flex_none().flex().items_center().justify_center().child(svg(I('login')).size(U.smallIcon)))))
        .when(!live&&!blocked&&!login,e=>e.child(div().id(`usage-refresh-required-${entry.id}`).h(U.control).flex().items_center().text_size(U.meta).text_color(t.muted)
          .role('button').accessibility_label(`Refresh required: ${entry.sourceLabel??'provider'}`).disabled(state.busy)
          .when(!state.busy,e=>e.cursor_pointer().hover(e=>e.text_color(t.foreground)))
          .on_mouse_down('left',(_e,cx)=>cx.stop_propagation()).on_click(refreshEntry)
          .child(state.busy&&state.id===refreshId?'Refreshing…':'Refresh required')))
        .when(!login,e=>e.child(this.iconButton(t,refreshId,I('refresh'),'Refresh provider',refreshEntry,state.busy,state.id===refreshId,cardHover(t)))))
      .when(!live&&Boolean(blocked),e=>e.child(div().id(`usage-blocked-reason-${entry.id}`).text_size(U.meta).text_color(t.muted).child(blocked)))
      .when(Boolean(retry),e=>e.child(div().text_size(U.meta).text_color(t.muted).child(`Try again after ${retry.at.split(' at ').pop()}.`)))
      // Shaped like the reset captions below: how long ago · day at time (full date on hover).
      .when(!live&&Boolean(shown),e=>{const fetched=fetchedInfo(lastFetched);return e.child(fetched
        ?this.resetCaption(t,`usage-last-known-${entry.id}`,{...fetched,relative:`Last known usage ${fetched.relative}`})
        :div().text_size(U.meta).text_color(t.muted).child('Last known usage'));})
      .children((shown?.windows??[]).map(window=>{
        const value=percentage(window,p.remaining),key=windowKey(entry.id,window.id),pinned=p.pins.includes(key),reset=resetInfo(window.resetsAt);
        return v_flex().id(`usage-window-${key}`).gap(5)
          .child(h_flex().items_center().gap(8).child(div().flex_1().font_medium().child(window.label))
            .child(value===null?'Not reported':`${Math.round(value)}% ${p.remaining?'left':'used'}`)
            .child(Toggle.new(`usage-pin-${key}`).id(`usage-pin-${key}`).pressed(pinned)
              .size(U.control).flex_none().flex().items_center().justify_center().rounded(U.radius).cursor_pointer()
              .border_1().border_color(pinned?t.input:'#00000000').bg(pinned?t.selected:'#00000000').text_color(pinned?t.foreground:t.dim)
              .tooltip(pinned?'Unpin from sidebar':'Show this quota in sidebar').accessibility_label(`${pinned?'Unpin':'Pin'} ${entry.sourceLabel} ${window.label}`)
              .hover(e=>e.bg(pinned?itemHover(t,true):cardHover(t)))
              .on_change((on,cx)=>{updatePreferences(this.machine,{pins:togglePin(preferences(this.machine),key,on)});cx.notify();})
              .child(svg(I('pin')).size(U.smallIcon))))
          .child(this.progress(t,window,p.remaining,key))
          .when(Boolean(reset),e=>e.child(this.resetCaption(t,`usage-reset-${key}`,reset)));
      }))
      .children((shown?.balances??[]).map(balance=>h_flex().gap(8).child(div().flex_1().child(balance.label)).child(balance.remaining!=null?`${balance.remaining} left`:balance.used!=null?`${balance.used} used`:'Not reported')))
      // Codex keeps its plain count row until its reset list has been read.
      .when(this.providerIcon(entry)==='codex'&&!(shown?.codexResets?.available>0),e=>e.child(this.codexResets(t,entry,shown?.resetCredits)))
      .when(this.providerIcon(entry)==='codex'&&shown?.codexResets?.available>0,e=>e.child(this.resetsBlock(t,entry,shown.codexResets,'https://chatgpt.com/settings/usage?tab=overview')))
      .when(this.providerIcon(entry)==='claude'&&shown?.claudeResets?.available>0,e=>e.child(this.resetsBlock(t,entry,shown.claudeResets,'https://claude.ai/new#settings/usage')))
      .when(Boolean(shown?.premiumUsage?.byModel?.length),e=>e.child(this.premiumBreakdown(t,entry,shown.premiumUsage)))
      .when(Boolean(reset),e=>e.child(this.resetCaption(t,`usage-report-reset-${entry.id}`,reset)))
      .children((shown?.details??[]).filter(detail=>detail!==extra).map(detail=>div().text_size(U.meta).text_color(t.muted).child(`${detail.label}: ${detail.value}`)))
      .when(Boolean(account)&&!(accountView&&this.providerIcon(entry)==='claude'),e=>e.child(div().id(`usage-account-${entry.id}`).text_size(U.meta).text_color(t.muted).child(account)))
      .when(Boolean(accountView)&&this.providerIcon(entry)==='claude',e=>e.child(this.accountPicker(t,entry,accountView)));
  }
  render(cx) {
    if(!pluginIsEnabled('usage')) {
      this.pluginWasEnabled=false;
      this.refreshContext=null;
      const overlay=props()?.overlay;
      if(overlay&&!this.pluginCloseQueued&&cx?.spawn) {
        this.pluginCloseQueued=true;
        cx.spawn(async cx=>{await cx.sleep(0);if(!pluginIsEnabled('usage'))closeOverlay(overlay);this.pluginCloseQueued=false;});
      }
      return div();
    }
    this.pluginWasEnabled=true;
    // The minute timer is the fallback, not the only way to resume collection.
    // Observe live host/focus/preferences here, but yield before any cache writes.
    const refreshMachine=props()?.summary?activeMachine():this.machine;
    const refreshContext=JSON.stringify([refreshMachine,Boolean(appWindow()?.active),preferences(refreshMachine).enabled]);
    if(cx?.spawn&&this.refreshContext!==refreshContext) {
      this.refreshContext=refreshContext;
      cx.spawn(async cx=>{
        await cx.sleep(0);
        if(this.refreshContext===refreshContext)refresh(refreshMachine,cx);
      });
    }
    const t=theme();if(props()?.summary)return this.summary(t);
    const machine=this.machine,p=preferences(machine),data=cache(machine),state=this.refreshState(data,machine);
    const refreshAll=(_e,cx)=>{cx.stop_propagation();this.requestRefresh(machine,cx);};
    const remembered=claudeSelection(this.machine),selection=this.accountOverride??(p.claudeAutomatic?'auto':remembered==='auto'?'manual':remembered);
    const context=claudeContext(this.opening,this.machine);
    const accounts=claudeView(data.reports,selection,context,remembered);
    // The session runs an account no report knows yet (a fresh /login): collect
    // once for it now instead of waiting out the cache. Once per account per
    // dialog, so an account the collector cannot see never loops.
    const missingKey=context.email&&!accounts.current&&!data.loading&&p.enabled?JSON.stringify([machine,context.email,context.id??'',context.organizationId??'']):null;
    if(missingKey&&cx?.spawn&&!(this.missingAsked??=new Set()).has(missingKey)) {
      this.missingAsked.add(missingKey);
      cx.spawn(async cx=>{await cx.sleep(0);refresh(machine,cx,{missing:true});});
    }
    const shown=orderReports(accounts.reports,p.order),keys=[...new Set(shown.map(orderKey))];
    if(this.drag.current&&!keys.includes(this.drag.current.id))this.drag.reset();
    const preview=this.dragPreview(t,shown);
    const actions=h_flex().id('usage-header-actions').gap(4).items_center()
      .child(this.iconButton(t,'usage-refresh',I('refresh'),'Refresh usage',refreshAll,state.busy,state.id==='usage-refresh'));
    const tools=h_flex().id('usage-header-tools').gap(12).items_center().child(this.hostPicker(t)).child(actions);
    const title=h_flex().gap(10).items_center().child(div().child('Usage'))
      .child(div().id('usage-checking').w(120).flex_none().text_size(U.meta).font_normal().text_color(t.muted).opacity(data.loading?1:0).child('Checking usage…')); 
    return dialogSurface(t,v_flex()).id('usage-dialog').h_full().track_focus(this.handle)
      .on_key_down((e,cx)=>{if(e.key==='escape'){this.close();cx.stop_propagation();}})
      .child(dialogHeader(t,title,()=>this.close(),tools).gap(4))
      .child(this.drag.surface(div().id('usage-drag-surface').relative().flex_1().min_h(0).h_full(),{release:(_id,cx)=>this.dropCard(keys,cx)})
        .child(dialogScrollFrame(div()).id('usage-scroll-frame').absolute().inset_0()
          .child(v_flex().id('usage-scroll').size_full().overflow_y_scroll().gap(0)
        .child(dialogScrollBody(v_flex()).id('usage-body').pb(0).flex_none().gap(12)
        .when(!p.enabled,e=>e.child(div().text_color(t.muted).child('Usage checking is paused for this machine. Enable it in Usage settings.')))
        .when(Boolean(data.error),e=>e.child(div().id('usage-refresh-required').text_size(U.meta).text_color(t.muted)
          .role('button').accessibility_label('Refresh required').disabled(state.busy)
          .when(!state.busy,e=>e.cursor_pointer().hover(e=>e.text_color(t.foreground)))
          .on_click(refreshAll).child(state.busy&&state.id==='usage-refresh'?'Refreshing…':'Refresh required')))
        .when(!data.loading&&!data.error&&!(data.reports??[]).length&&p.enabled,e=>e.child(emptyState(t,{id:'usage-empty',title:'No usage accounts',icon:I('gauge')}).h(160).tooltip('Sign in with Claude, Codex, Copilot or a supported CLI on this machine, then refresh')))
        .children(shown.map(entry=>this.draggable(t,this.card(t,entry,p,data,accounts),orderKey(entry),keys))))
        // A real scroll child keeps the bottom inset reachable; padding alone
        // can be omitted from native overflow bounds at the end of the list.
        .child(div().id('usage-bottom-inset').h(DIALOG_SCROLL.inset).w_full().flex_none()))
          .child(dialogScrollbar(Scrollbar.vertical('usage-scroll'))))
        .when(Boolean(preview),e=>e.child(preview)));
  }
}
