#!/bin/bash
# ngaj macOS Post-Install Script
# This script runs after the .pkg installer completes.
# It checks for Docker, installs if needed, runs the setup wizard, and starts services.

set -e

NGAJ_HOME="${HOME}/.ngaj"
INSTALL_DIR="/Applications/ngaj"

echo "🚀 ngaj Post-Install Setup"
echo "=========================="

# Create user data directory structure
mkdir -p "${NGAJ_HOME}/data/mongodb"
mkdir -p "${NGAJ_HOME}/data/chromadb"
mkdir -p "${NGAJ_HOME}/logs"
mkdir -p "${NGAJ_HOME}/scripts"

# Copy start script to user directory
echo "Installing launcher scripts..."
cp "${INSTALL_DIR}/scripts/ngaj-start.sh" "${NGAJ_HOME}/scripts/"
chmod +x "${NGAJ_HOME}/scripts/ngaj-start.sh"

# Copy app bundle to /Applications (outside the ngaj folder)
if [ -d "${INSTALL_DIR}/ngaj.app" ]; then
    echo "Installing ngaj.app to /Applications..."
    cp -R "${INSTALL_DIR}/ngaj.app" "/Applications/"
fi

# Check for Docker
echo "Checking for Docker..."
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Downloading Docker Desktop..."
    
    # Download Docker Desktop
    DOCKER_DMG="/tmp/Docker.dmg"
    curl -L -o "${DOCKER_DMG}" "https://desktop.docker.com/mac/main/arm64/Docker.dmg"
    
    # Mount and install
    echo "Installing Docker Desktop..."
    hdiutil attach "${DOCKER_DMG}" -nobrowse -quiet
    cp -R "/Volumes/Docker/Docker.app" "/Applications/"
    hdiutil detach "/Volumes/Docker" -quiet
    rm "${DOCKER_DMG}"
    
    # Start Docker
    echo "Starting Docker Desktop..."
    open -a Docker
fi

# Wait for Docker daemon
echo "Waiting for Docker daemon..."
until docker info &> /dev/null; do
    sleep 2
done
echo "✓ Docker is ready"

# Pull setup container
echo "Pulling ngaj setup container..."
docker pull ngaj/setup:latest

# Run setup wizard with volume mount
echo ""
echo "Starting setup wizard..."
echo "========================"
docker run --rm -it \
    -v "${NGAJ_HOME}:/data" \
    ngaj/setup:latest

# Check if setup completed (.env exists)
if [ ! -f "${NGAJ_HOME}/.env" ]; then
    echo "❌ Setup was cancelled. Run the installer again to complete setup."
    exit 1
fi

# Pull production images
echo ""
echo "Pulling production containers..."
cd "${INSTALL_DIR}"
docker compose pull

# Start services
echo "Starting ngaj services..."
docker compose up -d

# Wait for backend health check
echo "Waiting for services to be ready..."
until curl -s http://localhost:3000/health > /dev/null 2>&1; do
    sleep 2
done

# Detect LAN IP address for network access
detect_lan_ip() {
    local ip=""
    ip=$(ipconfig getifaddr en0 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(ipconfig getifaddr en1 2>/dev/null)
    fi
    echo "$ip"
}

LAN_IP=$(detect_lan_ip)

# Read login secret from .env
LOGIN_SECRET=$(grep -E "^LOGIN_SECRET=" "${NGAJ_HOME}/.env" | cut -d'=' -f2-)

echo ""
echo "✅ ngaj is ready!"
echo ""
echo "  Local access:   http://localhost:3000"
if [ -n "$LAN_IP" ]; then
    echo "  Network access: http://${LAN_IP}:3000"
    echo "  (Use this URL from your mobile device on the same WiFi)"
fi
if [ -n "$LOGIN_SECRET" ]; then
    echo ""
    echo "  Login code:     ${LOGIN_SECRET}"
fi
echo ""
echo "Opening browser..."

if [ -n "$LAN_IP" ]; then
    open "http://${LAN_IP}:3000"
else
    open "http://localhost:3000"
fi
