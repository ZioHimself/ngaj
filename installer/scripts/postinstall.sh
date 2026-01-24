#!/bin/bash
# ngaj macOS Post-Install Script
# This script runs after the .pkg installer completes (in non-interactive context).
# It installs files and then opens Terminal for the interactive setup wizard.

set -e

NGAJ_HOME="${HOME}/.ngaj"
INSTALL_DIR="/Applications/ngaj"

# Create user data directory structure
mkdir -p "${NGAJ_HOME}/data/mongodb"
mkdir -p "${NGAJ_HOME}/data/chromadb"
mkdir -p "${NGAJ_HOME}/logs"
mkdir -p "${NGAJ_HOME}/scripts"

# Copy scripts to user directory
cp "${INSTALL_DIR}/scripts/ngaj-start.sh" "${NGAJ_HOME}/scripts/"
cp "${INSTALL_DIR}/scripts/ngaj-setup.sh" "${NGAJ_HOME}/scripts/"
chmod +x "${NGAJ_HOME}/scripts/ngaj-start.sh"
chmod +x "${NGAJ_HOME}/scripts/ngaj-setup.sh"

# Copy app bundle to /Applications (outside the ngaj folder)
if [ -d "${INSTALL_DIR}/ngaj.app" ]; then
    cp -R "${INSTALL_DIR}/ngaj.app" "/Applications/"
fi

# Open Terminal to run the interactive setup wizard
# This runs AFTER the installer UI closes
osascript <<EOF
tell application "Terminal"
    activate
    do script "${NGAJ_HOME}/scripts/ngaj-setup.sh"
end tell
EOF

exit 0
