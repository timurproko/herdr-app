// Disposable Bash + fake hc only; never source real profiles or send terminal input.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';
const loader = fs.readFileSync(new URL('../shell/bash-cwd-loader.sh', import.meta.url), 'utf8');
const payload = fs.readFileSync(new URL('../shell/bash-cwd.sh', import.meta.url), 'utf8');
const guard = '[[ $- == *i* && -n ${HC_TERMINAL_ID:-} && -t 1 ]]';
assert.ok(loader.includes(guard)); assert.ok(payload.includes(guard));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'herdr-loader-test-'));
try {
  const home = path.join(temp, 'home with spaces'), shell = path.join(home, '.config/herdr-app/customizations/src/integration/shell');
  const state = path.join(home, '.local/state/yadm'), bin = path.join(temp, 'bin'), capture = path.join(temp, 'labels');
  const companion = path.join(home, '.claude/plugins-local/account-switcher/bin');
  for (const dir of [shell, state, bin, companion]) fs.mkdirSync(dir, { recursive: true });
  const fixture = text => text.replace(guard, '[[ $- == *i* && -n ${HC_TERMINAL_ID:-} ]]');
  fs.writeFileSync(path.join(shell, 'bash-cwd-loader.sh'), fixture(loader));
  fs.writeFileSync(path.join(shell, 'bash-cwd.sh'), '_fixture_payload=one\n' + fixture(payload));
  fs.writeFileSync(path.join(temp, 'payload-two.sh'), '_fixture_payload=two\n' + fixture(payload));
  fs.writeFileSync(path.join(state, 'herdr-shell.revision'), 'one\n');
  fs.writeFileSync(path.join(companion, 'shell-init.sh'), '_fixture_claude_shell=one\nclaude() { :; }\n');
  fs.writeFileSync(path.join(temp, 'shell-two.sh'), '_fixture_claude_shell=two\nclaude() { :; }\n');
  fs.writeFileSync(path.join(bin, 'hc'), '#!/usr/bin/env bash\nprintf "%s\\0" "$@" >> "$CAPTURE"\n');
  fs.chmodSync(path.join(bin, 'hc'), 0o755);
  const bash = path.join(process.env.ProgramFiles ?? 'C:/Program Files', 'Git/bin/bash.exe');
  const env = { ...process.env, HOME: home, BASH_ENV: '', ENV: '', HC_TERMINAL_ID: 'fixture-only',
    CAPTURE: capture, FIXTURE_BIN: bin, FIXTURE_ROOT: temp };
  const script = `export PATH="$(cygpath -u "$FIXTURE_BIN"):$PATH";
    PROMPT_COMMAND=true;
    source "$HOME/.config/herdr-app/customizations/src/integration/shell/bash-cwd-loader.sh";
    source "$HOME/.config/herdr-app/customizations/src/integration/shell/bash-cwd-loader.sh";
    [[ $PROMPT_COMMAND == 'true; _herdr_cwd_prompt' ]] || exit 10;
    [[ $_fixture_payload == one ]] || exit 11;
    [[ $_fixture_claude_shell == one && $(type -t claude) == function ]] || exit 16;
    cp "$FIXTURE_ROOT/shell-two.sh" "$HOME/.claude/plugins-local/account-switcher/bin/shell-init.sh";
    cp "$FIXTURE_ROOT/payload-two.sh" "$HOME/.config/herdr-app/customizations/src/integration/shell/bash-cwd.sh";
    _herdr_cwd_prompt;
    [[ $_fixture_payload == one && $_fixture_claude_shell == one ]] || exit 12;
    printf 'two\\n' > "$HOME/.local/state/yadm/herdr-shell.revision";
    false; _herdr_cwd_prompt;
    [[ $? == 1 && $_fixture_payload == two && $_fixture_claude_shell == two ]] || exit 13;
    [[ $PROMPT_COMMAND == 'true; _herdr_cwd_prompt' ]] || exit 14;
    PROMPT_COMMAND=(true true);source "$HOME/.config/herdr-app/customizations/src/integration/shell/bash-cwd-loader.sh";
    source "$HOME/.config/herdr-app/customizations/src/integration/shell/bash-cwd-loader.sh";
    [[ \${#PROMPT_COMMAND[@]} == 3 && \${PROMPT_COMMAND[2]} == _herdr_cwd_prompt ]] || exit 15;
    true`;
  const result = cp.spawnSync(bash, ['--noprofile', '--norc', '-ic', script], { cwd: home, env, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, 'Prompt bootstrap/reload failed: ' + result.stderr);
  assert.equal(fs.readFileSync(capture, 'utf8').split('\0').filter(Boolean).length, 10, 'Only initial install and changed revision report unchanged CWD.');
  const captured = path.join(temp, 'production-loader.sh'); fs.writeFileSync(captured, loader);
  const quiet = cp.spawnSync(bash, ['--noprofile', '--norc', '-ic', 'source "$PRODUCTION_LOADER"'],
    { env: { ...env, PRODUCTION_LOADER: captured }, encoding: 'utf8', timeout: 15000 });
  assert.equal(quiet.status, 0); assert.equal(quiet.stdout, '', 'Non-TTY tool shells must not install prompt reporting.');
  console.log('PASS: yadm revision reload at the next prompt, string/array hook idempotence, preserved exit status and non-TTY guards (no real terminal input).');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
