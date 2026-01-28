#!/bin/bash
# ngaj macOS Installer Build Script
# Creates a .dmg installer for distribution
#
# Prerequisites:
# - macOS with Xcode command line tools installed
#
# Usage:
#   ./installer/macos/build.sh
#
# Output:
#   dist/ngaj-{version}.dmg

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version")

# Build directories
BUILD_DIR="${PROJECT_ROOT}/dist/installer-build"
APP_BUNDLE_DIR="${BUILD_DIR}/ngaj.app"
DMG_DIR="${BUILD_DIR}/dmg"
OUTPUT_DIR="${PROJECT_ROOT}/dist"
OUTPUT_DMG="${OUTPUT_DIR}/ngaj-${VERSION}.dmg"

echo "Building ngaj macOS Installer v${VERSION}"
echo "==========================================="

# Clean previous build
echo "Cleaning previous build..."
rm -rf "${BUILD_DIR}"
rm -f "${OUTPUT_DMG}"
mkdir -p "${BUILD_DIR}"
mkdir -p "${OUTPUT_DIR}"

# --- APP BUNDLE: Self-contained ngaj.app ---

echo "Creating app bundle..."
mkdir -p "${APP_BUNDLE_DIR}/Contents/MacOS"
mkdir -p "${APP_BUNDLE_DIR}/Contents/Resources/scripts"

# Copy Info.plist
cp "${SCRIPT_DIR}/Info.plist" "${APP_BUNDLE_DIR}/Contents/"

# Copy launcher script
cp "${SCRIPT_DIR}/ngaj-launcher" "${APP_BUNDLE_DIR}/Contents/MacOS/ngaj"
chmod +x "${APP_BUNDLE_DIR}/Contents/MacOS/ngaj"

# Copy icon
cp "${SCRIPT_DIR}/resources/ngaj.icns" "${APP_BUNDLE_DIR}/Contents/Resources/"

# Copy docker-compose.yml (bundled in app)
cp "${PROJECT_ROOT}/docker-compose.yml" "${APP_BUNDLE_DIR}/Contents/Resources/"

# Copy scripts (bundled in app)
cp "${PROJECT_ROOT}/installer/scripts/ngaj-setup.sh" "${APP_BUNDLE_DIR}/Contents/Resources/scripts/"
cp "${PROJECT_ROOT}/installer/scripts/ngaj-start.sh" "${APP_BUNDLE_DIR}/Contents/Resources/scripts/"
chmod +x "${APP_BUNDLE_DIR}/Contents/Resources/scripts/"*.sh

# --- CREATE DMG ---

echo "Creating DMG..."

# Create DMG staging directory
mkdir -p "${DMG_DIR}"
cp -R "${APP_BUNDLE_DIR}" "${DMG_DIR}/"

# Create Applications symlink for drag-to-install UX
ln -s /Applications "${DMG_DIR}/Applications"

# Create temporary read-write DMG first (needed to set volume icon)
TEMP_DMG="${BUILD_DIR}/temp.dmg"
hdiutil create \
    -volname "ngaj ${VERSION}" \
    -srcfolder "${DMG_DIR}" \
    -ov \
    -format UDRW \
    "${TEMP_DMG}"

# Mount the temporary DMG to set volume icon
MOUNT_DIR=$(hdiutil attach "${TEMP_DMG}" -readwrite -noverify | grep "/Volumes/" | sed 's/.*\(\/Volumes\/.*\)/\1/')

# Copy icon and set custom icon flag on volume
cp "${SCRIPT_DIR}/resources/ngaj.icns" "${MOUNT_DIR}/.VolumeIcon.icns"
SetFile -a C "${MOUNT_DIR}"

# Unmount
hdiutil detach "${MOUNT_DIR}"

# Convert to compressed read-only DMG
hdiutil convert "${TEMP_DMG}" -format UDZO -o "${OUTPUT_DMG}"

# Clean up build directory
rm -rf "${BUILD_DIR}"

echo ""
echo "Installer built successfully!"
echo "   Output: ${OUTPUT_DMG}"
echo "   Size: $(du -h "${OUTPUT_DMG}" | cut -f1)"
echo ""
echo "To test the installer:"
echo "   1. Open ${OUTPUT_DMG}"
echo "   2. Drag ngaj.app to Applications"
echo "   3. Right-click ngaj.app -> Open (to bypass Gatekeeper)"
echo ""
echo "To clean up after testing:"
echo "   rm -rf /Applications/ngaj.app"
echo "   rm -rf ~/.ngaj"
