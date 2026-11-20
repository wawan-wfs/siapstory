@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
cd /d "%ROOT%"
title STORYSIAP - Local Web Server v4.1

if not exist "%ROOT%dist\index.html" (
  echo.
  echo [ERROR] File halaman utama tidak ditemukan:
  echo         "%ROOT%dist\index.html"
  echo.
  echo Pastikan file ZIP sudah diekstrak seluruhnya.
  echo Jalankan file ini dari folder story-siap hasil ekstraksi.
  echo.
  pause
  exit /b 2
)

rem Prefer Python for a faster threaded server; fallback works without Python.
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import sys; assert sys.version_info.major == 3" >nul 2>nul
  if not errorlevel 1 goto :run_py
)
where python >nul 2>nul
if not errorlevel 1 (
  python -c "import sys; assert sys.version_info.major == 3" >nul 2>nul
  if not errorlevel 1 goto :run_python
)
goto :run_powershell

:run_py
py -3 "%ROOT%launcher\serve.py"
goto :complete

:run_python
python "%ROOT%launcher\serve.py"
goto :complete

:run_powershell
echo [INFO] Python tidak tersedia. Menggunakan PowerShell bawaan Windows.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%launcher\serve.ps1"
goto :complete

:complete
if errorlevel 1 (
  echo.
  echo [ERROR] Proses server terhenti atau gagal. Lihat pesan di atas.
)
echo.
pause
endlocal
