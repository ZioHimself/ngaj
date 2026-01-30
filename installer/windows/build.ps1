# ngaj Windows Installer Build Script
# Creates a distributable installer package for Windows
#
# Prerequisites:
# - Windows with PowerShell 5.1+
# - Docker images built (npm run docker:build)
#
# Usage:
#   .\installer\windows\build.ps1
#
# Output:
#   dist\ngaj-installer-{version}.zip (for now, .msi in future with WiX)

$ErrorActionPreference = "Stop"

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$PackageJson = Get-Content "$ProjectRoot\package.json" | ConvertFrom-Json
$Version = $PackageJson.version
$Identifier = "com.ngaj.installer"

# Build directories
$BuildDir = "$ProjectRoot\dist\installer-build"
$PayloadDir = "$BuildDir\payload"
$OutputDir = "$ProjectRoot\dist"
$OutputZip = "$OutputDir\ngaj-installer-$Version-windows.zip"

Write-Host "Building ngaj Windows Installer v$Version" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Clean previous build
Write-Host "Cleaning previous build..."
if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
}
New-Item -ItemType Directory -Force -Path $PayloadDir | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# --- PAYLOAD: Files to be installed ---

Write-Host "Assembling payload..."

# Copy docker-compose.yml
Copy-Item "$ProjectRoot\docker-compose.yml" "$PayloadDir\"

# Copy scripts directory
New-Item -ItemType Directory -Force -Path "$PayloadDir\scripts" | Out-Null
Copy-Item "$ProjectRoot\installer\scripts\postinstall.ps1" "$PayloadDir\scripts\"
Copy-Item "$ProjectRoot\installer\scripts\ngaj-start.ps1" "$PayloadDir\scripts\"
Copy-Item "$ProjectRoot\installer\scripts\ngaj-setup.ps1" "$PayloadDir\scripts\"
Copy-Item "$ProjectRoot\installer\scripts\ngaj-update.ps1" "$PayloadDir\scripts\"

# Copy resources (icon)
New-Item -ItemType Directory -Force -Path "$PayloadDir\resources" | Out-Null
Copy-Item "$ScriptDir\resources\icon.ico" "$PayloadDir\resources\"

# Create install.bat for easy installation
$installBat = @"
@echo off
echo Installing ngaj...
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Please run this script as Administrator.
    pause
    exit /b 1
)

REM Create installation directory
if not exist "%ProgramFiles%\ngaj" mkdir "%ProgramFiles%\ngaj"
if not exist "%ProgramFiles%\ngaj\scripts" mkdir "%ProgramFiles%\ngaj\scripts"
if not exist "%ProgramFiles%\ngaj\resources" mkdir "%ProgramFiles%\ngaj\resources"

REM Copy files
copy /Y docker-compose.yml "%ProgramFiles%\ngaj\"
copy /Y scripts\*.ps1 "%ProgramFiles%\ngaj\scripts\"
copy /Y resources\icon.ico "%ProgramFiles%\ngaj\resources\"

REM Run post-install script
powershell -ExecutionPolicy Bypass -File "%ProgramFiles%\ngaj\scripts\postinstall.ps1"

echo.
echo Installation complete!
pause
"@
$installBat | Out-File -FilePath "$PayloadDir\install.bat" -Encoding ASCII

# Create uninstall.bat
$uninstallBat = @"
@echo off
echo Uninstalling ngaj...
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Please run this script as Administrator.
    pause
    exit /b 1
)

REM Stop services
cd /d "%ProgramFiles%\ngaj"
docker compose down 2>nul

REM Remove Start Menu shortcut
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\ngaj.lnk" 2>nul

REM Remove installation directory
rmdir /s /q "%ProgramFiles%\ngaj" 2>nul

REM Remove user data (optional - ask user)
echo.
set /p REMOVE_DATA="Remove user data (%LOCALAPPDATA%\ngaj)? [y/N]: "
if /i "%REMOVE_DATA%"=="y" (
    rmdir /s /q "%LOCALAPPDATA%\ngaj" 2>nul
    echo User data removed.
) else (
    echo User data preserved at %LOCALAPPDATA%\ngaj
)

echo.
echo Uninstallation complete!
pause
"@
$uninstallBat | Out-File -FilePath "$PayloadDir\uninstall.bat" -Encoding ASCII

# --- BUILD PACKAGE ---

Write-Host "Creating installer package..."

# For now, create a ZIP archive
# Future: Use WiX Toolset to create proper .msi
Compress-Archive -Path "$PayloadDir\*" -DestinationPath $OutputZip -Force

# Calculate size
$size = (Get-Item $OutputZip).Length / 1MB

Write-Host ""
Write-Host "Installer built successfully!" -ForegroundColor Green
Write-Host "   Output: $OutputZip"
Write-Host "   Size: $([math]::Round($size, 2)) MB"
Write-Host ""
Write-Host "To test the installer:"
Write-Host "   1. Extract the ZIP file"
Write-Host "   2. Run install.bat as Administrator"
Write-Host ""
Write-Host "To clean up after testing:"
Write-Host "   Run uninstall.bat as Administrator"
