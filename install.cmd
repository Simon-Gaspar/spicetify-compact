@echo off
rem Double-cliquer pour installer (contourne le blocage des scripts PowerShell pour ce seul lancement).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
pause
