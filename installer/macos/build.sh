#!/bin/bash
# ngaj macOS Installer Build Script
# Creates a .pkg installer for distribution
#
# Prerequisites:
# - macOS with Xcode command line tools installed
# - Docker images built (npm run docker:build)
#
# Usage:
#   ./installer/macos/build.sh
#
# Output:
#   dist/ngaj-installer-{version}.pkg

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
VERSION=$(node -p "require('${PROJECT_ROOT}/package.json').version")
IDENTIFIER="com.ngaj.installer"
INSTALL_LOCATION="/Applications/ngaj"

# Build directories
BUILD_DIR="${PROJECT_ROOT}/dist/installer-build"
PAYLOAD_DIR="${BUILD_DIR}/payload"
SCRIPTS_DIR="${BUILD_DIR}/scripts"
APP_BUNDLE_DIR="${BUILD_DIR}/ngaj.app"
OUTPUT_DIR="${PROJECT_ROOT}/dist"
OUTPUT_PKG="${OUTPUT_DIR}/ngaj-installer-${VERSION}.pkg"

echo "🔨 Building ngaj macOS Installer v${VERSION}"
echo "==========================================="

# Clean previous build
echo "Cleaning previous build..."
rm -rf "${BUILD_DIR}"
mkdir -p "${PAYLOAD_DIR}"
mkdir -p "${SCRIPTS_DIR}"
mkdir -p "${OUTPUT_DIR}"

# --- PAYLOAD: Files installed to /Applications/ngaj ---

echo "Assembling payload..."

# Copy docker-compose.yml
cp "${PROJECT_ROOT}/docker-compose.yml" "${PAYLOAD_DIR}/"

# Copy scripts directory structure
mkdir -p "${PAYLOAD_DIR}/scripts"
cp "${PROJECT_ROOT}/installer/scripts/postinstall.sh" "${SCRIPTS_DIR}/postinstall"
chmod +x "${SCRIPTS_DIR}/postinstall"

# --- APP BUNDLE: ngaj.app for day-2 launcher ---

echo "Creating app bundle..."
mkdir -p "${APP_BUNDLE_DIR}/Contents/MacOS"
mkdir -p "${APP_BUNDLE_DIR}/Contents/Resources"

# Copy Info.plist
cp "${SCRIPT_DIR}/Info.plist" "${APP_BUNDLE_DIR}/Contents/"

# Copy launcher script
cp "${SCRIPT_DIR}/ngaj-launcher" "${APP_BUNDLE_DIR}/Contents/MacOS/ngaj"
chmod +x "${APP_BUNDLE_DIR}/Contents/MacOS/ngaj"

# Copy icon
cp "${SCRIPT_DIR}/resources/ngaj.icns" "${APP_BUNDLE_DIR}/Contents/Resources/"

# Copy scripts to payload (will be installed to ~/.ngaj/scripts/ by postinstall)
cp "${PROJECT_ROOT}/installer/scripts/ngaj-start.sh" "${PAYLOAD_DIR}/scripts/"
cp "${PROJECT_ROOT}/installer/scripts/ngaj-setup.sh" "${PAYLOAD_DIR}/scripts/"

# Move app bundle to payload
mv "${APP_BUNDLE_DIR}" "${PAYLOAD_DIR}/"

# --- BUILD PACKAGE ---

echo "Building package with pkgbuild..."

# Create component plist to prevent pkgbuild from relocating the app bundle
COMPONENT_PLIST="${BUILD_DIR}/component.plist"
cat > "${COMPONENT_PLIST}" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
    <dict>
        <key>BundleHasStrictIdentifier</key>
        <false/>
        <key>BundleIsRelocatable</key>
        <false/>
        <key>BundleIsVersionChecked</key>
        <false/>
        <key>BundleOverwriteAction</key>
        <string>upgrade</string>
        <key>RootRelativeBundlePath</key>
        <string>ngaj.app</string>
    </dict>
</array>
</plist>
PLIST

pkgbuild \
    --root "${PAYLOAD_DIR}" \
    --scripts "${SCRIPTS_DIR}" \
    --identifier "${IDENTIFIER}" \
    --version "${VERSION}" \
    --install-location "${INSTALL_LOCATION}" \
    --component-plist "${COMPONENT_PLIST}" \
    "${OUTPUT_PKG}"

echo ""
echo "✅ Installer built successfully!"
echo "   Output: ${OUTPUT_PKG}"
echo "   Size: $(du -h "${OUTPUT_PKG}" | cut -f1)"
echo ""
echo "To test the installer:"
echo "   sudo installer -pkg ${OUTPUT_PKG} -target /"
echo ""
echo "To clean up after testing:"
echo "   sudo rm -rf /Applications/ngaj"
echo "   rm -rf ~/.ngaj"
