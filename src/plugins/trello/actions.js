import {exec, appHome, checking} from '../api.js';
// Local status only. No Trello transport or credential value crosses into GPUI.
export async function localStatus() {
  if (checking()) return {status: 'recommended', detail: 'Use herdr-trello setup locally; credentials are never supplied by deployment.'};
  try {
    const r = await exec('node', [`${appHome()}/.customizations/runtime/lib/trello/cli.cjs`, 'status', '--home', appHome()], {timeout: 30000});
    if (r.code !== 0) return {status: 'missing', detail: 'Install the Trello command through normal full deployment.'};
    const result = JSON.parse(r.stdout), d = result?.data;
    if (result.version !== 1 || result.ok !== true || typeof d?.configured !== 'boolean') throw Error('invalid');
    if (!d.configured) return {status: 'missing', detail: 'Run herdr-trello setup with protected local input; see docs/TRELLO.md.'};
    if (!Number.isInteger(d.allowedBoards) || d.allowedBoards < 0 || d.allowedBoards > 100 || typeof d.localWrites !== 'boolean') throw Error('invalid');
    return {status: d.allowedBoards ? 'ready' : 'missing', detail: `${d.allowedBoards} locally allowed boards · ${d.localWrites ? 'Local writes permitted; Access must also be Read-write.' : 'Local read-only policy.'}`};
  } catch { return {status: 'error', detail: 'Local Trello status could not be read. Check Node.js and protected setup.'}; }
}
