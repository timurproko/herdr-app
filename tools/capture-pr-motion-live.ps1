# Explicit opt-in live UI diagnostic. Clicks one inspected PR robot only.
# Never sends keyboard/terminal input. Review a fresh screenshot for X/Y first.
param(
  [Parameter(Mandatory=$true)][string]$ExpectedAgent,
  [Parameter(Mandatory=$true)][string]$ExpectedTarget,
  [Parameter(Mandatory=$true)][int]$X,
  [Parameter(Mandatory=$true)][int]$Y,
  [Parameter(Mandatory=$true)][string]$Prefix
)
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class PrMotionPointer {
 [StructLayout(LayoutKind.Sequential)] public struct Rect {public int L,T,R,B;}
 [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr w,out Rect r);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr w,uint m,IntPtr p,IntPtr l);
}
'@
$status=herdr-app status | ConvertFrom-Json
if($status.agent -ne $ExpectedAgent -or $status.overlays.Count -ne 0){throw 'Unexpected active view'}
$p=Get-Process herdr-app | Where-Object MainWindowHandle -ne 0 | Select-Object -First 1
$r=New-Object PrMotionPointer+Rect
if(!$p -or ![PrMotionPointer]::GetClientRect($p.MainWindowHandle,[ref]$r) -or $r.R -ne 1920 -or $r.B -ne 1032){throw 'Window dimensions changed; inspect coordinates again'}
if($X -lt 1850 -or $X -gt 1900 -or $Y -lt 160 -or $Y -gt 900){throw 'Click must be inside the inspected PR robot column'}
$xy=[IntPtr](($Y -shl 16) -bor $X)
[void][PrMotionPointer]::PostMessage($p.MainWindowHandle,0x0200,[IntPtr]0,$xy)
Start-Sleep -Milliseconds 100
[void][PrMotionPointer]::PostMessage($p.MainWindowHandle,0x0201,[IntPtr]1,$xy)
[void][PrMotionPointer]::PostMessage($p.MainWindowHandle,0x0202,[IntPtr]0,$xy)
$clock=[Diagnostics.Stopwatch]::StartNew()
$times=@()
for($i=0;$i -lt 16;$i++){
 $ms=$clock.ElapsedMilliseconds
 herdr-app shot "$Prefix-$i.png" | Out-Null
 $times+=@{frame=$i;start=$ms;end=$clock.ElapsedMilliseconds}
 Start-Sleep -Milliseconds 40
}
$after=herdr-app status | ConvertFrom-Json
@{times=$times;before=$status;after=$after} | ConvertTo-Json -Depth 8 | Set-Content "$Prefix.json"
Add-Type -AssemblyName System.Drawing
$out=New-Object Drawing.Bitmap 1440,960
$g=[Drawing.Graphics]::FromImage($out)
$font=New-Object Drawing.Font 'Arial',12
try {
 for($i=0;$i -lt 16;$i++){
  $img=[Drawing.Image]::FromFile("$Prefix-$i.png")
  try {
   $cx=($i%4)*360;$cy=[math]::Floor($i/4)*240
   $g.DrawImage($img,[Drawing.Rectangle]::new($cx,$cy+20,360,220),[Drawing.Rectangle]::new(1545,150,360,220),[Drawing.GraphicsUnit]::Pixel)
   $g.DrawString("$i : $($times[$i].start) ms",$font,[Drawing.Brushes]::White,$cx,$cy)
  } finally {$img.Dispose()}
 }
 $out.Save("$Prefix-grid.png")
} finally {$font.Dispose();$g.Dispose();$out.Dispose()}
if($after.agent -ne $ExpectedTarget){throw "Robot did not navigate to $ExpectedTarget"}
if($after.errors.Count -ne 0){throw 'Host reported errors'}
Write-Host "Captured live switch $ExpectedAgent -> $ExpectedTarget; inspect $Prefix-grid.png (navigation alone is not an animation pass)."
