param(
  [Parameter(Mandatory = $true)]
  [string]$Target
)

$ErrorActionPreference = "Stop"

function Get-VsArchForTarget {
  param([string]$BuildTarget)

  switch ($BuildTarget) {
    "x86_64-pc-windows-msvc" { return "x64" }
    "aarch64-pc-windows-msvc" { return "arm64" }
    default {
      throw "Unsupported target: $BuildTarget"
    }
  }
}

function Import-VsBuildEnvironment {
  param([string]$VsArch)

  $vswherePath = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
  if (-not (Test-Path $vswherePath)) {
    throw @"
MSVC compiler not found (cl.exe).
Install Visual Studio 2022 Build Tools with the 'Desktop development with C++' workload,
then rerun this command.
"@
  }

  $installationPath = & $vswherePath -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  if (-not $installationPath) {
    throw @"
MSVC compiler not found (cl.exe).
Install Visual Studio 2022 Build Tools with the 'Desktop development with C++' workload,
then rerun this command.
"@
  }

  $vsDevCmd = Join-Path $installationPath "Common7\Tools\VsDevCmd.bat"
  if (-not (Test-Path $vsDevCmd)) {
    throw "Found Visual Studio installation, but VsDevCmd.bat was not found at: $vsDevCmd"
  }

  Write-Host "Loading Visual Studio build environment from: $vsDevCmd (arch=$VsArch, host=x64)"
  $envDump = & cmd.exe /c "`"$vsDevCmd`" -arch=$VsArch -host_arch=x64 >nul && set"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to initialize Visual Studio developer environment via VsDevCmd.bat"
  }

  foreach ($line in $envDump) {
    if ($line -match "^([^=]+)=(.*)$") {
      [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
  }

  if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
    throw "Visual Studio environment loaded, but cl.exe is still unavailable in PATH."
  }
}

$vsArch = Get-VsArchForTarget -BuildTarget $Target
Import-VsBuildEnvironment -VsArch $vsArch

Write-Host "Building Tauri installer for target: $Target"
tauri build --target $Target --config src-tauri/tauri.release-remote.conf.json
if ($LASTEXITCODE -ne 0) {
  throw "tauri build failed for target $Target with exit code $LASTEXITCODE"
}
