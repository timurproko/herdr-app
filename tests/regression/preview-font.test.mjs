import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'mods/custom-settings/preview-font.js'),'utf8');
assert.equal(source,fs.readFileSync(path.join(root,'mods/custom-files/preview-font.js'),'utf8'));
const values=new Map(),writes=[];let terminalFamily='JetBrains Mono',terminalSize=13;
const context=vm.createContext({});
const api={shared:key=>values.get(key),setShared:(key,value)=>{values.set(key,value);writes.push(key);},settings:()=>({font_family:terminalFamily,font_size:terminalSize})};
const dependency=new vm.SyntheticModule(Object.keys(api),function(){for(const[k,v]of Object.entries(api))this.setExport(k,v);},{context});
const mod=new vm.SourceTextModule(source,{context});await mod.link(name=>{assert.equal(name,'./host.js');return dependency;});await mod.evaluate();
const p=mod.namespace,key=p.PREVIEW_FONT_KEY;
assert.equal(p.previewFont().size,12);assert.equal(p.previewFont().family,'JetBrains Mono');assert.equal(writes.length,0,'Reading/opening Settings never writes a default');
terminalFamily='New Terminal Family';terminalSize=27;assert.equal(p.previewFont().family,terminalFamily);assert.equal(p.previewFont().size,12,'Terminal size does not change preview size');
p.adjustPreviewFontSize(1);p.adjustPreviewFontSize(1);assert.equal(p.previewFont().size,14,'Rapid clicks read the current preference, not a stale render');
p.setPreviewFont({family:'Geist'});terminalFamily='Another Terminal Font';assert.equal(p.previewFont().family,'Geist');assert.equal(p.previewFont().size,14);
p.setPreviewFont({family:null});assert.equal(p.previewFontPreference().family,null);assert.equal(p.previewFont().family,terminalFamily,'Default inherits the terminal family, never its size');
const old={size:14,family:'Geist',future:{preserve:true}};values.set(key,old);p.setPreviewFont({size:15});assert.equal(old.size,14);assert.equal(values.get(key).future,old.future,'Updates preserve unrelated preference fields');
for(const[value,expected]of [[1,8],[100,32],[14.6,15],[NaN,12],[Infinity,12],['20',12],[null,12]]){p.setPreviewFont({size:value});assert.equal(p.previewFont().size,expected);}
for(const value of ['',42,[],{},' '.repeat(5),'x'.repeat(201)]){p.setPreviewFont({family:value});assert.equal(p.previewFontPreference().family,null);}
values.set(key,{size:'bad',family:123});assert.equal(p.previewFont().size,12);assert.equal(p.previewFont().family,terminalFamily);
assert.ok(writes.every(k=>k===key));assert.equal(terminalSize,27,'No native terminal setting is changed');
console.log('PASS: independent persisted preview size/family, defaults, limits, rapid changes, inheritance, unknown-field preservation and identical helper copies');
