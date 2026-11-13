@echo off
title Kush Tools Dev (:8085)
cd /d "%~dp0"
bun run dev
if %ERRORLEVEL% NEQ 0 npm run dev
pause
