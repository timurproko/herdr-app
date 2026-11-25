// Coordinator-only navigation. Notice checks and enrollment remain elsewhere.
import { div, svg } from 'gpui-kit';
import { U } from './ui.js';
import { choiceDropdown } from './choice-menu.js';

export class EnrollmentPicker {
  constructor({focus,current,onChoose}) {this.focus=focus;this.current=current;this.onChoose=onChoose;this.index=0;}
  stop() {this.opening=null;}
  valid(opening) {return Boolean(opening && this.current()?.key===opening.key);}
  choose(opening,repository,cx) {
    if(this.opening!==opening)return;
    const valid=this.valid(opening) && opening.choices.includes(repository);
    this.stop();cx.notify();
    if(valid)this.onChoose(repository);
  }
  render(t,presentation) {
    if(this.opening && !this.valid(this.opening))this.stop();
    if(!presentation?.choices.length)return null;
    const opening=this.opening,rows=opening?.choices??presentation.choices;
    // Match the list: 7px padding inside the panel's 1px border gives an 8px gutter.
    return div().id('git-enrollment-footer').flex_none().py(4).px(7).border_t(1).border_color(t.border)
      .child(div().id('git-enrollment-info').flex().w_full().px(8).py(6).gap(U.gap).items_center().rounded(U.radius).bg(t.raised)
        .accessibility_label('Add this repo in Settings')
        .child(div().h(20).flex_none().flex().items_center()
          .child(svg('mods/custom-changes/info.svg').id('git-enrollment-icon').size(U.icon).flex_none().text_color(t.accent)))
        .child(div().flex_1().min_w(0).text_size(U.meta).font_normal()
          .child(choiceDropdown(t,{id:'git-enrollment',label:'Add this repo in Settings',open:Boolean(opening),focus:this.focus,compact:true,
            content:[div().min_w(0).flex().whitespace_nowrap().items_center().gap_x(3).text_color(t.dim)
              .child(div().child('Add this repo in')).child(div().text_color(t.accent).underline().child('Settings'))],
            onOpen:(open,cx)=>{
              if(!open){if(this.opening===opening)this.stop();}
              else if(!this.opening && this.valid(presentation)){
                this.opening={key:presentation.key,choices:[...presentation.choices]};this.index=0;
              }
              cx.notify();
            },
            index:this.index,
            onKeyDown:(event,cx)=>{
              if(this.opening!==opening || !this.valid(opening)){if(this.opening===opening)this.stop();cx.notify();return;}
              if(event.key==='escape')this.stop();
              else if(event.key==='enter'){this.choose(opening,opening.choices[this.index],cx);cx.stop_propagation();return;}
              else if(event.key==='up'||event.key==='down')this.index=(this.index+(event.key==='up'?rows.length-1:1))%rows.length;
              else return;
              cx.stop_propagation();cx.notify();
            },
            rows:rows.map((repository,index)=>({id:`git-enrollment-choice-${index}`,label:repository,accessibility:`Open Git settings for ${repository}`,
              onHover:(over,cx)=>{if(over&&this.opening===opening&&this.valid(opening)){this.index=index;cx.notify();}},
              onClick:(_e,cx)=>this.choose(opening,repository,cx)})),
          }))));
  }
}
