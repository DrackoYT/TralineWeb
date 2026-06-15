@echo off
title Servidor Traline
echo ====================================
echo  Servidor local de Traline
echo  Abre http://localhost:8080/
echo ====================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
