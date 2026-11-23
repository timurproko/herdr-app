// Colour equations adapted from Primer React's IssueLabelToken at 2128032:
// https://github.com/primer/react/blob/2128032dca65a1bd565fe382c2e91c638c6473a4/packages/react/src/Token/IssueLabelToken.module.css
// HSL input rounding follows IssueLabelToken.tsx at the same revision.
//
// MIT License — Copyright (c) 2018 GitHub, Inc.
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(value, max));
const rgb = color => typeof color === 'string' && /^#[a-f\d]{6}$/i.test(color)
  ? [1,3,5].map(at => parseInt(color.slice(at,at+2),16)) : null;
// Primer intentionally weights encoded RGB here, not gamma-corrected luminance.
const perceived = ([r,g,b]) => (r*0.2126 + g*0.7152 + b*0.0722)/255;
const lightnessSwitch = (threshold, p) => clamp(1/(threshold-p));
const byte = value => Math.round(value).toString(16).padStart(2,'0');
const hex = channels => `#${channels.map(byte).join('')}`;
const alpha = (color, opacity) => `${color}${byte(clamp(opacity)*255)}`;

function roundedHsl(channels) {
  const [r,g,b] = channels.map(value => value/255);
  const max = Math.max(r,g,b), min = Math.min(r,g,b), delta = max-min, l = (max+min)/2;
  const h = !delta ? 0 : max === r ? ((g-b)/delta+6)%6 : max === g ? (b-r)/delta+2 : (r-g)/delta+4;
  const s = !delta ? 0 : delta/(1-Math.abs(2*l-1));
  return [Math.round(h*60),Math.round(s*100),Math.round(l*100)];
}

function hslHex(h, s, l) {
  s /= 100; l = clamp(l/100);
  const a = s*Math.min(l,1-l);
  return hex([0,8,4].map(n => {
    const k = (n+h/30)%12;
    return (l-a*Math.max(-1,Math.min(k-3,9-k,1)))*255;
  }));
}

export function labelColors(t, color) {
  const channels = rgb(color);
  if (!channels) return {background:t.raised,foreground:t.foreground,border:'#00000000'};
  const background = rgb(t.background), dark = !background || perceived(background)<0.5;
  const p = perceived(channels), [h,s,l] = roundedHsl(channels);
  if (dark) {
    const lightenBy = (0.6-p)*100*lightnessSwitch(0.6,p);
    const foreground = hslHex(h,s,l+lightenBy);
    return {background:alpha(hex(channels),0.18),foreground,border:alpha(foreground,0.3)};
  }
  return {
    background:hex(channels),
    foreground:hslHex(0,0,lightnessSwitch(0.453,p)*100),
    border:alpha(hslHex(h,s,l-25),clamp((p-0.96)*100)),
  };
}
