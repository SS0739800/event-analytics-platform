@echo off
echo Stopping any old instances...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 >nul

echo Starting Flask backend...
start "Flask Backend" cmd /k "cd /d "%~dp0" && venv\Scripts\python run_web.py"

timeout /t 2 >nul

echo Starting React frontend...
start "React Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are starting up.
echo Open http://localhost:5173 in your browser.
