// Mounted Custom owns one bounded repair lease. No writes from render/checking.
import {appHome,checking,commands,exec,keys,notify,readTextFile,writeTextFile,shared,setShared,window as win,requireHostCapabilities,hostVersion} from './host.js';
import {reconcileBinding,defaultsFromBindings,boundedLog,PALETTE_SCOPE,PALETTE_KEY,PALETTE_ACTION} from './palette-binding.js';
import {PALETTE_API} from './palette-capabilities.js';
import {hostVersionStatus} from './compatibility.js';
const STATUS='custom.palette.status',LEASE='custom.palette.repair';
const active=owner=>!owner.sidebarClosed&&shared('layout')==='Custom';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function safeFailure(error){
  const message=String(error?.message??'');
  if(/^(Unrecognized palette binding|Palette keys unavailable|Malformed key binding|Malformed Custom key|Higher-priority personal palette|Personal palette shortcut|Custom requires Herdr API|Owned palette|Palette repair waits|Host key reload)/.test(message))return message.slice(0,240);
  return 'Palette repair failed; check file permissions, Node and customization ownership';
}
export function initPalettePolicy(owner,cx){
  if(checking())return;
  owner.paletteGeneration=`${Date.now()}-${Math.random()}`;
  let signature=null,last=0,wasActive=false;
  const tick=(cx,force=false)=>{
    if(!active(owner)||checking())return;
    const now=Date.now(),focused=win()?.active!==false,resume=focused&&!wasActive;wasActive=focused;
    let current;
    try{current=JSON.stringify([keys(),shared('custom.palette.retry')??null]);}catch{current='capability-unavailable';}
    if(!force&&!resume&&signature===current&&now-last<60000)return;
    const lease=shared(LEASE);if(lease?.until>now)return;
    const token=`${owner.paletteGeneration}:${now}:${Math.random()}`;
    signature=current;last=now;setShared(LEASE,{token,until:now+30000});
    const live=()=>active(owner)&&shared(LEASE)?.token===token;
    cx.spawn(async cx=>{
      await cx.sleep(0);if(!live())return;
      const home=appHome();let status;
      try{
        const versionStatus=hostVersionStatus(hostVersion());
        if(!versionStatus.supported)throw Error('Owned palette host version is unavailable or below the minimum supported host');
        requireHostCapabilities(PALETTE_API);
        if(!commands().some(c=>c.name==='mod.open'&&c.args?.some(a=>a.name==='name')))throw Error('Owned palette requires mod.open argument name');
        const io={
          guard:async()=>{
            if(!live())throw Error('Repair superseded');
            const result=await exec('node',[`${home}/.customizations/runtime/scripts/palette-policy.mjs`,'inspect',home],{on:null,timeout:10000});
            if(!live())throw Error('Repair superseded');
            if(result.code!==0){let detail='';try{detail=JSON.parse(result.stderr).error;}catch{}throw Error(detail?.startsWith('Palette repair waits')?detail:'Owned palette validation failed; check customization ownership');}
          },
          read:rel=>readTextFile(`${home}/${rel}`),
          write:async(rel,text,expected)=>{if(!live())throw Error('Repair superseded');await writeTextFile(`${home}/${rel}`,text,expected);},
          defaults:()=>defaultsFromBindings(keys()),
        };
        status=await reconcileBinding(io,{install:true});
        if(!live())return;
        // keys() reads disk, not the installed GPUI table. Wait for normal reload
        // and report configuration reconciliation, never fictional dispatch proof.
        await cx.sleep(1100);if(!live())return;
        const bound=keys().some(b=>b.section===PALETTE_SCOPE&&b.keys===PALETTE_KEY&&b.action===PALETTE_ACTION);
        if(!bound||await readTextFile(`${home}/keys.error`))throw Error('Host key reload reports an error or missing palette binding');
        status={...status,configured:true};
      }catch(error){
        if(String(error?.message??'').startsWith('Palette repair waits')){signature=null;if(live())setShared(LEASE,null);return;}
        status={ok:false,status:'repair-failed',error:safeFailure(error)};
      }
      if(!live())return;
      const previous=shared(STATUS);if(!same(previous,status))setShared(STATUS,status);
      if(!status.ok&&previous?.error!==status.error)notify({title:'Custom palette needs attention',body:status.error,level:'warning',timeout:8000});
      // Keep logging best-effort and independent of successful keyboard repair.
      if(status.changed||previous?.ok!==status.ok||previous?.error!==status.error)try{
        const file=`${home}/.customizations/palette.log`,before=await readTextFile(file);
        if(live())await writeTextFile(file,boundedLog(before,status),before);
      }catch{if(live())setShared(STATUS,{...status,logUnavailable:true});}
      if(live())setShared(LEASE,null);
    });
  };
  owner.paletteTimer?.cancel();owner.paletteTimer=cx.timer.every(5000,cx=>tick(cx));tick(cx,true);
}
