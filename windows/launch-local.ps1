param(
  [string]$InstallRoot = '',
  [ValidateSet('Chrome', 'EdgeApp')]
  [string]$BrowserMode = 'Chrome',
  [switch]$NoOpen,
  [int]$StartupTimeoutSeconds = 60
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if (-not $InstallRoot) {
  $InstallRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
}
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
$appRoot = Join-Path $InstallRoot 'app'
$stateRoot = Join-Path $InstallRoot 'state'
$logsRoot = Join-Path $InstallRoot 'logs'
$runtimePath = Join-Path $stateRoot 'runtime.json'
$serverStatePath = Join-Path $stateRoot 'server.json'
$healthUrl = 'http://127.0.0.1:41731/api/v1/system/health'
$appUrl = 'http://127.0.0.1:41731/'

function Test-CareerAtlasHealth {
  try {
    $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
    return $response.data.ok -eq $true -and $response.data.db -eq $true
  } catch { return $false }
}

function Show-LaunchError([string]$Message) {
  Write-Error $Message
  if (-not $NoOpen) {
    try {
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.MessageBox]::Show($Message, 'Career Atlas could not start', 'OK', 'Error') | Out-Null
    } catch { }
  }
}

function Open-CareerAtlas([string]$Mode) {
  if ($Mode -eq 'Chrome') {
    $chromeCandidates = @(
      'C:\Program Files\Google\Chrome\Application\chrome.exe',
      'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
      (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    )
    $chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $chromePath) {
      throw 'Google Chrome was not found. Reinstall Chrome or use the Career Atlas Immersive shortcut.'
    }

    # Use the existing Chrome profile so installed assistants, side panels and
    # site permissions remain available. A regular maximized window keeps the
    # extension toolbar accessible, unlike browser app mode.
    Start-Process -FilePath $chromePath -ArgumentList @('--new-window', '--start-maximized', $appUrl) | Out-Null
    return
  }

  $edgeCandidates = @(
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
  )
  $edgePath = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($edgePath) {
    Start-Process -FilePath $edgePath -ArgumentList @("--app=$appUrl", '--new-window', '--start-maximized') | Out-Null
  } else {
    Start-Process $appUrl | Out-Null
  }
}

$mutex = New-Object System.Threading.Mutex($false, 'Local\CareerAtlasLauncher')
$hasMutex = $false
try {
  $hasMutex = $mutex.WaitOne([TimeSpan]::FromSeconds(20))
  if (-not $hasMutex) { throw 'Another Career Atlas launcher is still starting the application.' }
  if (-not (Test-Path -LiteralPath $runtimePath)) { throw 'The local edition is not installed. Run Install-Career-Atlas.cmd first.' }

  if (-not (Test-CareerAtlasHealth)) {
    $runtime = Get-Content -LiteralPath $runtimePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $nodePath = [string]$runtime.nodePath
    $entryPath = Join-Path $appRoot 'apps\server\dist\index.js'
    $webRoot = Join-Path $appRoot 'apps\web\dist'
    if (-not (Test-Path -LiteralPath $nodePath)) { throw "Node.js is no longer available at: $nodePath" }
    if (-not (Test-Path -LiteralPath $entryPath)) { throw 'The installed server runtime is incomplete. Run the updater.' }
    if (-not (Test-Path -LiteralPath (Join-Path $webRoot 'index.html'))) { throw 'The installed web runtime is incomplete. Run the updater.' }

    New-Item -ItemType Directory -Path $stateRoot, $logsRoot -Force | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $stdoutLog = Join-Path $logsRoot "server-$stamp.out.log"
    $stderrLog = Join-Path $logsRoot "server-$stamp.err.log"

    $env:NODE_ENV = 'production'
    $env:HOST = '127.0.0.1'
    $env:PORT = '41731'
    $env:DATA_DIR = Join-Path $InstallRoot 'data'
    $env:WEB_DIST_DIR = $webRoot
    $env:CAREER_ATLAS_ENV_FILE = Join-Path $InstallRoot 'config\.env.local'
    $env:AUTO_BOOTSTRAP = 'true'
    $env:AUTO_BACKUP = 'true'
    $env:AUTO_BACKUP_INTERVAL_HOURS = '24'

    $nodeArguments = "`"$entryPath`""
    $process = Start-Process -FilePath $nodePath -ArgumentList $nodeArguments -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru
    [PSCustomObject]@{
      processId = $process.Id
      startedAtUtc = $process.StartTime.ToUniversalTime().ToString('o')
      stdoutLog = $stdoutLog
      stderrLog = $stderrLog
    } | ConvertTo-Json | Set-Content -LiteralPath $serverStatePath -Encoding UTF8

    $deadline = [DateTime]::UtcNow.AddSeconds($StartupTimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
      if (Test-CareerAtlasHealth) { break }
      if ($process.HasExited) { throw "The local service stopped during startup. See: $stderrLog" }
      Start-Sleep -Milliseconds 500
    }
    if (-not (Test-CareerAtlasHealth)) { throw "The local service did not become ready. See: $stderrLog" }
  }

  if (-not $NoOpen) {
    Open-CareerAtlas $BrowserMode
  }
} catch {
  Show-LaunchError $_.Exception.Message
  exit 1
} finally {
  if ($hasMutex) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}

exit 0
