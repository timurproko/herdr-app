// Feature capability evidence, independent of exact release membership.
import {hostVersionStatus} from './compatibility.js';
export const PALETTE_API=['appHome','checking','commands','keys','layouts','themes','settings','shared','setShared','run','openOverlay','closeOverlay','readTextFile','writeTextFile','exec','notify'];
export const PALETTE_COMMANDS=['mod.open','overlay.close'];
export const missingPaletteUi=gpui=>['InputState','Input','VirtualListScrollHandle','Scrollbar','v_virtual_list','focus_handle','on_key_down'].filter(n=>!new RegExp(`\\b${n}\\b`).test(gpui));
export function checkPaletteFacts({version,declarations,gpui,commands:catalog}){
  const commands=Array.isArray(catalog)?catalog:[];
  const status=hostVersionStatus(version),missingApi=PALETTE_API.filter(n=>!new RegExp(`export (?:async )?function ${n}\\s*\\(`).test(declarations));
  const missingUi=missingPaletteUi(gpui);
  const missingCommands=PALETTE_COMMANDS.filter(n=>!commands.some(c=>(typeof c==='string'?c:c.name)===n));
  const open=commands.find(c=>typeof c!=='string'&&c.name==='mod.open');
  if(!open||!Array.isArray(open.args)||open.args[0]?.name!=='name'||open.args.slice(1).some(a=>a.required))missingCommands.push('mod.open first argument name / additional required arguments');
  return {ok:status.supported&&!missingApi.length&&!missingUi.length&&!missingCommands.length,version,advisory:status.advisory,reason:status.reason,missingApi,missingUi,missingCommands};
}
