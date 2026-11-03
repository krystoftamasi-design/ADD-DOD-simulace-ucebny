@echo off
setlocal
set "PORT=3017"
if not defined DOD_DATA_DIR if exist "%~dp0..\..\prace\showcase-digital-komplet\metadata.json" set "DOD_DATA_DIR=%~dp0..\.."
if defined DOD_DATA_DIR if not defined DOD_FEEDBACK_FILE set "DOD_FEEDBACK_FILE=%DOD_DATA_DIR%\opravy-rozhodnuti-sber-2026-11-03.jsonl"
cd /d "%~dp0"
echo Pracovni verze: http://127.0.0.1:3017/
if not defined DOD_DATA_DIR echo Katalog neni pripojeny. Nastav DOD_DATA_DIR podle README.
node server.mjs
endlocal
