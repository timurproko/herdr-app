// Explicit Windows core relaunches. Inspection never writes files or starts tasks.
// Task principals are always this user's SID, never SYSTEM, and store no password.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const encoded = text => Buffer.from(text, 'utf16le').toString('base64');
const psLiteral = text => "'" + String(text).replaceAll("'", "''") + "'";
const sessionName = () => process.env.HC_SESSION || 'default';
function validateRequest(input) {
  if (!input || !['inspect', 'apply', 'start', 'stop', 'autostart', 'status', 'reboot'].includes(input.action)) throw Error('Invalid permission action.');
  if (['apply', 'start', 'stop', 'autostart'].includes(input.action) && !['standard', 'administrator'].includes(input.mode)) throw Error('Invalid launch mode.');
  if (input.action === 'autostart' && typeof input.remember !== 'boolean') throw Error('Invalid autostart setting.');
  if (input.action !== 'inspect' && !/^[a-z0-9-]{10,80}$/.test(input.request || '')) throw Error('Invalid relaunch request.');
  if (input.session !== undefined && input.session !== sessionName()) throw Error('The core session changed. Refresh Settings before relaunching.');
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sessionName())) throw Error('This core session name is not supported by the permission launcher.');
  return input;
}
const WORKER = String.raw`
$ErrorActionPreference='Stop'
function Write-Result($state,$message) {
  $value=@{request=$o.request;mode=$o.mode;operation=$o.operation;state=$state;message=$message;at=[DateTime]::UtcNow.ToString('o')}
  $temp=$o.result+'.tmp'; [IO.File]::WriteAllText($temp,($value|ConvertTo-Json -Compress)); Move-Item -LiteralPath $temp -Destination $o.result -Force
}
function Invoke-Core([string[]]$arguments) {
  $s=New-Object Diagnostics.ProcessStartInfo; $s.FileName=$o.core; $s.UseShellExecute=$false; $s.CreateNoWindow=$true
  $s.RedirectStandardOutput=$true; $s.RedirectStandardError=$true
  $s.WorkingDirectory=$profileHome
  $s.Arguments=($arguments | ForEach-Object {'"'+($_ -replace '"','\"')+'"'}) -join ' '
  $p=New-Object Diagnostics.Process; $p.StartInfo=$s
  try {
    [void]$p.Start(); $out=$p.StandardOutput.ReadToEndAsync(); $err=$p.StandardError.ReadToEndAsync()
    if(-not $p.WaitForExit(15000)) { $p.Kill(); throw 'A core command timed out.' }
    return @{code=$p.ExitCode;stdout=$out.Result;stderr=$err.Result}
  } finally { $p.Dispose() }
}
try {
  $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
  $admin=([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  $tokenMode=if($o.startTask) {'administrator'} else {$o.mode}
  if($identity.User.Value -ne $o.sid -or $admin -ne ($tokenMode -eq 'administrator')) { throw 'Windows did not supply the requested user token. No core was stopped.' }
  $profileHome=[Environment]::GetFolderPath('UserProfile')
  if(-not $profileHome -or -not (Test-Path -LiteralPath $profileHome -PathType Container)) { throw 'The Windows user home folder is unavailable. No core was stopped.' }
  # Task Scheduler defaults to System32. Set BOTH PowerShell location and the
  # native process cwd; neither overrides explicit terminal/project cwd values.
  Set-Location -LiteralPath $profileHome
  [Environment]::CurrentDirectory=$profileHome
  $env:HC_SESSION=$o.session
  foreach($key in @('HC_SOCKET','HC_TERMINAL_ID')) { [Environment]::SetEnvironmentVariable($key,$null,'Process') }
  # Asks a NEW exec of the running core for its token, never this worker's.
  $check='if(([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){"administrator"}else{"standard"}'
  $check64=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($check))
  if($o.restart) {
    # Let the UI receive the queued acknowledgement before its exec connection ends.
    # A sign-in check has no UI waiting.
    if(-not $o.stopElevatedOnly) { Start-Sleep -Seconds 4 }
    $before=Invoke-Core @('server','status')
    # Sign-in in standard mode: an SSH login of an admin account is elevated, so another
    # machine reconnecting after boot can start core elevated before this user signs in.
    # Only such a core is replaced; one already running as a standard user is kept.
    if($o.stopElevatedOnly -and $before.code -eq 0) {
      $probe=Invoke-Core @('exec','powershell.exe','-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',$check64)
      if($probe.code -eq 0 -and $probe.stdout.Trim() -eq 'standard') { Write-Result 'complete' 'Core already runs as a standard user.'; return }
    }
    Write-Result 'restarting' 'Stopping this session and its terminal holders.'
    $pids=@()
    if($before.code -eq 0) {
      $status=$before.stdout|ConvertFrom-Json; $pids=@($status.pid)+@($status.holders|ForEach-Object {$_.pid})
      $stop=Invoke-Core @('server','stop'); if($stop.code -ne 0) { throw 'The old core could not be stopped. No replacement was started.' }
      # A normal restart retains the holders and therefore their old permissions.
      $deadline=[DateTime]::UtcNow.AddSeconds(20)
      while(@($pids|Where-Object {$_ -and (Get-Process -Id $_ -ErrorAction SilentlyContinue)}).Count -gt 0) {
        if([DateTime]::UtcNow -gt $deadline) { throw 'Old terminal holders are still running. No replacement was started.' }
        Start-Sleep -Milliseconds 200
      }
    } else {
      $errorReply=$before.stderr|ConvertFrom-Json
      if($errorReply.error.kind -ne 'unavailable' -or $errorReply.error.message -notmatch 'os error 2') { throw 'The current core could not be inspected. Nothing was stopped.' }
    }
  }
  if($o.stopOnly) { Write-Result 'complete' 'Core stopped.'; return }
  if($o.startTask) {
    # A limited token cannot inspect/stop an elevated Windows named pipe. The
    # elevated coordinator only stops it; a separate LIMITED task starts core.
    Start-ScheduledTask -TaskName $o.startTask
    return
  }
  $start=Invoke-Core @('server','start'); if($start.code -ne 0) { throw 'The requested core could not be started. Open Herdr on this machine to recover.' }
  # Check the token of a NEW exec, not this worker: SSH can race us to startup.
  $proof=Invoke-Core @('exec','powershell.exe','-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',$check64)
  if($proof.code -ne 0 -or $proof.stdout.Trim() -ne $o.mode) { throw 'The running core does not have the requested permissions. Another launcher may have won startup. No success is claimed; use Refresh or open Herdr on this machine.' }
  Write-Result 'complete' 'Core launch permissions verified.'
} catch { Write-Result 'failed' $_.Exception.Message }
finally {
  if($o.cleanup) { Unregister-ScheduledTask -TaskName $o.cleanup -Confirm:$false -ErrorAction SilentlyContinue }
}
`;
const MANAGER = String.raw`
param([switch]$Approved)
$ErrorActionPreference='Stop'
$accepted=$false
try {
  $identity=[Security.Principal.WindowsIdentity]::GetCurrent(); $sid=$identity.User.Value
  if($sid -ne $o.sid) { throw 'The approved account is different. Nothing was changed.' }
  $admin=([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  $existing=Get-ScheduledTask -TaskName $o.signInTask -ErrorAction SilentlyContinue
  if($existing -and $existing.Description -ne $o.marker) { throw 'A task with this name is not owned by the permission launcher. Nothing was changed.' }
  $startTask=$o.signInTask+'-start'
  $existingStart=Get-ScheduledTask -TaskName $startTask -ErrorAction SilentlyContinue
  if($existingStart -and $existingStart.Description -ne $o.marker) { throw 'A task with this name is not owned by the permission launcher. Nothing was changed.' }
  # An administrator account (even with a filtered desktop token) gets an elevated token
  # over SSH, so a core it starts there would beat a standard sign-in start.
  $adminCapable=$admin -or [bool](whoami /groups /fo csv | ConvertFrom-Csv | Where-Object { $_.SID -eq 'S-1-5-32-544' })
  $guarded=$o.operation -eq 'autostart' -and $o.remember -and $o.mode -eq 'standard' -and $adminCapable
  $needsAdmin=($o.mode -eq 'administrator' -and ($o.operation -ne 'autostart' -or $o.remember)) -or $guarded -or ($o.operation -eq 'autostart' -and $existing -and $existing.Principal.RunLevel -eq 'Highest')
  if($needsAdmin -and -not $admin) {
    if($Approved -or [Diagnostics.Process]::GetCurrentProcess().SessionId -eq 0) { throw 'Administrator approval must be made on this machine desktop. No SSH credential prompt was opened.' }
    $p=Start-Process -FilePath $o.powershell -Verb RunAs -ArgumentList @('-NoLogo','-NoProfile','-File',('"'+$PSCommandPath+'"'),'-Approved') -PassThru -Wait
    if($p.ExitCode -ne 0) { throw 'Administrator approval was cancelled or configuration failed.' }
    exit 0
  }
  # Interactive-token tasks deliberately refuse headless/password/SYSTEM fallbacks.
  $desktop=@(Get-CimInstance Win32_Process -Filter "Name='explorer.exe'" | Where-Object {(Invoke-CimMethod -InputObject $_ -MethodName GetOwnerSid -ErrorAction SilentlyContinue).Sid -eq $sid})
  if($o.operation -ne 'autostart' -and $desktop.Count -eq 0) { throw 'Sign in to the Windows desktop as this same user before starting core. Nothing was stopped.' }
  if(-not (Test-Path -LiteralPath $o.core -PathType Leaf)) { throw 'The per-user herdr-core installation was not found. Nothing was stopped.' }
  $profileHome=[Environment]::GetFolderPath('UserProfile')
  if(-not $profileHome -or -not (Test-Path -LiteralPath $profileHome -PathType Container)) { throw 'The Windows user home folder is unavailable. Nothing was stopped.' }
  $level=if($o.mode -eq 'administrator') {'Highest'} else {'Limited'}
  $principal=New-ScheduledTaskPrincipal -UserId $sid -LogonType Interactive -RunLevel $level
  $settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 3) -MultipleInstances IgnoreNew
  function Task-Action($restart,$result,$cleanup,$startTask,$stopElevatedOnly=$false) {
    $data=@{sid=$sid;core=$o.core;session=$o.session;mode=$o.mode;request=$o.request;result=$result;restart=$restart;cleanup=$cleanup;startTask=$startTask;stopElevatedOnly=$stopElevatedOnly;operation=$o.operation;stopOnly=($o.operation -eq 'stop')}
    $data64=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($data|ConvertTo-Json -Compress)))
    $script='$o=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('''+$data64+'''))|ConvertFrom-Json;'+$worker
    $script64=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
    # powershell.exe started directly by Task Scheduler opens a console window that -WindowStyle Hidden
    # only hides after it has appeared. A headless conhost gives it a console without a window.
    return New-ScheduledTaskAction -Execute $o.conhost -WorkingDirectory $profileHome -Argument ('--headless "'+$o.powershell+'" -NoLogo -NoProfile -NonInteractive -EncodedCommand '+$script64)
  }
  if($o.operation -eq 'autostart') {
    if($o.remember) {
      $trigger=New-ScheduledTaskTrigger -AtLogOn -User $sid
      if($guarded) {
        # Sign-in runs elevated only to replace an elevated core (see the worker's
        # stopElevatedOnly), then a LIMITED task starts core, as Apply's handoff does.
        $limited=New-ScheduledTask -Action (Task-Action $false $o.startupResult $null $null) -Principal $principal -Settings $settings -Description $o.marker
        Register-ScheduledTask -TaskName $startTask -InputObject $limited -Force | Out-Null
        $guard=New-ScheduledTaskPrincipal -UserId $sid -LogonType Interactive -RunLevel Highest
        $startup=New-ScheduledTask -Action (Task-Action $true $o.startupResult $null $startTask $true) -Trigger $trigger -Principal $guard -Settings $settings -Description $o.marker
      } else {
        if($existingStart) { Unregister-ScheduledTask -TaskName $startTask -Confirm:$false }
        $startup=New-ScheduledTask -Action (Task-Action $false $o.startupResult $null $null) -Trigger $trigger -Principal $principal -Settings $settings -Description $o.marker
      }
      Register-ScheduledTask -TaskName $o.signInTask -InputObject $startup -Force | Out-Null
    } else {
      if($existing) { Unregister-ScheduledTask -TaskName $o.signInTask -Confirm:$false }
      if($existingStart) { Unregister-ScheduledTask -TaskName $startTask -Confirm:$false }
    }
    $policy=@{version=1;mode=$o.mode;remember=$o.remember;session=$o.session}
    [IO.File]::WriteAllText($o.policy,($policy|ConvertTo-Json -Compress))
    [IO.File]::WriteAllText($o.ack,(@{configured=$true;request=$o.request;remember=$o.remember}|ConvertTo-Json -Compress))
    return
  }
  $handoff=$o.operation -eq 'apply' -and $admin -and $o.mode -eq 'standard'
  $restart=$o.operation -in @('apply','stop')
  $coordinator=$o.relaunchTask+'-stop'
  $oneShot=New-ScheduledTask -Action (Task-Action ($restart -and -not $handoff) $o.result $o.relaunchTask $null) -Principal $principal -Settings $settings -Description $o.marker
  if(Get-ScheduledTask -TaskName $o.relaunchTask -ErrorAction SilentlyContinue) { throw 'This relaunch request was already submitted. Use Refresh to check its result.' }
  Register-ScheduledTask -TaskName $o.relaunchTask -InputObject $oneShot | Out-Null
  try {
    if($handoff) {
      $stopPrincipal=New-ScheduledTaskPrincipal -UserId $sid -LogonType Interactive -RunLevel Highest
      $stopTask=New-ScheduledTask -Action (Task-Action $true $o.result $coordinator $o.relaunchTask) -Principal $stopPrincipal -Settings $settings -Description $o.marker
      Register-ScheduledTask -TaskName $coordinator -InputObject $stopTask | Out-Null
    }
    # Start/relaunch never enable, disable or rewrite the sign-in task.
    if($o.operation -ne 'stop') {
      $policy=@{version=1;mode=$o.mode;remember=($existing -and $existing.State -ne 'Disabled');session=$o.session}
      [IO.File]::WriteAllText($o.policy,($policy|ConvertTo-Json -Compress))
    }
    [IO.File]::WriteAllText($o.result,(@{request=$o.request;mode=$o.mode;state='queued';message='Relaunch queued. Reconnecting may take a moment.'}|ConvertTo-Json -Compress))
    $firstTask=if($handoff) {$coordinator} else {$o.relaunchTask}
    Start-ScheduledTask -TaskName $firstTask
    $accepted=$true
    [IO.File]::WriteAllText($o.ack,'{"queued":true}')
  } catch {
    Unregister-ScheduledTask -TaskName $o.relaunchTask -Confirm:$false -ErrorAction SilentlyContinue
    if($handoff) { Unregister-ScheduledTask -TaskName $coordinator -Confirm:$false -ErrorAction SilentlyContinue }
    throw
  }
} catch {
  [IO.File]::WriteAllText($o.ack,(@{error=$_.Exception.Message;rejected=(-not $accepted)}|ConvertTo-Json -Compress)); exit 1
}
`;
function paths(session = sessionName()) {
  const root = path.join(process.env.LOCALAPPDATA, 'herdr-core-permissions', crypto.createHash('sha256').update(session).digest('hex').slice(0, 16));
  return { root, policy: path.join(root, 'policy.json'), core: path.join(process.env.LOCALAPPDATA, 'Programs', 'herdr-core', 'herdr-core.exe') };
}
function powershell() { return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'); }
function conhost() { return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'conhost.exe'); }
function runPS(script, timeout = 12000) {
  const result = spawnSync(powershell(), ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded(script)], { encoding: 'utf8', timeout, windowsHide: true });
  if (result.error || result.status !== 0) throw Error('Windows permission setup failed or timed out. Refresh to check for a pending request before retrying.');
  return JSON.parse(result.stdout.trim());
}
const INSPECT = String.raw`
$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$i=[Security.Principal.WindowsIdentity]::GetCurrent(); $sid=$i.User.Value
$env:HC_SESSION=$o.session
foreach($key in @('HC_SOCKET','HC_TERMINAL_ID')){[Environment]::SetEnvironmentVariable($key,$null,'Process')}
$homePath=[Environment]::GetFolderPath('UserProfile')
$desktop=@(Get-CimInstance Win32_Process -Filter "Name='explorer.exe'" | Where-Object {(Invoke-CimMethod -InputObject $_ -MethodName GetOwnerSid -ErrorAction SilentlyContinue).Sid -eq $sid})
$policy=$null; if(Test-Path -LiteralPath $o.policy){$policy=Get-Content -LiteralPath $o.policy -Raw|ConvertFrom-Json}
$taskName='Custom-Herdr-'+$sid+'-'+(Split-Path $o.root -Leaf)
$task=Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
$marker='Custom Herdr permission launcher v1; '+$sid+'; '+$o.session
$owned=$task -and $task.Description -eq $marker
# A guarded standard sign-in runs elevated only to replace an elevated core; its LIMITED
# start task says the mode is standard.
$guardStart=Get-ScheduledTask -TaskName ($taskName+'-start') -ErrorAction SilentlyContinue
$guarded=$owned -and $guardStart -and $guardStart.Description -eq $marker
$taskMode=if($owned){if($task.Principal.RunLevel -eq 'Highest' -and -not $guarded){'administrator'}else{'standard'}}else{$null}
function Read-Core([string[]]$arguments){
  $s=New-Object Diagnostics.ProcessStartInfo; $s.FileName=$o.core; $s.WorkingDirectory=$homePath
  $s.UseShellExecute=$false; $s.CreateNoWindow=$true; $s.RedirectStandardOutput=$true; $s.RedirectStandardError=$true
  $s.Arguments=($arguments|ForEach-Object {'"'+($_ -replace '"','\"')+'"'}) -join ' '
  $p=New-Object Diagnostics.Process; $p.StartInfo=$s
  try{[void]$p.Start();$out=$p.StandardOutput.ReadToEndAsync();$err=$p.StandardError.ReadToEndAsync();if(-not $p.WaitForExit(8000)){$p.Kill();throw 'Core inspection timed out.'};return @{code=$p.ExitCode;stdout=$out.Result;stderr=$err.Result}}finally{$p.Dispose()}
}
$supported=Test-Path -LiteralPath $o.core -PathType Leaf
$running=$null; $elevated=$null; $problem=$null; $pidValue=$null
if($supported){
  $status=Read-Core @('server','status')
  if($status.code -eq 0){
    $running=$true; $facts=$status.stdout|ConvertFrom-Json; $pidValue=$facts.pid
    $check='([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'
    $proof=Read-Core @('exec','powershell.exe','-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',([Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($check))))
    if($proof.code -eq 0 -and $proof.stdout.Trim() -in @('True','False')){$elevated=$proof.stdout.Trim() -eq 'True'}else{$problem='The running core token could not be inspected.'}
  }else{
    $failure=$null; try{$failure=$status.stderr|ConvertFrom-Json}catch{}
    if($failure.error.kind -eq 'unavailable' -and $failure.error.message -match 'os error 2'){$running=$false}else{$problem='Core state is unknown. No automatic start was attempted.'}
  }
}
@{platform='win32';supported=$supported;running=$running;elevated=$elevated;pid=$pidValue;problem=$problem;sid=$sid;desktop=($desktop.Count -gt 0);session=$o.session;savedMode=$policy.mode;remember=[bool]($owned -and $task.State -ne 'Disabled');autostartMode=$taskMode;autostartConflict=[bool]($task -and -not $owned)}|ConvertTo-Json -Compress
`;
function inspect() {
  if (process.platform !== 'win32') return { platform: process.platform, elevated: process.geteuid?.() === 0, running: null, supported: false };
  return runPS(`$o=${psLiteral(JSON.stringify({ ...paths(), session: sessionName() }))}|ConvertFrom-Json;` + INSPECT, 25000);
}
function apply(input) {
  let info;
  try {
    info = inspect();
    if (!info.supported || (input.action !== 'autostart' && !info.desktop)) throw Error('Starting core requires this user to be signed in to the Windows desktop and a per-user herdr-core installation. Nothing was stopped.');
  } catch (error) { error.rejected = true;throw error; }
  const p = paths();fs.mkdirSync(p.root, { recursive: true });
  const result = path.join(p.root, input.request + '.json');
  const ack = path.join(p.root, input.request + '.ack.json');
  if (fs.existsSync(result) || fs.existsSync(ack)) throw Error('This request was already submitted. Use Refresh before retrying.');
  const data = { ...p, operation: input.action, mode: input.mode, remember: input.remember === true, session: info.session, sid: info.sid, request: input.request, result, ack, powershell: powershell(), conhost: conhost(), startupResult: path.join(p.root, 'startup.json'), signInTask: `Custom-Herdr-${info.sid}-${path.basename(p.root)}`, relaunchTask: `Custom-Herdr-Relaunch-${input.request}`, marker: `Custom Herdr permission launcher v1; ${info.sid}; ${info.session}` };
  const source = MANAGER.replace('param([switch]$Approved)', `param([switch]$Approved)\n$o=${psLiteral(JSON.stringify(data))}|ConvertFrom-Json\n$worker=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(WORKER).toString('base64')}'))`);
  const file = path.join(p.root, input.request + '.ps1');
  fs.writeFileSync(file, '\ufeff' + source, { flag: 'wx' });
  try {
    const reply = spawnSync(powershell(), ['-NoLogo', '-NoProfile', '-File', file], { encoding: 'utf8', timeout: 240000, windowsHide: true });
    const outcome = fs.existsSync(ack) ? JSON.parse(fs.readFileSync(ack, 'utf8')) : null;
    if (outcome?.error) { const error = Error(outcome.error);error.rejected = outcome.rejected === true;throw error; }
    if (input.action === 'autostart' && outcome?.configured && !reply.error && reply.status === 0) return outcome;
    if (!outcome?.queued || reply.error || reply.status !== 0) throw Error('Setup was cancelled, failed, or is still awaiting Windows approval. Refresh before retrying; no success is claimed.');
    return { queued: true, request: input.request, mode: input.mode };
  } finally { fs.rmSync(file, { force: true }); }
}
// Restarts the whole machine (an explicit Settings action, confirmed there). Windows waits
// a few seconds so this reply, and the SSH session carrying it, gets back first.
const REBOOT_DELAY = 5;
function reboot(input) {
  const shutdown = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'shutdown.exe');
  const r = spawnSync(shutdown, ['/r', '/t', String(REBOOT_DELAY), '/d', 'p:0:0', '/c', 'Restarted from Herdr Settings'], { encoding: 'utf8', timeout: 15000, windowsHide: true });
  if (r.error || r.status !== 0) { const error = Error(`Windows refused the restart. ${(r.stderr || r.stdout || '').trim()}`.trim());error.rejected = true;throw error; }
  return { rebooting: true, request: input.request, delay: REBOOT_DELAY };
}
function status(input) {
  const file = path.join(paths().root, input.request + '.json');
  const ackFile = path.join(paths().root, input.request + '.ack.json');
  const ack = fs.existsSync(ackFile) ? JSON.parse(fs.readFileSync(ackFile, 'utf8')) : null;
  if (ack?.configured) return { state: 'complete', request: input.request, operation: 'autostart', message: 'Settings saved.' };
  if (ack?.error && ack.rejected === true) return { state: 'failed', request: input.request, message: ack.error };
  if (!fs.existsSync(file)) return { state: 'unknown', request: input.request };
  const result = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (result.request !== input.request || !['queued', 'restarting', 'complete', 'failed'].includes(result.state)) throw Error('Invalid relaunch status.');
  return result;
}
function main(input) {
  validateRequest(input);
  if (input.action === 'inspect') return inspect();
  if (process.platform !== 'win32') throw Error('Permission relaunch is currently supported only on Windows.');
  if (input.action === 'reboot') return reboot(input);
  return ['apply', 'start', 'stop', 'autostart'].includes(input.action) ? apply(input) : status(input);
}
module.exports = { validateRequest, encoded, psLiteral, WORKER, MANAGER, INSPECT, main };
if (require.main === module || module.id === '[eval]') {
  try { const input = JSON.parse(process.argv[require.main === module ? 2 : 1] || '{"action":"inspect"}');process.stdout.write(JSON.stringify(main(input))); }
  catch (error) { process.stdout.write(JSON.stringify({ error: error.message, rejected: error.rejected === true }));process.exitCode = 1; }
}
