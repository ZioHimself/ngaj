#!/bin/bash
# ngaj Windows Installer Build Script (cross-platform)
# Creates a distributable installer package for Windows
# Can be run on macOS, Linux, or Windows (via Git Bash/WSL)
#
# Prerequisites:
# - zip command available
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
VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version")

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

# Create install.bat
cat > "${PAYLOAD_DIR}/install.bat" << 'INSTALL_EOF'
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

REM Copy files
copy /Y docker-compose.yml "%ProgramFiles%\ngaj\"
copy /Y scripts\*.ps1 "%ProgramFiles%\ngaj\scripts\"

REM Run post-install script
powershell -ExecutionPolicy Bypass -File "%ProgramFiles%\ngaj\scripts\postinstall.ps1"

echo.
echo Installation complete!
pause
INSTALL_EOF

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

# Create ZIP archive
cd "${PAYLOAD_DIR}"
zip -r "${OUTPUT_ZIP}" .

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
