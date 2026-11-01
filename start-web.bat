@echo off
title Sirona Web Studio
echo ==========================================================
echo           Starting Sirona Web Studio (Browser Mode)
echo ==========================================================

netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [Sirona] Starting local backend service on port 8000...
    start /b "" node "%~dp0apps\server\server.js"
    timeout /t 2 /nobreak >nul
) else (
    echo [Sirona] Local backend service active on port 8000.
)

netstat -ano | findstr :5176 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [Sirona] Starting web UI server on port 5176...
    start /b "" node "%~dp0apps\desktop\src\server.cjs"
    timeout /t 2 /nobreak >nul
) else (
    echo [Sirona] Web UI server active on port 5176.
)

echo [Sirona] Opening browser at http://127.0.0.1:5176 ...
start http://127.0.0.1:5176

echo.
echo ==========================================================
echo Sirona Web Studio is live!
echo URL: http://127.0.0.1:5176
echo Press F12 in your browser to open DevTools (Console and Network tabs).
echo ==========================================================
pause
