#!/bin/bash
# ngaj Update Script
# This script pulls the latest stable Docker images for ngaj.
#
# Features:
# - Ensures Docker Desktop is running
# - Pulls latest backend and setup images
# - Generates new login secret
# - Displays update status

set -e

NGAJ_HOME="${HOME}/.ngaj"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Updating ngaj               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found!${NC}"
    echo ""
    echo "Docker Desktop is required to update ngaj."
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

# Pull latest stable images
echo ""
echo "Pulling latest stable images..."
echo ""

echo -e "${BLUE}Updating backend image...${NC}"
if docker pull ziohimself/ngaj-backend:stable; then
    echo -e "${GREEN}✓ Backend image updated${NC}"
else
    echo -e "${RED}❌ Failed to pull backend image${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Updating setup image...${NC}"
if docker pull ziohimself/ngaj-setup:stable; then
    echo -e "${GREEN}✓ Setup image updated${NC}"
else
    echo -e "${RED}❌ Failed to pull setup image${NC}"
    exit 1
fi

# Generate new login secret using setup container
echo ""
echo -e "${BLUE}Generating new login secret...${NC}"

# Ensure ngaj home directory exists
mkdir -p "${NGAJ_HOME}"

# Run setup container with --regenerate-secret flag to generate new secret
# The container outputs only the new secret on stdout
NEW_SECRET=$(docker run --rm -v "${NGAJ_HOME}:/data" ziohimself/ngaj-setup:stable --regenerate-secret 2>/dev/null)

if [ -z "${NEW_SECRET}" ]; then
    echo -e "${RED}❌ Failed to generate new login secret${NC}"
    exit 1
fi
echo -e "${GREEN}✓ New login secret generated${NC}"

# Display success message
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}      ✅ ngaj updated!                 ${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "  New login code: ${YELLOW}${NEW_SECRET}${NC}"
echo ""
echo "To apply the update, restart ngaj:"
echo "  1. Stop ngaj (Ctrl+C or close the terminal)"
echo "  2. Start ngaj again"
echo ""
