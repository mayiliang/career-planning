@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-local.ps1" -Mode Install
if errorlevel 1 (
  echo.
  echo FAILED: Career Atlas was not installed. Review the message above.
  pause
  exit /b 1
)
echo.
echo SUCCESS: Career Atlas is ready. Use the desktop shortcut next time.
timeout /t 3 /nobreak >nul
exit /b 0
