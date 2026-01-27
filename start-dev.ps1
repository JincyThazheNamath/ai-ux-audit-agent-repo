# PowerShell script to start Next.js dev server
# This script helps bypass OneDrive/Windows permission issues

Write-Host "Starting Next.js development server..." -ForegroundColor Green

# Change to project directory
Set-Location "C:\Users\User\OneDrive\Desktop\UX-Audit\ai-ux-audit-agent-repo"

# Clear any existing .next cache
if (Test-Path ".next") {
    Write-Host "Clearing .next cache..." -ForegroundColor Yellow
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}

# Kill any existing Node processes
Write-Host "Checking for existing Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Stopping existing Node processes..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Set environment variables
$env:NODE_OPTIONS = ""
$env:PORT = "3001"

# Start the dev server
Write-Host "Starting server on port 3001..." -ForegroundColor Green
Write-Host "Access the app at: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""

npx next dev -p 3001
