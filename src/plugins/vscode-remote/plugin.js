// VS Code Remote: files on another machine open in VS Code over Remote - SSH,
// so saving edits the real file there instead of a local copy.
import { exec, hc, window } from '../api.js';

const EXTENSION = 'ms-vscode-remote.remote-ssh';
const psQuote = text => "'" + String(text).replace(/['‘’‚‛]/g, "$&$&") + "'";

// VS Code's `code` is a .cmd script on Windows, so it goes through PowerShell there.
async function code(args, timeout = 30000) {
  return window()?.platform === 'windows'
    ? exec('powershell', ['-NoProfile', '-Command', `& code ${args.map(psQuote).join(' ')}`], { timeout })
    : exec('code', args, { timeout });
}

// Herdr's machines and the ssh host each one is reached at (an ~/.ssh/config alias works).
async function machineList() {
  const r = await hc(['machine', 'ls']);
  if (r.code !== 0) throw new Error(r.stderr || 'Cannot list machines');
  const list = JSON.parse(r.stdout || '{}').machines;
  return Array.isArray(list) ? list.filter(m => !m.temporary) : [];
}

// vscode-remote://ssh-remote+pc2/d:/Git/a1/x.json for D:/Git/a1/x.json on pc2.
export function remoteFileUri(target, path) {
  const p = String(path).replace(/\\/g, '/');
  const drive = /^[A-Za-z]:/.test(p);
  const parts = (drive ? `/${p}` : p).split('/')
    .map((part, i) => drive && i === 1 ? part.toLowerCase() : encodeURIComponent(part));
  return `vscode-remote://ssh-remote+${target}${parts.join('/')}`;
}

const windowFlag = setting => setting('window') === 'new' ? ['--new-window'] : ['--reuse-window'];
async function launch(args) {
  const r = await code(args);
  if (r.code !== 0) throw new Error(r.stderr || `VS Code exited with ${r.code}`);
}

export default {
  id: 'vscode-remote',
  name: 'VS Code Remote',
  category: 'editor',
  version: '0.1.0',
  icon: 'code',
  description: 'Open files from your other machines in VS Code over SSH. You edit the real file there, not a copy on this computer.',
  defaultEnabled: false,
  settings: [
    { key: 'remoteFiles', type: 'toggle', default: true, label: 'Other machines’ files and folders',
      about: 'Open opens them in VS Code on that machine. Off: a file opens as a local copy.' },
    { key: 'localFiles', type: 'toggle', default: false, label: 'This computer’s files',
      about: 'Open opens them in VS Code too, instead of the app Windows picks.' },
    { key: 'window', type: 'choice', default: 'reuse', label: 'VS Code window',
      options: [['reuse', 'Reuse'], ['new', 'New']] },
  ],
  prerequisites: [
    { id: 'code', label: 'VS Code command line', about: 'The `code` command, added to PATH by the VS Code installer.',
      async check() {
        const r = await code(['--version']);
        return r.code === 0
          ? { status: 'ready', detail: `VS Code ${r.stdout.split(/\r?\n/)[0]}` }
          : { status: 'missing', detail: 'Install VS Code and keep “Add to PATH” checked.' };
      } },
    { id: 'remote-ssh', label: 'Remote - SSH extension', about: `VS Code extension ${EXTENSION}.`,
      async check() {
        const r = await code(['--list-extensions']);
        if (r.code !== 0) return { status: 'missing', detail: 'Needs the VS Code command line first.' };
        return r.stdout.split(/\r?\n/).some(e => e.trim().toLowerCase() === EXTENSION)
          ? { status: 'ready' } : { status: 'missing', detail: 'Not installed.' };
      },
      fix: { label: 'Install', async run() {
        const r = await code(['--install-extension', EXTENSION], 180000);
        if (r.code !== 0) throw new Error(r.stderr || 'Install failed');
      } } },
    { id: 'machines', label: 'Machines over SSH', about: 'VS Code connects with the same ssh host Herdr uses.',
      async check() {
        const list = await machineList();
        if (!list.length) return { status: 'missing', detail: 'No other machines. Add one in Settings > Machines.' };
        const detail = list.map(m => `${m.name}: ${m.state ?? 'unknown'}`).join(' · ');
        return { status: list.some(m => m.state === 'connected') ? 'ready' : 'missing', detail };
      } },
  ],
  hooks: {
    // { on, dir, fullPath, setting }: on is the machine (null here). True: handled.
    async 'files.open'({ on, dir, fullPath, setting }) {
      if (on) {
        if (!setting('remoteFiles')) return false;
        const target = (await machineList()).find(m => m.name === on)?.target || on;
        await launch([...windowFlag(setting), dir ? '--folder-uri' : '--file-uri', remoteFileUri(target, fullPath)]);
        return true;
      }
      // This computer's folders keep opening in the file manager.
      if (dir || !setting('localFiles')) return false;
      await launch([...windowFlag(setting), fullPath]);
      return true;
    },
  },
};
