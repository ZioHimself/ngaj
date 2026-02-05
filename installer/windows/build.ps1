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

# Create install.bat with self-elevation for easy installation
$installBat = @"
@echo off
setlocal EnableDelayedExpansion

title ngaj Installer

REM ============================================
REM  Check if running from extracted location
REM  (Running from inside ZIP will fail)
REM ============================================
cd /d "%~dp0"

if not exist "%~dp0docker-compose.yml" (
    echo.
    echo =======================================
    echo          ERROR: Extract First!
    echo =======================================
    echo.
    echo It looks like you're running install.bat directly
    echo from inside the ZIP file. This won't work.
    echo.
    echo Please:
    echo   1. Extract the entire ZIP to a folder
    echo   2. Open the extracted folder
    echo   3. Run install.bat from there
    echo.
    echo =======================================
    echo.
    pause
    exit /b 1
)

REM ============================================
REM  Self-elevation: Request admin if not admin
REM ============================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo =======================================
    echo        ngaj Installer
    echo =======================================
    echo.
    echo Requesting administrator privileges...
    echo A Windows prompt will appear - please click "Yes"
    echo.
    powershell -Command "Start-Process -Verb RunAs -FilePath '%~f0' -ArgumentList 'elevated'"
    exit /b
)

REM ============================================
REM  Main installation (running as admin)
REM ============================================

REM Change to the directory where install.bat is located
REM (elevated processes start in C:\Windows\System32 by default)
cd /d "%~dp0"

cls
echo.
echo =======================================
echo        ngaj Installer
echo =======================================
echo.

REM Verify source files exist (double-check after elevation)
if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found in %~dp0
    echo.
    echo Make sure you extracted the entire ZIP file and
    echo are running install.bat from the extracted folder.
    echo.
    pause
    exit /b 1
)
if not exist "scripts\postinstall.ps1" (
    echo ERROR: scripts\postinstall.ps1 not found in %~dp0
    echo.
    echo Make sure you extracted the entire ZIP file and
    echo are running install.bat from the extracted folder.
    echo.
    pause
    exit /b 1
)

echo Step 1/3: Creating installation directory...

REM Create installation directory
if not exist "%ProgramFiles%\ngaj" mkdir "%ProgramFiles%\ngaj"
if not exist "%ProgramFiles%\ngaj\scripts" mkdir "%ProgramFiles%\ngaj\scripts"
if not exist "%ProgramFiles%\ngaj\resources" mkdir "%ProgramFiles%\ngaj\resources"

echo          Done.
echo.
echo Step 2/3: Copying files...

REM Copy files with error checking
copy /Y "docker-compose.yml" "%ProgramFiles%\ngaj\"
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy docker-compose.yml
    pause
    exit /b 1
)

copy /Y "scripts\*.ps1" "%ProgramFiles%\ngaj\scripts\"
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy PowerShell scripts
    pause
    exit /b 1
)

copy /Y "resources\icon.ico" "%ProgramFiles%\ngaj\resources\"
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy icon resource
    pause
    exit /b 1
)

REM Verify critical file was copied
if not exist "%ProgramFiles%\ngaj\scripts\postinstall.ps1" (
    echo ERROR: postinstall.ps1 was not copied successfully
    echo.
    echo Please check file permissions and try again.
    pause
    exit /b 1
)

echo          Done.
echo.
echo Step 3/3: Running post-install setup...
echo.
echo =======================================
echo  A new window will open for setup.
echo  Please follow the prompts there.
echo =======================================
echo.

REM Run post-install script
powershell -ExecutionPolicy Bypass -File "%ProgramFiles%\ngaj\scripts\postinstall.ps1"

echo.
echo Installation complete!
echo.
echo The setup wizard should now be running in a new window.
echo You can close this window.
echo.
pause
"@
$installBat | Out-File -FilePath "$PayloadDir\install.bat" -Encoding ASCII

# Create README.txt with installation instructions
$readmeTxt = @"
=======================================
       ngaj Installer - README
=======================================

IMPORTANT: You must EXTRACT this ZIP file before running the installer!

Installation Steps:
-------------------
1. EXTRACT this entire ZIP to a folder (e.g., Desktop or Downloads)
   - Right-click the ZIP file
   - Select "Extract All..."
   - Choose a destination folder
   - Click "Extract"

2. OPEN the extracted folder

3. DOUBLE-CLICK "install.bat"
   - Windows will ask for Administrator permission - click "Yes"
   - Follow the on-screen prompts

DO NOT run install.bat directly from inside the ZIP file!
Windows cannot access the other required files when you do this.

Troubleshooting:
----------------
- If you see "Extract First!" error: Extract the ZIP and try again
- If you see permission errors: Right-click install.bat, "Run as administrator"
- For more help: https://github.com/ziohimself/ngaj/issues

"@
$readmeTxt | Out-File -FilePath "$PayloadDir\README.txt" -Encoding ASCII

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

REM Set HOME if not set (for consistency)
if not defined HOME set HOME=%USERPROFILE%

REM Stop services
cd /d "%ProgramFiles%\ngaj"
docker compose down 2>nul

REM Remove Start Menu shortcut
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\ngaj.lnk" 2>nul

REM Remove installation directory
rmdir /s /q "%ProgramFiles%\ngaj" 2>nul

REM Remove user data (optional - ask user)
echo.
set /p REMOVE_DATA="Remove user data? [y/N]: "
if /i "%REMOVE_DATA%"=="y" (
    rmdir /s /q "%LOCALAPPDATA%\ngaj" 2>nul
    rmdir /s /q "%HOME%\.ngaj" 2>nul
    echo User data removed.
) else (
    echo User data preserved at %LOCALAPPDATA%\ngaj and %HOME%\.ngaj
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
