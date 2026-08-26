@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-local.ps1" -Mode Update
if errorlevel 1 (
  echo.
  echo FAILED: The previous installed version was kept when possible.
  pause
  exit /b 1
)
echo.
echo SUCCESS: Career Atlas was updated and reopened.
timeout /t 3 /nobreak >nul
exit /b 0
