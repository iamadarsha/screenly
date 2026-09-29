# Screenly one-command installer for Windows.
#
#   irm https://raw.githubusercontent.com/iamadarsha/screenly/main/scripts/install.ps1 | iex
#
# Downloads the latest published Screenly installer (.exe, NSIS) from the
# iamadarsha/screenly GitHub Releases page and runs it.
#
# Note on SmartScreen: this build is not yet code-signed with a Windows
# code-signing certificate, so Windows Defender SmartScreen will show an
# "Windows protected your PC" prompt the first time you run the installer.
# Click "More info" then "Run anyway" to continue. This is expected for an
# unsigned build and does not indicate a corrupted download.

$ErrorActionPreference = "Stop"

$Repo = "iamadarsha/screenly"
$AssetName = "Screenly-windows-x64.exe"

Write-Host "==> Detecting latest Screenly release..."
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ "User-Agent" = "screenly-installer" }
$tag = $release.tag_name
if (-not $tag) {
    Write-Error "Could not determine latest release tag. Is https://github.com/$Repo/releases populated?"
    exit 1
}

$downloadUrl = "https://github.com/$Repo/releases/download/$tag/$AssetName"
Write-Host "==> Downloading Screenly $tag from $downloadUrl"

$tempDir = Join-Path $env:TEMP "screenly-install"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
$installerPath = Join-Path $tempDir $AssetName

Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing

Write-Host "==> Unblocking downloaded file..."
Unblock-File -Path $installerPath -ErrorAction SilentlyContinue

Write-Host "==> Launching installer (approve the SmartScreen prompt if shown)..."
Start-Process -FilePath $installerPath -Wait

Write-Host "==> Done."
