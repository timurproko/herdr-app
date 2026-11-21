# Herdr-only logical cwd reporting. Set-Location does not update Win32 process cwd.
# Captured agent tools can inherit HC_TERMINAL_ID; they are not the real terminal.
if (-not $env:HC_TERMINAL_ID -or $Host.Name -ne 'ConsoleHost' -or [Console]::IsOutputRedirected) { return }

& {
if (-not $global:__HerdrCwdState -or $global:__HerdrCwdState.Version -ne 1) {
    $global:__HerdrCwdState = @{ Version = 1; Last = $null; Core = $null; PreviousPreCommand = $null; PreviousPrompt = $null }
}
$core = Get-Command hc.exe -CommandType Application -ErrorAction Ignore | Select-Object -First 1
if ($core) { $global:__HerdrCwdState.Core = $core.Source }
elseif ($env:LOCALAPPDATA) {
    $candidate = Join-Path $env:LOCALAPPDATA 'Programs\herdr-core\hc.exe'
    if ([IO.File]::Exists($candidate)) { $global:__HerdrCwdState.Core = $candidate }
}

function global:Write-HerdrCwdEscape([string]$Uri) {
    [Console]::Write(([string][char]27) + ']7;' + $Uri + ([string][char]27) + '\')
}

function global:Invoke-HerdrCwdReport {
    $savedExitCode = $global:LASTEXITCODE
    try {
        if (-not $env:HC_TERMINAL_ID -or [Console]::IsOutputRedirected) { return }
        $location = Microsoft.PowerShell.Management\Get-Location
        if ($location.Provider.Name -ne 'FileSystem') { return }
        $directory = $location.ProviderPath
        if (-not $directory -or ($directory + $HOME) -match '[\x00-\x1f\x7f]') { return }
        $identity = $env:HC_TERMINAL_ID + '|' + $directory + '|' + $HOME
        if ($global:__HerdrCwdState.Last -ceq $identity) { return }
        $uri = [Uri]$directory
        if (-not $uri.IsFile) { return }
        Write-HerdrCwdEscape $uri.AbsoluteUri
        $reporter = $global:__HerdrCwdState.Core
        if (-not $reporter) { return }
        & $reporter label $env:HC_TERMINAL_ID "custom.cwd=$directory" "custom.home=$HOME" --json 2>$null | Out-Null
        if ($global:LASTEXITCODE -eq 0) { $global:__HerdrCwdState.Last = $identity }
    } catch {
        # Reporting cannot make the prompt noisy; failed labels retry next time.
    } finally {
        $global:LASTEXITCODE = $savedExitCode
    }
}

if ($env:STARSHIP_SHELL -in @('powershell', 'pwsh')) {
    # Starship captures command status before this documented hook, preserving its
    # prompt/status behavior. Chain any existing personal pre-command hook once.
    $previous = Get-Command Invoke-Starship-PreCommand -CommandType Function -ErrorAction Ignore
    if (-not $previous -or -not $previous.ScriptBlock.ToString().Contains('# Herdr cwd pre-command hook')) {
        $global:__HerdrCwdState.PreviousPreCommand = if ($previous) { $previous.ScriptBlock } else { $null }
        function global:Invoke-Starship-PreCommand {
            # Herdr cwd pre-command hook
            try {
                if ($global:__HerdrCwdState.PreviousPreCommand) { & $global:__HerdrCwdState.PreviousPreCommand }
            } finally { Invoke-HerdrCwdReport }
        }
    }
} else {
    # Preserve a non-Starship prompt's scriptblock/module binding and output.
    # Its first call sees the original command status; reporting runs afterward.
    $previous = Get-Command prompt -CommandType Function -ErrorAction Ignore
    if ($previous -and -not $previous.ScriptBlock.ToString().Contains('# Herdr cwd prompt hook')) {
        $global:__HerdrCwdState.PreviousPrompt = $previous.ScriptBlock
        function global:prompt {
            # Herdr cwd prompt hook
            & $global:__HerdrCwdState.PreviousPrompt
            Invoke-HerdrCwdReport
        }
    }
}
}
