param(
  [ValidateSet('Install', 'Update')]
  [string]$Mode = 'Install',
  [string]$InstallRoot = '',
  [switch]$SkipDependencyInstall,
  [switch]$SkipShortcuts,
  [switch]$SkipLaunch,
  [switch]$SkipDataImport,
  [switch]$SkipConfigImport
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Invoke-Checked([string]$FilePath, [string[]]$Arguments) {
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath"
  }
}

function Get-PnpmRunner {
  $pnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
  if ($pnpm) {
    return [PSCustomObject]@{ FilePath = $pnpm.Source; Prefix = @() }
  }

  $corepack = Get-Command corepack.cmd -ErrorAction SilentlyContinue
  if ($corepack) {
    return [PSCustomObject]@{ FilePath = $corepack.Source; Prefix = @('pnpm') }
  }

  throw 'Neither pnpm nor Corepack was found. Install Node.js 22 LTS and run this installer again.'
}

function Invoke-Pnpm($Runner, [string[]]$Arguments) {
  $allArguments = @($Runner.Prefix) + $Arguments
  Invoke-Checked $Runner.FilePath $allArguments
}

function Stop-InstalledServer([string]$Root) {
  $statePath = Join-Path $Root 'state\server.json'
  if (-not (Test-Path -LiteralPath $statePath)) { return }

  try {
    $state = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $process = Get-Process -Id ([int]$state.processId) -ErrorAction SilentlyContinue
    if (-not $process -or $process.ProcessName -ne 'node') { return }

    # PowerShell 7 turns ISO JSON timestamps into DateTime, while Windows
    # PowerShell 5.1 can leave them as strings. Preserve the parsed UTC kind when
    # present; otherwise DateTimeOffset keeps the explicit offset from the text.
    $recordedStart = if ($state.startedAtUtc -is [DateTime]) {
      ([DateTime]$state.startedAtUtc).ToUniversalTime()
    } else {
      [DateTimeOffset]::Parse([string]$state.startedAtUtc).UtcDateTime
    }
    $actualStart = $process.StartTime.ToUniversalTime()
    if ([Math]::Abs(($actualStart - $recordedStart).TotalSeconds) -gt 2) { return }

    $processId = [int]$process.Id
    $taskkillPath = Join-Path $env:SystemRoot 'System32\taskkill.exe'
    $taskkillOutput = & $taskkillPath /PID $processId /T /F 2>&1
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
      if (-not (Get-Process -Id $processId -ErrorAction SilentlyContinue)) { return }
      Start-Sleep -Milliseconds 250
    }
    throw "Windows could not stop process $processId. taskkill: $taskkillOutput"
  } catch {
    Write-Warning "The previous local service could not be stopped automatically: $($_.Exception.Message)"
  }
}

function Copy-DirectoryContents([string]$Source, [string]$Destination) {
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
  }
}

