import { shared, setShared } from '../api.js';
import { syncSidebarUsage } from './sidebar.js';
export default {
  id:'usage', name:'Usage', category:'Tools', version:'1.0.0',
  icon:'mods/custom-usage/gauge.svg', defaultEnabled:true,
  description:'Account quotas, the Usage dialog, sidebar summaries, and machine-specific settings.',
  // Invalidate collection generations without deleting pins, reports or preferences.
  onEnabledChange() { setShared('custom.usage.generation',(Number(shared('custom.usage.generation'))||0)+1); },
  lifecycle:{'sidebar.sync':({owner,cx,enabled})=>syncSidebarUsage(owner,cx,enabled)},
};
