@echo off
title Server Profil - Prof. Andi Sukri Syamsuri
cd /d "%~dp0"
echo ============================================================
echo   Menjalankan server profil ^& ruang tulisan...
echo ============================================================
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js tidak ditemukan. Silakan pasang dari https://nodejs.org
  echo.
  pause
  exit /b 1
)
node server.js
echo.
echo Server berhenti. Tekan tombol apa saja untuk menutup.
pause >nul
