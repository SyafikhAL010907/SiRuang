@echo off
echo ============================================================
echo   HelpDesk Admisi UNJ - AI Auto-Response Service
echo   Running at: http://localhost:8000
echo ============================================================
echo.

REM Cek apakah Python tersedia
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python tidak ditemukan! Pastikan Python 3.8+ sudah terinstall.
    pause
    exit /b 1
)

REM Install dependencies kalau belum ada
echo [1/2] Menginstall dependencies...
pip install -r requirements.txt --quiet

echo.
echo [2/2] Menjalankan AI Service...
set PYTHONPATH=.
python -m app.main

pause
