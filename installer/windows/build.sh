#!/bin/bash
# ngaj Windows Installer Build Script (cross-platform)
# Creates a distributable installer package for Windows
# Can be run on macOS, Linux, or Windows (via Git Bash/WSL)
#
# Prerequisites:
# - On Windows: PowerShell (built-in)
# - On macOS/Linux: zip command
#
# Usage:
#   ./installer/windows/build.sh
#
# Output:
#   dist/ngaj-installer-{version}-windows.zip

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Get version using npm (works cross-platform without path issues)
VERSION=$(npm pkg get version --json | tr -d '"')

# Build directories
BUILD_DIR="${PROJECT_ROOT}/dist/installer-build-windows"
PAYLOAD_DIR="${BUILD_DIR}/payload"
OUTPUT_DIR="${PROJECT_ROOT}/dist"
OUTPUT_ZIP="${OUTPUT_DIR}/ngaj-installer-${VERSION}-windows.zip"

echo "🔨 Building ngaj Windows Installer v${VERSION}"
echo "=============================================="

# Clean previous build
echo "Cleaning previous build..."
rm -rf "${BUILD_DIR}"
mkdir -p "${PAYLOAD_DIR}/scripts"
mkdir -p "${OUTPUT_DIR}"

# --- PAYLOAD: Files to be installed ---

echo "Assembling payload..."

# Copy docker-compose.yml
cp "${PROJECT_ROOT}/docker-compose.yml" "${PAYLOAD_DIR}/"

# Copy scripts
cp "${PROJECT_ROOT}/installer/scripts/postinstall.ps1" "${PAYLOAD_DIR}/scripts/"
cp "${PROJECT_ROOT}/installer/scripts/ngaj-start.ps1" "${PAYLOAD_DIR}/scripts/"
cp "${PROJECT_ROOT}/installer/scripts/ngaj-setup.ps1" "${PAYLOAD_DIR}/scripts/"
cp "${PROJECT_ROOT}/installer/scripts/ngaj-update.ps1" "${PAYLOAD_DIR}/scripts/"

# Copy resources (icon)
mkdir -p "${PAYLOAD_DIR}/resources"
cp "${SCRIPT_DIR}/resources/icon.ico" "${PAYLOAD_DIR}/resources/"

# Create install.bat with self-elevation and ZIP extraction check
cat > "${PAYLOAD_DIR}/install.bat" << 'INSTALL_EOF'
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
INSTALL_EOF

# Create README.txt with installation instructions
cat > "${PAYLOAD_DIR}/README.txt" << 'README_EOF'
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

README_EOF

# Create uninstall.bat
cat > "${PAYLOAD_DIR}/uninstall.bat" << 'UNINSTALL_EOF'
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
set /p REMOVE_DATA="Remove user data (~\AppData\Local\ngaj)? [y/N]: "
if /i "%REMOVE_DATA%"=="y" (
    rmdir /s /q "%LOCALAPPDATA%\ngaj" 2>nul
    echo User data removed.
) else (
    echo User data preserved at %LOCALAPPDATA%\ngaj
)

echo.
echo Uninstallation complete!
pause
UNINSTALL_EOF

# --- BUILD PACKAGE ---

echo "Creating installer package..."

# Create ZIP archive (use PowerShell on Windows, zip elsewhere)
cd "${PAYLOAD_DIR}"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  # Windows: use PowerShell's Compress-Archive (built-in, no external deps)
  # Convert Unix paths to Windows paths for PowerShell
  WIN_PAYLOAD_DIR=$(cygpath -w "${PAYLOAD_DIR}")
  WIN_OUTPUT_ZIP=$(cygpath -w "${OUTPUT_ZIP}")
  powershell -Command "Compress-Archive -Path '${WIN_PAYLOAD_DIR}\\*' -DestinationPath '${WIN_OUTPUT_ZIP}' -Force"
else
  # macOS/Linux: use zip command
  zip -r "${OUTPUT_ZIP}" .
fi

# Calculate size
SIZE=$(du -h "${OUTPUT_ZIP}" | cut -f1)

echo ""
echo "✅ Windows installer built successfully!"
echo "   Output: ${OUTPUT_ZIP}"
echo "   Size: ${SIZE}"
echo ""
echo "To install on Windows:"
echo "   1. Copy the ZIP to a Windows machine"
echo "   2. Extract the ZIP file"
echo "   3. Right-click install.bat → Run as Administrator"
