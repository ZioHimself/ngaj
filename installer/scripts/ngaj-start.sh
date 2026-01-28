#!/bin/bash
# ngaj Start Script
# This script starts ngaj services and opens the browser.
# It's called by the ngaj.app launcher for day-2 experience.
#
# Features:
# - Ensures Docker Desktop is running
# - Starts ngaj containers
# - Displays login code and network address
# - Opens browser to dashboard
# - Handles Ctrl+C gracefully

set -e

NGAJ_HOME="${HOME}/.ngaj"
ENV_FILE="${NGAJ_HOME}/.env"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping ngaj services...${NC}"
    cd "${NGAJ_HOME}" && docker compose down
    echo -e "${GREEN}ngaj stopped.${NC}"
    exit 0
}

# Register signal handler
trap cleanup SIGINT SIGTERM

# Header
clear
echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            Starting ngaj              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f "${ENV_FILE}" ]; then
    echo -e "${RED}❌ Configuration not found!${NC}"
    echo ""
    echo "ngaj has not been set up yet."
    echo "Please run the installer again to complete setup."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found!${NC}"
    echo ""
    echo "Docker Desktop is required to run ngaj."
    echo "Please install Docker Desktop and try again."
    exit 1
fi

# Start Docker Desktop if not running
echo "Checking Docker..."
if ! docker info &> /dev/null; then
    echo "Starting Docker Desktop..."
    open -a Docker
    
    # Wait for Docker daemon (max 60 seconds)
    WAIT_COUNT=0
    MAX_WAIT=60
    while ! docker info &> /dev/null; do
        sleep 1
        WAIT_COUNT=$((WAIT_COUNT + 1))
        if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
            echo -e "${RED}❌ Docker Desktop failed to start within ${MAX_WAIT} seconds.${NC}"
            echo "Please start Docker Desktop manually and try again."
            exit 1
        fi
        # Show progress every 5 seconds
        if [ $((WAIT_COUNT % 5)) -eq 0 ]; then
            echo "  Waiting for Docker... (${WAIT_COUNT}s)"
        fi
    done
fi
echo -e "${GREEN}✓ Docker is ready${NC}"

# Start services
echo ""
echo "Starting ngaj services..."
cd "${NGAJ_HOME}"
docker compose up -d

# Wait for backend health check (max 30 seconds)
echo "Waiting for services to be ready..."
WAIT_COUNT=0
MAX_WAIT=30
until curl -s http://localhost:3000/health > /dev/null 2>&1; do
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo -e "${RED}❌ Services failed to start within ${MAX_WAIT} seconds.${NC}"
        echo ""
        echo "Check the logs with: docker compose logs"
        exit 1
    fi
done

# Detect LAN IP address
detect_lan_ip() {
    # Try en0 (WiFi) first, then en1, then any active interface
    local ip=""
    
    # Method 1: ipconfig (most reliable on macOS)
    ip=$(ipconfig getifaddr en0 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(ipconfig getifaddr en1 2>/dev/null)
    fi
    
    # Method 2: route + ifconfig (fallback)
    if [ -z "$ip" ]; then
        local default_iface=$(route -n get default 2>/dev/null | grep 'interface:' | awk '{print $2}')
        if [ -n "$default_iface" ]; then
            ip=$(ifconfig "$default_iface" 2>/dev/null | grep 'inet ' | awk '{print $2}')
        fi
    fi
    
    echo "$ip"
}

LAN_IP=$(detect_lan_ip)

# Read login secret from .env
LOGIN_SECRET=$(grep -E "^LOGIN_SECRET=" "${ENV_FILE}" | cut -d'=' -f2-)

# Display success message
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}        ✅ ngaj is running!            ${NC}"
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
echo -e "${YELLOW}Press Ctrl+C to stop ngaj${NC}"
echo ""

# Open browser to dashboard
if [ -n "$LAN_IP" ]; then
    open "http://${LAN_IP}:3000"
else
    open "http://localhost:3000"
fi

# Keep script running until Ctrl+C
# This allows the terminal to stay open and show the status
while true; do
    sleep 1
done
