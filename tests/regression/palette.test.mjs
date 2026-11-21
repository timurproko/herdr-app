import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULT_PALETTE, buildTheme, hex, contrast, ink } from '../mods/custom-settings/palette.js';
import { hsvToHex, hexToHsv, svPoint } from '../mods/custom-settings/color.js';
for(const value of ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#1634d3','#84cc16','#f43f5e','#1b2c3d']) {
  const {h,s,v}=hexToHsv(value);assert.equal(hsvToHex(h,s,v),value,'HSV round trips preserve opaque colors');
}
// The rounded native hue/value base and masked white/value artwork must
// composite to standard HSV; neither layer leaves saturated hue at v=0.
const rgb=value=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
for(let h=0;h<360;h+=15)for(const s of [0,0.25,0.5,0.75,1])for(const v of [0,0.25,0.5,0.75,1]) {
  const expected=rgb(hsvToHex(h,s,v)),composite=rgb(hsvToHex(h,1,1)).map(channel=>Math.round(channel*v*s+255*v*(1-s)));
  composite.forEach((channel,i)=>assert.ok(Math.abs(channel-expected[i])<=1,'SV layers preserve HSV values without double-darkening'));
  if(v===0)assert.deepEqual(composite,[0,0,0],'All bottom hues/saturations end in black');
}
const svArtwork=fs.readFileSync(new URL('../mods/custom-settings/color-sv-value.svg',import.meta.url),'utf8');
assert.match(svArtwork,/maskUnits="userSpaceOnUse"/);assert.match(svArtwork,/color-interpolation="sRGB"/);assert.match(svArtwork,/rx="6"/);
assert.equal(hsvToHex(360,1,1),'#ff0000');assert.equal(hsvToHex(-120,1,1),'#0000ff');
assert.deepEqual(svPoint({x:220,y:178},{x:100,y:100,width:240,height:156}),{s:0.5,v:0.5});
assert.deepEqual(svPoint({x:-50,y:900},{x:0,y:0,width:240,height:156}),{s:0,v:0});assert.equal(svPoint({x:0,y:0},{width:0,height:0}),null);
const base = JSON.parse(fs.readFileSync(new URL('../themes/Custom.json', import.meta.url),'utf8'));
const before=JSON.stringify(base);
const accents=['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00','#00ffff','#ff00ff','#20744a','#3b82f6','#8b5cf6','#f59e0b','#f43f5e','#c4c9c6','#123456','#abcdef'];
for(const accent of accents) {
  const theme=buildTheme(base,{...DEFAULT_PALETTE,accent});
  assert.equal(theme.colors.solid,accent);
  const again=buildTheme(base,theme.customization.palette);assert.deepEqual(again,theme,'No progressive tint accumulation');
  for(const bg of ['background','chrome','surface']) {
    assert.ok(contrast(theme.colors.foreground,theme.colors[bg])>=4.5);
    assert.ok(contrast(theme.colors.muted,theme.colors[bg])>=3);
  }
  assert.ok(contrast(theme.colors.solid,theme.colors.solid_foreground)>=4.5,accent+' button text');
  assert.ok(contrast(theme.colors.accent,theme.colors.accent_foreground)>=4.5,accent+' toggle text');
  for(const bg of ['background','chrome','surface']) assert.ok(contrast(theme.colors.accent,theme.colors[bg])>=4.5,accent+' small icons on '+bg);
  for(const state of ['working','blocked','done','idle']) assert.equal(theme.colors[state],base.colors[state]);
  assert.deepEqual(theme.ansi,base.ansi);assert.equal(theme.customization.version,1);
}
const blue=buildTheme(base,{...DEFAULT_PALETTE,accent:'#3b82f6'}), rose=buildTheme(base,{...DEFAULT_PALETTE,accent:'#f43f5e'});
for(const role of ['background','chrome','surface','border','hover','selected','selection']) assert.notEqual(blue.colors[role],rose.colors[role],role+' follows the accent');
assert.ok(parseInt(blue.colors.background.slice(5),16)>parseInt(blue.colors.background.slice(1,3),16),'Blue surfaces are not green');
const neutral=buildTheme(base,DEFAULT_PALETTE);
for(const role of ['background','surface','canvas','chrome','popover','raised','border','hover','selected','selection','foreground','muted','dim','accent','input']) {
  const c=neutral.colors[role];assert.equal(c.slice(1,3),c.slice(3,5),role+' has no color cast');assert.equal(c.slice(3,5),c.slice(5,7),role+' is truly neutral');
}
const light={...DEFAULT_PALETTE,background:'#ffffff',sidebar:'#f4f4f5',surface:'#fafafa',foreground:'#18181b',muted:'#52525b',border:'#e4e4e7'};
assert.ok(contrast(buildTheme(base,light).colors.accent,light.background)>=4.5);
assert.equal(hex(' #ABC '),'#aabbcc');assert.equal(ink('#000'),'#ffffff');assert.equal(ink('#fff'),'#000000');
for(const color of ['green','#12','#1234','#gggggg','rgb(0,0,0)','<script>']) assert.throws(()=>hex(color));
assert.throws(()=>buildTheme(base,{...DEFAULT_PALETTE,foreground:'#181b1a'}),/Text must contrast/);
assert.throws(()=>buildTheme(base,{...DEFAULT_PALETTE,muted:'#181b1a'}),/Secondary text/);
assert.throws(()=>buildTheme({ansi:[]},DEFAULT_PALETTE),/unavailable/);
assert.equal(JSON.stringify(base),before,'Bundled theme is never mutated');
console.log('PASS: arbitrary accent palettes, readable text, shorthand hex, light surfaces, semantic colors and immutable base theme');
