@echo off
setlocal
cd /d "%~dp0\..\.."
node pilot\law-firm\admin-readiness.mjs
if errorlevel 1 (
  echo.
  echo STOPP - Bitte Admin/Engineering informieren.
  pause
  exit /b 1
)
start "GitLaw Pro Pilot Operations" http://127.0.0.1:4317
node pilot\law-firm\ops-console.mjs
