// Explicit profile startup via supported core terminal APIs and adoption labels.
// Separate from shell-tab selection (which uses the native app tab.new command).
const { spawn } = require('node:child_process');
function connect() {
  const child = spawn('hc', ['connect'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map(); let serial = 0, buffer = '';
  const fail = () => { for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(Error('Core connection closed.')); } pending.clear(); };
  child.on('error', fail); child.on('exit', fail); child.stdin.on('error', fail);
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffer += chunk.toString('utf8');
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
      let message; try { message = JSON.parse(line); } catch { continue; }
      const request = pending.get(message.id); if (!request) continue;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) { const error = Error(message.error.message || 'Core request failed.'); error.kind = message.error.data?.kind; request.reject(error); }
      else request.resolve(message.result);
    }
  });
  child.stderr.resume();
  return {
    call(method, params) { return new Promise((resolve, reject) => {
      const id = ++serial;
      const timer = setTimeout(() => { pending.delete(id); reject(Error('Core request timed out.')); }, 10000);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    }); },
    close() { child.stdin.end(); child.kill(); fail(); },
  };
}

// Quote for the actual configured shell, not this computer's OS.
function profileLine(shell, argv) {
  if (!Array.isArray(argv) || !argv.length || argv.some(v => typeof v !== 'string' || v.includes('\0')) || !argv[0])
    throw Error('Invalid profile command.');
  const name = (shell?.[0] ?? '').split(/[\\/]/).pop().replace(/\.exe$/i, '').toLowerCase();
  if (['powershell', 'pwsh'].includes(name)) return '& ' + argv.map(v => "'" + v.replace(/'/g, "''") + "'").join(' ');
  if (name === 'cmd') {
    if (argv.some(v => /["%!\r\n]/.test(v))) throw Error('These arguments cannot be passed literally through Command Prompt. Choose PowerShell or Bash as the default terminal.');
    return argv.map(v => '"' + v + '"').join(' ');
  }
  const words = argv.map((v, i) => i === 0 && /^[A-Za-z]:[\\/]/.test(v) ? v.replace(/\\/g, '/') : v);
  if (name === 'nu') return '^' + words.map(v => {
    let fence = '#'; while (v.includes("'" + fence)) fence += '#';
    return 'r' + fence + "'" + v + "'" + fence;
  }).join(' ');
  if (name === 'fish') return words.map(v => "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'").join(' ');
  if (['bash', 'sh', 'zsh', 'dash', 'ksh'].includes(name)) return words.map(v => "'" + v.replace(/'/g, "'\\''") + "'").join(' ');
  throw Error('This default shell is not supported for profile startup. Choose Bash or PowerShell in Settings → Terminals.');
}

function profileShellArgv(shell, command, preparation = null) {
  if (!Array.isArray(shell) || !shell.length || shell.some(v => typeof v !== 'string' || /[\0\r\n]/.test(v))) throw Error('Invalid default terminal.');
  const name = shell[0].split(/[\\/]/).pop().replace(/\.exe$/i, '').toLowerCase();
  let line = profileLine(shell, command);
  if(preparation){
    if(['powershell','pwsh'].includes(name))line='$env:PATH=$env:HERDR_AGENT_PATH+[IO.Path]::PathSeparator+$env:PATH; '+line;
    else if(name==='cmd')line='setlocal DisableDelayedExpansion & set "PATH=%HERDR_AGENT_PATH%;%PATH%" & '+line;
    else if(['bash','sh','zsh','dash','ksh'].includes(name))line='. '+profileLine(shell,[preparation.bashEnv.replace(/\\/g,'/')])+'; '+line;
  }
  const tail = shell.slice(1);
  const hasCommand = tail.some(v => ['cmd'].includes(name) ? /^\/[ck]$/i.test(v)
    : ['pwsh','powershell'].includes(name) ? /^-(?:c|command|commandwithargs|f|file|e|ec|enc|encodedcommand)$/i.test(v)
    : name === 'nu' ? /^(?:-[ce]|--commands|--execute)$/.test(v)
    : /^(?:--command|--|-[a-zA-Z]*c[a-zA-Z]*)$/.test(v));
  if (hasCommand) throw Error('The default terminal already has a startup command. Remove it in Settings → Terminals before using profiles.');
  if (['powershell', 'pwsh'].includes(name)) return [...shell, ...(!tail.some(v => /^-noexit$/i.test(v)) ? ['-NoExit'] : []), '-Command', line];
  if (name === 'cmd') return [...shell, '/s', '/k', '"' + line + '"'];
  if (name === 'nu') return [...shell, '--execute', line];
  return [...shell, '-c', line + '; exec ' + profileLine(shell, shell)];
}

// Resolve on the target machine, at explicit launch time. Never create a login
// here: the companion launcher owns isolation, token lineage and cleanup.
async function isolatedClaudeCommand(target, shell, options = {}) {
  const command = target.argv?.[0] ?? '';
  if (target.profile !== 'claude' || !/^claude(?:\.exe|\.cmd|\.bat)?$/i.test(command.split(/[\\/]/).pop())) return target.argv;
  const platform = options.platform ?? process.platform, win = platform === 'win32';
  const path = require('node:path'), p = win ? path.win32 : path.posix;
  const home = options.home ?? require('node:os').homedir(), env = options.env ?? process.env;
  const exists = options.exists ?? (async file => { try { return (await require('node:fs/promises').stat(file)).isFile(); } catch { return false; } });
  const launcher = p.join(home, '.claude', 'plugins-local', 'account-switcher', 'bin', 'claude-as.sh');
  if (!await exists(launcher) || !await exists(p.join(p.dirname(launcher), 'session-dir.js')))
    throw Error('Independent Claude accounts require the account-switcher launcher on this machine. Install it before opening Claude.');
  const readText = options.readText ?? (file => require('node:fs/promises').readFile(file, 'utf8'));
  if (!(await readText(launcher)).includes('account-switcher-launch-protocol: 1'))
    throw Error('Update account-switcher to 0.8.5+ on this machine before opening an isolated Claude session.');
  const selectedBash = /^bash(?:\.exe)?$/i.test((shell[0] ?? '').split(/[\\/]/).pop()) ? shell[0] : null;
  const candidates = win ? [selectedBash,
    ...[env.ProgramW6432, env.ProgramFiles, env['ProgramFiles(x86)'], 'C:\\Program Files'].filter(Boolean).map(dir => p.join(dir, 'Git', 'bin', 'bash.exe')),
    p.join(env.LOCALAPPDATA || p.join(home, 'AppData', 'Local'), 'Programs', 'Git', 'bin', 'bash.exe'),
    ...(env.PATH ?? env.Path ?? '').split(';').filter(dir => /[\\/]git[\\/](?:usr[\\/])?bin[\\/]?$/i.test(dir)).map(dir => p.join(dir, 'bash.exe')),
  ] : [selectedBash, '/bin/bash', '/usr/bin/bash', ...(env.PATH ?? '').split(':').filter(Boolean).map(dir => p.join(dir, 'bash'))];
  let bash;
  for (const file of candidates.filter(Boolean)) if (await exists(file)) { bash = file; break; }
  if (!bash) throw Error('Independent Claude accounts require Bash (Git Bash on Windows). No shared Claude session was started.');
  // --command preserves the exact configured executable; -- keeps every Claude
  // argument literal instead of interpreting prompts as account names/numbers.
  // A single explicitly quoted Bash command also survives Windows/MSYS argv
  // translation for apostrophes, empty strings and shell metacharacters.
  const script = [launcher.replace(/\\/g, '/'), '--command', command, '--', ...target.argv.slice(1)];
  const line = win ? profileLine(['bash'], script) : 'exec ' + profileLine(['bash'], [bash, '--noprofile', '--norc', ...script]);
  return [bash, '--noprofile', '--norc', '-c', line];
}

// Role launches (a plugin gate prepared them in the UI) carry the home folder as cwd and a
// few namespaced labels. Re-checked here: the worker never trusts a half-formed request.
function roleLabels(target) {
  if (!target.role) return {};
  if (!/^[a-z][a-z0-9-]{0,30}$/.test(String(target.role))) throw Error('Unsupported profile role.');
  if (typeof target.cwd !== 'string' || !target.cwd.trim()) throw Error('A role launch needs its home folder as the startup directory.');
  const labels = { 'custom.profile.role': target.role };
  for (const [key, text] of Object.entries(target.labels ?? {})) {
    if (!/^custom\.[a-z0-9][a-z0-9.-]{0,60}$/.test(key) || typeof text !== 'string' || text.length > 400 || /[\0\r\n]/.test(text)) throw Error('Invalid role label.');
    labels[key] = text;
  }
  return labels;
}
// The scoped environment a role may add: PATH, CREW_* and FM_* only, validated again here.
function roleEnvironment(target) {
  if (!target.role) return {};
  const env = {};
  for (const [key, text] of Object.entries(target.env ?? {})) {
    if (!/^(?:PATH|(?:CREW|FM)_[A-Z0-9_]{1,60})$/.test(key) || typeof text !== 'string' || text.length > 8192 || /[\0\r\n]/.test(text)) throw Error('Invalid role environment.');
    env[key] = text;
  }
  return env;
}

// Generic bounded launch preparation: plugin code resolves/validates owned paths
// on the execution host. This worker never accepts arbitrary environment keys.
function preparedEnvironment(target, role, options={}) {
  const preparations=target.preparations??[];
  if(!Array.isArray(preparations)||preparations.length>8)throw Error('Invalid profile preparation.');
  if(!preparations.length)return {env:role,shell:null};
  const platform=options.platform??process.platform,p=require('node:path')[platform==='win32'?'win32':'posix'],delimiter=platform==='win32'?';':':';
  const absolute=v=>typeof v==='string'&&v.length<=8192&&!/[\0\r\n]/.test(v)&&p.isAbsolute(v);
  const entries=[];let bashEnv;
  for(const value of preparations){
    if(!value||Object.keys(value).some(k=>!['pathEntries','bashEnv'].includes(k))||!Array.isArray(value.pathEntries)||value.pathEntries.length>8||value.pathEntries.some(v=>!absolute(v))||!absolute(value.bashEnv))throw Error('Invalid profile preparation.');
    if(bashEnv&&bashEnv!==value.bashEnv)throw Error('Conflicting shell preparation.');
    bashEnv=value.bashEnv;entries.push(...value.pathEntries);
  }
  const source=options.env??process.env,get=key=>Object.entries(source).find(([k])=>k.toLowerCase()===key.toLowerCase())?.[1]??'';
  const base=get('PATH'),rolePath=role.PATH??base;
  // Keep a coordinator's launcher prefix ahead of the shared user bin (e.g. pi).
  const prefix=role.PATH&&base&&rolePath.endsWith(base)?rolePath.slice(0,-base.length).replace(new RegExp(delimiter+'$'),''):'';
  const head=[prefix,...new Set(entries)].filter(Boolean).join(delimiter);
  const PATH=[head,prefix?base:rolePath].filter(Boolean).join(delimiter);
  if(PATH.length>24576||/[\0\r\n]/.test(PATH))throw Error('Invalid prepared PATH.');
  const previous=get('BASH_ENV')===bashEnv.replace(/\\/g,'/')?get('HERDR_AGENT_PREVIOUS_BASH_ENV'):get('BASH_ENV');
  return {env:{...role,PATH,BASH_ENV:bashEnv.replace(/\\/g,'/'),HERDR_AGENT_PREVIOUS_BASH_ENV:previous,HERDR_AGENT_PATH:head},shell:{bashEnv}};
}

async function launchProfile(target, rpc, options = {}) {
  let address = null;
  const fresh = prefix => prefix + require('node:crypto').randomUUID().replace(/-/g, '');
  const space = target.space || fresh('sp'), tab = fresh('tb');
  // Read-only legacy profile membership guard. No document writes. The public UI
  // also validates the machine/space before invoking this explicit action.
  const assertSpace = async () => {
    if (target.space && !(await rpc('doc.get', { name: 'herdr-app' })).value?.spaces?.some(s => s.id === target.space))
      throw Error('The target space was closed. Reopen the profile menu.');
  };
  try {
    if (!Array.isArray(target.argv) || !target.argv.length) throw Error('Missing profile command.');
    const extra = roleLabels(target), prepared=preparedEnvironment(target,roleEnvironment(target),options),environment=prepared.env;
    // Ignore retired automatic sessionColor metadata, including in-flight jobs
    // from an older mod. Preserve explicit user arguments and literal prompts.
    await assertSpace();
    let shell = target.shell ?? [];
    if (!shell.length) {
      const probe = await rpc('terminal.run', { argv: [], cwd: target.cwd ?? null, no_parent: true, no_notify: true, keep: false, wait: false });
      try {
        if (!probe.address || probe.state !== 'live') throw Error('The default terminal could not start.');
        shell = probe.argv;
      } finally {
        if (probe.address) await rpc('terminal.kill', { terminal: probe.address });
      }
    }
    const command = await isolatedClaudeCommand(target, shell, options);
    const argv = profileShellArgv(shell, command, prepared.shell);
    await assertSpace();
    // Labels are present from birth; no terminal input injection or prompt wait.
    const started = await rpc('terminal.run', { argv, cwd: target.cwd ?? null,
      no_parent: true, no_notify: true, keep: true, wait: false,
      ...(Object.keys(environment).length ? { env: environment } : {}),
      labels: { 'herdr.space': space, 'herdr.tab': tab, 'herdr.right-click': 'menu',
        // Preserve the selected explicit A1 installation through the shell wrapper.
        // This is a routing hint only; native runtime identity still authorizes control.
        ...(/[\\/]/.test(target.argv[0]) && /^a1(?:\.exe|\.cmd|\.bat)?$/i.test(target.argv[0].split(/[\\/]/).at(-1))
          ? {'custom.profile.a1-command':target.argv[0]} : {}), ...extra } });
    address = started.address;
    if (!address || started.state !== 'live') throw Error('The profile terminal could not start.');
    return { ok: true, address, space, tab };
  } catch (error) {
    return { ok: false, error: error.message || 'Could not start the profile.', ...(address ? { address, space, tab } : {}) };
  }
}
module.exports = { connect, profileLine, profileShellArgv, isolatedClaudeCommand, launchProfile, roleLabels, roleEnvironment, preparedEnvironment };
if (require.main === module || !module.parent) {
  const client = connect();
  Promise.resolve().then(() => {
    const request = JSON.parse(process.argv[process.argv.length - 1]);
    if (request.stage !== 'launch-profile') throw Error('Unsupported profile request.');
    return launchProfile(request, client.call);
  }).then(result => console.log(JSON.stringify(result)))
    .catch(() => console.log(JSON.stringify({ ok: false, error: 'Could not start the profile.' })))
    .finally(() => client.close());
}
