// Read the launch context through the selected machine's core. Never requests
// elevation, changes UAC/SSH configuration, or touches existing terminals.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
function inspectPermissions(platform = process.platform, run = spawnSync, uid = () => process.geteuid()) {
  if (platform !== 'win32') return { platform, elevated: uid() === 0 };
  const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = '$ErrorActionPreference="Stop"; $identity=[Security.Principal.WindowsIdentity]::GetCurrent(); $principal=[Security.Principal.WindowsPrincipal]::new($identity); @{platform="win32";elevated=$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)} | ConvertTo-Json -Compress';
  const reply = run(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', timeout: 5000, windowsHide: true });
  if (reply.error || reply.status !== 0) throw Error('Could not inspect Windows launch permissions.');
  const result = JSON.parse(reply.stdout.trim());
  if (result.platform !== 'win32' || typeof result.elevated !== 'boolean') throw Error('Invalid Windows permission response.');
  return result;
}
module.exports = { inspectPermissions };
if (require.main === module || process.argv[1] === undefined) {
  try { process.stdout.write(JSON.stringify(inspectPermissions())); }
  catch { process.stderr.write('Could not inspect launch permissions.'); process.exitCode = 1; }
}
