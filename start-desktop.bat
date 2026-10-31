@echo off
title Sirona Desktop Studio
echo ==========================================================
echo           Starting Sirona Electron Desktop Studio
echo ==========================================================

netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [Sirona] Starting local backend service on port 8000...
    start /b "" node "%~dp0apps\server\server.js"
    timeout /t 2 /nobreak >nul
) else (
    echo [Sirona] Local backend service active on port 8000.
)

cd "%~dp0apps\desktop"
npm start
