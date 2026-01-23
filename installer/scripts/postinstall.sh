#!/bin/bash
# ngaj macOS Post-Install Script
# This script runs after the .pkg installer completes.
# It checks for Docker, installs if needed, runs the setup wizard, and starts services.

set -e

NGAJ_HOME="${HOME}/.ngaj"
INSTALL_DIR="/Applications/ngaj"

echo "🚀 ngaj Post-Install Setup"
echo "=========================="

# Create user data directory
mkdir -p "${NGAJ_HOME}/data/mongodb"
mkdir -p "${NGAJ_HOME}/data/chromadb"
mkdir -p "${NGAJ_HOME}/logs"

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

echo ""
echo "✅ ngaj is ready!"
echo "Opening http://localhost:3000..."
open "http://localhost:3000"
