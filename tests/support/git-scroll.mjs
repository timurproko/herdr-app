// Drive the real content/frame handlers with native-style window-pixel bounds.
import {find,nodes} from './choice-menu.mjs';
export const taskWindow=panel=>panel.taskWindows.get(`${panel.aggregate.context.scope}\0${panel.view}`);
const frame=tree=>nodes(tree).find(node=>String(node.attrs.id?.[0]).startsWith('task-pulls-frame-'));
export const ordinaryContent=tree=>nodes(tree).find(node=>String(node.attrs.id?.[0]).startsWith('pulls-content-'));
export const taskContent=tree=>nodes(tree).find(node=>String(node.attrs.id?.[0]).startsWith('task-pulls-content-'));
export const activeContent=(tree,number)=>nodes(tree).find(node=>String(node.attrs.id?.[0]).startsWith(`active-pull-content-${number}-`));
export function measureTask(panel,tree,cx,height=400,width=390,zoom=1) {
  const contentHeight=taskWindow(panel).contentHeight*zoom;
  frame(tree).attrs.on_size_change[0]({height:height*zoom,width:width*zoom},cx);
  taskContent(tree).attrs.on_size_change[0]({height:contentHeight,width:width*zoom},cx);
}
export function scrollTask(panel,tree,cx,offset,height=400,zoom=1,kind='move') {
  const content=taskContent(tree), viewport=frame(tree);
  const size=taskWindow(panel).contentHeight*zoom;
  // The content's padded outer box starts at the viewport origin before scrolling.
  const event={position:{x:50,y:100},bounds:{x:0,y:0,width:390*zoom,height:height*zoom},delta:{y:0}};
  content.attrs[kind==='wheel'?'on_scroll_wheel':'on_mouse_move'][0]({...event,bounds:{...event.bounds,y:-offset*zoom,height:size}});
  viewport.attrs[kind==='wheel'?'on_scroll_wheel':'on_mouse_move'][0](event,cx);
}
