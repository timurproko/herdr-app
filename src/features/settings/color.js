// Opaque HSV color math shared by the custom accent controls and tests.
import { hex } from './palette.js';
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export function hsvToHex(h, s, v) {
  h=((Number(h)%360)+360)%360;s=clamp(Number(s),0,1);v=clamp(Number(v),0,1);
  const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
  const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return '#'+[r,g,b].map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');
}
export function hexToHsv(value) {
  const color=hex(value),[r,g,b]=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  const hue=!delta?0:max===r?60*(((g-b)/delta)%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4);
  return {h:(hue+360)%360,s:max?delta/max:0,v:max};
}
export function svPoint(position,bounds) {
  if(!bounds?.width || !bounds?.height)return null;
  return {s:clamp((position.x-bounds.x)/bounds.width,0,1),v:1-clamp((position.y-bounds.y)/bounds.height,0,1)};
}
