@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall-local.ps1"
if errorlevel 1 (
  echo.
  echo FAILED: Career Atlas was not fully uninstalled.
  pause
  exit /b 1
)
echo.
echo SUCCESS: The application was removed and personal data was kept.
pause
exit /b 0
