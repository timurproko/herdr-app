// Session switching is deliberately separate from Usage's statistics-only selection.
import { div, svg } from 'gpui-kit';
import { U, PILL, slot, menuSurface, menuRow, dropdown, pillTrigger, pillMenu } from './ui.js';
import { terminals, appHome, readTextFile, exec, notify } from './host.js';
import { claudeContext } from './claude-context.js';
const nonce = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
const same = (a,b) => a?.email===b?.email && (a?.account??'')===(b?.account??'') && (a?.organization??'')===(b?.organization??'');
export function sessionAccount(target) {
  const context=claudeContext({address:target.terminal},target.on);
  if (!context.email) return null;
  const labels=terminals().find(t=>t.address===target.terminal)?.labels??{};
  return {...context,session:labels['custom.claude.session'],control:labels['custom.claude.control']==='1',
    current:{email:context.email,account:context.id??'',organization:context.organizationId??''}};
}
export class ClaudeAccount {
  init(cx) { this.focus=cx.focus_handle(); this.accountLists=new Map(); }
  async worker(opening,action,extra={}) {
    const source=await readTextFile(`${appHome()}/mods/custom-workspace-status/session-account.cjs`);
    if (!source) throw Error('The Claude account worker is missing. Reinstall Custom.');
    const request={action,terminal:opening.address.split('/').at(-1),session:opening.session,scope:opening.control?'isolated':'shared',current:opening.current,...extra};
    const result=await exec('node',['--input-type=commonjs','-e',source,'--',JSON.stringify(request)],{on:opening.machine??null,timeout:action==='switch'&&!opening.control?120000:15000});
    let value;try {value=JSON.parse(result.stdout);}catch {throw Error('Cannot reach the Claude account helper. Node and hc are required on that machine.');}
    if(result.code!==0 || value.error) throw Error(value.error??'Cannot access the Claude session.');
    return value;
  }
  open(target,account,cx) {
    if (this.pending || !account.session) return;
    const opening={...account,machine:target.on},request=nonce();
    const machineKey=JSON.stringify(target.on??null);
    this.opening=opening;this.request=request;this.rows=this.accountLists.get(machineKey)??null;this.error=null;
    this.awaitingRows=this.rows===null;this.opened=!this.awaitingRows;
    this.index=Math.max(0,this.rows?.findIndex(row=>same(row,opening.current))??0);
    cx.notify();
    cx.spawn(async cx=>{
      try {
        const value=await this.worker(opening,'list');
        this.accountLists.set(machineKey,value.accounts);
        if(this.request===request&&this.awaitingRows){
          this.rows=value.accounts;this.index=Math.max(0,this.rows.findIndex(row=>same(row,opening.current)));
          this.awaitingRows=false;this.opened=true;
        } else if(this.request===request&&this.opened&&JSON.stringify(this.rows)!==JSON.stringify(value.accounts)){
          // The cached list was shown at once; a login saved since then appears
          // now, with the highlight kept on the same account.
          const highlighted=this.rows?.[this.index];
          this.rows=value.accounts;
          const keep=this.rows.findIndex(row=>same(row,highlighted));
          this.index=Math.max(0,keep>=0?keep:this.rows.findIndex(row=>same(row,opening.current)));
        }
      }
      catch(error) {if(this.request===request){this.error=String(error.message);if(this.awaitingRows){this.awaitingRows=false;this.opened=true;}}}
      finally {cx.notify();}
    });
  }
  choose(target,account,cx) {
    const opening=this.opening;
    this.awaitingRows=false;
    const live=opening?sessionAccount({terminal:opening.address,on:opening.machine}):null;
    if(this.pending || !opening || !account || !live || live.control!==opening.control || live.session!==opening.session || !same(live.current,opening.current)) {
      this.opened=false;cx.notify();return;
    }
    if(same(account,opening.current)) {this.opened=false;cx.notify();return;}
    this.opened=false;
    const pending={id:nonce(),opening,target:account,since:Date.now(),waiting:true};
    this.pending=pending;cx.notify();
    cx.spawn(async cx=>{
      try {
        const result=await this.worker(opening,'switch',{id:pending.id,target:account,...(!opening.control?{confirmShared:true}: {})});
        if(this.pending===pending){
          pending.waiting=false;pending.since=Date.now();pending.sharedApplied=result.applied==='shared';
        }
      }
      catch(error) {if(this.pending===pending){this.pending=null;notify({title:'Could not switch Claude account',body:String(error.message),level:'error'});}}
      finally {cx.notify();}
    });
  }
  tick(cx) {
    const p=this.pending;if(!p)return;
    const labels=terminals().find(t=>t.address===p.opening.address)?.labels??{};
    let reply;try {reply=JSON.parse(labels['custom.claude.reply']??'null');}catch {}
    const current=sessionAccount({terminal:p.opening.address,on:p.opening.machine});
    const rejected=reply?.id===p.id && reply.state==='rejected';
    const completed=labels['custom.claude.session']===p.opening.session && same(current?.current,p.target) && (p.sharedApplied || reply?.id===p.id && reply.state==='accepted' && labels['custom.claude.state']==='ok');
    const gone=labels['custom.claude.session']!==p.opening.session;
    if(!rejected && !completed && !gone && Date.now()-p.since<(p.waiting?135000:75000))return;
    this.pending=null;
    if(!completed)notify({title:'Claude account switch not confirmed',body:rejected?'The session rejected the request. Reopen the account menu.':gone?'The original Claude session ended or changed.':'The plugin did not confirm the requested account. Check /account check in that session.',level:'error'});
    cx.notify();
  }
  render(target,t,cx) {
    const account=sessionAccount(target);
    const pending=this.pending?.opening.address===target.terminal?this.pending:null;
    if(!account && !pending) {this.opened=false;this.awaitingRows=false;return null;}
    if(this.opening?.address!==target.terminal || this.opening?.session!==account?.session || !same(this.opening?.current,account?.current)){this.opened=false;this.awaitingRows=false;}
    const email=account?.email??pending?.opening.email;
    this.shownText=pending?'Switching…':email; // What the status bar shows, for its reveal.
    const canSwitch=Boolean(account?.session && !this.pending && this.focus);
    const label=`Claude session account: ${email}${pending?', switching':''}`;
    const content=[slot(svg('mods/custom-workspace-status/claude.svg').size(U.smallIcon)),pending?'Switching…':email];
    // The shared pill (ui.js); it also hangs out on the right here, so the chevron keeps the bar's edge.
    if(!canSwitch)return div().id('status-claude-account').h(U.control).px(PILL.inset).mx(-PILL.inset).flex().gap(6).items_center().rounded(U.radius)
      .text_color(t.muted).role('label').accessibility_label(label).children(content);
    const trigger=pillTrigger(t,'status-claude-account',{label,open:Boolean(this.opened),children:content,chevronSize:12}).mr(-PILL.inset)
      // Popover opens on its wrapper's left mouse-down. Let that press bubble.
      .on_mouse_down('right',(_e,cx)=>cx.stop_propagation());
    const menu=menuSurface(t).min_w(180).max_w(360).max_h(280).flex().flex_col().overflow_y_scroll().track_focus(this.focus)
      .on_key_down((event,cx)=>{
        if(event.key==='escape')this.opened=false;
        else if(event.key==='enter')this.choose(target,this.rows?.[this.index],cx);
        else if((event.key==='up'||event.key==='down')&&this.rows?.length)this.index=(this.index+(event.key==='up'?this.rows.length-1:1))%this.rows.length;
        else return;
        cx.stop_propagation();cx.notify();
      })
      .when(Boolean(this.error)&&!this.rows,e=>e.child(div().px(8).py(6).text_color(t.muted).child(this.error)))
      .when(this.rows?.length===0,e=>e.child(div().px(8).py(6).text_color(t.muted).child('No saved logins. Use /login in Claude.')))
      // The shared popup-menu row (ui.js), with the current login ticked.
      .children((this.rows??[]).map((choice,index)=>menuRow(t,{id:`status-claude-choice-${index}`,label:choice.email,accessibility:`Switch Claude session to ${choice.email}`,
        highlighted:index===this.index,onHover:(hovered,cx)=>{if(hovered){this.index=index;cx.notify();}},onClick:(_e,cx)=>this.choose(target,choice,cx),
        trailing:div().size(U.smallIcon).flex_none().when(same(choice,account.current),e=>e.child(svg('mods/custom-workspace-status/check.svg').size(U.smallIcon)))})));
    return dropdown('status-claude-account-popup',trigger,pillMenu(menu),{above:true,open:Boolean(this.opened),focus:this.focus,
      onOpen:(open,cx)=>{if(!open){this.opened=false;this.awaitingRows=false;}else if(!this.opened&&!this.awaitingRows)this.open(target,account,cx);cx.notify();}});
  }
}
