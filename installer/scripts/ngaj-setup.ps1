# ngaj First-Time Setup Script for Windows
# This script runs in PowerShell after the installer completes.
# It runs the interactive setup wizard and starts services.

$ErrorActionPreference = "Stop"

$NgajHome = "$env:LOCALAPPDATA\ngaj"
$InstallDir = "$env:ProgramFiles\ngaj"

# Header
Clear-Host
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "       ngaj First-Time Setup          " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if already set up
if (Test-Path "$NgajHome\.env") {
    Write-Host "ngaj is already configured." -ForegroundColor Yellow
    Write-Host ""
    $reconfigure = Read-Host "Do you want to reconfigure? (y/N)"
    if ($reconfigure -notmatch "^[Yy]$") {
        Write-Host "Starting ngaj..."
        & "$NgajHome\scripts\ngaj-start.ps1"
        exit 0
    }
}

# Check for Docker
Write-Host "Checking for Docker..."
$dockerExists = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerExists) {
    Write-Host "Docker not found. Downloading Docker Desktop..." -ForegroundColor Yellow
    
    # Download Docker Desktop
    $dockerInstaller = "$env:TEMP\DockerDesktopInstaller.exe"
    Write-Host "Downloading Docker Desktop installer..."
    Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile $dockerInstaller
    
    # Install silently
    Write-Host "Installing Docker Desktop (this may take a few minutes)..."
    Start-Process -Wait -FilePath $dockerInstaller -ArgumentList "install", "--quiet", "--accept-license"
    Remove-Item $dockerInstaller -ErrorAction SilentlyContinue
    
    Write-Host "Docker Desktop installed" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please restart your computer, then run this script again:" -ForegroundColor Yellow
    Write-Host "  $NgajHome\scripts\ngaj-setup.ps1"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

# Start Docker Desktop if not running
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "Starting Docker Desktop..."
    Start-Process "Docker Desktop" -ErrorAction SilentlyContinue
    
    # Wait for Docker daemon (max 120 seconds)
    Write-Host "Waiting for Docker to start..."
    $waitCount = 0
    $maxWait = 120
    while (-not (docker info 2>$null)) {
        Start-Sleep -Seconds 2
        $waitCount += 2
        if ($waitCount -ge $maxWait) {
            Write-Host "Docker Desktop failed to start within $maxWait seconds." -ForegroundColor Red
            Write-Host ""
            Write-Host "Please start Docker Desktop manually and run this script again:"
            Write-Host "  $NgajHome\scripts\ngaj-setup.ps1"
            Write-Host ""
            Read-Host "Press Enter to exit"
            exit 1
        }
        # Show progress every 10 seconds
        if ($waitCount % 10 -eq 0) {
            Write-Host "  Still waiting for Docker... ($waitCount s)"
        }
    }
}
Write-Host "Docker is ready" -ForegroundColor Green

# Pull setup container
Write-Host ""
Write-Host "Pulling ngaj setup container..."
docker pull ziohimself/ngaj-setup:stable

# Run setup wizard with volume mount
Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "       Credentials Setup              " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
docker run --rm -it -v "${NgajHome}:/data" ziohimself/ngaj-setup:stable

# Check if setup completed (.env exists)
if (-not (Test-Path "$NgajHome\.env")) {
    Write-Host ""
    Write-Host "Setup was cancelled." -ForegroundColor Red
    Write-Host ""
    Write-Host "To try again, run:"
    Write-Host "  $NgajHome\scripts\ngaj-setup.ps1"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Pull production images
Write-Host ""
Write-Host "Pulling production containers..."
Set-Location $InstallDir
docker compose pull

# Start services
Write-Host ""
Write-Host "Starting ngaj services..."
docker compose up -d

# Wait for backend health check (max 60 seconds)
Write-Host "Waiting for services to be ready..."
$waitCount = 0
$maxWait = 60
$ready = $false
while (-not $ready -and $waitCount -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waitCount += 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction SilentlyContinue
        $ready = $response.StatusCode -eq 200
    } catch {
        $ready = $false
    }
}

if (-not $ready) {
    Write-Host "Services failed to start within $maxWait seconds." -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the logs with: docker compose logs"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Detect LAN IP address
function Get-LanIP {
    $ip = $null
    try {
        $networkConfig = Get-NetIPConfiguration | Where-Object { 
            $_.IPv4DefaultGateway -ne $null -and 
            $_.NetAdapter.Status -eq "Up" 
        } | Select-Object -First 1
        
        if ($networkConfig) {
            $ip = ($networkConfig.IPv4Address | Where-Object { $_.PrefixOrigin -ne "WellKnown" }).IPAddress
        }
    } catch {
        # Fallback
        $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
            $_.IPAddress -notlike "127.*" -and 
            $_.IPAddress -notlike "169.254.*" 
        } | Select-Object -First 1).IPAddress
    }
    return $ip
}

$lanIP = Get-LanIP

# Read login secret from .env
$loginSecret = $null
if (Test-Path "$NgajHome\.env") {
    $envContent = Get-Content "$NgajHome\.env"
    $loginLine = $envContent | Where-Object { $_ -match "^LOGIN_SECRET=" }
    if ($loginLine) {
        $loginSecret = $loginLine -replace "^LOGIN_SECRET=", ""
    }
}

# Display success message
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "        ngaj is ready!                " -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

if ($lanIP) {
    $networkUrl = "http://${lanIP}:3000"
    Write-Host "  Dashboard:    $networkUrl" -ForegroundColor Cyan
    Write-Host "  (localhost):  http://localhost:3000"
} else {
    $networkUrl = "http://localhost:3000"
    Write-Host "  Dashboard:    http://localhost:3000" -ForegroundColor Cyan
}

Write-Host ""
if ($loginSecret) {
    Write-Host "  Login code:   $loginSecret" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  (Use this code to log in from any device on your WiFi)"
}

Write-Host ""
Write-Host "Opening browser..."

# Open browser to dashboard
if ($lanIP) {
    Start-Process "http://${lanIP}:3000"
} else {
    Start-Process "http://localhost:3000"
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start ngaj in the future, use the Start Menu shortcut,"
Write-Host "or run: $NgajHome\scripts\ngaj-start.ps1"
Write-Host ""
Read-Host "Press Enter to close this window"
