# ngaj Windows Post-Install Script
# This script runs after the installer completes (may be non-interactive).
# It installs files and then opens PowerShell for the interactive setup wizard.

$ErrorActionPreference = "Stop"

$NgajHome = "$env:LOCALAPPDATA\ngaj"
$InstallDir = "$env:ProgramFiles\ngaj"

# Create user data directory structure
# Note: MongoDB and ChromaDB use Docker named volumes, not host directories
New-Item -ItemType Directory -Force -Path "$NgajHome\logs" | Out-Null
New-Item -ItemType Directory -Force -Path "$NgajHome\scripts" | Out-Null

# Copy scripts to user directory
Copy-Item "$InstallDir\scripts\ngaj-start.ps1" "$NgajHome\scripts\" -Force
Copy-Item "$InstallDir\scripts\ngaj-setup.ps1" "$NgajHome\scripts\" -Force

# Create Start Menu shortcut for ngaj (day-2 launcher)
$WshShell = New-Object -ComObject WScript.Shell
$StartMenu = [Environment]::GetFolderPath('StartMenu')
$Shortcut = $WshShell.CreateShortcut("$StartMenu\Programs\ngaj.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -NoExit -File `"$NgajHome\scripts\ngaj-start.ps1`""
$Shortcut.WorkingDirectory = $NgajHome
$Shortcut.Description = "Start ngaj - Social Media Engagement Companion"
$Shortcut.Save()

# Open PowerShell to run the interactive setup wizard
# This runs AFTER the installer UI closes
Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -NoExit -File `"$NgajHome\scripts\ngaj-setup.ps1`""

exit 0
