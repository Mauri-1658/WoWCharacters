@echo off
SETLOCAL EnableDelayedExpansion

:: --- Configuration ---
SET SERVER_PORT=3000
SET URL=http://localhost:!SERVER_PORT!
SET PROJECT_DIR=%~dp0

:: --- Move to project directory ---
cd /d "!PROJECT_DIR!"

echo WoWCharacters Launcher
echo ---------------------------

:: --- Check for node_modules ---
if not exist node_modules (
    echo [!] node_modules not found. Installing dependencies...
    call npm install
)

:: --- Start Server ---
echo [*] Starting server...
start "WoWCharacters Server" /B node server.js

:: --- Wait for server to initialize ---
echo [*] Waiting for server to start at !URL!...
timeout /t 3 /nobreak > nul

:: --- Open Browser ---
echo [*] Opening browser...
start !URL!

echo ---------------------------
echo [OK] Server is running in the background.
echo [OK] You can close this window if you want, but the server will stop.
echo [!] Keep this window open to see server logs.
echo ---------------------------

:: Keep the window open to show logs
pause
