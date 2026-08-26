param(
  [string]$InstallRoot = '',
  [switch]$RemoveData,
  [switch]$Force,
  [switch]$SkipShortcuts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $InstallRoot) { $InstallRoot = Join-Path $env:LOCALAPPDATA 'CareerAtlas' }
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
$driveRoot = [IO.Path]::GetPathRoot($InstallRoot).TrimEnd('\')
if ($InstallRoot -eq $driveRoot -or $InstallRoot.Length -lt 10) { throw "Unsafe install root: $InstallRoot" }

function Stop-InstalledServer {
  $statePath = Join-Path $InstallRoot 'state\server.json'
  if (-not (Test-Path -LiteralPath $statePath)) { return }
  try {
    $state = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $process = Get-Process -Id ([int]$state.processId) -ErrorAction SilentlyContinue
    if (-not $process -or $process.ProcessName -ne 'node') { return }
    $recordedStart = [DateTime]::Parse([string]$state.startedAtUtc).ToUniversalTime()
    if ([Math]::Abs(($process.StartTime.ToUniversalTime() - $recordedStart).TotalSeconds) -gt 2) { return }
    $processId = [int]$process.Id
    $taskkillPath = Join-Path $env:SystemRoot 'System32\taskkill.exe'
    $taskkillOutput = & $taskkillPath /PID $processId /T /F 2>&1
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
      if (-not (Get-Process -Id $processId -ErrorAction SilentlyContinue)) { return }
      Start-Sleep -Milliseconds 250
    }
    throw "Windows could not stop process $processId. taskkill: $taskkillOutput"
  } catch {
    Write-Warning "The local service could not be stopped automatically: $($_.Exception.Message)"
  }
}

if ($RemoveData -and -not $Force) {
  $confirmation = Read-Host 'Type DELETE to remove all Career Atlas personal data and backups'
  if ($confirmation -ne 'DELETE') { throw 'Data removal was cancelled.' }
}

Stop-InstalledServer

if (-not $SkipShortcuts) {
  $desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Career Atlas.lnk'
  if (Test-Path -LiteralPath $desktopShortcut) { Remove-Item -LiteralPath $desktopShortcut -Force }
  $programsRoot = Join-Path ([Environment]::GetFolderPath('Programs')) 'Career Atlas'
  if (Test-Path -LiteralPath $programsRoot) { Remove-Item -LiteralPath $programsRoot -Recurse -Force }
}

foreach ($name in @('app', 'rollback-app', 'logs', 'state', 'tools')) {
  $target = Join-Path $InstallRoot $name
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
}

if ($RemoveData) {
  foreach ($name in @('data', 'config')) {
    $target = Join-Path $InstallRoot $name
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
  }
  if (Test-Path -LiteralPath $InstallRoot) { Remove-Item -LiteralPath $InstallRoot -Recurse -Force }
  Write-Host 'Career Atlas and all personal data were removed.' -ForegroundColor Green
} else {
  Write-Host 'Career Atlas was uninstalled. Personal data and configuration were kept at:' -ForegroundColor Green
  Write-Host $InstallRoot
}
