// Disposable installed package + fake hc only; never read profiles or send input.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
const loader = fs.readFileSync(new URL('../shell/bash-cwd-loader.sh', import.meta.url), 'utf8');
const payload = fs.readFileSync(new URL('../shell/bash-cwd.sh', import.meta.url), 'utf8');
const guard = '[[ $- == *i* && -n ${HC_TERMINAL_ID:-} && -t 1 ]]';
assert.ok(loader.includes(guard)); assert.ok(payload.includes(guard));
const artifacts=path.resolve(process.env.HERDR_CUSTOMIZATION_SOURCE??path.join(import.meta.dirname,'../..'),'.artifacts');
fs.mkdirSync(artifacts,{recursive:true});
const temp = fs.mkdtempSync(path.join(artifacts, 'herdr-loader-'));
try {
  const home = path.join(temp, 'user'), appHome=path.join(temp,'selected home with spaces');
  const shell = path.join(appHome, '.customizations/runtime/shell');
  const bin = path.join(temp, 'bin'), capture = path.join(temp, 'labels');
  const companion = path.join(home, '.claude/plugins-local/account-switcher/bin');
  for (const dir of [shell, bin, companion]) fs.mkdirSync(dir, { recursive: true });
  // Only the fixture's TTY check is relaxed; exercise the production guard below.
  const fixture = text => text.replace(guard, '[[ $- == *i* && -n ${HC_TERMINAL_ID:-} ]]');
  fs.writeFileSync(path.join(shell, 'bash-cwd-loader.sh'), fixture(loader));
  fs.writeFileSync(path.join(shell, 'bash-cwd.sh'), '_fixture_payload=one\n' + fixture(payload));
  fs.writeFileSync(path.join(temp, 'payload-two.sh'), '_fixture_payload=two\n' + fixture(payload));
  fs.writeFileSync(path.join(shell, 'revision'), 'one\n');
  fs.writeFileSync(path.join(companion, 'shell-init.sh'), '_fixture_claude_shell=one\nclaude() { :; }\n');
  fs.writeFileSync(path.join(temp, 'shell-two.sh'), '_fixture_claude_shell=two\nclaude() { :; }\n');
  fs.writeFileSync(path.join(bin, 'hc'), '#!/usr/bin/env bash\n[[ ! -f "$FIXTURE_ROOT/fail" ]] || exit 1\nprintf "%s\\0" "$@" >> "$CAPTURE"\n');
  fs.chmodSync(path.join(bin, 'hc'), 0o755);
  const bash = process.platform==='win32'?path.join(process.env.ProgramFiles ?? 'C:/Program Files', 'Git/bin/bash.exe'):'/bin/bash';
  const env = { ...process.env, HOME: home, HERDR_APP_HOME:appHome, BASH_ENV: '', ENV: '', HC_TERMINAL_ID: 'fixture-only',
    CAPTURE: capture, FIXTURE_BIN: bin, FIXTURE_ROOT: temp };
  const script = `if command -v cygpath >/dev/null; then HOME=$(cygpath -u "$HOME"); HERDR_APP_HOME=$(cygpath -u "$HERDR_APP_HOME"); FIXTURE_BIN=$(cygpath -u "$FIXTURE_BIN"); FIXTURE_ROOT=$(cygpath -u "$FIXTURE_ROOT"); fi;
    export HOME HERDR_APP_HOME FIXTURE_ROOT PATH="$FIXTURE_BIN:$PATH";
    hook="$HERDR_APP_HOME/.customizations/runtime/shell/bash-cwd-loader.sh";
    PROMPT_COMMAND=true;
    source "$hook"; source "$hook";
    [[ $PROMPT_COMMAND == 'true; _herdr_cwd_prompt' && $_fixture_payload == one ]] || exit 10;
    [[ $_fixture_claude_shell == one && $(type -t claude) == function ]] || exit 11;
    cp "$FIXTURE_ROOT/shell-two.sh" "$HOME/.claude/plugins-local/account-switcher/bin/shell-init.sh";
    cp "$FIXTURE_ROOT/payload-two.sh" "$_herdr_cwd_directory/bash-cwd.sh";
    _herdr_cwd_prompt;
    [[ $_fixture_payload == one && $_fixture_claude_shell == one ]] || exit 12;
    cd "$FIXTURE_ROOT";
    printf 'two\\n' > "$_herdr_cwd_directory/revision";
    false; _herdr_cwd_prompt;
    [[ $? == 1 && $_fixture_payload == two && $_fixture_claude_shell == two ]] || exit 13;
    PROMPT_COMMAND=(true true); source "$hook"; source "$hook";
    [[ \${#PROMPT_COMMAND[@]} == 3 && \${PROMPT_COMMAND[2]} == _herdr_cwd_prompt ]] || exit 14;
    mv "$_herdr_cwd_directory/bash-cwd.sh" "$FIXTURE_ROOT/saved.sh";
    false; _herdr_cwd_prompt; [[ $? == 1 ]] || exit 15;
    mv "$FIXTURE_ROOT/saved.sh" "$_herdr_cwd_directory/bash-cwd.sh";
    touch "$FIXTURE_ROOT/fail"; unset _herdr_cwd_last;
    false; _herdr_cwd_prompt; [[ $? == 1 && -z \${_herdr_cwd_last:-} ]] || exit 16;
    rm "$FIXTURE_ROOT/fail"; _herdr_cwd_prompt;
    [[ -n $_herdr_cwd_last && $PROMPT_COMMAND == true ]] || exit 17;
    true`;
  const result = cp.spawnSync(bash, ['--noprofile', '--norc', '-ic', script], { cwd: home, env, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, 'Prompt bootstrap/reload failed: ' + result.stderr);
  assert.equal(fs.readFileSync(capture, 'utf8').split('\0').filter(Boolean).length, 15, 'Initial load, changed revision/directory and retry report.');
  assert.ok(!fs.existsSync(path.join(home,'.config/herdr-app/customizations')));
  assert.ok(!fs.existsSync(path.join(home,'.local/state/yadm')));
  const captured = path.join(temp, 'production-loader.sh'); fs.writeFileSync(captured, loader);
  for(const [args,identity] of [[['-ic'], 'fixture-only'],[['-c'],'fixture-only'],[['-ic'],'']]) {
    const quiet = cp.spawnSync(bash, ['--noprofile', '--norc', ...args, 'source "$PRODUCTION_LOADER"; ! declare -F _herdr_cwd_prompt >/dev/null'],
      { env: { ...env, HC_TERMINAL_ID:identity, PRODUCTION_LOADER: captured }, encoding: 'utf8', timeout: 15000 });
    assert.equal(quiet.status, 0,quiet.stderr); assert.equal(quiet.stdout, '', 'Tool/non-Herdr shells stay quiet.');
  }
  console.log('PASS: installed sibling reload, alternate home/cd, hook idempotence, retries, exit status and guards (fake Core only).');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
