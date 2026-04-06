@echo off
:: IPL Analytics — Nightly Data Refresh
:: Scheduled via Windows Task Scheduler at 01:00 AM IST daily

cd /d "C:\Users\45IN\OneDrive\Documents\Portfolio App\Analytics app\backend"

echo [%date% %time%] Starting nightly IPL data refresh...

:: Run the nightly refresh script using the system Python
python scripts\nightly_refresh.py

echo [%date% %time%] Nightly refresh finished with exit code %ERRORLEVEL%
exit /b %ERRORLEVEL%
