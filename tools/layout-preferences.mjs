// Pure layout projection shared by deployment and installed preference export.
const mutable=new Set(['theme','colors','font','font_size','ui_font','terminal_padding','terminal_opacity','size','hidden','active','background','padding','radius','border','focus']);
export function layoutOverrides(base,current,prefix='',out={}) {
  for(const key of new Set([...Object.keys(base??{}),...Object.keys(current??{})])) {
    const a=base?.[key],b=current?.[key],p=prefix?`${prefix}.${key}`:key;
    if(JSON.stringify(a)===JSON.stringify(b))continue;
    if(mutable.has(key)&&b!==undefined){out[p]=b;continue;}
    if(a&&b&&typeof a==='object'&&typeof b==='object')layoutOverrides(a,b,p,out);
    else throw Error(`Personal layout structure conflict: ${p}`);
  }
  return out;
}
export function projectLayout(base,overrides={}) {
  const result=structuredClone(base);
  for(const [p,value]of Object.entries(overrides)) {
    const parts=p.split('.');if(parts.some(k=>['__proto__','constructor','prototype'].includes(k))||!mutable.has(parts.at(-1)))throw Error(`Invalid layout preference: ${p}`);
    let target=result;for(const k of parts.slice(0,-1)){if(!target?.[k]||typeof target[k]!=='object')throw Error(`Layout preference no longer applies: ${p}`);target=target[k];}
    if(parts.at(-1)==='terminal_padding'&&(!Array.isArray(value)||value.length!==2||value.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>48)))throw Error('Invalid terminal padding preference.');
    target[parts.at(-1)]=value;
  }
  return result;
}
