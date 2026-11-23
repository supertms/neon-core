@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Neon Core - Local Codex Client

where node >nul 2>nul
if errorlevel 1 (
  echo [Neon Core] Node.js 20 or newer is required.
  echo Install it from https://nodejs.org/ and run this launcher again.
  pause
  exit /b 1
)

where codex >nul 2>nul
if errorlevel 1 (
  echo [Neon Core] Codex CLI is not installed or is not on PATH.
  echo Open a terminal and run: npm install -g @openai/codex@latest
  echo Then run: codex login
  pause
  exit /b 1
)

echo [Neon Core] Starting local client at http://127.0.0.1:4173/
echo [Neon Core] This window must stay open while you use the client.
echo [Neon Core] Closing this window stops the local connection.
echo.

rem Browser is opened after the local server has started listening.
start "" cmd /c "timeout /t 3 /nobreak >nul & start "" "http://127.0.0.1:4173/""
node local\server.mjs
if errorlevel 1 (
  echo.
  echo [Neon Core] The local bridge exited with an error.
  echo Check that port 4173 is free and Node.js is up to date.
  pause
)
endlocal
