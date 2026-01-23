# ngaj Windows Post-Install Script
# This script runs after the .msi installer completes.
# It checks for Docker, installs if needed, runs the setup wizard, and starts services.

$ErrorActionPreference = "Stop"

$NgajHome = "$env:USERPROFILE\.ngaj"
$InstallDir = "$env:ProgramFiles\ngaj"

Write-Host "🚀 ngaj Post-Install Setup" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Create user data directory
New-Item -ItemType Directory -Force -Path "$NgajHome\data\mongodb" | Out-Null
New-Item -ItemType Directory -Force -Path "$NgajHome\data\chromadb" | Out-Null
New-Item -ItemType Directory -Force -Path "$NgajHome\logs" | Out-Null

# Check for Docker
Write-Host "Checking for Docker..."
$dockerExists = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerExists) {
    Write-Host "Docker not found. Downloading Docker Desktop..." -ForegroundColor Yellow
    
    # Download Docker Desktop
    $dockerInstaller = "$env:TEMP\DockerDesktopInstaller.exe"
    Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile $dockerInstaller
    
    # Install silently
    Write-Host "Installing Docker Desktop..."
    Start-Process -Wait -FilePath $dockerInstaller -ArgumentList "install", "--quiet", "--accept-license"
    Remove-Item $dockerInstaller
    
    Write-Host "Please restart your computer and run this script again." -ForegroundColor Yellow
    exit 0
}

# Wait for Docker daemon
Write-Host "Waiting for Docker daemon..."
while (-not (docker info 2>$null)) {
    Start-Sleep -Seconds 2
}
Write-Host "✓ Docker is ready" -ForegroundColor Green

# Pull setup container
Write-Host "Pulling ngaj setup container..."
docker pull ngaj/setup:latest

# Run setup wizard with volume mount
Write-Host ""
Write-Host "Starting setup wizard..." -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
docker run --rm -it -v "${NgajHome}:/data" ngaj/setup:latest

# Check if setup completed (.env exists)
if (-not (Test-Path "$NgajHome\.env")) {
    Write-Host "❌ Setup was cancelled. Run the installer again to complete setup." -ForegroundColor Red
    exit 1
}

# Pull production images
Write-Host ""
Write-Host "Pulling production containers..."
Set-Location $InstallDir
docker compose pull

# Start services
Write-Host "Starting ngaj services..."
docker compose up -d

# Wait for backend health check
Write-Host "Waiting for services to be ready..."
do {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction SilentlyContinue
        $ready = $response.StatusCode -eq 200
    } catch {
        $ready = $false
    }
} while (-not $ready)

Write-Host ""
Write-Host "✅ ngaj is ready!" -ForegroundColor Green
Write-Host "Opening http://localhost:3000..."
Start-Process "http://localhost:3000"
