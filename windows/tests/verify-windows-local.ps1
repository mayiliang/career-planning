Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

$launchScript = Get-Content -LiteralPath (Join-Path $repoRoot 'windows\launch-local.ps1') -Raw -Encoding UTF8
$installScript = Get-Content -LiteralPath (Join-Path $repoRoot 'windows\install-local.ps1') -Raw -Encoding UTF8
$uninstallScript = Get-Content -LiteralPath (Join-Path $repoRoot 'windows\uninstall-local.ps1') -Raw -Encoding UTF8
$appShell = Get-Content -LiteralPath (Join-Path $repoRoot 'apps\web\index.html') -Raw -Encoding UTF8

Assert-True ($launchScript.Contains("[ValidateSet('Chrome', 'EdgeApp')]")) 'The launcher does not expose both browser modes.'
Assert-True ($launchScript.Contains("[string]`$BrowserMode = 'Chrome'")) 'Chrome is not the default Career Atlas browser mode.'
Assert-True ($launchScript.Contains("'Google\Chrome\Application\chrome.exe'")) 'The launcher does not locate an existing Chrome installation.'
Assert-True ($launchScript.Contains('if ($visibleChromeWindows.Count -gt 0)')) 'The launcher does not detect an already-open Chrome window.'
Assert-True ($launchScript.Contains('Start-Process -FilePath $chromePath -ArgumentList @($appUrl)')) 'An already-open Chrome window does not receive Career Atlas as a normal new tab.'
Assert-True ($launchScript.Contains("@('--new-window', '--start-maximized', `$appUrl)")) 'Chrome is not configured to open a maximized window when no window exists.'
Assert-True ($launchScript.Contains('ShowWindowAsync')) 'The launcher does not apply a native maximize action to the new Chrome window.'
Assert-True ($launchScript.Contains("Get-VisibleBrowserWindows 'chrome'")) 'The launcher does not distinguish existing Chrome windows from a first launch.'
Assert-True ($launchScript.Contains('SW_MAXIMIZE = 3')) 'The native maximize command is not documented and verifiable.'
Assert-True ($launchScript.Contains('"--app=$appUrl"')) 'The launcher no longer offers the Edge immersive app mode.'
Assert-True ($installScript.Contains('-BrowserMode Chrome')) 'The main shortcut does not open the Chrome extension-enabled mode.'
Assert-True ($installScript.Contains('-BrowserMode EdgeApp')) 'The installer does not create an immersive Edge shortcut.'
Assert-True ($installScript.Contains('Career Atlas Immersive.lnk')) 'The immersive shortcut is missing.'
Assert-True ($uninstallScript.Contains('Career Atlas Immersive.lnk')) 'The uninstaller leaves the immersive desktop shortcut behind.'
Assert-True ($installScript.Contains("assets\Career-Atlas.ico")) 'The installer does not copy the Career Atlas icon.'
Assert-True ($installScript.Contains('$icon = "$iconPath,0"')) 'Shortcuts do not use the Career Atlas icon.'
Assert-True ($installScript.Contains('remove-directory-tree.mjs')) 'The updater cannot safely remove pnpm directory links on Windows.'
Assert-True ($installScript.Contains('--config.node-linker=hoisted')) 'The deployed runtime may contain Windows directory links that block reliable upgrades.'
Assert-True ($installScript.Contains('legacy-runtime-')) 'Legacy linked rollbacks are not isolated during the one-time runtime migration.'
Assert-True ($installScript.Contains("`$env:CI = 'true'")) 'Dependency reconciliation may block a non-interactive Windows upgrade.'
Assert-True ($installScript.Contains("runtimeLayout = 'hoisted-v1'")) 'The installed runtime layout is not recorded for future upgrades.'
Assert-True ($installScript.Contains("learning-material-supplements\pending")) 'The updater does not surface the persistent learning-material supplement inbox.'
Assert-True ($installScript.Contains('Pending candidates:')) 'The updater does not report how many supplement candidates require review.'
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

Write-Host 'Windows local icon, Chrome tab reuse and immersive launch checks passed.' -ForegroundColor Green
