$ErrorActionPreference = "Stop"

function Invoke-Step {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Description,
		[Parameter(Mandatory = $true)]
		[scriptblock]$Action
	)

	Write-Host "`n==> $Description"
	& $Action
	if ($LASTEXITCODE -ne 0) {
		throw "$Description failed with exit code $LASTEXITCODE"
	}
}

Invoke-Step "Installing Rust Windows targets (x64 + arm64)" {
	rustup target add x86_64-pc-windows-msvc aarch64-pc-windows-msvc
}

Invoke-Step "Building x64 installer" {
	powershell -ExecutionPolicy Bypass -File scripts/run-tauri-build.ps1 -Target x86_64-pc-windows-msvc
}

Invoke-Step "Building arm64 installer" {
	powershell -ExecutionPolicy Bypass -File scripts/run-tauri-build.ps1 -Target aarch64-pc-windows-msvc
}

Write-Host "`nDual-arch packaging complete."
Write-Host "x64 and arm64 bundles are under src-tauri/target/<target-triple>/release/bundle/nsis"
