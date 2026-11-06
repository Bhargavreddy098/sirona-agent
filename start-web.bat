@echo off
echo ========================================================
echo   Starting Sirona Local Web Interface
echo ========================================================
echo.
echo Starting backend server on http://127.0.0.1:8000...
start "Sirona Backend" /min cmd /c "npm --prefix apps/server run dev"

timeout /t 2 /nobreak >nul

echo Starting web interface on http://127.0.0.1:5178...
start "" "http://127.0.0.1:5178"
npm --prefix apps/web run dev
