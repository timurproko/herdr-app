// A1 started from a profile gets its space's color at launch (--session-color).
import { spaceColor } from '../api.js';
import { agentColorForSpace } from './palette.js';

// Only recognized interactive A1 argv is eligible. Wrappers, comparison/CLI
// commands, conflicting user overrides and unknown flags remain unchanged.
export function startupColorCandidate(argv) {
  if(!Array.isArray(argv) || !argv.length || argv.some(v=>typeof v!=='string' || /[\0\r\n]/.test(v))
    || !/^a1(?:\.exe|\.cmd|\.bat)?$/i.test(argv[0].split(/[\\/]/).at(-1)))return false;
  let session=false,sessionDir=false;
  for(let i=1;i<argv.length;i++) {
    if(argv[i]==='--')break;
    if(argv[i]==='--session' && !session)session=true;
    else if(argv[i]==='--session-dir' && !sessionDir)sessionDir=true;
    else return false;
    if(!argv[++i] || argv[i].startsWith('--'))return false;
  }
  return !sessionDir || session;
}

// Current A1 supports invocation colors. Read the latest space color at launch
// rather than probing versions or trusting stale queued color metadata.
export function launchColorArgv(argv, space) {
  if(!space || !startupColorCandidate(argv))return argv;
  const color=agentColorForSpace(spaceColor(space));
  return color?[argv[0],'--session-color',color,...argv.slice(1)]:argv;
}
