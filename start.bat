@echo off
set "NODE_DIR=C:\Users\chw\node\node-v24.20.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"
cd /d "%~dp0"
echo Node:
"%NODE_DIR%\node.exe" -v
echo.
echo Starting DSE MC Generator + Poe proxy at http://localhost:3457
echo Gemini: browser key still talks to Google directly
echo Poe:    Settings key is forwarded via /api/poe (avoids CORS)
echo Press Ctrl+C to stop.
echo.
"%NODE_DIR%\node.exe" "api\dev-server.mjs"
