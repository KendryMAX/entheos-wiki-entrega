@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Entheos Wiki

if not exist ".env" (
  echo Falta el archivo .env. Ejecuta primero INSTALAR.bat
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Faltan las dependencias. Ejecuta primero INSTALAR.bat
  pause
  exit /b 1
)

echo.
echo Iniciando Entheos Wiki...
echo Abrir: http://entheoswiki.localhost
echo Para detenerlo: Ctrl + C
echo.
call npm run iniciar
pause