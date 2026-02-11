# ngaj Start Script
# This script starts ngaj services and opens the browser.
# It's called by the Start Menu shortcut for day-2 experience.
#
# Features:
# - Ensures Docker Desktop is running
# - Starts ngaj containers
# - Displays login code and network address
# - Opens browser to dashboard

$ErrorActionPreference = "Stop"

# Ensure HOME is set for docker-compose compatibility
# Windows doesn't set HOME by default, but docker-compose.yml uses ${HOME}
if (-not $env:HOME) {
    $env:HOME = $env:USERPROFILE
}

$NgajHome = "$env:LOCALAPPDATA\ngaj"
$NgajConfig = "$env:HOME\.ngaj"
$InstallDir = "$env:ProgramFiles\ngaj"
$EnvFile = "$NgajConfig\.env"

# Header
Clear-Host
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "           Starting ngaj              " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists - if not, redirect to setup (matching macOS behavior)
if (-not (Test-Path $EnvFile)) {
    Write-Host "Configuration not found. Starting setup wizard..." -ForegroundColor Yellow
    Write-Host ""
    # Run setup script in current window
    & "$NgajHome\scripts\ngaj-setup.ps1"
    exit $LASTEXITCODE
}

# Check if Docker is installed
$dockerExists = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerExists) {
    Write-Host "Docker not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Docker Desktop is required to run ngaj."
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

# Start services
Write-Host ""
Write-Host "Starting ngaj services..."
Set-Location $InstallDir
docker compose up -d

# Wait for backend health check (max 30 seconds)
Write-Host "Waiting for services to be ready..."
$waitCount = 0
$maxWait = 30
$ready = $false
while (-not $ready -and $waitCount -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waitCount++
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
        # Get the IP address of the default network adapter
        $networkConfig = Get-NetIPConfiguration | Where-Object { 
            $_.IPv4DefaultGateway -ne $null -and 
            $_.NetAdapter.Status -eq "Up" 
        } | Select-Object -First 1
        
        if ($networkConfig) {
            $ip = ($networkConfig.IPv4Address | Where-Object { $_.PrefixOrigin -ne "WellKnown" }).IPAddress
        }
    } catch {
        # Fallback: try to get any non-localhost IPv4
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
if (Test-Path $EnvFile) {
    $envContent = Get-Content $EnvFile
    $loginLine = $envContent | Where-Object { $_ -match "^LOGIN_SECRET=" }
    if ($loginLine) {
        $loginSecret = $loginLine -replace "^LOGIN_SECRET=", ""
    }
}

# Display success message
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "        ngaj is running!              " -ForegroundColor Green
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

# Display login code with visual emphasis (ADR-021)
if ($loginSecret) {
    # Copy to clipboard
    $clipboardSuccess = $false
    try {
        $loginSecret | Set-Clipboard
        $clipboardSuccess = $true
    } catch {
        # Clipboard operation failed (e.g., headless environment)
        $clipboardSuccess = $false
    }
    
    # Save to file for backup reference
    $loginCodeFile = "$NgajHome\login-code.txt"
    $fileSaveSuccess = $false
    try {
        # Ensure directory exists
        if (-not (Test-Path $NgajHome)) {
            New-Item -ItemType Directory -Path $NgajHome -Force | Out-Null
        }
        $loginSecret | Out-File -FilePath $loginCodeFile -Encoding ASCII -NoNewline
        $fileSaveSuccess = $true
    } catch {
        $fileSaveSuccess = $false
    }
    
    # Display with visual emphasis
    Write-Host ""
    Write-Host "═══════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "  LOGIN CODE:  $loginSecret" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════" -ForegroundColor Yellow
    if ($clipboardSuccess) {
        Write-Host "  ✓ Copied to clipboard" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "  (Use this code to log in from any device on your WiFi)"
    if ($fileSaveSuccess) {
        Write-Host "  Login code also saved to: $loginCodeFile" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Close this window or press Ctrl+C to stop ngaj" -ForegroundColor DarkGray
Write-Host ""

# Open browser to dashboard
if ($lanIP) {
    Start-Process "http://${lanIP}:3000"
} else {
    Start-Process "http://localhost:3000"
}

# Keep script running until user closes window
# This allows the terminal to stay open and show the status
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # Cleanup on exit
    Write-Host ""
    Write-Host "Stopping ngaj services..." -ForegroundColor Yellow
    docker compose down
    Write-Host "ngaj stopped." -ForegroundColor Green
}
