Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          Starting Sirona Electron Desktop Studio         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Ensure backend service is running on port 8000
$portActive = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $portActive) {
    Write-Host "[Sirona] Starting local backend service on port 8000..." -ForegroundColor Yellow
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "[Sirona] Local backend service active on port 8000." -ForegroundColor Green
}

# 2. Launch Electron Desktop Studio
Set-Location "$PSScriptRoot\frontend\sirona-next"
npm run desktop
