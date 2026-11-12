param([string]$ReceiptPath = '.artifacts/menu-release-service/service.json')
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not [IO.Path]::IsPathRooted($ReceiptPath)) { $ReceiptPath = Join-Path $projectRoot $ReceiptPath }
$saved = Get-Content -LiteralPath $ReceiptPath -Raw | ConvertFrom-Json
$address = [Uri]$saved.url
if ($address.Host -ne '127.0.0.1' -or $address.Scheme -ne 'http') { throw 'Expected local Simulator address' }
foreach ($pair in @(@($saved.scenePath, $saved.saveSha256), @($saved.sdkPath, $saved.sdkSha256))) {
    if ((Get-FileHash -LiteralPath $pair[0] -Algorithm SHA256).Hash.ToLowerInvariant() -ne $pair[1]) { throw "Changed input: $($pair[0])" }
}
$healthUrl = $saved.url + '/menu-health'
try { $health = Invoke-RestMethod $healthUrl -TimeoutSec 2 } catch { $health = $null }
if ($health.app -eq 'menu-native-2d-review' -and $health.ready -and $health.saveSha256 -eq $saved.saveSha256) {
    Write-Output ($saved.url + '/editor/play#menu-play')
    exit 0
}
$serviceDir = Join-Path $projectRoot '.artifacts/menu-preview-service'
New-Item -ItemType Directory -Force -Path $serviceDir | Out-Null
$env:MENU_REVIEW_SDK = $saved.sdkPath
$env:MENU_REVIEW_PORT = [string]$address.Port
$nodePath = (Get-Command node.exe).Source
$arguments = @((Join-Path $PSScriptRoot 'serve.mjs'), $saved.web, $saved.scenePath, $serviceDir) | ForEach-Object { '"' + $_ + '"' }
# A detached hidden process survives the tool/shell that starts it; no desktop input.
$child = Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $serviceDir 'stdout.log') -RedirectStandardError (Join-Path $serviceDir 'stderr.log')
@{ pid = $child.Id; startedAt = [DateTime]::UtcNow.ToString('o'); receipt = $ReceiptPath } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $serviceDir 'launcher.json')
$deadline = [DateTime]::UtcNow.AddSeconds(45)
while ([DateTime]::UtcNow -lt $deadline) {
    if ($child.HasExited) { throw (Get-Content -LiteralPath (Join-Path $serviceDir 'stderr.log') -Raw) }
    try { $health = Invoke-RestMethod $healthUrl -TimeoutSec 2 } catch { $health = $null }
    if ($health.app -eq 'menu-native-2d-review' -and $health.ready -and $health.saveSha256 -eq $saved.saveSha256) {
        Write-Output ($saved.url + '/editor/play#menu-play')
        exit 0
    }
    Start-Sleep -Milliseconds 200
}
throw "Simulator not ready; inspect $serviceDir"
