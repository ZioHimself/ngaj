# ngaj Update Script
# This script pulls the latest stable Docker images for ngaj.
#
# Features:
# - Ensures Docker Desktop is running
# - Pulls latest backend and setup images
# - Displays update status

$ErrorActionPreference = "Stop"

# Header
Clear-Host
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "           Updating ngaj              " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
$dockerExists = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerExists) {
    Write-Host "Docker not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Docker Desktop is required to update ngaj."
    Write-Host "Please install Docker Desktop and try again."
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Start Docker Desktop if not running
Write-Host "Checking Docker..."
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "Starting Docker Desktop..."
    Start-Process "Docker Desktop"
    
    # Wait for Docker daemon (max 60 seconds)
    $waitCount = 0
    $maxWait = 60
    while (-not (docker info 2>$null)) {
        Start-Sleep -Seconds 1
        $waitCount++
        if ($waitCount -ge $maxWait) {
            Write-Host "Docker Desktop failed to start within $maxWait seconds." -ForegroundColor Red
            Write-Host "Please start Docker Desktop manually and try again."
            Write-Host ""
            Read-Host "Press Enter to exit"
            exit 1
        }
        # Show progress every 5 seconds
        if ($waitCount % 5 -eq 0) {
            Write-Host "  Waiting for Docker... ($waitCount s)"
        }
    }
}
Write-Host "Docker is ready" -ForegroundColor Green

# Pull latest stable images
Write-Host ""
Write-Host "Pulling latest stable images..."
Write-Host ""

Write-Host "Updating backend image..." -ForegroundColor Cyan
try {
    docker pull ziohimself/ngaj-backend:stable
    Write-Host "Backend image updated" -ForegroundColor Green
} catch {
    Write-Host "Failed to pull backend image" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Updating setup image..." -ForegroundColor Cyan
try {
    docker pull ziohimself/ngaj-setup:stable
    Write-Host "Setup image updated" -ForegroundColor Green
} catch {
    Write-Host "Failed to pull setup image" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Display success message
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "      ngaj images updated!            " -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "To apply the update, restart ngaj:"
Write-Host "  1. Stop ngaj (close the terminal window)"
Write-Host "  2. Start ngaj again"
Write-Host ""
Read-Host "Press Enter to close this window"
