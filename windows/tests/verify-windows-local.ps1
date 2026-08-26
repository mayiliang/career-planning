Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

$launchScript = Get-Content -LiteralPath (Join-Path $repoRoot 'windows\launch-local.ps1') -Raw -Encoding UTF8
$installScript = Get-Content -LiteralPath (Join-Path $repoRoot 'windows\install-local.ps1') -Raw -Encoding UTF8
$appShell = Get-Content -LiteralPath (Join-Path $repoRoot 'apps\web\index.html') -Raw -Encoding UTF8

Assert-True ($launchScript.Contains("'--start-maximized'")) 'The Edge app window is not configured to start maximized.'
Assert-True ($launchScript.Contains('"--app=$appUrl"')) 'The launcher no longer opens Career Atlas in Edge app mode.'
Assert-True ($installScript.Contains("assets\Career-Atlas.ico")) 'The installer does not copy the Career Atlas icon.'
Assert-True ($installScript.Contains('$icon = "$iconPath,0"')) 'Shortcuts do not use the Career Atlas icon.'
Assert-True ($installScript.Contains('remove-directory-tree.mjs')) 'The updater cannot safely remove pnpm directory links on Windows.'
Assert-True ($installScript.Contains('--config.node-linker=hoisted')) 'The deployed runtime may contain Windows directory links that block reliable upgrades.'
Assert-True ($installScript.Contains('legacy-runtime-')) 'Legacy linked rollbacks are not isolated during the one-time runtime migration.'
Assert-True ($installScript.Contains("`$env:CI = 'true'")) 'Dependency reconciliation may block a non-interactive Windows upgrade.'
Assert-True ($installScript.Contains("runtimeLayout = 'hoisted-v1'")) 'The installed runtime layout is not recorded for future upgrades.'
Assert-True ($appShell.Contains('/manifest.webmanifest')) 'The web app manifest is not linked.'
Assert-True ($appShell.Contains('/favicon.ico')) 'The Windows-compatible favicon is not linked.'

$manifestPath = Join-Path $repoRoot 'apps\web\public\manifest.webmanifest'
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
Assert-True ($manifest.display -eq 'standalone') 'The manifest does not request standalone display.'
foreach ($manifestIcon in $manifest.icons) {
  $iconRelativePath = ([string]$manifestIcon.src).TrimStart('/').Replace('/', '\')
  Assert-True (Test-Path -LiteralPath (Join-Path $repoRoot "apps\web\public\$iconRelativePath")) "Manifest icon is missing: $($manifestIcon.src)"
}

Add-Type -AssemblyName System.Drawing
$pngPath = Join-Path $repoRoot 'apps\web\public\career-atlas-icon-512.png'
$bitmap = [System.Drawing.Bitmap]::FromFile($pngPath)
try {
  Assert-True ($bitmap.Width -eq 512 -and $bitmap.Height -eq 512) 'The primary web icon is not 512x512.'
  Assert-True ($bitmap.GetPixel(0, 0).A -eq 0) 'The icon corners must use real transparency.'
} finally {
  $bitmap.Dispose()
}

$windowsIconPath = Join-Path $repoRoot 'windows\assets\Career-Atlas.ico'
$windowsIcon = [System.Drawing.Icon]::new($windowsIconPath)
try {
  Assert-True ($windowsIcon.Width -ge 16 -and $windowsIcon.Height -ge 16) 'The Windows icon cannot be decoded.'
} finally {
  $windowsIcon.Dispose()
}

$removerPath = Join-Path $repoRoot 'windows\remove-directory-tree.mjs'
Assert-True (Test-Path -LiteralPath $removerPath) 'The safe Windows directory remover is missing.'

Write-Host 'Windows local icon and maximized-launch checks passed.' -ForegroundColor Green
