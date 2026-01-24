# ngaj Windows Post-Install Script
# This script runs after the .msi installer completes.
# It checks for Docker, installs if needed, runs the setup wizard, and starts services.

$ErrorActionPreference = "Stop"

$NgajHome = "$env:LOCALAPPDATA\ngaj"
$InstallDir = "$env:ProgramFiles\ngaj"

Write-Host "ngaj Post-Install Setup" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Create user data directory structure
New-Item -ItemType Directory -Force -Path "$NgajHome\data\mongodb" | Out-Null
New-Item -ItemType Directory -Force -Path "$NgajHome\data\chromadb" | Out-Null
New-Item -ItemType Directory -Force -Path "$NgajHome\logs" | Out-Null
New-Item -ItemType Directory -Force -Path "$NgajHome\scripts" | Out-Null

# Copy start script to user directory
Write-Host "Installing launcher scripts..."
Copy-Item "$InstallDir\scripts\ngaj-start.ps1" "$NgajHome\scripts\" -Force

# Create Start Menu shortcut
Write-Host "Creating Start Menu shortcut..."
$WshShell = New-Object -ComObject WScript.Shell
$StartMenu = [Environment]::GetFolderPath('StartMenu')
$Shortcut = $WshShell.CreateShortcut("$StartMenu\Programs\ngaj.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -NoExit -File `"$NgajHome\scripts\ngaj-start.ps1`""
$Shortcut.WorkingDirectory = $NgajHome
$Shortcut.Description = "Start ngaj - Social Media Engagement Companion"
$Shortcut.Save()

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

# Detect LAN IP address for network access
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
        $ip = $null
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

Write-Host ""
Write-Host "ngaj is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "  Local access:   http://localhost:3000"
if ($lanIP) {
    Write-Host "  Network access: http://${lanIP}:3000"
    Write-Host "  (Use this URL from your mobile device on the same WiFi)"
}
if ($loginSecret) {
    Write-Host ""
    Write-Host "  Login code:     $loginSecret"
}
Write-Host ""
Write-Host "Opening browser..."

if ($lanIP) {
    Start-Process "http://${lanIP}:3000"
} else {
    Start-Process "http://localhost:3000"
}
