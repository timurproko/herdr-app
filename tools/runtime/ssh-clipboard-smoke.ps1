# Explicit live smoke: creates local and selected remote spaces and changes the clipboard.
# Synthetic clipboard checks only. Preserve clipboard formats in memory; never print their contents.
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$')]
    [string]$RemoteMachine
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$original = [System.Windows.Forms.Clipboard]::GetDataObject()
$backup = New-Object System.Windows.Forms.DataObject
if ($null -ne $original) {
    foreach ($format in $original.GetFormats($false)) {
        $value = $original.GetData($format, $false)
        if ($null -ne $value) { $backup.SetData($format, $false, $value) }
    }
}
function AppJson([string[]]$Arguments) {
    $raw = & herdr-app @Arguments | Out-String
    if ($LASTEXITCODE -ne 0) { throw ('Herdr test command failed [' + ($Arguments[0..([Math]::Min(2,$Arguments.Length-1))] -join ' ') + ']: ' + ($raw -join ' ')) }
    return (($raw -join "`n") | ConvertFrom-Json)
}
$before = AppJson @('status')
$created = @()
$token = 'CUSTOM_LOCAL_CLIPBOARD_SMOKE_8f3c'
$remoteToken = 'CUSTOM_OSC52_CLIPBOARD_SMOKE_8f3c'
$receiver = 'process.stdout.write("READY\r\n");if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stdin.resume();process.stdin.on("data",d=>{const s=d.toString();if(s.includes("\x10"))process.stdout.write("\x1b]52;c;"+Buffer.from("CUSTOM_OSC52_CLIPBOARD_SMOKE_8f3c").toString("base64")+"\x07");else process.stdout.write("RECEIVED:"+JSON.stringify(s)+"\r\n");});setInterval(()=>{},60000);'
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($receiver))
$bootstrap = "eval(Buffer.from('$encoded','base64').toString())"
$argv = (ConvertTo-Json -Compress -InputObject @('node', '-e', $bootstrap)).Replace('"', '\"')
try {
    foreach ($machine in @('', $RemoteMachine)) {
        [System.Windows.Forms.Clipboard]::SetText($token)
        $arguments = @('do', 'space.new', '--name', '__clipboard-smoke', '--argv', $argv)
        if ($machine) { $arguments += @('--machine', $machine) }
        $made = AppJson $arguments
        $created += $made.space
        Start-Sleep -Milliseconds 1400
        $null = AppJson @('do', 'terminal.paste')
        Start-Sleep -Milliseconds 500
        $screen = (& hc read $made.terminal --json) -join "`n"
        $pasted = $screen.Contains($token)
        Write-Output ((@{test='native-paste'; machine=$(if($machine){$machine}else{'local'}); passed=$pasted} | ConvertTo-Json -Compress))
        if ($machine) {
            $null = & hc keys $made.terminal ctrl+p --json
            Start-Sleep -Milliseconds 1000
            $copied = [System.Windows.Forms.Clipboard]::GetText() -eq $remoteToken
            Write-Output ((@{test='remote-osc52-copy'; machine=$machine; passed=$copied} | ConvertTo-Json -Compress))
        }
    }
} finally {
    foreach ($id in $created) {
        try { $null = AppJson @('do','space.close','--id',$id,'--confirmed','true') } catch {}
    }
    if ($before.space) {
        try { $null = AppJson @('do','space.select','--id',$before.space) } catch {}
        if ($before.tab) { try { $null = AppJson @('do','tab.select','--id',$before.tab) } catch {} }
    }
    [System.Windows.Forms.Clipboard]::SetDataObject($backup, $true)
}
