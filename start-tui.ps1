Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      Starting Sirona Interactive Terminal UI (TUI)       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\apps\cli"
npm start -- tui
