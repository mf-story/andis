@echo off
:: Membuka akses dari HP/perangkat lain di jaringan yang sama (port 5533).
:: Menambahkan aturan firewall lalu menjalankan server.
cd /d "%~dp0"

:: Minta hak administrator (untuk mengubah firewall)
net session >nul 2>nul
if errorlevel 1 (
  echo Meminta izin administrator...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

title Buka Akses HP - Profil Prof. Andi Sukri Syamsuri
echo ============================================================
echo   Menyiapkan akses dari HP (port 5533)
echo ============================================================

netsh advfirewall firewall show rule name="Profil AndiSukri 5533" >nul 2>nul
if errorlevel 1 (
  netsh advfirewall firewall add rule name="Profil AndiSukri 5533" dir=in action=allow protocol=TCP localport=5533
  echo [OK] Aturan firewall ditambahkan.
) else (
  echo [OK] Aturan firewall sudah ada.
)

echo.
echo Alamat untuk dibuka di HP (satu WiFi yang sama):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo   http://%%a:5533
echo.
echo (Admin: tambahkan /admin.html di belakang alamat)
echo ------------------------------------------------------------
node server.js
pause >nul
