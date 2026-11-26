// Only these four fixed operations reach the installed tool. No owner identity,
// ambient target setter, setup, orchestration or app-side registry writer.
const quote = value => "'" + String(value).replace(/['‘’‚‛]/g, '$&$&') + "'";
export const absoluteHome = value => typeof value === 'string' && value.length <= 2048 &&
  !/[\u0000-\u001f\u007f]/.test(value) && (/^[A-Za-z]:[\\/]/.test(value) || /^\/(?!\/)/.test(value));
export const homeIdentity = home => /^[A-Za-z]:/.test(home) ? home.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase() : home.replace(/\/$/, '');
export const supportedCapability = value => value?.capability === 'worker-space-local-set' && value.version === 1 &&
  value.explicitHome === true && Array.isArray(value.modes) && value.modes.includes('combined') && value.modes.includes('per-project');
export function workerSpaceScript(prelude, request) {
  const {kind, home, mode, cached, cwd} = request;
  if (!['capability','discover','read','set'].includes(kind) || home != null && !absoluteHome(home) ||
      kind === 'set' && (!absoluteHome(home) || !['combined','per-project'].includes(mode)) || kind === 'read' && !absoluteHome(home) || cwd != null && (kind !== 'discover' || !absoluteHome(cwd))) throw Error('Invalid worker-space request');
  const lines = [...prelude];
  if (kind === 'capability') return [...lines,
    "$file = Get-Item -LiteralPath $main; $identity = $file.FullName + ':' + $file.LastWriteTimeUtc.Ticks + ':' + $file.Length",
    `$cached = ConvertFrom-Json ${quote(JSON.stringify(cached ?? null))}`,
    "if ($cached -and $cached.identity -eq $identity) { $cached | ConvertTo-Json -Depth 8 -Compress; exit 0 }",
    "$ErrorActionPreference = 'Continue'",
    "$answer = @(& node $main config worker-space --capabilities --json 2>$null); $code = $LASTEXITCODE",
    'if (($answer -join "`n").Length -gt 8192) { exit 70 }',
    "[ordered]@{identity=$identity;code=$code;stdout=($answer -join \"`n\")} | ConvertTo-Json -Depth 8 -Compress", 'exit 0'].join('\n');
  if (home) lines.push(`$env:CREW_HOME = ${quote(home)}`);
  else lines.push(cwd ? `Set-Location -LiteralPath ${quote(cwd)}` : 'Set-Location -LiteralPath $env:USERPROFILE'); // only an explicit launch folder may replace default discovery
  if (kind === 'discover') return [...lines,
    "$ErrorActionPreference = 'Continue'",
    "$answer = @(& node $main status --json --view fleet 2>$null); $code = $LASTEXITCODE",
    'if ($code -ne 0) { exit $code }',
    "$r = ConvertFrom-Json ($answer -join \"`n\"); [ordered]@{home=$r.home} | ConvertTo-Json -Compress", 'exit 0'].join('\n');
  const command = kind === 'read' ? '& node $main config worker-space' :
    `& node $main config worker-space --set-local ${quote(mode)} --home ${quote(home)} --json`;
  return [...lines, "$ErrorActionPreference = 'Continue'", `$answer = @(${command} 2>$null); $code = $LASTEXITCODE`,
    '$text = $answer -join "`n"; if ($text.Length -gt 16384) { exit 70 }', '[Console]::Out.Write($text)', 'exit $code'].join('\n');
}
export function setterResult(result, home, mode) {
  let value; try { value = JSON.parse(result.stdout); } catch { return {status:'failed',reason:'Invalid Crew reply'}; }
  if (value?.capability !== 'worker-space-local-set' || value.version !== 1) return {status:'failed',reason:'Invalid Crew reply'};
  if (result.code === 0 && value.ok === true && typeof value.changed === 'boolean' && absoluteHome(value.home) &&
      homeIdentity(value.home) === homeIdentity(home) && value.mode === mode && value.error == null) return {status:'accepted'};
  const codes = {2:['invalid-arguments','invalid-mode','home-not-found','home-not-initialized','invalid-home','invalid-registry'],3:['registry-busy'],4:['io-error'],70:['internal-error']};
  if (value.ok !== false || value.mode !== null || value.changed !== false ||
      value.home !== null && (!absoluteHome(value.home) || homeIdentity(value.home) !== homeIdentity(home)) ||
      !codes[result.code]?.includes(value.error?.code)) return {status:'failed',reason:'Invalid Crew reply'};
  return {status:result.code === 3 ? 'pending' : result.code === 2 ? 'refused' : 'failed',
    reason:result.code === 3 ? 'Crew is busy' : result.code === 2 ? 'Crew refused this home' : 'Crew could not save',code:value.error.code};
}
