// Preference is in the registry; this host-local board is never portable intent.
import { shared } from '../api.js';
export const WORKER_SPACE_KEY = 'custom.crew.worker-space';
export const WORKER_SPACE_SETTING = 'separateProjectSpaces';
export function workerSpaceRows(section) {
  if (section !== 'spaces') return [];
  const board = shared(WORKER_SPACE_KEY);
  return [{ key: WORKER_SPACE_SETTING, title: 'Separate space per project',
    about: 'Give each project its own space under the coordinator for new work; running agents stay where they are.',
    available: board?.available === true,
    statuses: Array.isArray(board?.statuses) ? board.statuses.filter(s=>s.status==='error').map(({machine,detail})=>({machine,detail})) : [] }];
}
