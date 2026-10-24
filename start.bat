@echo off
title Sirona Autonomous Developer Agent
echo ==========================================================
echo       Starting Sirona Native Desktop Agent (Electron)
echo ==========================================================

start "Sirona Core Backend" cmd /k "cd sirona-core && .venv\Scripts\activate && python -m sirona.cli serve --host 127.0.0.1 --port 8000"
timeout /t 2 /nobreak >nul
start "Sirona Electron Desktop" cmd /k "cd sirona-ui && npm run electron"

echo Sirona Native Desktop App launched!
echo Backend: http://127.0.0.1:8000
