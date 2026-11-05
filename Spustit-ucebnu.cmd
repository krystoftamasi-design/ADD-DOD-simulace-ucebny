@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Nainstaluj Node.js 22 nebo novejsi a spust tento soubor znovu.
  goto failure
)
python --version
if errorlevel 1 (
  echo Nainstaluj Python 3 a spust tento soubor znovu.
  goto failure
)
if not exist "node_modules\three\package.json" (
  call npm ci
  if errorlevel 1 goto failure
)
call npm run build
if errorlevel 1 goto failure
node scripts/classroom.mjs
if errorlevel 1 goto failure
exit /b 0

:failure
echo Spusteni se nezdarilo. Podrobnosti jsou vyse.
pause
exit /b 1