function Remove-DirectoryTree([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $removerScript = Join-Path $PSScriptRoot 'remove-directory-tree.mjs'
  if (-not (Test-Path -LiteralPath $removerScript)) { throw "The safe directory remover is missing: $removerScript" }
  Invoke-Checked $node.Source @($removerScript, $InstallRoot, $Path)
}

function New-Shortcut([string]$Path, [string]$Target, [string]$Arguments, [string]$WorkingDirectory, [string]$Description, [string]$IconLocation) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $Target
  $shortcut.Arguments = $Arguments
  $shortcut.WorkingDirectory = $WorkingDirectory
  $shortcut.Description = $Description
  $shortcut.WindowStyle = 7
  if ($IconLocation) { $shortcut.IconLocation = $IconLocation }
  $shortcut.Save()
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (-not $InstallRoot) {
  $InstallRoot = Join-Path $env:LOCALAPPDATA 'CareerAtlas'
}
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
$driveRoot = [IO.Path]::GetPathRoot($InstallRoot).TrimEnd('\')
if ($InstallRoot -eq $driveRoot -or $InstallRoot.Length -lt 10) {
  throw "Unsafe install root: $InstallRoot"
}

$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js was not found. Install Node.js 22 LTS and run this installer again.' }
$nodeMajor = [int]((& $node.Source --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) { throw "Node.js 20 or newer is required. Found: $nodeMajor" }

$runner = Get-PnpmRunner
$appRoot = Join-Path $InstallRoot 'app'
$rollbackRoot = Join-Path $InstallRoot 'rollback-app'
$stageRoot = Join-Path $InstallRoot ("stage-{0}" -f [Guid]::NewGuid().ToString('N'))
$dataRoot = Join-Path $InstallRoot 'data'
$configRoot = Join-Path $InstallRoot 'config'
$toolsRoot = Join-Path $InstallRoot 'tools'
$assetsRoot = Join-Path $InstallRoot 'assets'
$stateRoot = Join-Path $InstallRoot 'state'
$logsRoot = Join-Path $InstallRoot 'logs'

try {
  Write-Step "$Mode Career Atlas Windows local edition"
  New-Item -ItemType Directory -Path $InstallRoot, $dataRoot, $configRoot, $toolsRoot, $assetsRoot, $stateRoot, $logsRoot -Force | Out-Null

  if (-not $SkipDependencyInstall) {
    Write-Step 'Checking project dependencies'
    Push-Location $repoRoot
    $previousCI = $env:CI
    try {
      $env:CI = 'true'
      Invoke-Pnpm $runner @('install', '--frozen-lockfile')
    } finally {
      $env:CI = $previousCI
      Pop-Location
    }
  }

  Write-Step 'Building the production application once'
  Push-Location $repoRoot
  try { Invoke-Pnpm $runner @('build') } finally { Pop-Location }

  Write-Step 'Creating an isolated production runtime'
  New-Item -ItemType Directory -Path (Join-Path $stageRoot 'apps') -Force | Out-Null
  Push-Location $repoRoot
  try {
    Invoke-Pnpm $runner @('--config.node-linker=hoisted', '--filter', '@career-atlas/server', '--prod', 'deploy', (Join-Path $stageRoot 'apps\server'))
  } finally { Pop-Location }
  Copy-DirectoryContents (Join-Path $repoRoot 'apps\web\dist') (Join-Path $stageRoot 'apps\web\dist')
  Copy-DirectoryContents (Join-Path $repoRoot 'docs') (Join-Path $stageRoot 'docs')

  if (-not $SkipDataImport -and -not (Test-Path -LiteralPath (Join-Path $dataRoot 'career-atlas.db'))) {
    $sourceData = Join-Path $repoRoot 'data'
    if (Test-Path -LiteralPath $sourceData) {
      Write-Step 'Copying existing local data without changing the source copy'
      Copy-DirectoryContents $sourceData $dataRoot
    }
  }

  $configPath = Join-Path $configRoot '.env.local'
  if (-not $SkipConfigImport -and -not (Test-Path -LiteralPath $configPath)) {
    $sourceConfig = Join-Path $repoRoot '.env.local'
    if (Test-Path -LiteralPath $sourceConfig) {
      Copy-Item -LiteralPath $sourceConfig -Destination $configPath
    }
  }

  Write-Step 'Replacing only the installed application runtime'
  Stop-InstalledServer $InstallRoot
  if (Test-Path -LiteralPath $rollbackRoot) {
    try {
      Remove-DirectoryTree $rollbackRoot
    } catch {
      $legacyRollback = Join-Path $InstallRoot ("legacy-runtime-{0}" -f [Guid]::NewGuid().ToString('N'))
      Move-Item -LiteralPath $rollbackRoot -Destination $legacyRollback
      Write-Warning "An older pnpm-linked rollback was isolated instead of blocking the upgrade: $legacyRollback"
    }
  }
  if (Test-Path -LiteralPath $appRoot) {
    Move-Item -LiteralPath $appRoot -Destination $rollbackRoot
  }
  try {
    Move-Item -LiteralPath $stageRoot -Destination $appRoot
  } catch {
    if (-not (Test-Path -LiteralPath $appRoot) -and (Test-Path -LiteralPath $rollbackRoot)) {
      Move-Item -LiteralPath $rollbackRoot -Destination $appRoot
    }
    throw
  }

  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'launch-local.ps1') -Destination (Join-Path $toolsRoot 'launch-local.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'uninstall-local.ps1') -Destination (Join-Path $toolsRoot 'uninstall-local.ps1') -Force
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'remove-directory-tree.mjs') -Destination (Join-Path $toolsRoot 'remove-directory-tree.mjs') -Force
  $iconSource = Join-Path $PSScriptRoot 'assets\Career-Atlas.ico'
  if (-not (Test-Path -LiteralPath $iconSource)) { throw "The Career Atlas icon is missing: $iconSource" }
  $iconPath = Join-Path $assetsRoot 'Career-Atlas.ico'
  Copy-Item -LiteralPath $iconSource -Destination $iconPath -Force
  $commit = (& git -C $repoRoot rev-parse --short HEAD 2>$null)
  if ($LASTEXITCODE -ne 0) { $commit = 'unknown' }
  [PSCustomObject]@{
    nodePath = $node.Source
    sourceRoot = $repoRoot
    installedAtUtc = [DateTime]::UtcNow.ToString('o')
    commit = [string]$commit
    runtimeLayout = 'hoisted-v1'
  } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stateRoot 'runtime.json') -Encoding UTF8

  if (-not $SkipShortcuts) {
    Write-Step 'Creating Desktop and Start Menu shortcuts'
    $powershellPath = Join-Path $PSHOME 'powershell.exe'
    $icon = "$iconPath,0"
    $launchScript = Join-Path $toolsRoot 'launch-local.ps1'
    $launchArguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launchScript`""
    $desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Career Atlas.lnk'
    New-Shortcut $desktopShortcut $powershellPath $launchArguments $InstallRoot 'Open Career Atlas' $icon

    $programsRoot = Join-Path ([Environment]::GetFolderPath('Programs')) 'Career Atlas'
    New-Item -ItemType Directory -Path $programsRoot -Force | Out-Null
    New-Shortcut (Join-Path $programsRoot 'Career Atlas.lnk') $powershellPath $launchArguments $InstallRoot 'Open Career Atlas' $icon
    $updateArguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot 'install-local.ps1')`" -Mode Update"
    New-Shortcut (Join-Path $programsRoot 'Update Career Atlas.lnk') $powershellPath $updateArguments $repoRoot 'Update Career Atlas from the selected source branch' $icon
    $uninstallArguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $toolsRoot 'uninstall-local.ps1')`""
    New-Shortcut (Join-Path $programsRoot 'Uninstall Career Atlas.lnk') $powershellPath $uninstallArguments $repoRoot 'Uninstall Career Atlas and keep personal data' $icon
  }

  Write-Step 'Installation completed'
  Write-Host "Application: $appRoot"
  Write-Host "Personal data: $dataRoot"
  if (-not $SkipLaunch) {
    Invoke-Checked (Join-Path $PSHOME 'powershell.exe') @('-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $toolsRoot 'launch-local.ps1'))
  }
} catch {
  $installFailure = $_
  if (Test-Path -LiteralPath $stageRoot) {
    try {
      Remove-DirectoryTree $stageRoot
    } catch {
      Write-Warning "The temporary runtime could not be removed automatically: $($_.Exception.Message)"
    }
  }
  Write-Error $installFailure
  exit 1
}

exit 0
