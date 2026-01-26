#!/bin/bash
# ngaj First-Time Setup Script
# This script runs in Terminal after the .pkg installer completes.
# It runs the interactive setup wizard and starts services.

set -e

NGAJ_HOME="${HOME}/.ngaj"
INSTALL_DIR="/Applications/ngaj"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         ngaj First-Time Setup         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check if already set up
if [ -f "${NGAJ_HOME}/.env" ]; then
    echo -e "${YELLOW}ngaj is already configured.${NC}"
    echo ""
    read -p "Do you want to reconfigure? (y/N): " RECONFIGURE
    if [[ ! "$RECONFIGURE" =~ ^[Yy]$ ]]; then
        echo "Starting ngaj..."
        exec "${NGAJ_HOME}/scripts/ngaj-start.sh"
    fi
fi

# Check for Docker
echo "Checking for Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Downloading Docker Desktop...${NC}"
    
    # Detect architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        DOCKER_URL="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
    else
        DOCKER_URL="https://desktop.docker.com/mac/main/amd64/Docker.dmg"
    fi
    
    # Download Docker Desktop
    DOCKER_DMG="/tmp/Docker.dmg"
    echo "Downloading from ${DOCKER_URL}..."
    curl -L -o "${DOCKER_DMG}" "${DOCKER_URL}"
    
    # Mount and install
    echo "Installing Docker Desktop..."
    hdiutil attach "${DOCKER_DMG}" -nobrowse -quiet
    cp -R "/Volumes/Docker/Docker.app" "/Applications/"
    hdiutil detach "/Volumes/Docker" -quiet
    rm "${DOCKER_DMG}"
    
    echo -e "${GREEN}✓ Docker Desktop installed${NC}"
fi

# Start Docker Desktop if not running
if ! docker info &> /dev/null; then
    echo "Starting Docker Desktop..."
    open -a Docker
    
    # Wait for Docker daemon (max 120 seconds)
    echo "Waiting for Docker to start..."
    WAIT_COUNT=0
    MAX_WAIT=120
    while ! docker info &> /dev/null; do
        sleep 2
        WAIT_COUNT=$((WAIT_COUNT + 2))
        if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
            echo -e "${RED}❌ Docker Desktop failed to start within ${MAX_WAIT} seconds.${NC}"
            echo ""
            echo "Please start Docker Desktop manually and run this script again:"
            echo "  ${NGAJ_HOME}/scripts/ngaj-setup.sh"
            echo ""
            read -p "Press Enter to exit..."
            exit 1
        fi
        # Show progress every 10 seconds
        if [ $((WAIT_COUNT % 10)) -eq 0 ]; then
            echo "  Still waiting for Docker... (${WAIT_COUNT}s)"
        fi
    done
fi
echo -e "${GREEN}✓ Docker is ready${NC}"

# Pull setup container
echo ""
echo "Pulling ngaj setup container..."
docker pull ziohimself/ngaj-setup:stable

# Ensure ngaj home directory exists with correct permissions
mkdir -p "${NGAJ_HOME}"

# Run setup wizard with volume mount
# Use host user's UID/GID to ensure write permissions to mounted volume
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}         Credentials Setup              ${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
docker run --rm -it \
    --user "$(id -u):$(id -g)" \
    -v "${NGAJ_HOME}:/data" \
    ziohimself/ngaj-setup:stable

# Check if setup completed (.env exists)
if [ ! -f "${NGAJ_HOME}/.env" ]; then
    echo ""
    echo -e "${RED}❌ Setup was cancelled.${NC}"
    echo ""
    echo "To try again, run:"
    echo "  ${NGAJ_HOME}/scripts/ngaj-setup.sh"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Pull production images
echo ""
echo "Pulling production containers..."
cd "${INSTALL_DIR}"
docker compose pull

# Start services
echo ""
echo "Starting ngaj services..."
docker compose up -d

# Wait for backend health check (max 60 seconds)
echo "Waiting for services to be ready..."
WAIT_COUNT=0
MAX_WAIT=60
until curl -s http://localhost:3000/health > /dev/null 2>&1; do
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo -e "${RED}❌ Services failed to start within ${MAX_WAIT} seconds.${NC}"
        echo ""
        echo "Check the logs with: docker compose logs"
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    fi
done

# Detect LAN IP address for network access
detect_lan_ip() {
    local ip=""
    ip=$(ipconfig getifaddr en0 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(ipconfig getifaddr en1 2>/dev/null)
    fi
    if [ -z "$ip" ]; then
        # Fallback: try to get from route
        local default_iface=$(route -n get default 2>/dev/null | grep 'interface:' | awk '{print $2}')
        if [ -n "$default_iface" ]; then
            ip=$(ifconfig "$default_iface" 2>/dev/null | grep 'inet ' | awk '{print $2}')
        fi
    fi
    echo "$ip"
}

LAN_IP=$(detect_lan_ip)

# Read login secret from .env
LOGIN_SECRET=$(grep -E "^LOGIN_SECRET=" "${NGAJ_HOME}/.env" | cut -d'=' -f2-)

# Display success message
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}        ✅ ngaj is ready!              ${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

if [ -n "$LAN_IP" ]; then
    NETWORK_URL="http://${LAN_IP}:3000"
    echo -e "  Dashboard:    ${BLUE}${NETWORK_URL}${NC}"
    echo -e "  (localhost):  http://localhost:3000"
else
    NETWORK_URL="http://localhost:3000"
    echo -e "  Dashboard:    ${BLUE}http://localhost:3000${NC}"
fi

echo ""
if [ -n "$LOGIN_SECRET" ]; then
    echo -e "  Login code:   ${YELLOW}${LOGIN_SECRET}${NC}"
    echo ""
    echo "  (Use this code to log in from any device on your WiFi)"
fi

echo ""
echo "Opening browser..."

# Open browser to dashboard
if [ -n "$LAN_IP" ]; then
    open "http://${LAN_IP}:3000"
else
    open "http://localhost:3000"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "To start ngaj in the future, click the ngaj app in your Applications folder,"
echo "or run: ${NGAJ_HOME}/scripts/ngaj-start.sh"
echo ""
read -p "Press Enter to close this window..."
