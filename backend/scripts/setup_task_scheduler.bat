@echo off
:: Run this ONCE as Administrator to register the nightly task
:: Right-click this file → "Run as administrator"

echo Setting up IPL Analytics nightly refresh task...

schtasks /create ^
  /tn "IPL Analytics Nightly Refresh" ^
  /tr "\"C:\Users\45IN\OneDrive\Documents\Portfolio App\Analytics app\backend\scripts\refresh_data.bat\"" ^
  /sc DAILY ^
  /st 01:00 ^
  /ru "%USERNAME%" ^
  /f

if %ERRORLEVEL% == 0 (
    echo.
    echo SUCCESS! Task scheduled to run daily at 01:00 AM.
    echo.
    echo To verify: Open Task Scheduler ^> Task Scheduler Library ^> "IPL Analytics Nightly Refresh"
    echo To run now: schtasks /run /tn "IPL Analytics Nightly Refresh"
) else (
    echo.
    echo ERROR: Failed to create task. Make sure you ran this as Administrator.
)

pause
