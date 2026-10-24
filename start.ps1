Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Starting Sirona Native Desktop Agent (Electron)        " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$CoreDir = Join-Path $PSScriptRoot "sirona-core"
$UIDir = Join-Path $PSScriptRoot "sirona-ui"
$PythonExe = Join-Path $CoreDir ".venv\Scripts\python.exe"

# 1. Start Backend Server if not already running
$TestBackend = Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet
if (-not $TestBackend) {
    Write-Host "[1/2] Launching Sirona Core Backend on port 8000..." -ForegroundColor Yellow
    Start-Process -FilePath $PythonExe -ArgumentList "-m sirona.cli serve --host 127.0.0.1 --port 8000" -WorkingDirectory $CoreDir
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/2] Backend already active on port 8000." -ForegroundColor Green
}

# 2. Launch Native Electron App
Write-Host "[2/2] Launching Sirona Native Electron Desktop..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-Command", "cd '$UIDir'; npm run electron"

Write-Host "`nSirona Native Desktop App is running!" -ForegroundColor Green
