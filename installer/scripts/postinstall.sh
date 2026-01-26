#!/bin/bash
# ngaj macOS Post-Install Script
# This script runs after the .pkg installer completes (in non-interactive context).
# It installs files and then opens Terminal for the interactive setup wizard.
#
# NOTE: This script runs as ROOT. We must get the actual logged-in user
# and create directories with correct ownership.

set -e

# Get the actual logged-in user (not root)
CURRENT_USER=$(stat -f '%Su' /dev/console)
USER_HOME=$(eval echo "~${CURRENT_USER}")
NGAJ_HOME="${USER_HOME}/.ngaj"
INSTALL_DIR="/Applications/ngaj"

# Create user data directory structure with correct ownership
sudo -u "${CURRENT_USER}" mkdir -p "${NGAJ_HOME}/logs"
sudo -u "${CURRENT_USER}" mkdir -p "${NGAJ_HOME}/scripts"

# Copy scripts to user directory (as root, then fix ownership)
cp "${INSTALL_DIR}/scripts/ngaj-start.sh" "${NGAJ_HOME}/scripts/"
cp "${INSTALL_DIR}/scripts/ngaj-setup.sh" "${NGAJ_HOME}/scripts/"
chmod +x "${NGAJ_HOME}/scripts/ngaj-start.sh"
chmod +x "${NGAJ_HOME}/scripts/ngaj-setup.sh"

# Fix ownership of entire ngaj home directory
chown -R "${CURRENT_USER}" "${NGAJ_HOME}"

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
