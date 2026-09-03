param(
  [ValidateSet('all', 'b01', 'b02', 'b03', 'b04', 'b05', 'b06', 'b07', 'b08', 'b09', 'b10', 'b11', 'b12', 'b13', 'b14', 'b15', 'b16', 'b17', 'b18', 'b19', 'b20', 'b21', 'b22', 'b23', 'b24', 'b25', 'b26', 'b27', 'b28', 'b29', 'b30', 'b31', 'b32', 'b33', 'b34', 'b35')]
  [string]$Batch = 'all',
  [string]$VoiceName = 'Microsoft Zira Desktop',
  [int]$Rate = -1
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$guideRoot = Join-Path $repoRoot 'docs\knowledge\chinese-guides'
$pronunciationRoot = Join-Path $repoRoot 'apps\web\public\pronunciation'
$batchConfig = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'pronunciation-batches.json') -Encoding UTF8 -Raw | ConvertFrom-Json -AsHashtable
$batchNames = if ($Batch -eq 'all') { @($batchConfig.Keys | Sort-Object) } else { @($Batch) }

function Normalize-Term([string]$Value) {
  return ([regex]::Replace($Value.Trim(), '\s+', ' ')).ToLowerInvariant()
}

function Add-Term([System.Collections.Generic.Dictionary[string,string]]$Terms, [string]$Value) {
  $display = [regex]::Replace($Value.Trim(), '\s+', ' ')
  if (-not $display -or $display.Length -gt 80 -or $display -notmatch '[A-Za-z]') { return }
  $key = Normalize-Term $display
  if (-not $Terms.ContainsKey($key)) { $Terms.Add($key, $display) }
}

function Test-WaveAsset([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
  $info = Get-Item -LiteralPath $Path
  if ($info.Length -le 1024) { return $false }
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $header = New-Object byte[] 4
    if ($stream.Read($header, 0, 4) -ne 4) { return $false }
    return [System.Text.Encoding]::ASCII.GetString($header) -eq 'RIFF'
  } finally {
    $stream.Dispose()
  }
}

$synthesizer = New-Object -ComObject SAPI.SpVoice
$installedVoices = $synthesizer.GetVoices()
$voice = $null
for ($index = 0; $index -lt $installedVoices.Count; $index += 1) {
  $candidate = $installedVoices.Item($index)
  if ($candidate.GetDescription() -like "$VoiceName*English (United States)*") {
    $voice = $candidate
    break
  }
}
if (-not $voice) { throw "The required en-US voice is unavailable: $VoiceName" }

$synthesizer.Voice = $voice
$synthesizer.Rate = $Rate
$synthesizer.Volume = 100
$sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
  foreach ($batchName in $batchNames) {
    $guideNames = @($batchConfig[$batchName])
    $outputRoot = Join-Path $pronunciationRoot $batchName
    $terms = [System.Collections.Generic.Dictionary[string,string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($guideName in $guideNames) {
      $path = Join-Path $guideRoot $guideName
      if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing $batchName material: $path" }
      $markdown = Get-Content -LiteralPath $path -Encoding UTF8 -Raw
      $withoutCodeBlocks = [regex]::Replace($markdown, '(?s)```.*?```', ' ')
      foreach ($strongMatch in [regex]::Matches($withoutCodeBlocks, '\*\*([^*\r\n]+)\*\*')) {
        $strongText = [regex]::Replace($strongMatch.Groups[1].Value, '`', '').Trim()
        $parenthetical = [regex]::Matches($strongText, '[（(]([A-Za-z][A-Za-z0-9.'' -]*)[）)]')
        if ($parenthetical.Count -gt 0) {
          foreach ($termMatch in $parenthetical) { Add-Term $terms $termMatch.Groups[1].Value }
        } elseif ($strongText -match '^[A-Za-z][A-Za-z0-9.'' -]*$') {
          Add-Term $terms $strongText
        }
      }
    }

    [void](New-Item -ItemType Directory -Path $outputRoot -Force)
    $manifestTerms = [ordered]@{}
    $generated = 0
    $pruned = 0
    foreach ($entry in ($terms.GetEnumerator() | Sort-Object Key)) {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($entry.Key)
      $hash = ([System.BitConverter]::ToString($sha256.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant().Substring(0, 16)
      $fileName = "$hash.wav"
      $target = Join-Path $outputRoot $fileName
      if (-not (Test-WaveAsset $target)) {
        if (Test-Path -LiteralPath $target -PathType Leaf) { Remove-Item -LiteralPath $target -Force }
        $stream = New-Object -ComObject SAPI.SpFileStream
        try {
          $stream.Open($target, 3, $false)
          $synthesizer.AudioOutputStream = $stream
          [void]$synthesizer.Speak($entry.Value)
        } finally {
          $stream.Close()
          [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($stream)
        }
        $generated += 1
      }
      $manifestTerms[$entry.Key] = [ordered]@{ file = $fileName; text = $entry.Value }
    }

    $manifest = [ordered]@{
      voice = [ordered]@{ name = $VoiceName; culture = 'en-US'; gender = 'Female'; rate = $Rate }
      sourceGuides = $guideNames
      terms = $manifestTerms
    }
    $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $outputRoot 'manifest.json') -Encoding UTF8
    $expectedFiles = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($manifestEntry in $manifestTerms.Values) { [void]$expectedFiles.Add($manifestEntry.file) }
    $resolvedOutputRoot = [System.IO.Path]::GetFullPath($outputRoot).TrimEnd('\') + '\'
    foreach ($audioFile in (Get-ChildItem -LiteralPath $outputRoot -File -Filter '*.wav')) {
      $resolvedAudioPath = [System.IO.Path]::GetFullPath($audioFile.FullName)
      if ($resolvedAudioPath.StartsWith($resolvedOutputRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
          $audioFile.Name -match '^[a-f0-9]{16}\.wav$' -and
          -not $expectedFiles.Contains($audioFile.Name)) {
        Remove-Item -LiteralPath $resolvedAudioPath -Force
        $pruned += 1
      }
    }
    Write-Output "$($batchName.ToUpperInvariant()) en-US pronunciation assets are ready: $(@($manifestTerms.Keys).Count) terms, $generated generated, $pruned obsolete generated files pruned."
  }
} finally {
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($installedVoices)
  [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($synthesizer)
  $sha256.Dispose()
}
