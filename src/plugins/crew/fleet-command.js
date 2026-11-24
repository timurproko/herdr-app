// Project before hc Base64-encodes stdout, never in render or a new companion.
// Old Crew silently ignores unknown status flags: only an explicit help
// advertisement permits --view fleet. Crew owns its versioned history policy.
export function fleetStatusScript(prelude, {discover = true, legacy = false} = {}) {
  const flags=discover?" '--discover-prs'":'';
  return [...prelude,
    '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)',
    // PowerShell 5 turns native stderr into ErrorRecords. Capture their raw
    // text rather than wrapping an exact unsupported-flag refusal in its own
    // NativeCommandError formatting (or letting Stop skip our exit code).
    'function InvokeCrew {',
    '  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$CrewArgs)',
    "  $saved = $ErrorActionPreference; $ErrorActionPreference = 'Continue'",
    '  $lines = @(& node $main @CrewArgs 2>&1); $code = $LASTEXITCODE',
    // Array += recopies all preceding lines: pretty status at 50k lines can
    // exceed the entire command deadline. Lists append in amortized O(1),
    // then each stream is joined once; task projection below is one pass.
    '  $ErrorActionPreference = $saved; $stdout = [System.Collections.Generic.List[string]]::new(); $stderr = [System.Collections.Generic.List[string]]::new()',
    '  foreach ($line in $lines) { if ($line -is [System.Management.Automation.ErrorRecord]) { $stderr.Add($line.ToString()) } else { $stdout.Add([string]$line) } }',
    '  return [pscustomobject]@{code=$code;stdout=($stdout -join "`n");stderr=($stderr -join "`n")}',
    '}',
    ...(legacy ? ['$fleetView = $false'] : [
      "$help = InvokeCrew '--help'",
      'if ($help.code -ne 0) { if ($help.stderr) { [Console]::Error.WriteLine($help.stderr) }; $help.stdout; exit $help.code }',
      "$fleetView = $help.stdout -match '--view(?:\\s+|=)fleet\\b'",
    ]),
    `if ($fleetView) { $result = InvokeCrew status '--json' '--view' 'fleet'${flags} }`,
    `else { $result = InvokeCrew status '--all' '--json'${flags} }`,
    '$code = $result.code; $raw = $result.stdout',
    'if ($result.stderr) { [Console]::Error.WriteLine($result.stderr) }',
    'if ($code -ne 0) { if ($raw) { $raw }; exit $code }',
    'function HasFields($value, $names) {',
    '  if ($value -isnot [pscustomobject]) { return $false }',
    '  foreach ($name in $names) { if ($null -eq $value.PSObject.Properties[$name]) { return $false } }',
    '  return $true',
    '}',
    'try {',
    '  $r = ConvertFrom-Json -InputObject ($raw -join "`n") -ErrorAction Stop',
    // Do not manufacture owner:null, tasks:[], or a missing task terminal:null:
    // those can be authoritative absence. Malformed shapes pass through for
    // the existing strict status validator to reject.
    "  if (-not (HasFields $r @('home','owner','tasks')) -or $r.tasks -isnot [array]) { throw 'shape' }",
    "  if ($null -ne $r.owner -and -not (HasFields $r.owner @('terminal','live'))) { throw 'shape' }",
    '  $owner = $null',
    '  if ($null -ne $r.owner) { $owner = [ordered]@{terminal=$r.owner.terminal;live=$r.owner.live} }',
    '  $tasks = @(foreach ($task in $r.tasks) {',
    "    if (-not (HasFields $task @('id','state','terminal'))) { throw 'shape' }",
    '    $t = [ordered]@{id=$task.id;state=$task.state;terminal=$task.terminal}',
    "    if ($null -ne $task.PSObject.Properties['pr']) { $t.pr = $task.pr }",
    "    if ($null -ne $task.PSObject.Properties['prDiscovery']) {",
    '      $d = $task.prDiscovery',
    "      if (HasFields $d @('status','url','source','reason')) { $t.prDiscovery = [ordered]@{status=$d.status;url=$d.url;source=$d.source;reason=$d.reason} }",
    '      else { $t.prDiscovery = $d }',
    '    }',
    '    $t',
    '  })',
    '  $out = [ordered]@{home=$r.home;owner=$owner;tasks=$tasks}',
    "  if ($null -ne $r.PSObject.Properties['prDiscovery']) {",
    "    if (HasFields $r.prDiscovery @('version')) { $out.prDiscovery = [ordered]@{version=$r.prDiscovery.version} }",
    '    else { $out.prDiscovery = $r.prDiscovery }',
    '  }',
    '  ConvertTo-Json -InputObject $out -Depth 8 -Compress',
    '} catch { $raw }',
    'exit $code',
  ].join('\n');
}
