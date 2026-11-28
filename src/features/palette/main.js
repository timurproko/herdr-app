// Custom-owned overlay. No imports from, or writes to, the native palette.
import {View,div} from 'gpui-kit';
import {v_flex,h_flex,InputState,v_virtual_list,VirtualListScrollHandle,Scrollbar} from 'gpui-base';
import {commands,layouts,keys,run,themes,settings,props,closeOverlay,openOverlay,shared,setShared,window as win,exec,appHome,readTextFile,checking} from './host.js';
import {searchHeader,hotkey,menuHeading,dialogSurface,emptyState,dialogScrollFrame,dialogScrollbar,dialogScrollRow} from './ui.js';
import {liveTheme,ensureNativeSelection} from './look.js';
import {topFade,bottomFade} from './scroll-fade.js';
import {openSettings} from './settings-dialog.js';
import {pluginIsEnabled} from './plugins.js';
import {entries,rows as catalogRows,keyOf,activation,HISTORY_KEY,recentIds,remember} from './model.js';
const SHOWN=10,ROW_H=32,HEAD_H=26;
export function paletteItems(rows,searching){
  const items=[];if(searching&&rows.length)items.push({id:'head:results',head:`${rows.length} item${rows.length===1?'':'s'}`,gap:0});
  rows.forEach((r,i)=>{if(!searching&&(i===0||r.head!==rows[i-1].head))items.push({id:`head:${r.head}`,head:r.head,gap:items.length?8:0});items.push({id:r.e.id,e:r.e,hits:r.hits,index:i});});return items;
}
export function paletteHeading(items,first=0){for(let i=Math.min(Math.max(0,first),items.length-1);i>=0;i--)if(items[i].head)return items[i].head;return null;}
const keyParts=k=>k.endsWith('--')?[...k.slice(0,-2).split('-'),'-']:k.split('-');
export default class Palette extends View{
  init(_props,cx){
    ensureNativeSelection(cx);this.query='';this.mods=[];this.at=0;this.resetScroll();this.closed=false;
    this.recent=recentIds(shared(HISTORY_KEY));this.listScroll=VirtualListScrollHandle.new();this.inputFocused=true;
    this.input=InputState.new({placeholder:'Search for a command…'});
    this.input.on('focus',(_e,cx)=>{this.inputFocused=true;ensureNativeSelection(cx);cx.notify();});
    this.input.on('blur',(_e,cx)=>{this.inputFocused=false;cx.notify();});
    this.input.on('change',(_e,cx)=>{this.query=this.input.value();this.at=0;this.resetScroll();this.listScroll.scroll_to_item(0);cx.notify();});
    this.input.on('submit',()=>this.go(this.rows()[this.at]?.e));this.input.focus();
    cx.timer.after(600,()=>{if(!this.closed)this.input.focus();});this.handle=cx.focus_handle();
    this.headingSync=cx.timer.every(32,cx=>{
      if(this.closed||this.pendingHead===null)return;const more=this.pendingMore??this.moreBelow;
      const above=(this.listScroll.offset?.()?.y??(this.visibleRange?.start>0?1:0))>0.5;
      if(this.pendingHead===this.pinnedHead&&more===this.moreBelow&&above===this.moreAbove)return;
      this.pinnedHead=this.pendingHead;this.moreBelow=more;this.moreAbove=above;cx.notify();
    });
    if(!checking())cx.spawn(async cx=>{
      await cx.sleep(0);if(this.closed)return;
      const home=appHome();
      // Only the migration seed is a file; new history is stored by the public shared API.
      if(shared(HISTORY_KEY)==null)try{
        const raw=await readTextFile(`${home}/.customizations/palette-recent.json`);
        if(this.closed)return;
        if(raw){const seed=JSON.parse(raw);if(seed.version===1&&shared(HISTORY_KEY)==null){this.recent=recentIds(seed.recent);setShared(HISTORY_KEY,this.recent);}}
      }catch{this.catalogError='Legacy history could not be read';}
      try{
        const result=await exec('node',[`${home}/.customizations/runtime/scripts/palette-manifests.mjs`,home],{on:null,timeout:15000});
        if(this.closed)return;
        if(result.code!==0)throw Error('Mod palette metadata is unavailable');
        const value=JSON.parse(result.stdout);if(value.ok!==true||!Array.isArray(value.entries))throw Error('Invalid mod palette metadata');
        this.mods=value.entries;this.catalogError=null;
      }catch{if(this.closed)return;this.catalogError='Mod palette entries unavailable; host commands remain available';}
      if(!this.closed)cx.notify();
    });
  }
  resetScroll(){this.visibleRange=null;this.pinnedHead=null;this.pendingHead=null;this.moreAbove=false;this.moreBelow=true;this.pendingMore=null;}
  close(){this.closed=true;this.headingSync?.cancel();closeOverlay(props().overlay);}
  go(e){
    if(!e)return;this.recent=remember(shared(HISTORY_KEY)??this.recent,e.id);setShared(HISTORY_KEY,this.recent);this.close();
    const target=activation(e,shared('layout'));
    if(target.settings)openSettings(target.settings);
    else if(target.prompt)openOverlay({mod:'prompt',kind:'dialog',width:380,props:{title:'Duplicate mod',hint:'Mod to copy; creates <name>-copy',command:{name:'mod.clone',args:{}}}});
    else run(target.name,target.args);
  }
  rows(){return catalogRows(entries({commands:commands(),layouts:layouts(),themes:themes(),dark:Boolean(settings().dark),layout:shared('layout'),platform:win()?.platform,usage:pluginIsEnabled('usage')},this.mods),this.query,this.recent);}
  title(t,text,hits,on){
    if(!hits?.length)return div().text_color(on?t.foreground:t.muted).child(text);
    const parts=[];let cur='',lit=false;
    [...text].forEach((ch,i)=>{const h=hits.includes(i);if(h!==lit&&cur){parts.push([cur,lit]);cur='';}lit=h;cur+=ch;});if(cur)parts.push([cur,lit]);
    return h_flex().children(parts.map(([s,h])=>div().text_color(h?t.accent:on?t.foreground:t.muted).when(h,d=>d.font_semibold()).child(s.replace(/ /g,'\u00a0'))));
  }
  render(){
    const t=liveTheme(),rows=this.rows(),bound=keys();this.at=Math.min(this.at,Math.max(0,rows.length-1));
    const searching=Boolean(this.query.trim()),items=paletteItems(rows,searching),sizes=items.map(r=>r.head?HEAD_H+r.gap:ROW_H),total=sizes.reduce((s,h)=>s+h,0);
    const overflow=total-(this.listHeight??343)>1,heading=searching?items[0]?.head:this.pinnedHead??paletteHeading(items);
    const key=k=>h_flex().gap(3).children(keyParts(hotkey(k)).map(p=>div().px(5).rounded(4).border_1().border_color(t.border).bg(t.raised).text_size(11).text_color(t.dim).child(p)));
    return dialogSurface(t,v_flex(),{nativeFrame:true}).id('palette').track_focus(this.handle).relative().w_full().h(408).min_h(0).overflow_hidden()
      .on_key_down((e,cx)=>{
        if(e.key==='escape'){cx.stop_propagation();return this.close();}
        if(!rows.length&&['down','up','pagedown','pageup'].includes(e.key)){cx.stop_propagation();return;}
        if(e.key==='down')this.at=Math.min(this.at+1,rows.length-1);else if(e.key==='up')this.at=Math.max(this.at-1,0);
        else if(e.key==='pagedown')this.at=Math.min(this.at+SHOWN,rows.length-1);else if(e.key==='pageup')this.at=Math.max(this.at-SHOWN,0);else return;
        const index=items.findIndex(r=>r.e?.id===rows[this.at]?.e.id);
        if(index>=0&&(!this.visibleRange||index<=this.visibleRange.start+1||index>=this.visibleRange.end-1))this.listScroll.scroll_to_item(index,'center');
        cx.stop_propagation();cx.notify();
      })
      .child(searchHeader(t,this.input,{id:'palette-search-header',fieldId:'palette-search',focused:this.inputFocused,onClear:()=>{this.query='';this.at=0;this.resetScroll();this.listScroll.scroll_to_item(0);}}).absolute().top(0).left(0).right(0).h(57).bg(t.popover))
      .when(Boolean(this.catalogError),el=>el.child(div().id('palette-catalog-warning').absolute().bottom(0).left(8).right(8).h(24).text_size(11).text_color(t.muted).bg(t.popover).child(this.catalogError)))
      .child(dialogScrollFrame(div()).id('palette-list-frame').absolute().top(57).bottom(this.catalogError?24:0).left(0).right(0).mb(0)
        .on_size_change((size,cx)=>{if(size.height>0&&Math.abs(size.height-(this.listHeight??-1))>0.5){this.listHeight=size.height;cx.notify();}})
        .on_scroll_wheel((_e,cx)=>cx.stop_propagation())
        .when(!items.length,el=>el.child(emptyState(t,{id:'palette-empty'})))
        .when(Boolean(items.length),el=>el.child(v_virtual_list('palette-native-rows',items.length,sizes,i=>items[i].id,range=>{
          this.visibleRange=range;this.pendingHead=paletteHeading(items,range.start);this.pendingMore=range.end<items.length;
          return items.slice(range.start,range.end).map(r=>{
            if(r.head)return dialogScrollRow(menuHeading(t,r.head,h_flex())).text_color(t.foreground).id(r.id).h(HEAD_H+r.gap).px(8).pt(r.gap).pb(4).items_end();
            const on=r.index===this.at,k=keyOf(r.e,bound);
            return dialogScrollRow(h_flex()).id(`pl-${r.index}`).h(ROW_H).px(8).gap(10).items_center().rounded(6).cursor_pointer().text_size(13)
              .when(on,e=>e.bg(t.selected)).hover(e=>e.bg(t.hover)).child(div().flex_1().min_w(0).child(this.title(t,r.e.title,r.hits,on)))
              .when(searching,e=>e.child(div().text_size(11.5).text_color(t.dim).child(r.e.group))).when(Boolean(k),e=>e.child(key(k)));
          });
        }).size_full().track_scroll(this.listScroll).on_item_click(id=>{const entry=this.rows().find(r=>r.e.id===id)?.e;if(entry)this.go(entry);}))
          .child(menuHeading(t,heading,h_flex()).id('palette-pinned-heading').absolute().top(0).left(0).right(8).h(HEAD_H).px(8).pb(4).items_end().bg(t.popover).text_color(t.foreground)
            .on_mouse_down('left',(_e,cx)=>cx.stop_propagation()).on_click((_e,cx)=>cx.stop_propagation()))
          .when(overflow&&this.moreAbove,frame=>frame.child(topFade(this,'palette-list',t.popover,{left:0,right:8}).top(HEAD_H)))
          .when(overflow&&this.moreBelow,frame=>frame.child(bottomFade(this,'palette-list',t.popover,{left:0,right:8})))
          .child(dialogScrollbar(Scrollbar.vertical('palette-native-rows').scroll_size(0,total).viewport_from_layout()))));
  }
}
