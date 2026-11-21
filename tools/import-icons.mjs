// Build-time artwork import only. Never invoked by Install or the runtime.
// Material Icon Theme (MIT), via the licensed reference project; retain its attribution.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reference=process.argv[2];if(!reference)throw Error('Pass the licensed reference checkout explicitly.');
const source=fs.readFileSync(path.join(reference,'packages/app/src/components/material-file-icons.ts'),'utf8');
const iconSection=source.slice(source.indexOf('const SVG_ICONS'),source.indexOf('const EXTENSION_TO_ICON'));
const icons=Object.fromEntries([...iconSection.matchAll(/^\s*([a-z_]+): `(<svg[^`]*<\/svg>)`,?\s*$/gm)].map(m=>[m[1],m[2]]));
const mapping=Object.fromEntries([...source.slice(source.indexOf('const EXTENSION_TO_ICON')).matchAll(/^\s*([a-z0-9_]+): "([a-z_]+)",?\s*$/gm)].map(m=>[m[1],m[2]]));
if(Object.keys(icons).length<50||!icons._default||Object.values(mapping).some(n=>!icons[n]))throw Error('Unrecognized reference icon table.');
// OKLab chroma reduction, retaining 65% at unchanged perceived lightness.
function tone(hex){
 let s=hex.slice(1);if(s.length===3)s=[...s].map(c=>c+c).join('');if(s.length!==6)return hex;
 const rgb=[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
 const [r,g,b]=rgb,l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),q=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 const L=.2104542553*l+.793617785*m-.0040720468*q,a=(1.9779984951*l-2.428592205*m+.4505937099*q)*.65,B=(.0259040371*l+.7827717662*m-.808675766*q)*.65;
 const x=(L+.3963377774*a+.2158037573*B)**3,y=(L-.1055613458*a-.0638541728*B)**3,z=(L-.0894841775*a-1.291485548*B)**3;
 return '#'+[4.0767416621*x-3.3077115913*y+.2309699292*z,-1.2684380046*x+2.6097574011*y-.3413193965*z,-.0041960863*x-.7034186147*y+1.707614701*z].map(v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055).map(v=>Math.max(0,Math.min(255,Math.round(v*255))).toString(16).padStart(2,'0')).join('');
}
const dir=path.join(root,'src/plugins/files/mod/icons');fs.mkdirSync(dir,{recursive:true});
for(const [name,svg]of Object.entries(icons))fs.writeFileSync(path.join(dir,name+'.svg'),svg.replace(/#[0-9a-fA-F]+/g,tone)+'\n');
const helper='// Static Material Icon Theme artwork; see custom-files/icons/NOTICE.txt.\n'+
 'export const FILE_EXTENSIONS = Object.freeze('+JSON.stringify(mapping,null,2)+');\n'+
 "export function fileIconAsset(name) { const dot=String(name).lastIndexOf('.'); const ext=dot<0?'':String(name).slice(dot+1).toLowerCase(); const icon=Object.prototype.hasOwnProperty.call(FILE_EXTENSIONS,ext)?FILE_EXTENSIONS[ext]:'_default'; return `mods/custom-files/icons/${icon}.svg`; }\n";
fs.writeFileSync(path.join(root,'src/shared/file-icons.js'),helper);
fs.copyFileSync(path.join(reference,'LICENSE'),path.join(dir,'LICENSE-REFERENCE.txt'));
console.log(`Generated ${Object.keys(icons).length} self-contained toned file icons.`);
