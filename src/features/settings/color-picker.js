// Standard opaque SV/hue/hex picker using full-color assets and native slider/input state.
import { div, image, Background, PathBuilder } from 'gpui-kit';
import { h_flex, v_flex, InputState, Input, SliderState, Slider, SliderTrack, SliderIndicator, SliderThumb } from 'gpui-base';
import { settings } from './host.js';
import { ensureNativeSelection } from './look.js';
import { U, control, field, dropdown, menuSurface, dropdownPlacement } from './ui.js';
import { hex } from './palette.js';
import { hsvToHex, hexToHsv, svPoint } from './color.js';
const I=name=>`mods/custom-settings/color-${name}.svg`;
export function initColorPicker(owner,cx,commit) {
  ensureNativeSelection(cx);
  const c=owner.design.color={open:false,drag:false,syncing:false,draft:owner.design.palette.accent,hsv:hexToHsv(owner.design.palette.accent),focus:cx.focus_handle(),padFocus:cx.focus_handle(),hexInput:InputState.new(),svDriver:SliderState.new({min:0,max:1,step:0.0001,value:0}),hue:SliderState.new({min:0,max:360,step:1,value:0})};
  c.commit=commit;
  // One rounded hue/value paint path; percentages keep its corners aligned at any zoom.
  const rx=`${100*U.radius/240}%`,ry=`${100*U.radius/156}%`,right=`${100-100*U.radius/240}%`,bottom=`${100-100*U.radius/156}%`;
  c.svShape=PathBuilder.fill().move_to(rx,0).line_to(right,0).arc_to(rx,ry,0,false,true,'100%',ry)
    .line_to('100%',bottom).arc_to(rx,ry,0,false,true,right,'100%').line_to(rx,'100%')
    .arc_to(rx,ry,0,false,true,0,bottom).line_to(0,ry).arc_to(rx,ry,0,false,true,rx,0).close().build();
  // A native slider owns pointer capture/release for SV as well as for hue.
  // Hover changes must never terminate a pressed drag at a straight edge.
  c.svDriver.on('change',(_value,cx)=>{
    if(!c.syncing&&c.drag)dragColor(owner,{position:globalThis.window.mouse_position()},cx);
  });
  c.svDriver.on('release',(_value,cx)=>{c.drag=false;saveColor(owner,cx);});
  c.hue.on('change',(value,cx)=>{
    // Native slider steps may round a programmatic hex-to-HSV synchronization.
    // Opening the picker must not quantize and save an otherwise unchanged color.
    if(c.syncing||Math.abs(Number(value)-c.hsv.h)<0.51)return;
    c.hsv.h=Number(value);updateDraft(c);saveColor(owner,cx);cx.notify();
  });
  c.hue.on('release',(_value,cx)=>saveColor(owner,cx));
  c.hexInput.on('focus',(_e,cx)=>{c.drag=false;c.hexFocused=true;ensureNativeSelection(cx);cx.notify();});
  c.hexInput.on('blur',(_e,cx)=>{c.hexFocused=false;if(c.open)saveColor(owner,cx);cx.notify();});
  c.hexInput.on('change',(_e,cx)=>{if(c.syncing)return;try {const value=hex(c.hexInput.value());if(value===c.draft)return;c.draft=value;c.hsv=hexToHsv(value);c.syncing=true;c.hue.set_value(c.hsv.h);c.svDriver.set_value(c.hsv.s);c.syncing=false;c.error=null;}catch{}cx.notify();});
  c.hexInput.on('submit',(_e,cx)=>saveColor(owner,cx));
}
function updateDraft(c) {
  c.draft=hsvToHex(c.hsv.h,c.hsv.s,c.hsv.v);c.error=null;c.syncing=true;c.hexInput.set_value(c.draft);if(Math.abs(Number(c.svDriver.value())-c.hsv.s)>0.00011)c.svDriver.set_value(c.hsv.s);c.syncing=false;
}
export function syncColorPicker(owner,value) {
  const c=owner.design.color;c.hsv=hexToHsv(value);c.draft=hex(value);c.error=null;c.syncing=true;c.hue.set_value(c.hsv.h);c.svDriver.set_value(c.hsv.s);c.hexInput.set_value(c.draft);c.syncing=false;
}
function saveColor(owner,cx) {
  const d=owner.design,c=d.color;if(!c.open||!d.custom)return;
  try {const value=hex(c.hexInput.value());c.error=null;if(value!==d.palette.accent)c.commit(value,cx);}
  catch {c.error='Use #RRGGBB or #RGB';cx.notify();}
}
function dragColor(owner,e,cx) {
  const c=owner.design.color,point=svPoint(e.position,c.svBounds);if(!point)return;
  c.hsv={...c.hsv,...point};updateDraft(c);saveColor(owner,cx);cx.notify();
}
export function customColorControl(owner,t) {
  const d=owner.design,c=d.color;
  const trigger=control(t,div()).id('ds-custom-color').w(U.field).flex().items_center().justify_center().cursor_pointer().tooltip('Choose custom accent')
    .role('button').accessibility_label('Choose custom accent')
    .on_mouse_move(e=>{c.bounds=e.bounds;}).on_mouse_down('left',e=>{c.bounds=e.bounds;})
    .child(div().size(20).rounded(4).bg(d.palette.accent));
  // Both layers reach black at the bottom, including their antialiased corners.
  // (hue*v)*s + (white*v)*(1-s) is standard HSV, without hue under a black mask.
  const svBackground=Background.linear_gradient(180,hsvToHex(c.hsv.h,1,1),'#000000').color_space('srgb');
  const pad=div().id('ds-color-sv').relative().w(240).h(156).flex_none().rounded(U.radius).cursor_crosshair()
    .role('slider').accessibility_label('Saturation and brightness').track_focus(c.padFocus)
    .on_key_down((e,cx)=>{
      if(!['left','right','up','down'].includes(e.key))return;
      const step=e.modifiers?.shift?0.1:0.01;
      if(e.key==='left'||e.key==='right')c.hsv.s=Math.max(0,Math.min(1,c.hsv.s+(e.key==='left'?-step:step)));
      else c.hsv.v=Math.max(0,Math.min(1,c.hsv.v+(e.key==='down'?-step:step)));
      updateDraft(c);saveColor(owner,cx);cx.stop_propagation();cx.notify();
    })
    .on_mouse_move(e=>{if(!c.drag)c.svBounds=e.bounds??c.svBounds;})
    .child(globalThis.window.paint_path(c.svShape,svBackground).absolute().inset_0().size_full())
    .child(Slider.new(c.svDriver).w_full().h_full().child(SliderTrack.new(c.svDriver).w_full().h_full()
      .child(SliderIndicator.new(c.svDriver).relative().w_full().h_full()
        .child(image(I('sv-value')).absolute().inset_0().size_full())
        .child(SliderThumb.new(c.svDriver).id('ds-color-sv-marker').absolute().top((1-c.hsv.v)*156-5).ml(-5).size(10).rounded_full().border_2().border_color('#ffffff').shadow_sm()))));
  const hue=div().id('ds-color-hue').w_full().h(24).child(Slider.new(c.hue).child(SliderTrack.new(c.hue).w_full().h(24).flex().items_center()
    .child(SliderIndicator.new(c.hue).relative().w_full().h(12).rounded(3)
      .child(image(I('hue')).absolute().inset_0().size_full().rounded(3))
      .child(SliderThumb.new(c.hue).id('ds-color-hue-thumb').absolute().top(-4).w(10).h(20).ml(-5).rounded(4).border_2().border_color('#ffffff').bg(hsvToHex(c.hsv.h,1,1)).shadow_sm()))));
  const content=menuSurface(t,v_flex()).id('ds-color-panel').relative().w(264).p(12).pt(12).pb(12).gap(10).max_h(c.placement?.height??290).overflow_y_scrollbar().track_focus(c.focus)
    // Continue/clamp SV drags through the pad's rounded corners and surrounding gutter.
    // A fresh press outside the pad or focus in the native input cancels this gesture.
    .on_mouse_move((e,cx)=>{if(c.drag&&!c.hexFocused)dragColor(owner,e,cx);})
    .on_mouse_up('left',(_e,cx)=>{if(c.drag){c.drag=false;saveColor(owner,cx);}})
    .on_key_down((e,cx)=>{
      if(e.key==='escape'){c.open=false;c.drag=false;d.trigger.focus();cx.stop_propagation();cx.notify();}
    })
    .child(pad).child(hue)
    // Capture-phase press observer: does not steal the native track/input event.
    // Outside presses cancel stale gestures before the hex editor handles selection.
    .child(div().id('ds-color-press-observer').absolute().right(0).bottom(0).size(1)
      .on_mouse_down_out((e,cx)=>{
        const b=c.svBounds,p=e.position;
        c.drag=e.button==='left'&&Boolean(b)&&p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;
        if(c.drag){c.hexFocused=false;c.padFocus.focus();dragColor(owner,e,cx);}
      }))
    .child(h_flex().gap(8).items_center().child(div().text_color(t.muted).child('Hex'))
      // Style the surrounding chrome, not the editor's caret/selection paint.
      .child(field(t,h_flex(),c.hexFocused).id('ds-color-hex').flex_1().min_w(0).cursor_text()
        .child(Input.new(c.hexInput).id('ds-color-hex-input').flex_1().min_w(0).h_full())))
    .when(Boolean(c.error),e=>e.child(div().text_size(U.meta).text_color(t.blocked).child(c.error)));
  return dropdown('ds-color-popup',trigger,content,{open:c.open,focus:c.focus,above:c.placement?.above,onOpen:(open,cx)=>{
    if(open===c.open)return;
    c.open=open;c.drag=false;
    if(open){syncColorPicker(owner,d.palette.accent);c.placement=dropdownPlacement(c.bounds,290,globalThis.window.viewport_size().height,settings().zoom);c.padFocus.focus();}
    cx.notify();
  }});
}
